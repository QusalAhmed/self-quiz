import { computePairSimilarity } from './scorer';

describe('Similarity Scorer', () => {
  it('assigns high score to spelling similarity (trial vs trail)', () => {
    const res = computePairSimilarity('trial', 'trail');
    expect(res.overallScore).toBeGreaterThanOrEqual(0.75);
    expect(res.signals.isTransposition).toBe(true);
    expect(res.orthographicScore).toBeGreaterThanOrEqual(0.8);
  });

  it('assigns high score to morphological similarity (retail vs retailer)', () => {
    const res = computePairSimilarity('retail', 'retailer');
    expect(res.overallScore).toBeGreaterThanOrEqual(0.85);
    expect(res.morphologicalScore).toBeGreaterThanOrEqual(0.85);
    expect(res.signals.stemMatch).toBe(true);
  });

  it('assigns high score to prefix word-family (care vs careful)', () => {
    const res = computePairSimilarity('care', 'careful');
    expect(res.overallScore).toBeGreaterThanOrEqual(0.8);
    expect(res.signals.stemMatch).toBe(true);
  });

  it('assigns low score to false spelling similarity (retail vs restaurant)', () => {
    const res = computePairSimilarity('retail', 'restaurant');
    expect(res.overallScore).toBeLessThan(0.45);
  });

  it('penalizes suffix-only overlap across unrelated roots (station vs creation)', () => {
    const res = computePairSimilarity('station', 'creation');
    expect(res.overallScore).toBeLessThan(0.45);
  });

  it('penalizes large length differences without morphological link (cat vs caterpillar)', () => {
    const res = computePairSimilarity('cat', 'caterpillar');
    expect(res.overallScore).toBeLessThan(0.45);
  });

  it('handles identical words with score 1.0', () => {
    const res = computePairSimilarity('retail', 'Retail');
    expect(res.overallScore).toBe(1.0);
  });
});
