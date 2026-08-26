import type { WordDefinition, WordFamilyMemberRecord, WordRecord } from './db';
import {
  calculateWordMatchScore,
  compileSearchQuery,
  filterAndSortWords,
  getSearchableWordData,
  levenshteinDistance,
  sortWordsByDefault,
} from './word-search';

function createMockWord(
  id: string,
  word: string,
  meaning: string,
  overrides?: Partial<WordRecord>
): WordRecord {
  const definitions: WordDefinition[] = [
    {
      meaning,
      partOfSpeech: 'noun',
      examples: [`Example with ${word}`],
      userExamples: [],
    },
  ];

  return {
    id,
    word,
    meaning,
    definitions,
    aiExampleCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDeleted: false,
    lastSyncedAt: '',
    customGroups: [],
    ...overrides,
  };
}

describe('lib/word-search', () => {
  describe('levenshteinDistance', () => {
    it('handles exact and empty string cases correctly', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(levenshteinDistance('apple', '')).toBe(5);
      expect(levenshteinDistance('', 'banana')).toBe(6);
      expect(levenshteinDistance('hello', 'hello')).toBe(0);
    });

    it('calculates accurate distances for single and multi-character edits', () => {
      expect(levenshteinDistance('cat', 'bat')).toBe(1);
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('flaw', 'lawn')).toBe(2);
    });
  });

  describe('compileSearchQuery', () => {
    it('returns null for empty or whitespace query', () => {
      expect(compileSearchQuery('')).toBeNull();
      expect(compileSearchQuery('    ')).toBeNull();
    });

    it('compiles valid single and multi-token queries', () => {
      const single = compileSearchQuery('apple');
      expect(single).not.toBeNull();
      expect(single?.normalized).toBe('apple');
      expect(single?.isMultiToken).toBe(false);
      expect(single?.tokens).toEqual(['apple']);

      const multi = compileSearchQuery('run fast daily');
      expect(multi).not.toBeNull();
      expect(multi?.isMultiToken).toBe(true);
      expect(multi?.tokens).toEqual(['run', 'fast', 'daily']);
    });
  });

  describe('getSearchableWordData & Caching', () => {
    it('caches and reuses SearchableWordData for the same WordRecord reference', () => {
      const w = createMockWord('1', 'resilient', 'able to withstand difficult conditions');
      const data1 = getSearchableWordData(w);
      const data2 = getSearchableWordData(w);

      expect(data1).toBe(data2); // Exact reference match via WeakMap cache
      expect(data1.headword).toBe('resilient');
      expect(data1.headwordLength).toBe(9);
      expect(data1.defs[0].meaning).toBe('able to withstand difficult conditions');
    });
  });

  describe('calculateWordMatchScore', () => {
    it('returns 0 for empty or whitespace query', () => {
      const w = createMockWord('1', 'apple', 'a round fruit');
      expect(calculateWordMatchScore(w, '')).toBe(0);
      expect(calculateWordMatchScore(w, '   ')).toBe(0);
    });

    it('scores exact headword matches highest', () => {
      const exact = createMockWord('1', 'run', 'to move swiftly on foot');
      const prefix = createMockWord('2', 'running', 'the act of moving fast');
      const substring = createMockWord('3', 'rerun', 'to run again');
      const defMatch = createMockWord('4', 'sprint', 'a fast run');

      const scoreExact = calculateWordMatchScore(exact, 'run', { searchScope: 'all' });
      const scorePrefix = calculateWordMatchScore(prefix, 'run', { searchScope: 'all' });
      const scoreSub = calculateWordMatchScore(substring, 'run', { searchScope: 'all' });
      const scoreDef = calculateWordMatchScore(defMatch, 'run', { searchScope: 'all' });

      expect(scoreExact).toBeGreaterThan(scorePrefix);
      expect(scorePrefix).toBeGreaterThan(scoreSub);
      expect(scoreSub).toBeGreaterThan(scoreDef);
    });

    it('respects searchScope "word" and ignores definitions/notes/examples', () => {
      const wordOnlyMatch = createMockWord('1', 'swift', 'moving rapidly');
      const defOnlyMatch = createMockWord('2', 'fast', 'swift and speedy');

      expect(
        calculateWordMatchScore(wordOnlyMatch, 'swift', { searchScope: 'word' })
      ).toBeGreaterThan(0);
      expect(calculateWordMatchScore(defOnlyMatch, 'swift', { searchScope: 'word' })).toBe(0);
    });

    it('matches word family members in "all" scope', () => {
      const word = createMockWord('1', 'create', 'bring something into existence');
      const members: WordFamilyMemberRecord[] = [
        {
          id: '1-creativity',
          wordId: '1',
          word: 'creativity',
          partOfSpeech: 'noun',
          banglaDefinition: 'সৃজনশীলতা',
          englishDefinition: 'the use of imagination',
          examples: ['Creativity is key'],
          createdAt: '',
          updatedAt: '',
          isDeleted: false,
          lastSyncedAt: '',
        },
      ];

      const score = calculateWordMatchScore(word, 'creativity', {
        searchScope: 'all',
        wordFamilyMembers: members,
      });

      expect(score).toBeGreaterThan(0);
    });
  });

  describe('filterAndSortWords', () => {
    it('sorts strictly by match score ignoring sortOption when search query is active', () => {
      const wordA = createMockWord('1', 'cat', 'feline animal');
      const wordB = createMockWord('2', 'caterpillar', 'larva of a butterfly');
      const wordC = createMockWord('3', 'scatter', 'disperse widely');
      const wordD = createMockWord('4', 'bobcat', 'wild cat');

      // Alphabetical descending would put scatter > caterpillar > cat > bobcat
      // But search for "cat" must put exact "cat" first, then prefix "caterpillar", etc.
      const results = filterAndSortWords({
        words: [wordC, wordB, wordD, wordA],
        searchQuery: 'cat',
        searchScope: 'all',
        sortOption: 'alphaDesc', // UI set order: should be IGNORED!
      });

      expect(results.map((w) => w.word)).toEqual(['cat', 'caterpillar', 'bobcat', 'scatter']);
    });

    it('filters out non-matching words when search query is active', () => {
      const wordA = createMockWord('1', 'banana', 'yellow fruit');
      const wordB = createMockWord('2', 'apple', 'red fruit');
      const wordC = createMockWord('3', 'orange', 'citrus fruit');

      const results = filterAndSortWords({
        words: [wordA, wordB, wordC],
        searchQuery: 'apple',
        searchScope: 'word',
        sortOption: 'alphaAsc',
      });

      expect(results).toHaveLength(1);
      expect(results[0].word).toBe('apple');
    });

    it('uses UI sortOption when search query is empty', () => {
      const wordA = createMockWord('1', 'zebra', 'striped animal');
      const wordB = createMockWord('2', 'apple', 'fruit');
      const wordC = createMockWord('3', 'mango', 'tropical fruit');

      const resultsAsc = filterAndSortWords({
        words: [wordA, wordB, wordC],
        searchQuery: '',
        searchScope: 'all',
        sortOption: 'alphaAsc',
      });
      expect(resultsAsc.map((w) => w.word)).toEqual(['apple', 'mango', 'zebra']);

      const resultsDesc = filterAndSortWords({
        words: [wordA, wordB, wordC],
        searchQuery: '   ',
        searchScope: 'all',
        sortOption: 'alphaDesc',
      });
      expect(resultsDesc.map((w) => w.word)).toEqual(['zebra', 'mango', 'apple']);
    });

    it('executes high-speed filtering across 2,000 words efficiently', () => {
      const largeWordList: WordRecord[] = [];
      for (let i = 0; i < 2000; i++) {
        largeWordList.push(
          createMockWord(
            `id-${i}`,
            `vocabulary_${i}`,
            `meaning for vocabulary item ${i} with additional definition details and contexts`,
            { notes: `personal study notes for item ${i}` }
          )
        );
      }

      // Warm-up run (indexes the objects in WeakMap)
      filterAndSortWords({
        words: largeWordList,
        searchQuery: 'vocabulary_1',
        searchScope: 'all',
        sortOption: 'newest',
      });

      // Measured run using cached searchable structures
      const start = performance.now();
      const results = filterAndSortWords({
        words: largeWordList,
        searchQuery: 'vocabulary_150',
        searchScope: 'all',
        sortOption: 'newest',
      });
      const durationMs = performance.now() - start;

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].word).toBe('vocabulary_150');
      expect(durationMs).toBeLessThan(300); // High speed search verification
    });
  });

  describe('sortWordsByDefault', () => {
    it('sorts alphabetically ascending and descending', () => {
      const wordA = createMockWord('1', 'alpha', 'first');
      const wordB = createMockWord('2', 'beta', 'second');

      const asc = sortWordsByDefault([wordB, wordA], { sortOption: 'alphaAsc' });
      expect(asc[0].word).toBe('alpha');

      const desc = sortWordsByDefault([wordA, wordB], { sortOption: 'alphaDesc' });
      expect(desc[0].word).toBe('beta');
    });
  });
});
