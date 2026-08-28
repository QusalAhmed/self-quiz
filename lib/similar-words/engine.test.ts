import { SimilarWordsEngine } from './engine';

describe('SimilarWordsEngine', () => {
  const vocabulary = [
    { id: '1', word: 'retail' },
    { id: '2', word: 'retailer' },
    { id: '3', word: 'retailing' },
    { id: '4', word: 'trail' },
    { id: '5', word: 'detail' },
    { id: '6', word: 'entail' },
    { id: '7', word: 'produce' },
    { id: '8', word: 'producer' },
    { id: '9', word: 'production' },
    { id: '10', word: 'productive' },
    { id: '11', word: 'decide' },
    { id: '12', word: 'decision' },
    { id: '13', word: 'banana' },
  ];

  it('finds ranked similar words for query', () => {
    const engine = new SimilarWordsEngine();
    const results = engine.findSimilarWords('retail', vocabulary, { limit: 5 });

    expect(results.length).toBeGreaterThan(0);
    const words = results.map((r) => r.word);
    expect(words).toContain('retailer');
    expect(words).toContain('trail');

    // retailer should have high score
    const retailerResult = results.find((r) => r.word === 'retailer');
    expect(retailerResult?.score).toBeGreaterThanOrEqual(0.8);
    expect(retailerResult?.relationship).toBe('word_family');
  });

  it('filters results by relationship type', () => {
    const engine = new SimilarWordsEngine();
    const morphResults = engine.findSimilarWords('produce', vocabulary, {
      relationshipType: 'word_family',
    });

    for (const r of morphResults) {
      expect(['word_family', 'morphological']).toContain(r.relationship);
    }
  });

  it('performs batch computation on vocabulary', () => {
    const engine = new SimilarWordsEngine();
    const { records, metrics } = engine.batchComputeAll(vocabulary, 0.45);

    expect(records.length).toBeGreaterThan(0);
    expect(metrics.totalWords).toBe(vocabulary.length);
    expect(metrics.discoveredRelationships).toBe(records.length);

    for (const rec of records) {
      expect(rec.sourceWordId < rec.targetWordId).toBe(true);
      expect(rec.overallScore).toBeGreaterThanOrEqual(0.45);
      expect(rec.algorithmVersion).toBe('v1');
    }
  });
});
