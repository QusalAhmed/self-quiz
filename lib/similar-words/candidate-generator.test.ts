import { CandidateGenerator } from './candidate-generator';

describe('CandidateGenerator', () => {
  const sampleVocabulary = [
    { id: '1', word: 'retail' },
    { id: '2', word: 'retailer' },
    { id: '3', word: 'retailing' },
    { id: '4', word: 'trail' },
    { id: '5', word: 'detail' },
    { id: '6', word: 'entail' },
    { id: '7', word: 'predict' },
    { id: '8', word: 'prediction' },
    { id: '9', word: 'banana' },
    { id: '10', word: 'elephant' },
    { id: '11', word: 'restaurant' },
  ];

  it('generates relevant candidate words for query', () => {
    const generator = new CandidateGenerator(sampleVocabulary);
    const candidates = generator.generateCandidates('retail', { maxCandidates: 10 });

    const candidateWords = candidates.map((c) => c.word);
    expect(candidateWords).toContain('retailer');
    expect(candidateWords).toContain('retailing');
    expect(candidateWords).toContain('trail');
    expect(candidateWords).toContain('detail');
    expect(candidateWords).not.toContain('banana');
    expect(candidateWords).not.toContain('elephant');
  });

  it('handles small datasets gracefully', () => {
    const generator = new CandidateGenerator([{ id: '1', word: 'cat' }]);
    const candidates = generator.generateCandidates('car');
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates[0].word).toBe('cat');
  });
});
