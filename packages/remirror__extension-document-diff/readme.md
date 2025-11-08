# @remirror/extension-document-diff

> Compare ProseMirror documents and compute structured diffs using the Myers algorithm

## Installation

```bash
npm install @remirror/extension-document-diff
# or
yarn add @remirror/extension-document-diff
# or
pnpm add @remirror/extension-document-diff
```

## Usage

```typescript
import { DocumentDiffExtension } from '@remirror/extension-document-diff';
import { RemirrorManager } from 'remirror';

// Create manager with extension
const manager = RemirrorManager.create([
  new DocumentDiffExtension(),
  // ... other extensions
]);

// Compare two documents
const oldDoc = /* ... */;
const newDoc = /* ... */;

const result = manager.store.helpers.compareDocuments(oldDoc, newDoc);

console.log(`Insertions: ${result.insertions}`);
console.log(`Deletions: ${result.deletions}`);
console.log(`Unchanged: ${result.unchanged}`);
console.log(`Identical: ${result.identical}`);

// Filter operations
const insertions = manager.store.helpers.getInsertions(result);
const deletions = manager.store.helpers.getDeletions(result);

// Calculate similarity
const similarity = manager.store.helpers.calculateSimilarity(oldDoc, newDoc);
console.log(`${similarity}% similar`);
```

## Features

- **Myers Diff Algorithm**: Efficient O(ND) document comparison
- **Structured Results**: Detailed operations with position tracking
- **Flexible Comparison**: Configure mark, attribute, and depth comparison
- **Helper Methods**: Filter operations, calculate similarity, generate summaries
- **TypeScript Support**: Full type definitions included

## API

### Helpers

- `compareDocuments(oldDoc, newDoc, options?)` - Compare two documents
- `compareWithDocument(otherDoc, options?)` - Compare current document with another
- `compareStates(oldState, newState, options?)` - Compare two editor states
- `getInsertions(diff)` - Get only insertion operations
- `getDeletions(diff)` - Get only deletion operations
- `getUnchanged(diff)` - Get only unchanged operations
- `calculateSimilarity(oldDoc, newDoc, options?)` - Get similarity percentage
- `getDiffSummary(diff)` - Generate human-readable summary
- `areDocumentsIdentical(docA, docB, options?)` - Check if documents are identical

### Options

```typescript
interface DocumentDiffOptions {
  maxDepth?: number;          // Maximum traversal depth (-1 for unlimited)
  compareAttributes?: boolean; // Compare node attributes (default: true)
  compareMarks?: boolean;      // Compare node marks (default: true)
  isEqual?: (a, b) => boolean; // Custom equality function
}
```

## License

MIT
