# Document Comparison with Myers Diff Algorithm

## Problem Brief

Build a Remirror extension that compares two ProseMirror documents and computes a structured diff showing insertions, deletions, and unchanged content. The extension should implement the Myers diff algorithm (the same algorithm used by Git) to efficiently identify differences between document structures.

The extension should provide helper methods to compare documents, calculate similarity percentages, and filter operations by type. It should support configurable options like comparing marks, attributes, and traversal depth.

## Agent Instructions

Create a `DocumentDiffExtension` that provides these core capabilities:

1. **Document Comparison**: Implement helpers to compare two documents and return detailed diff results including operation lists, statistics (insertions, deletions, unchanged counts), and an identical flag.

2. **Myers Algorithm Implementation**: Build the core diff algorithm that converts documents to comparable sequences, computes differences using Myers' O(ND) algorithm, and generates operations. The algorithm should handle ProseMirror's nested node structures efficiently.

3. **Helper Methods**: Provide utilities to:
   - Compare current document with another document
   - Filter operations by type (insertions, deletions, unchanged)
   - Calculate similarity percentage between documents
   - Generate human-readable diff summaries
   - Check document identity

4. **Configuration Options**: Support customizable comparison behavior including mark comparison toggle, attribute comparison toggle, maximum traversal depth, and custom equality functions for specialized comparison logic.

The extension should handle edge cases like empty documents, large documents (50+ paragraphs), nested structures (lists, blockquotes), mark changes, and node type changes. Focus on algorithm correctness and performance.

## Test Assumptions

The extension must be importable as `DocumentDiffExtension` from the package root. Configuration options must be named `compareMarks` (boolean, default true), `compareAttributes` (boolean, default true), `maxDepth` (number, default -1 for unlimited), and `isEqual` (optional custom equality function).

Helper methods accessible via `manager.store.helpers`:
- `compareDocuments(oldDoc, newDoc, options?)` - returns diff result
- `compareWithDocument(otherDoc, options?)` - compares with current document
- `compareStates(oldState, newState, options?)` - compares editor states
- `getInsertions(diffResult)` - filters to insertion operations
- `getDeletions(diffResult)` - filters to deletion operations  
- `getUnchanged(diffResult)` - filters to unchanged operations
- `calculateSimilarity(docA, docB, options?)` - returns percentage (0-100)
- `getDiffSummary(diffResult)` - returns human-readable string
- `areDocumentsIdentical(docA, docB, options?)` - returns boolean

Diff results must include `operations` (array), `insertions` (number), `deletions` (number), `unchanged` (number), and `identical` (boolean) properties.
