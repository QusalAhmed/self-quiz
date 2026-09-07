import { appNotifications } from './notifications';
import {
  applyAddSuggestedDefinition,
  applyDefinitionFix,
  applyWordSpellingFix,
  dismissWordVerificationIssue,
  verifyAndStoreWord,
} from './word-verification-store';

jest.mock('./notifications', () => ({
  appNotifications: {
    warning: jest.fn(),
  },
}));

jest.mock('./settings', () => ({
  getAppSettings: jest.fn(() => ({
    ai: {
      autoVerifyWords: true,
    },
  })),
}));

describe('word-verification-store', () => {
  let mockDoc: any;
  let mockDatabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDoc = {
      toJSON: () => ({
        id: 'w1',
        word: 'definately',
        meaning: 'without doubt',
        definitions: [
          { meaning: 'without doubt', partOfSpeech: 'adverb', examples: [], userExamples: [] },
        ],
        aiExampleCount: 5,
        verificationIssue: '',
      }),
      verificationIssue: '',
      patch: jest.fn().mockImplementation(async (data: any) => {
        Object.assign(mockDoc, data);
      }),
    };

    mockDatabase = {
      words: {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockDoc),
        }),
        upsert: jest.fn().mockResolvedValue(mockDoc),
      },
      fsrsRecords: {
        find: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              toJSON: () => ({
                id: 'fsrs-1',
                wordId: 'w1',
                quizMode: 'spelling',
                word: 'definately',
                meaning: 'without doubt',
              }),
            },
          ]),
        }),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
  });

  describe('verifyAndStoreWord', () => {
    it('stores verification issue and displays warning notification when issue detected', async () => {
      const mockResult = {
        word: 'definately',
        isWordValid: false,
        wordSpellingSuggestion: 'definitely',
        wordFeedback: 'Did you mean definitely?',
        overallStatus: 'warning',
        definitions: [],
        generatorAiDetails: 'Google Gemini 2.5 Flash',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      } as any);

      const issue = await verifyAndStoreWord(mockDatabase, 'w1');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/verify-word',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"word":"definately"'),
        })
      );

      expect(mockDoc.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationIssue: expect.stringContaining('"wordSpellingSuggestion":"definitely"'),
        })
      );

      expect(appNotifications.warning).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'verify-issue-w1',
          title: expect.stringContaining('definately'),
          message: expect.stringContaining('definitely'),
        })
      );

      expect(issue).not.toBeNull();
      expect(issue?.wordSpellingSuggestion).toBe('definitely');
    });

    it('clears verification issue if word is valid', async () => {
      mockDoc.verificationIssue = JSON.stringify({ status: 'warning' });

      const mockResult = {
        word: 'definitely',
        isWordValid: true,
        wordFeedback: 'Valid word',
        overallStatus: 'valid',
        definitions: [],
        generatorAiDetails: 'Google Gemini 2.5 Flash',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      } as any);

      const issue = await verifyAndStoreWord(mockDatabase, 'w1');

      expect(mockDoc.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationIssue: '',
        })
      );

      expect(issue).toBeNull();
    });

    it('skips verification if autoVerifyWords is disabled', async () => {
      const { getAppSettings } = require('./settings');
      (getAppSettings as jest.Mock).mockReturnValueOnce({
        ai: { autoVerifyWords: false },
      });

      global.fetch = jest.fn();

      const issue = await verifyAndStoreWord(mockDatabase, 'w1');
      expect(global.fetch).not.toHaveBeenCalled();
      expect(issue).toBeNull();
    });
  });

  describe('dismissWordVerificationIssue', () => {
    it('clears verificationIssue on document', async () => {
      await dismissWordVerificationIssue(mockDatabase, 'w1');

      expect(mockDoc.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationIssue: '',
        })
      );
    });
  });

  describe('applyWordSpellingFix', () => {
    it('patches word with corrected spelling and updates FSRS card', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ overallStatus: 'valid' }),
      } as any);

      await applyWordSpellingFix(mockDatabase, 'w1', 'definitely');

      expect(mockDoc.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'definitely',
          verificationIssue: '',
        })
      );

      expect(mockDatabase.fsrsRecords.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          word: 'definitely',
        })
      );
    });
  });

  describe('applyDefinitionFix', () => {
    it('patches word definition and updates meaning', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ overallStatus: 'valid' }),
      } as any);

      await applyDefinitionFix(mockDatabase, 'w1', 0, 'certainly and unequivocally', 'adverb');

      expect(mockDoc.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          meaning: 'certainly and unequivocally',
          definitions: [
            expect.objectContaining({
              meaning: 'certainly and unequivocally',
              partOfSpeech: 'adverb',
            }),
          ],
        })
      );
    });
  });

  describe('applyAddSuggestedDefinition', () => {
    it('appends suggested definition to word and updates meaning', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ overallStatus: 'valid' }),
      } as any);

      await applyAddSuggestedDefinition(mockDatabase, 'w1', {
        meaning: 'in a definite manner',
        partOfSpeech: 'adverb',
      });

      expect(mockDoc.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          definitions: expect.arrayContaining([
            expect.objectContaining({
              meaning: 'without doubt',
            }),
            expect.objectContaining({
              meaning: 'in a definite manner',
              partOfSpeech: 'adverb',
            }),
          ]),
        })
      );
    });
  });
});
