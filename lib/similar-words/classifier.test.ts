import { classifyRelationship } from './classifier';
import { computePairSimilarity } from './scorer';

describe('Relationship Classifier & Explainability', () => {
  it('classifies exact match', () => {
    const scores = computePairSimilarity('Retail', 'retail');
    const res = classifyRelationship('Retail', 'retail', scores);
    expect(res.primaryType).toBe('exact');
    expect(res.explanation).toContain('Exact match');
  });

  it('classifies transposition with swapped character explanation', () => {
    const scores = computePairSimilarity('trial', 'trail');
    const res = classifyRelationship('trial', 'trail', scores);
    expect(res.primaryType).toBe('transposition');
    expect(res.explanation).toContain('transposed');
  });

  it('classifies word family with base word and affix explanation', () => {
    const scores = computePairSimilarity('retail', 'retailer');
    const res = classifyRelationship('retail', 'retailer', scores);
    expect(res.primaryType).toBe('word_family');
    expect(res.explanation).toContain('retail');
    expect(res.explanation).toContain('-er');
  });

  it('classifies morphological derivative', () => {
    const scores = computePairSimilarity('predict', 'prediction');
    const res = classifyRelationship('predict', 'prediction', scores);
    expect(['morphological', 'word_family']).toContain(res.primaryType);
    expect(res.explanation).toContain('predict');
  });

  it('classifies orthographic similarity with shared sequence', () => {
    const scores = computePairSimilarity('retail', 'trail');
    const res = classifyRelationship('retail', 'trail', scores);
    expect(res.primaryType).toBe('orthographic');
    expect(res.explanation).toMatch(/ail|rail|Spelling/i);
  });
});
