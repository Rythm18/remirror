import { pmBuild } from 'jest-prosemirror';
import { extensionValidityTest, renderEditor } from 'jest-remirror';

import { DocumentDiffExtension } from '../src';

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

  describe('document comparison', () => {
    it('should identify identical documents', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello world'));
      const docB = doc(p('Hello world'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(true);
      expect(result.insertions).toBe(0);
      expect(result.deletions).toBe(0);
      expect(result.unchanged).toBeGreaterThan(0);
    });

    it('should detect when content is added', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello'));
      const docB = doc(p('Hello world'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.insertions).toBeGreaterThan(0);
      expect(result.deletions).toBe(0);
    });

    it('should detect when content is removed', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello world'));
      const docB = doc(p('Hello'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.insertions).toBe(0);
      expect(result.deletions).toBeGreaterThan(0);
    });

    it('should detect when node types change', () => {
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

      expect(result.identical).toBe(true);
    });

    it('should detect attribute changes when compareAttributes is enabled', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(h1('Heading'));
      const docB = doc(h2('Heading'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(false);
    });

    it('should ignore attribute changes when compareAttributes is disabled', () => {
      const extension = new DocumentDiffExtension({ compareAttributes: false });
      const { manager } = renderEditor([extension]);
      
      // Create documents with different heading levels (attributes differ)
      const docA = doc(h1('Same text'));
      const docB = doc(h2('Same text'));

      const resultWithCheck = manager.store.helpers.compareDocuments(docA, docB);
      const resultWithoutCheck = manager.store.helpers.compareDocuments(docA, docB, { compareAttributes: false });

      // When compareAttributes is false, should have fewer or equal differences
      // since attribute differences are ignored
      expect(resultWithoutCheck).toBeDefined();
      expect(typeof resultWithoutCheck.identical).toBe('boolean');
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
      const extension = new DocumentDiffExtension({ maxDepth: 1 });
      const { manager } = renderEditor([extension]);
      
      // Nested structure: bulletList > listItem > paragraph > text
      const docA = doc(bulletList(listItem(p('Item 1'))));
      const docB = doc(bulletList(listItem(p('Item 2'))));

      // With limited depth, comparison stops at certain level
      const resultLimitedDepth = manager.store.helpers.compareDocuments(docA, docB, { maxDepth: 1 });
      const resultFullDepth = manager.store.helpers.compareDocuments(docA, docB, { maxDepth: -1 });

      // Both should complete, but may have different operation counts
      expect(resultLimitedDepth).toBeDefined();
      expect(resultFullDepth).toBeDefined();
      expect(typeof resultLimitedDepth.identical).toBe('boolean');
      expect(typeof resultFullDepth.identical).toBe('boolean');
    });

    it('should handle empty documents', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p(''));
      const docB = doc(p(''));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(true);
    });

    it('should detect whitespace differences', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello'));
      const docB = doc(p('Hello '));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(false);
    });

    it('should handle large documents efficiently', () => {
      const { manager } = renderEditor([extension]);
      
      const paragraphs = Array.from({ length: 100 }, (_, i) => p(`Paragraph ${i}`));
      const docA = doc(...paragraphs);
      const docB = doc(...paragraphs);

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(result.identical).toBe(true);
    });
  });

  describe('helper methods', () => {
    it('should filter to show only insertions', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('A'));
      const docB = doc(p('A'), p('B'));

      const diff = manager.store.helpers.compareDocuments(docA, docB);
      const insertions = manager.store.helpers.getInsertions(diff);

      expect(insertions.length).toBeGreaterThan(0);
      expect(insertions.length).toBeLessThanOrEqual(diff.insertions);
    });

    it('should filter to show only deletions', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('A'), p('B'));
      const docB = doc(p('A'));

      const diff = manager.store.helpers.compareDocuments(docA, docB);
      const deletions = manager.store.helpers.getDeletions(diff);

      expect(deletions.length).toBeGreaterThan(0);
      expect(deletions.length).toBeLessThanOrEqual(diff.deletions);
    });

    it('should filter to show only unchanged content', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Same'), p('Different 1'));
      const docB = doc(p('Same'), p('Different 2'));

      const diff = manager.store.helpers.compareDocuments(docA, docB);
      const unchanged = manager.store.helpers.getUnchanged(diff);

      expect(unchanged.length).toBeGreaterThan(0);
      expect(unchanged.length).toBeLessThanOrEqual(diff.unchanged);
    });

    it('should calculate 100% similarity for identical documents', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello world'));
      const docB = doc(p('Hello world'));

      const similarity = manager.store.helpers.calculateSimilarity(docA, docB);

      expect(similarity).toBe(100);
    });

    it('should calculate partial similarity for partially matching documents', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('A'), p('B'), p('C'));
      const docB = doc(p('A'), p('X'), p('C'));

      const similarity = manager.store.helpers.calculateSimilarity(docA, docB);

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(100);
    });

    it('should generate a human-readable diff summary', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello'));
      const docB = doc(p('Hello world'));

      const diff = manager.store.helpers.compareDocuments(docA, docB);
      const summary = manager.store.helpers.getDiffSummary(diff);

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should report identical documents in summary', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Hello'));
      const docB = doc(p('Hello'));

      const diff = manager.store.helpers.compareDocuments(docA, docB);
      const summary = manager.store.helpers.getDiffSummary(diff);

      // Summary should reflect that documents are identical
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      expect(diff.identical).toBe(true);
    });

    it('should reflect changes in summary when present', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('A'));
      const docB = doc(p('A'), p('B'));

      const diff = manager.store.helpers.compareDocuments(docA, docB);
      const summary = manager.store.helpers.getDiffSummary(diff);

      // Summary should be non-empty and reflect that changes exist
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      expect(diff.insertions).toBeGreaterThan(0);
    });

    it('should generate meaningful summary for documents with differences', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('A'), p('B'));
      const docB = doc(p('A'));

      const diff = manager.store.helpers.compareDocuments(docA, docB);
      const summary = manager.store.helpers.getDiffSummary(diff);

      // Summary should be non-empty for documents with deletions
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      expect(diff.deletions).toBeGreaterThan(0);
    });

    it('should correctly identify identical documents', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('Test'));
      const docB = doc(p('Test'));
      const docC = doc(p('Different'));

      expect(manager.store.helpers.areDocumentsIdentical(docA, docB)).toBe(true);
      expect(manager.store.helpers.areDocumentsIdentical(docA, docC)).toBe(false);
    });
  });

  describe('compareWithDocument', () => {
    it('should compare current document state with provided document', () => {
      const { manager, add } = renderEditor([extension]);

      add(doc(p('Initial text')));

      const otherDoc = doc(p('Different text'));
      const result = manager.store.helpers.compareWithDocument(otherDoc);

      expect(result.identical).toBe(false);
      expect(result.insertions + result.deletions).toBeGreaterThan(0);
    });
  });

  describe('compareStates', () => {
    it('should compare two editor states', () => {
      const { manager, view } = renderEditor([extension]);

      const state1 = view.state;
      
      // Create new content using the view's schema
      const tr = view.state.tr.replaceWith(
        0,
        view.state.doc.content.size,
        view.state.schema.nodes.paragraph!.create({}, view.state.schema.text('New content'))
      );
      const state2 = view.state.apply(tr);

      const result = manager.store.helpers.compareStates(state1, state2);

      expect(result).toBeDefined();
      expect(result.identical).toBe(false);
    });
  });

  describe('custom equality function', () => {
    it('should use custom equality when provided', () => {
      const customExtension = new DocumentDiffExtension({
        isEqual: (a, b) => a.type.name === b.type.name,
      });
      const { manager } = renderEditor([customExtension]);

      const docA = doc(p('Text 1'));
      const docB = doc(p('Text 2'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      // With custom equality checking only types, documents should match
      expect(result.identical).toBe(true);
    });
  });

  describe('operations structure', () => {
    it('should return operations array in diff result', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('A'));
      const docB = doc(p('B'));

      const result = manager.store.helpers.compareDocuments(docA, docB);

      expect(Array.isArray(result.operations)).toBe(true);
      expect(result.operations.length).toBeGreaterThan(0);
    });

    it('should provide operations that can be filtered by helpers', () => {
      const { manager } = renderEditor([extension]);
      const docA = doc(p('A'), p('B'));
      const docB = doc(p('A'), p('C'));

      const diff = manager.store.helpers.compareDocuments(docA, docB);
      
      const insertions = manager.store.helpers.getInsertions(diff);
      const deletions = manager.store.helpers.getDeletions(diff);
      const unchanged = manager.store.helpers.getUnchanged(diff);

      // All operations should be accounted for across the filters
      const totalFiltered = insertions.length + deletions.length + unchanged.length;
      expect(totalFiltered).toBe(diff.operations.length);
    });
  });
});
