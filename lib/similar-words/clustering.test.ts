import {
  clusterSimilarWords,
  findCommonContiguousCore,
  findCommonSubsequenceCore,
} from './clustering';

describe('Similar Word Graph Clustering', () => {
  it('finds common contiguous core across words', () => {
    expect(findCommonContiguousCore(['retail', 'retailer', 'retailing'])).toBe('retail');
    expect(findCommonContiguousCore(['trail', 'retail', 'detail'])).toBe('ail');
    expect(findCommonContiguousCore(['xyz', 'abc'])).toBe('');
  });

  it('finds common subsequence core across words', () => {
    expect(findCommonSubsequenceCore(['trial', 'trail']).length).toBe(4);
    expect(findCommonSubsequenceCore(['care', 'careful'])).toBe('care');
  });

  it('clusters words into word family groups', () => {
    const words = [
      { id: '1', word: 'retail' },
      { id: '2', word: 'retailer' },
      { id: '3', word: 'retailing' },
      { id: '4', word: 'apple' },
    ];

    const similarityRecords = [
      {
        source_word_id: '1',
        target_word_id: '2',
        source_word: 'retail',
        target_word: 'retailer',
        overall_score: 0.94,
        relationship_type: 'word_family',
        explanation: 'Word family',
      },
      {
        source_word_id: '1',
        target_word_id: '3',
        source_word: 'retail',
        target_word: 'retailing',
        overall_score: 0.91,
        relationship_type: 'word_family',
        explanation: 'Word family',
      },
    ];

    const clusters = clusterSimilarWords(words, similarityRecords, { minScore: 0.5 });
    expect(clusters.length).toBe(1);
    const cluster = clusters[0];

    expect(cluster.words).toContain('retail');
    expect(cluster.words).toContain('retailer');
    expect(cluster.words).toContain('retailing');
    expect(cluster.words).not.toContain('apple');
    expect(cluster.clusterType).toBe('word_family');
    expect(cluster.size).toBe(3);
    expect(cluster.averageScore).toBeGreaterThan(0.9);
  });

  it('clusters words into transposition pairs', () => {
    const words = [
      { id: '1', word: 'trial' },
      { id: '2', word: 'trail' },
    ];

    const similarityRecords = [
      {
        source_word_id: '1',
        target_word_id: '2',
        source_word: 'trial',
        target_word: 'trail',
        overall_score: 0.88,
        relationship_type: 'transposition',
        explanation: 'Swapped characters',
      },
    ];

    const clusters = clusterSimilarWords(words, similarityRecords);
    expect(clusters.length).toBe(1);
    expect(clusters[0].clusterType).toBe('transposition');
    expect(clusters[0].size).toBe(2);
  });

  it('respects minScore threshold option', () => {
    const words = [
      { id: '1', word: 'cat' },
      { id: '2', word: 'cart' },
    ];

    const similarityRecords = [
      {
        source_word_id: '1',
        target_word_id: '2',
        overall_score: 0.52,
        relationship_type: 'orthographic',
      },
    ];

    const highThreshold = clusterSimilarWords(words, similarityRecords, { minScore: 0.7 });
    expect(highThreshold.length).toBe(0);

    const normalThreshold = clusterSimilarWords(words, similarityRecords, { minScore: 0.5 });
    expect(normalThreshold.length).toBe(1);
  });
});
