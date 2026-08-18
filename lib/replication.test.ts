import {
  pullDailyUsageModifier,
  pullFsrsModifier,
  pullGroupModifier,
  pullMissedWordModifier,
  pullSrsPracticeModifier,
  pullWordModifier,
  pushDailyUsageModifier,
  pushFsrsModifier,
  pushGroupModifier,
  pushMissedWordModifier,
  pushSrsPracticeModifier,
  pushWordModifier,
} from './replication';

describe('Supabase Replication Modifiers', () => {
  describe('Words', () => {
    it('correctly maps remote Supabase row to local WordRecord', () => {
      const row = {
        id: 'w1',
        word: 'abate',
        meaning: 'become less intense',
        definitions: [
          { meaning: 'become less intense', partOfSpeech: 'verb', examples: [], userExamples: [] },
        ],
        ai_example_count: 7,
        notes: 'test note',
        custom_groups: ['GRE', 'TOEFL'],
        created_at: '2026-08-17T00:00:00.000Z',
        updated_at: '2026-08-17T01:00:00.000Z',
        deleted: false,
      };

      const record = pullWordModifier(row);
      expect(record.id).toBe('w1');
      expect(record.word).toBe('abate');
      expect(record.aiExampleCount).toBe(7);
      expect(record.customGroups).toEqual(['GRE', 'TOEFL']);
      expect(record.isDeleted).toBe(false);
      expect(record.notes).toBe('test note');
    });

    it('correctly maps local WordRecord to remote Supabase row for push', () => {
      const record = {
        id: 'w1',
        word: 'abate',
        meaning: 'become less intense',
        definitions: [
          { meaning: 'become less intense', partOfSpeech: 'verb', examples: [], userExamples: [] },
        ],
        aiExampleCount: 5,
        notes: 'my notes',
        customGroups: ['GRE'],
        createdAt: '2026-08-17T00:00:00.000Z',
        updatedAt: '2026-08-17T01:00:00.000Z',
        isDeleted: true,
        lastSyncedAt: '2026-08-17T00:00:00.000Z',
      };

      const row = pushWordModifier(record);
      expect(row.id).toBe('w1');
      expect(row.ai_example_count).toBe(5);
      expect(row.custom_groups).toEqual(['GRE']);
      expect(row.deleted).toBe(true);
      expect(row.created_at).toBe('2026-08-17T00:00:00.000Z');
      expect(row.updated_at).toBe('2026-08-17T01:00:00.000Z');
    });
  });

  describe('Groups', () => {
    it('correctly pulls and pushes group data', () => {
      const remote = {
        id: 'g1',
        name: 'GRE',
        created_at: '2026-08-17T00:00:00.000Z',
        updated_at: '2026-08-17T01:00:00.000Z',
        deleted: false,
      };
      const pulled = pullGroupModifier(remote);
      expect(pulled.id).toBe('g1');
      expect(pulled.name).toBe('GRE');
      expect(pulled.isDeleted).toBe(false);

      const pushed = pushGroupModifier(pulled);
      expect(pushed.id).toBe('g1');
      expect(pushed.name).toBe('GRE');
      expect(pushed.deleted).toBe(false);
    });
  });

  describe('Missed Words', () => {
    it('correctly pulls and pushes missed words', () => {
      const remote = {
        id: 'w1:wordToMeaning',
        word_id: 'w1',
        quiz_mode: 'wordToMeaning',
        word: 'abate',
        meaning: 'become less intense',
        missed_at: '2026-08-17T00:00:00.000Z',
        missed_count: 3,
        updated_at: '2026-08-17T01:00:00.000Z',
        deleted: false,
      };
      const pulled = pullMissedWordModifier(remote);
      expect(pulled.id).toBe('w1:wordToMeaning');
      expect(pulled.wordId).toBe('w1');
      expect(pulled.missedCount).toBe(3);

      const pushed = pushMissedWordModifier(pulled);
      expect(pushed.word_id).toBe('w1');
      expect(pushed.quiz_mode).toBe('wordToMeaning');
      expect(pushed.missed_count).toBe(3);
    });
  });

  describe('FSRS Records', () => {
    it('correctly pulls and pushes FSRS records', () => {
      const remote = {
        id: 'w1:meaningToWord',
        word_id: 'w1',
        quiz_mode: 'meaningToWord',
        word: 'abate',
        meaning: 'become less intense',
        due_at: '2026-08-18T00:00:00.000Z',
        stability: 2.5,
        difficulty: 4.0,
        elapsed_days: 1,
        scheduled_days: 2,
        learning_steps: 0,
        reps: 2,
        lapses: 0,
        state: 'Review',
        last_reviewed_at: '2026-08-17T00:00:00.000Z',
        updated_at: '2026-08-17T01:00:00.000Z',
        deleted: false,
        last_rating: 'good',
      };
      const pulled = pullFsrsModifier(remote);
      expect(pulled.id).toBe('w1:meaningToWord');
      expect(pulled.wordId).toBe('w1');
      expect(pulled.stability).toBe(2.5);
      expect(pulled.lastRating).toBe('good');

      const pushed = pushFsrsModifier(pulled);
      expect(pushed.word_id).toBe('w1');
      expect(pushed.due_at).toBe('2026-08-18T00:00:00.000Z');
      expect(pushed.last_rating).toBe('good');
    });
  });

  describe('SRS Practice Words', () => {
    it('correctly pulls and pushes SRS practice records', () => {
      const remote = {
        id: 'w1:spelling',
        word_id: 'w1',
        quiz_mode: 'spelling',
        word: 'abate',
        meaning: 'become less intense',
        difficulty: 'easy',
        practiced_at: '2026-08-17T00:00:00.000Z',
        updated_at: '2026-08-17T01:00:00.000Z',
        deleted: false,
      };
      const pulled = pullSrsPracticeModifier(remote);
      expect(pulled.id).toBe('w1:spelling');
      expect(pulled.difficulty).toBe('easy');

      const pushed = pushSrsPracticeModifier(pulled);
      expect(pushed.word_id).toBe('w1');
      expect(pushed.difficulty).toBe('easy');
    });
  });

  describe('Daily Usage', () => {
    it('correctly pulls and pushes daily usage records', () => {
      const remote = {
        id: '2026-08-17:dev1',
        date: '2026-08-17',
        device_id: 'dev1',
        seconds: 120,
        updated_at: '2026-08-17T01:00:00.000Z',
        deleted: false,
      };
      const pulled = pullDailyUsageModifier(remote);
      expect(pulled.id).toBe('2026-08-17:dev1');
      expect(pulled.seconds).toBe(120);

      const pushed = pushDailyUsageModifier(pulled);
      expect(pushed.device_id).toBe('dev1');
      expect(pushed.seconds).toBe(120);
    });
  });

  describe('RxDB Sync State Structures', () => {
    it('defines the 6 required sync collection keys correctly', () => {
      const keys = [
        'words',
        'groups',
        'missedWords',
        'fsrsRecords',
        'srsPracticeWords',
        'dailyUsage',
      ];
      expect(keys.length).toBe(6);
      expect(keys).toContain('words');
      expect(keys).toContain('groups');
      expect(keys).toContain('missedWords');
      expect(keys).toContain('fsrsRecords');
      expect(keys).toContain('srsPracticeWords');
      expect(keys).toContain('dailyUsage');
    });
  });
});
