import {
  command,
  CommandFunction,
  EditorState,
  extension,
  Helper,
  helper,
  PlainExtension,
  ProsemirrorNode,
} from '@remirror/core';

import { computeDocumentDiff } from './myers-diff-algorithm';
import {
  DiffOperation,
  DiffOperationType,
  DocumentDiffOptions,
  DocumentDiffResult,
} from './document-diff-types';

export interface DocumentDiffExtensionOptions extends DocumentDiffOptions {}

/**
 * Extension for comparing ProseMirror documents and computing structured diffs.
 *
 * This extension provides functionality to:
 * - Compare two documents and identify insertions, deletions, and unchanged content
 * - Use the Myers diff algorithm for optimal diff computation
 * - Support configurable comparison options (attributes, marks, depth)
 * - Generate transformation steps to convert one document to another
 *
 * @remarks
 * The extension uses the Myers diff algorithm, which is the same algorithm used by Git.
 * It provides an efficient O(ND) solution where N is the sum of sequence lengths and
 * D is the size of the minimal edit script.
 */
@extension<DocumentDiffExtensionOptions>({
  defaultOptions: {
    maxDepth: -1,
    compareAttributes: true,
    compareMarks: true,
  },
})
export class DocumentDiffExtension extends PlainExtension<DocumentDiffExtensionOptions> {
  get name() {
    return 'documentDiff' as const;
  }

  /**
   * Compare two ProseMirror documents and return a structured diff.
   *
   * @param oldDoc - The original document
   * @param newDoc - The new document to compare against
   * @param options - Optional comparison options (overrides extension defaults)
   *
   * @returns A DocumentDiffResult containing operations and statistics
   *
   * @example
   * ```ts
   * const result = helpers.compareDocuments(oldState.doc, newState.doc);
   * console.log(`Insertions: ${result.insertions}, Deletions: ${result.deletions}`);
   * console.log(`Documents identical: ${result.identical}`);
   * ```
   */
  @helper()
  compareDocuments(
    oldDoc: ProsemirrorNode,
    newDoc: ProsemirrorNode,
    options?: DocumentDiffOptions,
  ): Helper<DocumentDiffResult> {
    const mergedOptions = { ...this.options, ...options };
    return computeDocumentDiff(oldDoc, newDoc, mergedOptions);
  }

  /**
   * Compare the current document with another document.
   *
   * @param otherDoc - The document to compare against the current document
   * @param options - Optional comparison options
   *
   * @returns A DocumentDiffResult
   */
  @helper()
  compareWithDocument(
    otherDoc: ProsemirrorNode,
    options?: DocumentDiffOptions,
  ): Helper<DocumentDiffResult> {
    const currentDoc = this.store.getState().doc;
    return this.compareDocuments(currentDoc, otherDoc, options);
  }

  /**
   * Compare two editor states.
   *
   * @param oldState - The original editor state
   * @param newState - The new editor state to compare against
   * @param options - Optional comparison options
   *
   * @returns A DocumentDiffResult
   */
  @helper()
  compareStates(
    oldState: EditorState,
    newState: EditorState,
    options?: DocumentDiffOptions,
  ): Helper<DocumentDiffResult> {
    return this.compareDocuments(oldState.doc, newState.doc, options);
  }

  /**
   * Get only the insertions from a diff result.
   *
   * @param diff - The diff result to filter
   * @returns Array of insert operations
   */
  @helper()
  getInsertions(diff: DocumentDiffResult): Helper<DiffOperation[]> {
    return diff.operations.filter((op) => op.type === DiffOperationType.INSERT);
  }

  /**
   * Get only the deletions from a diff result.
   *
   * @param diff - The diff result to filter
   * @returns Array of delete operations
   */
  @helper()
  getDeletions(diff: DocumentDiffResult): Helper<DiffOperation[]> {
    return diff.operations.filter((op) => op.type === DiffOperationType.DELETE);
  }

  /**
   * Get only the unchanged nodes from a diff result.
   *
   * @param diff - The diff result to filter
   * @returns Array of equal operations
   */
  @helper()
  getUnchanged(diff: DocumentDiffResult): Helper<DiffOperation[]> {
    return diff.operations.filter((op) => op.type === DiffOperationType.EQUAL);
  }

  /**
   * Calculate similarity percentage between two documents.
   *
   * @param oldDoc - The original document
   * @param newDoc - The new document
   * @param options - Optional comparison options
   *
   * @returns A number between 0 and 100 representing similarity percentage
   */
  @helper()
  calculateSimilarity(
    oldDoc: ProsemirrorNode,
    newDoc: ProsemirrorNode,
    options?: DocumentDiffOptions,
  ): Helper<number> {
    const diff = this.compareDocuments(oldDoc, newDoc, options);
    const total = diff.unchanged + diff.insertions + diff.deletions;

    if (total === 0) {
      return 100;
    }

    return (diff.unchanged / total) * 100;
  }

  /**
   * Generate a human-readable summary of the diff.
   *
   * @param diff - The diff result to summarize
   * @returns A string summary
   */
  @helper()
  getDiffSummary(diff: DocumentDiffResult): Helper<string> {
    if (diff.identical) {
      return 'Documents are identical';
    }

    const parts: string[] = [];

    if (diff.insertions > 0) {
      parts.push(`${diff.insertions} insertion${diff.insertions === 1 ? '' : 's'}`);
    }

    if (diff.deletions > 0) {
      parts.push(`${diff.deletions} deletion${diff.deletions === 1 ? '' : 's'}`);
    }

    if (diff.unchanged > 0) {
      parts.push(`${diff.unchanged} unchanged`);
    }

    return parts.join(', ');
  }

  /**
   * Check if two documents are identical.
   *
   * @param docA - First document
   * @param docB - Second document
   * @param options - Optional comparison options
   *
   * @returns True if documents are identical
   */
  @helper()
  areDocumentsIdentical(
    docA: ProsemirrorNode,
    docB: ProsemirrorNode,
    options?: DocumentDiffOptions,
  ): Helper<boolean> {
    const diff = this.compareDocuments(docA, docB, options);
    return diff.identical;
  }

  /**
   * Command to log diff information to console (useful for debugging).
   * This is a non-chainable command that doesn't modify the document.
   *
   * @param otherDoc - The document to compare against current document
   *
   * @example
   * ```ts
   * commands.logDocumentDiff(previousState.doc);
   * ```
   */
  @command()
  logDocumentDiff(otherDoc: ProsemirrorNode): CommandFunction {
    return ({ state }) => {
      const diff = this.compareDocuments(state.doc, otherDoc);
      console.log('Document Diff Summary:', this.getDiffSummary(diff));
      console.log('Full Diff Result:', diff);
      return false; // Non-modifying command
    };
  }
}

declare global {
  namespace Remirror {
    interface AllExtensions {
      documentDiff: DocumentDiffExtension;
    }
  }
}
