import type { FsrsRecord, MissedWordRecord, StoryWordReference, WordRecord } from './db';
import {
  getWordStem,
  tokenizeStory,
  isClozeAnswerCorrect,
  isWordInTargetList,
  getDueWordsForStory,
  getMissedWordsForStory,
  getRandomWordsForStory,
  getRecentWordsForStory,
  getWordsByGroupForStory,
  parsePastedWords,
  buildStoryUserPrompt,
  parseStoryGenerationResponse,
  shuffleWords,
} from './story';

describe('Story helper and tokenizer utilities', () => {
  describe('getWordStem', () => {
    it('stems common English inflections correctly', () => {
      expect(getWordStem('running')).toBe('run');
      expect(getWordStem('excitedly')).toBe('excit');
      expect(getWordStem('mysteries')).toBe('mystery');
      expect(getWordStem('boxes')).toBe('box');
      expect(getWordStem('played')).toBe('play');
      expect(getWordStem('quickly')).toBe('quick');
      expect(getWordStem('dogs')).toBe('dog');
      expect(getWordStem('glass')).toBe('glass');
      expect(getWordStem('captivate')).toBe('captivat');
      expect(getWordStem('captivating')).toBe('captivat');
    });
  });

  describe('tokenizeStory', () => {
    const targetWords: StoryWordReference[] = [
      { wordId: 'w1', word: 'ephemeral', meaning: 'lasting a very short time' },
      { wordId: 'w2', word: 'captivate', meaning: 'attract and hold interest' },
    ];

    it('returns text token when no target words match', () => {
      const content = 'The sun rose over the quiet valley.';
      const tokens = tokenizeStory(content, targetWords);
      expect(tokens.every((t) => t.type === 'text')).toBe(true);
      expect(tokens.map((t) => (t.type === 'text' ? t.text : '')).join('')).toBe(content);
    });

    it('accurately isolates exact target words', () => {
      const content = 'Her ephemeral joy was evident.';
      const tokens = tokenizeStory(content, targetWords);

      const targetToken = tokens.find((t) => t.type === 'target_word') as Extract<
        (typeof tokens)[number],
        { type: 'target_word' }
      >;
      expect(targetToken).toBeDefined();
      expect(targetToken.matchedWord).toBe('ephemeral');
      expect(targetToken.originalText).toBe('ephemeral');
      expect(targetToken.meaning).toBe('lasting a very short time');
    });

    it('matches inflected words like captivating', () => {
      const content = 'It was a captivating performance.';
      const tokens = tokenizeStory(content, targetWords);

      const targetToken = tokens.find((t) => t.type === 'target_word') as Extract<
        (typeof tokens)[number],
        { type: 'target_word' }
      >;
      expect(targetToken).toBeDefined();
      expect(targetToken.matchedWord).toBe('captivate');
      expect(targetToken.originalText).toBe('captivating');
    });

    it('matches derived word forms like captivation and mysterious', () => {
      const content = 'The sheer captivation of the crowd was palpable.';
      const tokens = tokenizeStory(content, targetWords);

      const targetToken = tokens.find((t) => t.type === 'target_word') as Extract<
        (typeof tokens)[number],
        { type: 'target_word' }
      >;
      expect(targetToken).toBeDefined();
      expect(targetToken.matchedWord).toBe('captivate');
      expect(targetToken.originalText).toBe('captivation');
    });

    it('handles empty content gracefully', () => {
      expect(tokenizeStory('', targetWords)).toEqual([]);
    });
  });

  describe('isClozeAnswerCorrect', () => {
    it('strictly validates against the exact sentence word form case-insensitively', () => {
      expect(isClozeAnswerCorrect('Captivating', 'captivate', 'captivating')).toBe(true);
      expect(isClozeAnswerCorrect('captivating ', 'captivate', 'captivating')).toBe(true);
      expect(isClozeAnswerCorrect('captivate', 'captivate', 'captivating')).toBe(false);
      expect(isClozeAnswerCorrect('captivated', 'captivate', 'captivating')).toBe(false);
      expect(isClozeAnswerCorrect('wrong', 'captivate', 'captivating')).toBe(false);
    });
  });

  describe('isWordInTargetList', () => {
    const targetWords: StoryWordReference[] = [
      { wordId: 'w1', word: 'ephemeral', meaning: 'short-lived' },
      { wordId: 'w2', word: 'captivate', meaning: 'attract and hold interest' },
    ];

    it('returns true for empty string or valid target words and inflections', () => {
      expect(isWordInTargetList('', targetWords)).toBe(true);
      expect(isWordInTargetList('ephemeral', targetWords)).toBe(true);
      expect(isWordInTargetList('ephemerally', targetWords)).toBe(true);
      expect(isWordInTargetList('captivate', targetWords)).toBe(true);
      expect(isWordInTargetList('captivating', targetWords)).toBe(true);
      expect(isWordInTargetList('captivated', targetWords)).toBe(true);
    });

    it('returns false for words missing the last character or incomplete words', () => {
      expect(isWordInTargetList('ephemera', targetWords)).toBe(false);
      expect(isWordInTargetList('ephem', targetWords)).toBe(false);
      expect(isWordInTargetList('captiva', targetWords)).toBe(false);
      expect(isWordInTargetList('captivat', targetWords)).toBe(false);
    });

    it('returns false for words not in the target list', () => {
      expect(isWordInTargetList('banana', targetWords)).toBe(false);
      expect(isWordInTargetList('serendipity', targetWords)).toBe(false);
      expect(isWordInTargetList('randomword', targetWords)).toBe(false);
    });
  });

  describe('Word preset algorithms', () => {
    const mockWords: WordRecord[] = [
      {
        id: '1',
        word: 'serendipity',
        meaning: 'fortunate discovery',
        definitions: [
          { meaning: 'fortunate discovery', partOfSpeech: 'noun', examples: [], userExamples: [] },
        ],
        aiExampleCount: 5,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-20T00:00:00.000Z',
        isDeleted: false,
        lastSyncedAt: '',
        customGroups: ['GRE'],
      },
      {
        id: '2',
        word: 'ephemeral',
        meaning: 'short-lived',
        definitions: [
          { meaning: 'short-lived', partOfSpeech: 'adjective', examples: [], userExamples: [] },
        ],
        aiExampleCount: 5,
        createdAt: '2026-08-02T00:00:00.000Z',
        updatedAt: '2026-08-21T00:00:00.000Z',
        isDeleted: false,
        lastSyncedAt: '',
        customGroups: ['GRE', 'Daily'],
      },
    ];

    it('gets recent words', () => {
      const recent = getRecentWordsForStory(mockWords, 2);
      expect(recent.length).toBe(2);
      expect(recent[0].word).toBe('ephemeral');
    });

    it('gets words by group', () => {
      const daily = getWordsByGroupForStory(mockWords, 'Daily', 5);
      expect(daily.length).toBe(1);
      expect(daily[0].word).toBe('ephemeral');
    });

    it('gets due words from FSRS records', () => {
      const mockFsrs: FsrsRecord[] = [
        {
          id: '1:fsrs:wordToMeaning',
          wordId: '1',
          quizMode: 'wordToMeaning',
          word: 'serendipity',
          meaning: 'fortunate discovery',
          dueAt: '2026-08-24T00:00:00.000Z',
          stability: 2,
          difficulty: 5,
          elapsedDays: 1,
          scheduledDays: 1,
          learningSteps: 0,
          reps: 2,
          lapses: 0,
          state: 'Review',
          lastReviewedAt: '2026-08-20T00:00:00.000Z',
          updatedAt: '2026-08-20T00:00:00.000Z',
          lastSyncedAt: '',
          isDeleted: false,
        },
      ];

      const due = getDueWordsForStory(mockFsrs, mockWords, 1);
      expect(due.length).toBe(1);
      expect(due[0].word).toBe('serendipity');
    });

    it('gets missed words exclusively for wordToMeaning quiz mode', () => {
      const mockMissed: MissedWordRecord[] = [
        {
          id: '1:spelling',
          wordId: '1',
          quizMode: 'spelling',
          word: 'serendipity',
          meaning: 'fortunate discovery',
          missedCount: 10,
          missedAt: '2026-08-02T00:00:00.000Z',
          updatedAt: '2026-08-22T00:00:00.000Z',
          lastSyncedAt: '',
          isDeleted: false,
        },
        {
          id: '1:meaningToWord',
          wordId: '1',
          quizMode: 'meaningToWord',
          word: 'serendipity',
          meaning: 'fortunate discovery',
          missedCount: 8,
          missedAt: '2026-08-02T00:00:00.000Z',
          updatedAt: '2026-08-22T00:00:00.000Z',
          lastSyncedAt: '',
          isDeleted: false,
        },
        {
          id: '2:wordToMeaning',
          wordId: '2',
          quizMode: 'wordToMeaning',
          word: 'ephemeral',
          meaning: 'short-lived',
          missedCount: 3,
          missedAt: '2026-08-02T00:00:00.000Z',
          updatedAt: '2026-08-22T00:00:00.000Z',
          lastSyncedAt: '',
          isDeleted: false,
        },
      ];

      const missed = getMissedWordsForStory(mockMissed, mockWords, 1);
      expect(missed.length).toBe(1);
      expect(missed[0].word).toBe('ephemeral');
    });

    it('gets random shuffled words', () => {
      const randomWords = getRandomWordsForStory(mockWords, 2);
      expect(randomWords.length).toBe(2);
      const wordNames = randomWords.map((w) => w.word);
      expect(wordNames).toContain('serendipity');
      expect(wordNames).toContain('ephemeral');
    });

    it('parses pasted text and matches known and new words', () => {
      const pasted = 'serendipity, ephemeral\nnostalgia; customword';
      const result = parsePastedWords(pasted, mockWords);

      expect(result.recognized.length).toBe(2);
      expect(result.recognized.map((r) => r.word)).toEqual(['serendipity', 'ephemeral']);
      expect(result.unrecognized.length).toBe(2);
      expect(result.unrecognized.map((u) => u.word)).toEqual(['nostalgia', 'customword']);
    });
  });

  describe('Prompt building & response parsing', () => {
    it('shuffles arrays non-destructively', () => {
      const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
      const shuffled = shuffleWords(items);
      expect(shuffled.length).toBe(items.length);
      expect(shuffled.sort()).toEqual([...items].sort());
    });

    it('builds a prompt with all target words, length, and difficulty specifications', () => {
      const prompt = buildStoryUserPrompt({
        targetWords: [{ word: 'solitude', meaning: 'state of being alone' }],
        genre: 'Mystery & Suspense',
        length: 'short',
        difficulty: 'beginner',
        includeBangla: true,
      });

      expect(prompt).toContain('solitude');
      expect(prompt).toContain('Mystery & Suspense');
      expect(prompt).toContain('Beginner (A1–A2) level');
      expect(prompt).toContain('banglaTranslation');
      expect(prompt).toContain('RANDOMIZED');
      expect(prompt).toContain('MORPHOLOGICAL VARIETY RULE');
    });

    it('builds prompts with different difficulty levels', () => {
      const promptAdv = buildStoryUserPrompt({
        targetWords: [{ word: 'solitude', meaning: 'state of being alone' }],
        difficulty: 'advanced',
      });
      expect(promptAdv).toContain('Advanced (C1–C2 / GRE) level');

      const promptInter = buildStoryUserPrompt({
        targetWords: [{ word: 'solitude', meaning: 'state of being alone' }],
        difficulty: 'intermediate',
      });
      expect(promptInter).toContain('Intermediate (B1–B2) level');
    });

    it('parses valid AI JSON response', () => {
      const raw = {
        title: 'A Night in Solitude',
        content: 'He cherished his solitude.',
        banglaTranslation: 'সে তার একাকীত্ব উপভোগ করছিল।',
      };

      const parsed = parseStoryGenerationResponse(raw, 'Groq Llama 3.3 70B');
      expect(parsed.title).toBe('A Night in Solitude');
      expect(parsed.content).toBe('He cherished his solitude.');
      expect(parsed.banglaTranslation).toBe('সে তার একাকীত্ব উপভোগ করছিল।');
      expect(parsed.generatorAiDetails).toBe('Groq Llama 3.3 70B');
    });
  });
});
