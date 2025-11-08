import { pmBuild } from 'jest-prosemirror';

import { computeDocumentDiff } from '../src/myers-diff-algorithm';
import { DiffOperationType } from '../src/document-diff-types';

describe('Myers Diff Algorithm', () => {
  const { doc, p, h1, h2, strong, em, blockquote, bulletList, listItem } = pmBuild;

  describe('computeDocumentDiff', () => {
    it('should return empty diff for identical documents', () => {
      const docA = doc(p('Hello world'));
      const docB = doc(p('Hello world'));

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(true);
      expect(result.insertions).toBe(0);
      expect(result.deletions).toBe(0);
      expect(result.unchanged).toBeGreaterThan(0);
    });

    it('should detect simple insertion at end', () => {
      const docA = doc(p('Hello'));
      const docB = doc(p('Hello'), p('World'));

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.insertions).toBeGreaterThan(0);
      expect(result.deletions).toBe(0);

      const insertOps = result.operations.filter(op => op.type === DiffOperationType.INSERT);
      expect(insertOps.length).toBeGreaterThan(0);
    });

    it('should detect simple deletion', () => {
      const docA = doc(p('Hello'), p('World'));
      const docB = doc(p('Hello'));

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.insertions).toBe(0);
      expect(result.deletions).toBeGreaterThan(0);

      const deleteOps = result.operations.filter(op => op.type === DiffOperationType.DELETE);
      expect(deleteOps.length).toBeGreaterThan(0);
    });

    it('should detect replacement (delete + insert)', () => {
      const docA = doc(p('Old text'));
      const docB = doc(p('New text'));

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.insertions).toBeGreaterThan(0);
      expect(result.deletions).toBeGreaterThan(0);
    });

    it('should handle multiple changes', () => {
      const docA = doc(
        p('Keep this'),
        p('Delete this'),
        p('Keep this too'),
      );
      const docB = doc(
        p('Keep this'),
        p('Insert this'),
        p('Keep this too'),
      );

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.unchanged).toBeGreaterThan(0);
      expect(result.insertions).toBeGreaterThan(0);
      expect(result.deletions).toBeGreaterThan(0);
    });

    it('should handle nested structures', () => {
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

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.insertions).toBeGreaterThan(0);
    });

    it('should compare marks correctly by default', () => {
      const docA = doc(p('Plain text'));
      const docB = doc(p(strong('Bold text')));

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(false);
    });

    it('should ignore marks when compareMarks is false', () => {
      const docA = doc(p('Same text'));
      const docB = doc(p(strong('Same text')));

      const result = computeDocumentDiff(docA, docB, { compareMarks: false });

      expect(result.identical).toBe(true);
    });

    it('should compare attributes correctly by default', () => {
      const docA = doc(h1('Heading'));
      const docB = doc(h2('Heading'));

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(false);
    });

    it('should handle empty documents', () => {
      const docA = doc(p(''));
      const docB = doc(p(''));

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(true);
    });

    it('should detect insertion into empty document', () => {
      const docA = doc(p(''));
      const docB = doc(p('New content'));

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.insertions).toBeGreaterThan(0);
    });

    it('should detect deletion to empty document', () => {
      const docA = doc(p('Content to delete'));
      const docB = doc(p(''));

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.deletions).toBeGreaterThan(0);
    });

    it('should maintain operation order', () => {
      const docA = doc(p('A'), p('B'), p('C'));
      const docB = doc(p('A'), p('X'), p('C'));

      const result = computeDocumentDiff(docA, docB);

      // Operations should be in document order
      let lastPos = -1;
      for (const op of result.operations) {
        if (op.type === DiffOperationType.EQUAL && op.oldPos !== undefined) {
          expect(op.oldPos).toBeGreaterThanOrEqual(lastPos);
          lastPos = op.oldPos;
        } else if (op.type === DiffOperationType.DELETE && op.oldPos !== undefined) {
          expect(op.oldPos).toBeGreaterThanOrEqual(lastPos);
          lastPos = op.oldPos;
        }
      }
    });

    it('should handle complex mixed operations', () => {
      const docA = doc(
        h1('Title'),
        p('Paragraph 1'),
        p('Paragraph 2'),
        blockquote(p('Quote')),
      );
      const docB = doc(
        h1('Title'),
        p('Paragraph 1 modified'),
        blockquote(p('Quote')),
        p('New paragraph'),
      );

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(false);
      expect(result.unchanged).toBeGreaterThan(0); // Title and quote unchanged
      expect(result.insertions).toBeGreaterThan(0);
      expect(result.deletions).toBeGreaterThan(0);
    });

    it('should respect maxDepth option', () => {
      const docA = doc(bulletList(listItem(p('Deep text 1'))));
      const docB = doc(bulletList(listItem(p('Deep text 2'))));

      const result1 = computeDocumentDiff(docA, docB, { maxDepth: 0 });
      const result2 = computeDocumentDiff(docA, docB, { maxDepth: -1 });

      // With limited depth, fewer nodes are compared
      expect(result1.operations.length).toBeLessThan(result2.operations.length);
    });

    it('should use custom isEqual function', () => {
      const customIsEqual = (a: any, b: any) => {
        // Only compare node types, ignore content
        return a.type.name === b.type.name;
      };

      const docA = doc(p('Text A'));
      const docB = doc(p('Text B'));

      const result = computeDocumentDiff(docA, docB, { isEqual: customIsEqual });

      // With custom equality that ignores content, should be identical
      expect(result.identical).toBe(true);
    });

    it('should handle documents with multiple identical sections', () => {
      const docA = doc(
        p('Same 1'),
        p('Different A'),
        p('Same 2'),
        p('Different B'),
        p('Same 3'),
      );
      const docB = doc(
        p('Same 1'),
        p('Different X'),
        p('Same 2'),
        p('Different Y'),
        p('Same 3'),
      );

      const result = computeDocumentDiff(docA, docB);

      const equalOps = result.operations.filter(op => op.type === DiffOperationType.EQUAL);
      
      // Should identify the three "Same" paragraphs
      expect(equalOps.length).toBeGreaterThan(0);
      expect(result.unchanged).toBeGreaterThan(0);
    });

    it('should handle transpositions', () => {
      const docA = doc(p('A'), p('B'), p('C'));
      const docB = doc(p('C'), p('B'), p('A'));

      const result = computeDocumentDiff(docA, docB);

      // Transposition should be detected as deletions and insertions
      expect(result.identical).toBe(false);
    });

    it('should generate operations with correct node references', () => {
      const docA = doc(p('Hello'));
      const docB = doc(p('World'));

      const result = computeDocumentDiff(docA, docB);

      for (const op of result.operations) {
        expect(op.node).toBeDefined();
        expect(op.node.type).toBeDefined();
      }
    });

    it('should handle large documents efficiently', () => {
      const largeParagraphs = Array.from({ length: 50 }, (_, i) => p(`Paragraph ${i}`));
      const docA = doc(...largeParagraphs);
      const docB = doc(...largeParagraphs);

      const startTime = Date.now();
      const result = computeDocumentDiff(docA, docB);
      const endTime = Date.now();

      expect(result.identical).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle documents with only whitespace', () => {
      const docA = doc(p('   '));
      const docB = doc(p('   '));

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(true);
    });

    it('should detect single character changes', () => {
      const docA = doc(p('Hello'));
      const docB = doc(p('Hella'));

      const result = computeDocumentDiff(docA, docB);

      expect(result.identical).toBe(false);
    });
  });
});
