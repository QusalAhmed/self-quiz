import {
  characterSetOverlap,
  computeMultiNgramSimilarity,
  damerauLevenshteinDistance,
  damerauLevenshteinSimilarity,
  detectTransposition,
  extractNgrams,
  levenshteinDistance,
  longestCommonPrefix,
  longestCommonSubsequence,
  longestCommonSubstring,
  longestCommonSuffix,
  normalizedLevenshteinSimilarity,
  normalizeWord,
} from './algorithms';

describe('Similarity Algorithms', () => {
  describe('normalizeWord', () => {
    it('handles uppercase, whitespace, and punctuation', () => {
      expect(normalizeWord('  Retail! ')).toBe('retail');
      expect(normalizeWord('Pre-dict.')).toBe('pre-dict');
      expect(normalizeWord('')).toBe('');
    });
  });

  describe('Levenshtein Distance & Normalized Similarity', () => {
    it('computes exact match', () => {
      expect(levenshteinDistance('retail', 'retail')).toBe(0);
      expect(normalizedLevenshteinSimilarity('retail', 'retail')).toBe(1);
    });

    it('computes substitutions, insertions, deletions', () => {
      expect(levenshteinDistance('adapt', 'adept')).toBe(1);
      expect(normalizedLevenshteinSimilarity('adapt', 'adept')).toBe(0.8);

      expect(levenshteinDistance('retail', 'retailer')).toBe(2);
      expect(normalizedLevenshteinSimilarity('retail', 'retailer')).toBe(0.75);
    });

    it('handles empty strings', () => {
      expect(levenshteinDistance('', 'word')).toBe(4);
      expect(normalizedLevenshteinSimilarity('', 'word')).toBe(0);
      expect(normalizedLevenshteinSimilarity('', '')).toBe(1);
    });
  });

  describe('Damerau-Levenshtein Distance & Similarity', () => {
    it('recognizes single character transposition as distance 1', () => {
      expect(damerauLevenshteinDistance('trial', 'trail')).toBe(1);
      expect(damerauLevenshteinSimilarity('trial', 'trail')).toBe(0.8);

      expect(damerauLevenshteinDistance('form', 'from')).toBe(1);
      expect(damerauLevenshteinSimilarity('form', 'from')).toBe(0.75);
    });

    it('detects transposition flag and swapped characters', () => {
      const res = detectTransposition('trial', 'trail');
      expect(res.isTransposition).toBe(true);
      expect(res.swappedChars).toEqual(['i', 'a']);

      const nonTrans = detectTransposition('retail', 'trail');
      expect(nonTrans.isTransposition).toBe(false);
    });
  });

  describe('Longest Common Substring (LCS)', () => {
    it('extracts correct substring and ratio', () => {
      const res = longestCommonSubstring('detail', 'retail');
      expect(res.substring).toBe('etail');
      expect(res.length).toBe(5);
      expect(res.ratio).toBeCloseTo(10 / 12, 2);

      const res2 = longestCommonSubstring('retail', 'trail');
      expect(res2.substring).toBe('ail');
      expect(res2.length).toBe(3);
    });

    it('handles words with no common substring', () => {
      const res = longestCommonSubstring('abc', 'xyz');
      expect(res.substring).toBe('');
      expect(res.length).toBe(0);
      expect(res.ratio).toBe(0);
    });
  });

  describe('Longest Common Subsequence', () => {
    it('extracts non-contiguous common subsequence', () => {
      const res = longestCommonSubsequence('retail', 'trail');
      expect(['tail', 'rail']).toContain(res.sequence);
      expect(res.length).toBe(4);

      const res2 = longestCommonSubsequence('predict', 'predictive');
      expect(res2.sequence).toBe('predict');
      expect(res2.length).toBe(7);
    });
  });

  describe('N-Grams and Multi-N-Gram Composite', () => {
    it('extracts boundary-padded n-grams', () => {
      const trigrams = extractNgrams('cat', 3, true);
      expect(Array.from(trigrams.keys())).toContain('^ca');
      expect(Array.from(trigrams.keys())).toContain('cat');
      expect(Array.from(trigrams.keys())).toContain('at$');
    });

    it('computes composite multi-n-gram similarity', () => {
      const res = computeMultiNgramSimilarity('retail', 'trail');
      expect(res.composite).toBeGreaterThan(0.15);
      expect(res.ngram2).toBeGreaterThan(0);
      expect(res.ngram3).toBeGreaterThan(0);
    });
  });

  describe('Character Set Overlap', () => {
    it('computes unique character Jaccard overlap', () => {
      expect(characterSetOverlap('trial', 'trail')).toBe(1);
      expect(characterSetOverlap('retail', 'trail')).toBe(5 / 6);
      expect(characterSetOverlap('cat', 'dog')).toBe(0);
    });
  });

  describe('Longest Common Prefix & Suffix', () => {
    it('calculates common prefix and ratios', () => {
      const res = longestCommonPrefix('predict', 'prediction');
      expect(res.prefix).toBe('predict');
      expect(res.ratioShort).toBe(1);
      expect(res.ratioLong).toBe(0.7);
    });

    it('calculates common suffix and ratios', () => {
      const res = longestCommonSuffix('careful', 'harmful');
      expect(res.suffix).toBe('ful');
      expect(res.length).toBe(3);
    });
  });
});
