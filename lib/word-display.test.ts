import type { WordRecord } from './db';
import { resolveWordTextFromMainTable } from './word-display';

describe('resolveWordTextFromMainTable', () => {
  const wordsById = new Map<string, WordRecord>([
    [
      'w1',
      {
        id: 'w1',
        word: 'updated word',
        meaning: 'updated meaning',
        examples: [],
        userExamples: [],
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-03T00:00:00.000Z',
        isDeleted: false,
        lastSyncedAt: '',
        customGroups: [],
      },
    ],
  ]);

  it('returns the latest word and meaning from the main table', () => {
    const record = {
      id: 'w1:missed:wordToMeaning',
      wordId: 'w1',
      word: 'stale word',
      meaning: 'stale meaning',
      quizMode: 'wordToMeaning' as const,
      missedAt: '2026-07-02T00:00:00.000Z',
      missedCount: 1,
      updatedAt: '2026-07-02T00:00:00.000Z',
      lastSyncedAt: '',
      isDeleted: false,
    };

    expect(resolveWordTextFromMainTable(record, wordsById)).toEqual({
      ...record,
      word: 'updated word',
      meaning: 'updated meaning',
    });
  });

  it('returns null when the main word has been deleted', () => {
    const record = {
      id: 'missing:missed:wordToMeaning',
      wordId: 'missing',
      word: 'stale word',
      meaning: 'stale meaning',
      quizMode: 'wordToMeaning' as const,
      missedAt: '2026-07-02T00:00:00.000Z',
      missedCount: 1,
      updatedAt: '2026-07-02T00:00:00.000Z',
      lastSyncedAt: '',
      isDeleted: false,
    };

    expect(resolveWordTextFromMainTable(record, wordsById)).toBeNull();
  });
});
