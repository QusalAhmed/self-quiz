import type { DailyUsageRecord, FsrsRecord, MissedWordRecord, WordRecord } from '@/lib/db';
import { calculateAnalysis, computeRetrievability, getWordMemoryState } from './calculator';
import type { AnalysisFilters } from './types';

describe('Analysis Calculator', () => {
  const fixedNow = new Date('2026-08-18T12:00:00.000Z');

  describe('computeRetrievability', () => {
    it('returns 1 if stability is 0 or invalid', () => {
      expect(computeRetrievability(0, fixedNow.toISOString(), fixedNow)).toBe(1);
    });

    it('returns ~0.90 when elapsed time equals stability', () => {
      // 10 days elapsed with stability = 10
      const lastReview = new Date(fixedNow.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const r = computeRetrievability(10, lastReview, fixedNow);
      expect(r).toBeCloseTo(0.9, 2);
    });

    it('returns >0.90 when elapsed time is less than stability', () => {
      const lastReview = new Date(fixedNow.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const r = computeRetrievability(10, lastReview, fixedNow);
      expect(r).toBeGreaterThan(0.9);
    });

    it('returns <0.90 when elapsed time exceeds stability', () => {
      const lastReview = new Date(fixedNow.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const r = computeRetrievability(10, lastReview, fixedNow);
      expect(r).toBeLessThan(0.9);
    });
  });

  describe('getWordMemoryState', () => {
    it('identifies New cards', () => {
      expect(getWordMemoryState(undefined)).toBe('New');
      expect(
        getWordMemoryState({
          id: '1',
          wordId: '1',
          quizMode: 'wordToMeaning',
          word: 'test',
          meaning: 'test',
          dueAt: '',
          stability: 0,
          difficulty: 0,
          elapsedDays: 0,
          scheduledDays: 0,
          learningSteps: 0,
          reps: 0,
          lapses: 0,
          state: 'New',
          lastReviewedAt: '',
          updatedAt: '',
          lastSyncedAt: '',
          isDeleted: false,
        })
      ).toBe('New');
    });

    it('identifies Mastered cards with stability >= 21', () => {
      expect(
        getWordMemoryState({
          id: '1',
          wordId: '1',
          quizMode: 'wordToMeaning',
          word: 'test',
          meaning: 'test',
          dueAt: '',
          stability: 25,
          difficulty: 4,
          elapsedDays: 10,
          scheduledDays: 25,
          learningSteps: 0,
          reps: 5,
          lapses: 0,
          state: 'Review',
          lastReviewedAt: '',
          updatedAt: '',
          lastSyncedAt: '',
          isDeleted: false,
        })
      ).toBe('Mastered');
    });

    it('identifies Review cards with stability >= 3 and < 21', () => {
      expect(
        getWordMemoryState({
          id: '1',
          wordId: '1',
          quizMode: 'wordToMeaning',
          word: 'test',
          meaning: 'test',
          dueAt: '',
          stability: 8,
          difficulty: 5,
          elapsedDays: 2,
          scheduledDays: 8,
          learningSteps: 0,
          reps: 2,
          lapses: 0,
          state: 'Review',
          lastReviewedAt: '',
          updatedAt: '',
          lastSyncedAt: '',
          isDeleted: false,
        })
      ).toBe('Review');
    });

    it('identifies Learning cards with stability < 3 and reps > 0', () => {
      expect(
        getWordMemoryState({
          id: '1',
          wordId: '1',
          quizMode: 'wordToMeaning',
          word: 'test',
          meaning: 'test',
          dueAt: '',
          stability: 1.2,
          difficulty: 6,
          elapsedDays: 0,
          scheduledDays: 1,
          learningSteps: 1,
          reps: 1,
          lapses: 0,
          state: 'Learning',
          lastReviewedAt: '',
          updatedAt: '',
          lastSyncedAt: '',
          isDeleted: false,
        })
      ).toBe('Learning');
    });
  });

  describe('calculateAnalysis full integration', () => {
    const sampleWords: WordRecord[] = [
      {
        id: 'w1',
        word: 'Abate',
        meaning: 'To lessen',
        definitions: [
          { meaning: 'To lessen', partOfSpeech: 'verb', examples: [], userExamples: [] },
        ],
        aiExampleCount: 5,
        createdAt: '2026-08-01T10:00:00.000Z',
        updatedAt: '2026-08-01T10:00:00.000Z',
        isDeleted: false,
        lastSyncedAt: '',
        customGroups: ['GRE', 'Verbs'],
      },
      {
        id: 'w2',
        word: 'Aberration',
        meaning: 'Deviation from standard',
        definitions: [
          { meaning: 'Deviation', partOfSpeech: 'noun', examples: [], userExamples: [] },
        ],
        aiExampleCount: 5,
        createdAt: '2026-08-05T10:00:00.000Z',
        updatedAt: '2026-08-05T10:00:00.000Z',
        isDeleted: false,
        lastSyncedAt: '',
        customGroups: ['GRE'],
      },
      {
        id: 'w3',
        word: 'Candid',
        meaning: 'Frank, outspoken',
        definitions: [{ meaning: 'Frank', partOfSpeech: 'adj', examples: [], userExamples: [] }],
        aiExampleCount: 5,
        createdAt: '2026-08-10T10:00:00.000Z',
        updatedAt: '2026-08-10T10:00:00.000Z',
        isDeleted: false,
        lastSyncedAt: '',
        customGroups: [],
      },
    ];

    const sampleFsrs: FsrsRecord[] = [
      {
        id: 'w1:fsrs:wordToMeaning',
        wordId: 'w1',
        quizMode: 'wordToMeaning',
        word: 'Abate',
        meaning: 'To lessen',
        dueAt: '2026-09-01T10:00:00.000Z',
        stability: 35,
        difficulty: 3,
        elapsedDays: 17,
        scheduledDays: 35,
        learningSteps: 0,
        reps: 6,
        lapses: 0,
        state: 'Review',
        lastReviewedAt: '2026-08-15T10:00:00.000Z',
        updatedAt: '2026-08-15T10:00:00.000Z',
        lastSyncedAt: '',
        isDeleted: false,
        lastRating: 'easy',
      },
      {
        id: 'w2:fsrs:wordToMeaning',
        wordId: 'w2',
        quizMode: 'wordToMeaning',
        word: 'Aberration',
        meaning: 'Deviation from standard',
        dueAt: '2026-08-18T14:00:00.000Z',
        stability: 1.5,
        difficulty: 8.5,
        elapsedDays: 1,
        scheduledDays: 1,
        learningSteps: 1,
        reps: 4,
        lapses: 3,
        state: 'Relearning',
        lastReviewedAt: '2026-08-17T10:00:00.000Z',
        updatedAt: '2026-08-17T10:00:00.000Z',
        lastSyncedAt: '',
        isDeleted: false,
        lastRating: 'again',
      },
    ];

    const sampleDailyUsage: DailyUsageRecord[] = [
      {
        id: '2026-08-15:dev1',
        date: '2026-08-15',
        deviceId: 'dev1',
        seconds: 600,
        updatedAt: '2026-08-15T23:59:59.000Z',
        lastSyncedAt: '',
        isDeleted: false,
      },
      {
        id: '2026-08-17:dev1',
        date: '2026-08-17',
        deviceId: 'dev1',
        seconds: 900,
        updatedAt: '2026-08-17T23:59:59.000Z',
        lastSyncedAt: '',
        isDeleted: false,
      },
    ];

    const sampleMissed: MissedWordRecord[] = [
      {
        id: 'w2:wordToMeaning',
        wordId: 'w2',
        quizMode: 'wordToMeaning',
        word: 'Aberration',
        meaning: 'Deviation from standard',
        missedAt: '2026-08-17T10:00:00.000Z',
        missedCount: 3,
        updatedAt: '2026-08-17T10:00:00.000Z',
        lastSyncedAt: '',
        isDeleted: false,
      },
    ];

    const defaultFilters: AnalysisFilters = {
      datePreset: '30d',
      comparison: 'previous_period',
      quizMode: 'all',
      groupFilter: 'all',
      stateFilter: 'all',
    };

    it('calculates full analytics result correctly', () => {
      const result = calculateAnalysis({
        words: sampleWords,
        fsrsRecords: sampleFsrs,
        dailyUsage: sampleDailyUsage,
        missedWords: sampleMissed,
        filters: defaultFilters,
        now: fixedNow,
      });

      expect(result.hasData).toBe(true);
      expect(result.totalWordsCount).toBe(3);
      expect(result.totalCardsCount).toBe(2);
      expect(result.totalReviewsCount).toBe(10); // 6 + 4

      // KPIs
      expect(result.kpis.wordsMastered.value).toBe(1); // Abate
      expect(result.kpis.wordsLearning.value).toBe(1); // Aberration (learning)
      expect(result.kpis.totalStudyTimeSec.value).toBe(1500); // 600 + 900
      expect(result.kpis.activeStudyDays.value).toBe(2);

      // Difficult words table contains Aberration with high problem score
      expect(result.difficultWords.length).toBe(1);
      expect(result.difficultWords[0].word).toBe('Aberration');
      expect(result.difficultWords[0].lapses).toBe(3);

      // Strong words contains Abate
      expect(result.strongestWords.length).toBe(1);
      expect(result.strongestWords[0].word).toBe('Abate');
      expect(result.strongestWords[0].stability).toBe(35);

      // Rating distribution
      expect(result.ratingDistribution.againCount).toBe(1);
      expect(result.ratingDistribution.easyCount).toBe(1);
      expect(result.ratingDistribution.totalRatings).toBe(2);
      expect(result.ratingDistribution.successfulRecallRate).toBe(50); // 1 easy out of 2

      // Insights & recommendations are generated
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('handles empty database gracefully', () => {
      const result = calculateAnalysis({
        words: [],
        fsrsRecords: [],
        dailyUsage: [],
        missedWords: [],
        filters: defaultFilters,
        now: fixedNow,
      });

      expect(result.hasData).toBe(false);
      expect(result.totalWordsCount).toBe(0);
      expect(result.kpis.wordsMastered.value).toBe(0);
      expect(result.kpis.currentStreak.value).toBe(0);
      expect(result.difficultWords).toEqual([]);
      expect(result.strongestWords).toEqual([]);
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});
