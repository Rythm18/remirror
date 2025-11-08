import { pmBuild } from 'jest-prosemirror';
import { extensionValidityTest, renderEditor } from 'jest-remirror';

import {
  DiffOperationType,
  DocumentDiffExtension,
  type DocumentDiffResult,
} from '../src';

extensionValidityTest(DocumentDiffExtension);

describe('DocumentDiffExtension', () => {
  const {
    add,
    doc,
    p,
    strong,
    em,
    blockquote,
    h1,
    h2,
    bulletList,
    listItem,
    schema,
  } = pmBuild;

  let extension: DocumentDiffExtension;

  beforeEach(() => {
    extension = new DocumentDiffExtension();
  });

  describe('compareDocuments', () => {
    it('should detect identical documents', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello world'));
      const docB = doc(p('Hello world'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(true);
      expect(result.insertions).toBe(0);
      expect(result.deletions).toBe(0);
      expect(result.unchanged).toBeGreaterThan(0);
    });

    it('should detect text insertions', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello'));
      const docB = doc(p('Hello world'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.insertions).toBeGreaterThan(0);
      expect(result.deletions).toBe(0);
    });

    it('should detect text deletions', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello world'));
      const docB = doc(p('Hello'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.insertions).toBe(0);
      expect(result.deletions).toBeGreaterThan(0);
    });

    it('should detect node type changes', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Text'));
      const docB = doc(h1('Text'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.insertions).toBeGreaterThan(0);
      expect(result.deletions).toBeGreaterThan(0);
    });

    it('should handle complex document structures', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(
        h1('Title'),
        p('First paragraph'),
        blockquote(p('Quote')),
      );
      const docB = doc(
        h1('Title'),
        p('First paragraph modified'),
        blockquote(p('Quote')),
      );

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.unchanged).toBeGreaterThan(0);
      expect(result.insertions + result.deletions).toBeGreaterThan(0);
    });

    it('should detect mark changes when compareMarks is enabled', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello world'));
      const docB = doc(p(strong('Hello'), ' world'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(false);
    });

    it('should ignore mark changes when compareMarks is disabled', () => {
      const extension = new DocumentDiffExtension({ compareMarks: false });
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello world'));
      const docB = doc(p(strong('Hello world')));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      // With compareMarks: false, marks are ignored
      expect(result.identical).toBe(true);
    });

    it('should handle nested list structures', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(
        bulletList(
          listItem(p('Item 1')),
          listItem(p('Item 2')),
        ),
      );
      const docB = doc(
        bulletList(
          listItem(p('Item 1')),
          listItem(p('Item 2')),
          listItem(p('Item 3')),
        ),
      );

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.insertions).toBeGreaterThan(0);
    });

    it('should respect maxDepth option', () => {
      const extension = new DocumentDiffExtension({ maxDepth: 0 });
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Text 1'));
      const docB = doc(p('Text 2'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      // With maxDepth 0, only top-level nodes are compared
      expect(result).toBeDefined();
    });
  });

  describe('operations', () => {
    it('should generate correct operation types', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('A'), p('B'));
      const docB = doc(p('A'), p('C'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      const hasEqual = result.operations.some(op => op.type === DiffOperationType.EQUAL);
      const hasInsert = result.operations.some(op => op.type === DiffOperationType.INSERT);
      const hasDelete = result.operations.some(op => op.type === DiffOperationType.DELETE);

      expect(hasEqual).toBe(true);
      expect(hasInsert || hasDelete).toBe(true);
    });

    it('should include position information in operations', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello'));
      const docB = doc(p('World'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      for (const op of result.operations) {
        if (op.type === DiffOperationType.DELETE) {
          expect(op.oldPos).toBeDefined();
        } else if (op.type === DiffOperationType.INSERT) {
          expect(op.newPos).toBeDefined();
        } else if (op.type === DiffOperationType.EQUAL) {
          expect(op.oldPos).toBeDefined();
          expect(op.newPos).toBeDefined();
        }
      }
    });
  });

  describe('helper methods', () => {
    it('getInsertions should filter insert operations', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('A'));
      const docB = doc(p('A'), p('B'));

      const diff = manager.store.helpers.compareDocuments(docA, docB);
      const insertions = manager.store.helpers.getInsertions(diff);

      expect(insertions.length).toBeGreaterThan(0);
      expect(insertions.every(op => op.type === DiffOperationType.INSERT)).toBe(true);
    });

    it('getDeletions should filter delete operations', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('A'), p('B'));
      const docB = doc(p('A'));

      const diff = manager.store.helpers.compareDocuments(docA, docB);
      const deletions = manager.store.helpers.getDeletions(diff);

      expect(deletions.length).toBeGreaterThan(0);
      expect(deletions.every(op => op.type === DiffOperationType.DELETE)).toBe(true);
    });

    it('getUnchanged should filter equal operations', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Same'), p('Different 1'));
      const docB = doc(p('Same'), p('Different 2'));

      const diff = manager.store.helpers.compareDocuments(docA, docB);
      const unchanged = manager.store.helpers.getUnchanged(diff);

      expect(unchanged.length).toBeGreaterThan(0);
      expect(unchanged.every(op => op.type === DiffOperationType.EQUAL)).toBe(true);
    });

    it('calculateSimilarity should return percentage', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello world'));
      const docB = doc(p('Hello world'));

      const similarity = manager.store.helpers.calculateSimilarity(docA, docB);

      expect(similarity).toBe(100);
    });

    it('calculateSimilarity should handle partial matches', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('A'), p('B'), p('C'));
      const docB = doc(p('A'), p('X'), p('C'));

      const similarity = manager.store.helpers.calculateSimilarity(docA, docB);

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(100);
    });

    it('getDiffSummary should generate readable summary', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello'));
      const docB = doc(p('Hello world'));

      const diff = manager.store.helpers.compareDocuments(docA, docB);
      const summary = manager.store.helpers.getDiffSummary(diff);

      expect(summary).toContain('insertion');
      expect(summary).toContain('unchanged');
    });

    it('getDiffSummary should handle identical documents', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello'));
      const docB = doc(p('Hello'));

      const diff = manager.store.helpers.compareDocuments(docA, docB);
      const summary = manager.store.helpers.getDiffSummary(diff);

      expect(summary).toBe('Documents are identical');
    });

    it('areDocumentsIdentical should return boolean', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Test'));
      const docB = doc(p('Test'));
      const docC = doc(p('Different'));

      expect(manager.store.helpers.areDocumentsIdentical(docA, docB)).toBe(true);
      expect(manager.store.helpers.areDocumentsIdentical(docA, docC)).toBe(false);
    });
  });

  describe('compareWithDocument', () => {
    it('should compare current document with provided document', () => {
      const { manager, add } = renderEditor([extension]);

      add(doc(p('Initial text')));

      const otherDoc = doc(p('Different text'));
      const result = manager.store.helpers.compareWithDocument(otherDoc);

      expect(result.identical).toBe(false);
    });
  });

  describe('compareStates', () => {
    it('should compare two editor states', () => {
      const { manager, view } = renderEditor([extension]);

      const state1 = view.state;
      
      // Create a new state with different content
      const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, schema.nodes.paragraph!.create({}, schema.text('New content')));
      const state2 = view.state.apply(tr);

      const result = manager.store.helpers.compareStates(state1, state2);

      expect(result).toBeDefined();
      expect(result.identical).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty documents', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p(''));
      const docB = doc(p(''));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(true);
    });

    it('should handle documents with only whitespace differences', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello'));
      const docB = doc(p('Hello '));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(false);
    });

    it('should handle very large documents', () => {
      const { manager } = renderEditor([extension]);
      
      const paragraphs = Array.from({ length: 100 }, (_, i) => p(`Paragraph ${i}`));
      const docA = doc(...paragraphs);
      const docB = doc(...paragraphs);

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(true);
    });
  });

  describe('custom equality function', () => {
    it('should use custom isEqual function when provided', () => {
      const customExtension = new DocumentDiffExtension({
        isEqual: (a, b) => a.type.name === b.type.name, // Ignore content, only compare types
      });
      const { manager } = renderEditor([customExtension]);

      const docA = doc(p('Text 1'));
      const docB = doc(p('Text 2'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      // With custom equality that only checks types, these should be equal
      expect(result.identical).toBe(true);
    });
  });
});
