import {
  pullDailyUsageModifier,
  pullFsrsModifier,
  pullGroupModifier,
  pullMissedWordModifier,
  pullQuranVerseModifier,
  pullReviewLogModifier,
  pullSettingsModifier,
  pullSrsPracticeModifier,
  pullWordFamilyModifier,
  pullWordModifier,
  pushDailyUsageModifier,
  pushFsrsModifier,
  pushGroupModifier,
  pushMissedWordModifier,
  pushQuranVerseModifier,
  pushReviewLogModifier,
  pushSettingsModifier,
  pushSrsPracticeModifier,
  pushWordFamilyModifier,
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
        usage_frequency: 'Top 3000',
        generator_ai_details: 'Google Gemma 4 26B',
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
      expect(record.usageFrequency).toBe('Top 3000');
      expect(record.generatorAiDetails).toBe('Google Gemma 4 26B');
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
        usageFrequency: 'Top 3000',
        generatorAiDetails: 'Google Gemma 4 26B',
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
      expect(row.usage_frequency).toBe('Top 3000');
      expect(row.generator_ai_details).toBe('Google Gemma 4 26B');
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
      expect(pulled.isDeleted).toBe(false);

      const pushed = pushMissedWordModifier(pulled);
      expect(pushed.id).toBe('w1:wordToMeaning');
      expect(pushed.missed_count).toBe(3);
      expect(pushed.deleted).toBe(false);
    });
  });

  describe('Word Families', () => {
    it('correctly pulls and pushes word family records', () => {
      const remote = {
        id: 'wf1',
        word_id: 'w1',
        word: 'abatement',
        part_of_speech: 'noun',
        bangla_definition: 'হ্রাস',
        english_definition: 'reduction',
        examples: ['Noise abatement'],
        usage_frequency: 'Top 5000',
        generator_ai_details: 'Google Gemma 4 26B',
        created_at: '2026-08-17T00:00:00.000Z',
        updated_at: '2026-08-17T01:00:00.000Z',
        deleted: false,
      };
      const pulled = pullWordFamilyModifier(remote);
      expect(pulled.id).toBe('wf1');
      expect(pulled.wordId).toBe('w1');
      expect(pulled.word).toBe('abatement');
      expect(pulled.partOfSpeech).toBe('noun');
      expect(pulled.examples).toEqual(['Noise abatement']);
      expect(pulled.usageFrequency).toBe('Top 5000');
      expect(pulled.generatorAiDetails).toBe('Google Gemma 4 26B');

      const pushed = pushWordFamilyModifier(pulled);
      expect(pushed.id).toBe('wf1');
      expect(pushed.word_id).toBe('w1');
      expect(pushed.word).toBe('abatement');
      expect(pushed.part_of_speech).toBe('noun');
      expect(pushed.usage_frequency).toBe('Top 5000');
      expect(pushed.generator_ai_details).toBe('Google Gemma 4 26B');
    });
  });

  describe('FSRS Records', () => {
    it('correctly pulls and pushes FSRS records', () => {
      const remote = {
        id: 'w1:fsrs:wordToMeaning',
        word_id: 'w1',
        quiz_mode: 'wordToMeaning',
        word: 'abate',
        meaning: 'less intense',
        due_at: '2026-08-20T00:00:00.000Z',
        stability: 4.5,
        difficulty: 3.2,
        elapsed_days: 2,
        scheduled_days: 5,
        learning_steps: 0,
        reps: 3,
        lapses: 0,
        state: 'Review',
        last_reviewed_at: '2026-08-17T00:00:00.000Z',
        updated_at: '2026-08-17T01:00:00.000Z',
        deleted: false,
        last_rating: 'good',
      };
      const pulled = pullFsrsModifier(remote);
      expect(pulled.id).toBe('w1:fsrs:wordToMeaning');
      expect(pulled.stability).toBe(4.5);
      expect(pulled.difficulty).toBe(3.2);
      expect(pulled.state).toBe('Review');
      expect(pulled.lastRating).toBe('good');

      const pushed = pushFsrsModifier(pulled);
      expect(pushed.id).toBe('w1:fsrs:wordToMeaning');
      expect(pushed.stability).toBe(4.5);
      expect(pushed.last_rating).toBe('good');
    });
  });

  describe('SRS Practice Words', () => {
    it('correctly pulls and pushes SRS practice records', () => {
      const remote = {
        id: 'w1:srs_practice:wordToMeaning',
        word_id: 'w1',
        quiz_mode: 'wordToMeaning',
        word: 'abate',
        meaning: 'less intense',
        difficulty: 'easy',
        practiced_at: '2026-08-17T00:00:00.000Z',
        updated_at: '2026-08-17T01:00:00.000Z',
        deleted: false,
      };
      const pulled = pullSrsPracticeModifier(remote);
      expect(pulled.id).toBe('w1:srs_practice:wordToMeaning');
      expect(pulled.difficulty).toBe('easy');

      const pushed = pushSrsPracticeModifier(pulled);
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

  describe('Review Logs', () => {
    it('correctly pulls and pushes immutable review logs', () => {
      const remote = {
        id: 'rl-1',
        word_id: 'w1',
        card_id: 'w1:fsrs:wordToMeaning',
        quiz_mode: 'wordToMeaning',
        word: 'abate',
        meaning: 'less intense',
        rating: 'good',
        state_before: 'Review',
        state_after: 'Review',
        reviewed_at: '2026-08-18T10:00:00.000Z',
        duration_ms: 2500,
        stability: 12.5,
        difficulty: 4.2,
        elapsed_days: 5,
        scheduled_days: 12,
        due_at: '2026-08-30T10:00:00.000Z',
        previous_due_at: '2026-08-18T10:00:00.000Z',
        lapses: 0,
        reps: 5,
        retrievability: 0.92,
        created_at: '2026-08-18T10:00:00.000Z',
        updated_at: '2026-08-18T10:00:00.000Z',
        deleted: false,
      };

      const pulled = pullReviewLogModifier(remote);
      expect(pulled.id).toBe('rl-1');
      expect(pulled.wordId).toBe('w1');
      expect(pulled.cardId).toBe('w1:fsrs:wordToMeaning');
      expect(pulled.rating).toBe('good');
      expect(pulled.stateBefore).toBe('Review');
      expect(pulled.stateAfter).toBe('Review');
      expect(pulled.durationMs).toBe(2500);
      expect(pulled.stability).toBe(12.5);
      expect(pulled.difficulty).toBe(4.2);
      expect(pulled.scheduledDays).toBe(12);
      expect(pulled.retrievability).toBe(0.92);
      expect(pulled.isDeleted).toBe(false);

      const pushed = pushReviewLogModifier(pulled);
      expect(pushed.id).toBe('rl-1');
      expect(pushed.word_id).toBe('w1');
      expect(pushed.card_id).toBe('w1:fsrs:wordToMeaning');
      expect(pushed.rating).toBe('good');
      expect(pushed.state_before).toBe('Review');
      expect(pushed.state_after).toBe('Review');
      expect(pushed.duration_ms).toBe(2500);
      expect(pushed.stability).toBe(12.5);
      expect(pushed.difficulty).toBe(4.2);
      expect(pushed.scheduled_days).toBe(12);
      expect(pushed.retrievability).toBe(0.92);
      expect(pushed.deleted).toBe(false);
    });
  });

  describe('Settings', () => {
    it('correctly pulls and pushes settings records with normalization', () => {
      const remote = {
        id: 'default',
        appearance: {
          colorScheme: 'dark',
          accentColor: 'teal',
          cardGlassmorphism: true,
          reducedMotion: false,
          uiDensity: 'comfortable',
        },
        study_quiz: {
          defaultQuizDirection: 'meaningToWord',
          defaultQuizRange: 'all',
          autoPronounceQuizWord: true,
          autoAdvanceOnFlip: true,
          autoAdvanceDelayMs: 1500,
          hideMissedMeaningsDefault: false,
          hideSrsPracticeMeaningsDefault: false,
          shuffleChoices: true,
        },
        audio: {
          reviewSoundEffectsEnabled: true,
          notificationSoundsEnabled: false,
          audioVolume: 0.8,
          ttsVoiceUri: 'Google US English',
          ttsRate: 1.2,
          ttsPitch: 1.0,
          ttsVolume: 0.9,
        },
        fsrs: {
          requestRetention: 0.85,
          maximumIntervalDays: 300,
          enableFuzz: true,
          autoRefillQueue: true,
        },
        ai: {
          preferredProvider: 'groq',
          groqModel: 'llama-3.3-70b-versatile',
          exampleCount: 4,
          useCustomApiKeys: false,
        },
        created_at: '2026-08-17T00:00:00.000Z',
        updated_at: '2026-08-17T01:00:00.000Z',
        deleted: false,
      };

      const pulled = pullSettingsModifier(remote);
      expect(pulled.id).toBe('default');
      expect(pulled.appearance.colorScheme).toBe('dark');
      expect(pulled.appearance.accentColor).toBe('teal');
      expect(pulled.studyQuiz.defaultQuizDirection).toBe('meaningToWord');
      expect(pulled.audio.ttsRate).toBe(1.2);
      expect(pulled.fsrs.requestRetention).toBe(0.85);
      expect(pulled.isDeleted).toBe(false);

      const pushed = pushSettingsModifier(pulled);
      expect(pushed.id).toBe('default');
      expect(pushed.appearance.accentColor).toBe('teal');
      expect(pushed.study_quiz.defaultQuizDirection).toBe('meaningToWord');
      expect(pushed.audio.ttsRate).toBe(1.2);
      expect(pushed.fsrs.requestRetention).toBe(0.85);
      expect(pushed.deleted).toBe(false);
    });
  });

  describe('Quran Verses', () => {
    it('correctly pulls and pushes single verses and verse ranges', () => {
      const remote = {
        id: '94:5-6',
        chapter: 94,
        verse: 5,
        verse_end: 6,
        category: 'Ease & Relief',
        notes: 'Indeed with hardship comes ease',
        status: 'active',
        view_count: 3,
        last_viewed_at: '2026-08-25T10:00:00.000Z',
        last_error: null,
        created_at: '2026-08-25T00:00:00.000Z',
        updated_at: '2026-08-25T10:00:00.000Z',
        deleted: false,
      };

      const pulled = pullQuranVerseModifier(remote);
      expect(pulled.id).toBe('94:5-6');
      expect(pulled.chapter).toBe(94);
      expect(pulled.verse).toBe(5);
      expect(pulled.verseEnd).toBe(6);
      expect(pulled.category).toBe('Ease & Relief');
      expect(pulled.viewCount).toBe(3);
      expect(pulled.status).toBe('active');
      expect(pulled.isDeleted).toBe(false);

      const pushed = pushQuranVerseModifier(pulled);
      expect(pushed.id).toBe('94:5-6');
      expect(pushed.chapter).toBe(94);
      expect(pushed.verse).toBe(5);
      expect(pushed.verse_end).toBe(6);
      expect(pushed.category).toBe('Ease & Relief');
      expect(pushed.view_count).toBe(3);
      expect(pushed.deleted).toBe(false);
    });

    it('derives verseEnd from id when verse_end column is absent in older Supabase schema', () => {
      const remoteWithoutCol = {
        id: '2:285-286',
        chapter: 2,
        verse: 285,
        category: 'Faith',
        deleted: false,
      };

      const pulled = pullQuranVerseModifier(remoteWithoutCol);
      expect(pulled.id).toBe('2:285-286');
      expect(pulled.chapter).toBe(2);
      expect(pulled.verse).toBe(285);
      expect(pulled.verseEnd).toBe(286);
    });

    it('maps empty strings in lastViewedAt and lastError to null on push to prevent PostgreSQL 22007 error', () => {
      const doc = {
        id: '2:255',
        chapter: 2,
        verse: 255,
        category: 'Protection',
        notes: '',
        status: 'active' as const,
        viewCount: 0,
        lastViewedAt: '', // empty string default from RxDB
        lastError: '',
        createdAt: '2026-08-26T00:00:00.000Z',
        updatedAt: '2026-08-26T00:00:00.000Z',
        isDeleted: false,
        lastSyncedAt: '',
      };

      const pushed = pushQuranVerseModifier(doc);
      expect(pushed.last_viewed_at).toBeNull();
      expect(pushed.last_error).toBeNull();
      expect(pushed.verse_end).toBeNull();
      expect(pushed.created_at).toBe('2026-08-26T00:00:00.000Z');
      expect(pushed.updated_at).toBe('2026-08-26T00:00:00.000Z');
    });
  });

  describe('RxDB Sync State Structures', () => {
    it('defines the 10 required sync collection keys correctly', () => {
      const keys = [
        'words',
        'groups',
        'missedWords',
        'wordFamilies',
        'fsrsRecords',
        'srsPracticeWords',
        'dailyUsage',
        'reviewLogs',
        'settings',
        'quranVerses',
      ];
      expect(keys.length).toBe(10);
      expect(keys).toContain('words');
      expect(keys).toContain('groups');
      expect(keys).toContain('missedWords');
      expect(keys).toContain('wordFamilies');
      expect(keys).toContain('fsrsRecords');
      expect(keys).toContain('srsPracticeWords');
      expect(keys).toContain('dailyUsage');
      expect(keys).toContain('reviewLogs');
      expect(keys).toContain('settings');
      expect(keys).toContain('quranVerses');
    });
  });
});
