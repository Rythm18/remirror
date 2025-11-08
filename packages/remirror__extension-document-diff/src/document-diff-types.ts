import type { ProsemirrorNode } from '@remirror/core';

/**
 * Types of operations in a diff
 */
export enum DiffOperationType {
  /** Content is the same in both documents */
  EQUAL = 'equal',
  /** Content was inserted in the new document */
  INSERT = 'insert',
  /** Content was deleted from the old document */
  DELETE = 'delete',
}

/**
 * Represents a single diff operation on a node
 */
export interface DiffOperation {
  /**
   * The type of operation
   */
  type: DiffOperationType;

  /**
   * The node involved in this operation
   */
  node: ProsemirrorNode;

  /**
   * The position in the original document (for DELETE and EQUAL operations)
   */
  oldPos?: number;

  /**
   * The position in the new document (for INSERT and EQUAL operations)
   */
  newPos?: number;
}

/**
 * Result of comparing two documents
 */
export interface DocumentDiffResult {
  /**
   * List of diff operations
   */
  operations: DiffOperation[];

  /**
   * Total number of insertions
   */
  insertions: number;

  /**
   * Total number of deletions
   */
  deletions: number;

  /**
   * Total number of equal (unchanged) nodes
   */
  unchanged: number;

  /**
   * Whether the documents are identical
   */
  identical: boolean;
}

/**
 * Options for computing document diffs
 */
export interface DocumentDiffOptions {
  /**
   * Maximum depth to traverse when comparing node structures
   * @defaultValue -1 (unlimited)
   */
  maxDepth?: number;

  /**
   * Whether to compare node attributes
   * @defaultValue true
   */
  compareAttributes?: boolean;

  /**
   * Whether to compare node marks
   * @defaultValue true
   */
  compareMarks?: boolean;

  /**
   * Custom equality function for nodes
   */
  isEqual?: (a: ProsemirrorNode, b: ProsemirrorNode) => boolean;
}

/**
 * Internal representation for Myers diff algorithm
 */
export interface DiffNode {
  node: ProsemirrorNode;
  pos: number;
}
