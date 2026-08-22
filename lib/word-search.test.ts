import type { WordDefinition, WordFamilyMemberRecord, WordRecord } from './db';
import { calculateWordMatchScore, filterAndSortWords, sortWordsByDefault } from './word-search';

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
