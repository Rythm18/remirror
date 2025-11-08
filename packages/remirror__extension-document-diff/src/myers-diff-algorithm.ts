import type { ProsemirrorNode } from '@remirror/core';
import {
  DiffNode,
  DiffOperation,
  DiffOperationType,
  DocumentDiffOptions,
  DocumentDiffResult,
} from './document-diff-types';

/**
 * Implementation of Myers diff algorithm for ProseMirror nodes
 * Based on: "An O(ND) Difference Algorithm and Its Variations" by Eugene W. Myers
 */

/**
 * Convert a ProseMirror document to a flat list of comparable nodes
 */
function flattenDocument(
  doc: ProsemirrorNode,
  maxDepth: number = -1,
  currentDepth: number = 0,
): DiffNode[] {
  const nodes: DiffNode[] = [];
  let pos = 0;

  const traverse = (node: ProsemirrorNode, depth: number) => {
    // Add the node itself
    nodes.push({ node, pos });
    pos += node.nodeSize;

    // Traverse children if within depth limit
    if ((maxDepth < 0 || depth < maxDepth) && node.content.size > 0) {
      node.content.forEach((child) => {
        traverse(child, depth + 1);
      });
    }
  };

  // Start traversal from document children
  doc.content.forEach((child) => {
    traverse(child, currentDepth);
  });

  return nodes;
}

/**
 * Check if two nodes are equal based on options
 */
function nodesEqual(
  a: ProsemirrorNode,
  b: ProsemirrorNode,
  options: DocumentDiffOptions,
): boolean {
  // Use custom equality function if provided
  if (options.isEqual) {
    return options.isEqual(a, b);
  }

  // Check node type
  if (a.type.name !== b.type.name) {
    return false;
  }

  // Check text content for text nodes
  if (a.isText && b.isText) {
    return a.text === b.text;
  }

  // Check attributes if enabled
  if (options.compareAttributes !== false) {
    const aAttrs = JSON.stringify(a.attrs);
    const bAttrs = JSON.stringify(b.attrs);
    if (aAttrs !== bAttrs) {
      return false;
    }
  }

  // Check marks if enabled
  if (options.compareMarks !== false) {
    if (a.marks.length !== b.marks.length) {
      return false;
    }

    for (let i = 0; i < a.marks.length; i++) {
      const aMark = a.marks[i];
      const bMark = b.marks[i];

      if (!aMark || !bMark || aMark.type.name !== bMark.type.name) {
        return false;
      }

      const aMarkAttrs = JSON.stringify(aMark.attrs);
      const bMarkAttrs = JSON.stringify(bMark.attrs);
      if (aMarkAttrs !== bMarkAttrs) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Core Myers diff algorithm implementation
 * Returns the shortest edit script (SES) between two sequences
 */
function myersDiff(
  oldNodes: DiffNode[],
  newNodes: DiffNode[],
  options: DocumentDiffOptions,
): DiffOperation[] {
  const n = oldNodes.length;
  const m = newNodes.length;
  const max = n + m;

  // V array stores the furthest reaching D-path in diagonal k
  const v: Map<number, number> = new Map();
  v.set(1, 0);

  // Trace stores the V arrays for backtracking
  const trace: Map<number, number>[] = [];

  // Find the shortest edit script
  for (let d = 0; d <= max; d++) {
    trace.push(new Map(v));

    for (let k = -d; k <= d; k += 2) {
      // Determine whether to move down or right
      const goDown = k === -d || (k !== d && (v.get(k - 1) ?? 0) < (v.get(k + 1) ?? 0));

      const xStart = goDown ? v.get(k + 1) ?? 0 : v.get(k - 1) ?? 0;
      let x = goDown ? xStart : xStart + 1;
      let y = x - k;

      // Follow diagonal as far as possible
      while (x < n && y < m && nodesEqual(oldNodes[x]!.node, newNodes[y]!.node, options)) {
        x++;
        y++;
      }

      v.set(k, x);

      // Check if we've reached the end
      if (x >= n && y >= m) {
        return backtrack(oldNodes, newNodes, trace, d, k);
      }
    }
  }

  // Should never reach here, but return empty if it does
  return [];
}

/**
 * Backtrack through the trace to construct the diff operations
 */
function backtrack(
  oldNodes: DiffNode[],
  newNodes: DiffNode[],
  trace: Map<number, number>[],
  d: number,
  k: number,
): DiffOperation[] {
  const operations: DiffOperation[] = [];
  let x = oldNodes.length;
  let y = newNodes.length;

  // Backtrack from (n, m) to (0, 0)
  for (let currentD = d; currentD >= 0; currentD--) {
    const v = trace[currentD]!;
    const kCurrent = k;

    // Determine the previous k
    const goDown =
      kCurrent === -currentD ||
      (kCurrent !== currentD && (v.get(kCurrent - 1) ?? 0) < (v.get(kCurrent + 1) ?? 0));

    const kPrev = goDown ? kCurrent + 1 : kCurrent - 1;
    const xStart = v.get(kPrev) ?? 0;
    const yStart = xStart - kPrev;
    const xMid = goDown ? xStart : xStart + 1;
    const yMid = xMid - kCurrent;

    // Add diagonal moves (equals)
    while (x > xMid && y > yMid) {
      x--;
      y--;
      operations.unshift({
        type: DiffOperationType.EQUAL,
        node: oldNodes[x]!.node,
        oldPos: oldNodes[x]!.pos,
        newPos: newNodes[y]!.pos,
      });
    }

    // Add the edit operation
    if (currentD > 0) {
      if (x > xMid) {
        // Deletion
        x--;
        operations.unshift({
          type: DiffOperationType.DELETE,
          node: oldNodes[x]!.node,
          oldPos: oldNodes[x]!.pos,
        });
      } else {
        // Insertion
        y--;
        operations.unshift({
          type: DiffOperationType.INSERT,
          node: newNodes[y]!.node,
          newPos: newNodes[y]!.pos,
        });
      }
    }

    k = kPrev;
  }

  return operations;
}

/**
 * Compute the diff between two ProseMirror documents
 */
export function computeDocumentDiff(
  oldDoc: ProsemirrorNode,
  newDoc: ProsemirrorNode,
  options: DocumentDiffOptions = {},
): DocumentDiffResult {
  const maxDepth = options.maxDepth ?? -1;

  // Flatten both documents to comparable node lists
  const oldNodes = flattenDocument(oldDoc, maxDepth);
  const newNodes = flattenDocument(newDoc, maxDepth);

  // Compute diff operations using Myers algorithm
  const operations = myersDiff(oldNodes, newNodes, options);

  // Calculate statistics
  let insertions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const op of operations) {
    switch (op.type) {
      case DiffOperationType.INSERT:
        insertions++;
        break;
      case DiffOperationType.DELETE:
        deletions++;
        break;
      case DiffOperationType.EQUAL:
        unchanged++;
        break;
    }
  }

  const identical = insertions === 0 && deletions === 0;

  return {
    operations,
    insertions,
    deletions,
    unchanged,
    identical,
  };
}
