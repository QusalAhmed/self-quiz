import {
  buildWordVerificationUserPrompt,
  parseWordVerificationResponse,
  verifyWordAndDefinitions,
  verifyWordWithCloudflare,
  verifyWordWithDictionary,
  verifyWordWithGoogle,
  verifyWordWithGroq,
} from './word-verification';

describe('word-verification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('buildWordVerificationUserPrompt', () => {
    it('formats word and definitions correctly', () => {
      const prompt = buildWordVerificationUserPrompt('eloquent', [
        { meaning: 'fluent or persuasive in speaking or writing', partOfSpeech: 'adjective' },
        { meaning: 'clearly expressing or indicating something', partOfSpeech: 'adjective' },
      ]);

      expect(prompt).toContain('Word: "eloquent"');
      expect(prompt).toContain('Definition #1: "fluent or persuasive in speaking or writing"');
      expect(prompt).toContain('Part of speech: "adjective"');
      expect(prompt).toContain('Definition #2: "clearly expressing or indicating something"');
    });

    it('handles empty definitions gracefully', () => {
      const prompt = buildWordVerificationUserPrompt('ephemeral', []);
      expect(prompt).toContain('Word: "ephemeral"');
      expect(prompt).toContain('(No definitions provided yet)');
    });
  });

  describe('parseWordVerificationResponse', () => {
    it('parses a valid response with accurate definition', () => {
      const mockAiOutput = {
        isWordValid: true,
        wordSpellingSuggestion: null,
        wordFeedback: 'Valid English word.',
        overallStatus: 'valid',
        definitions: [
          {
            index: 0,
            isAccurate: true,
            partOfSpeechMatches: true,
            detectedPartOfSpeech: 'adjective',
            feedback: 'Accurate definition.',
          },
        ],
      };

      const result = parseWordVerificationResponse(
        mockAiOutput,
        'eloquent',
        [{ meaning: 'fluent in speaking', partOfSpeech: 'adjective' }],
        'Google Gemini 2.5 Flash'
      );

      expect(result.word).toBe('eloquent');
      expect(result.isWordValid).toBe(true);
      expect(result.overallStatus).toBe('valid');
      expect(result.wordSpellingSuggestion).toBeUndefined();
      expect(result.definitions[0].isAccurate).toBe(true);
      expect(result.generatorAiDetails).toBe('Google Gemini 2.5 Flash');
    });

    it('detects spelling suggestion and marks overall status as warning', () => {
      const mockAiOutput = {
        isWordValid: false,
        wordSpellingSuggestion: 'definitely',
        wordFeedback: 'Did you mean "definitely"?',
        overallStatus: 'warning',
        definitions: [
          {
            index: 0,
            isAccurate: true,
            partOfSpeechMatches: true,
            feedback: 'Accurate meaning for definitely.',
          },
        ],
      };

      const result = parseWordVerificationResponse(
        mockAiOutput,
        'definately',
        [{ meaning: 'without doubt', partOfSpeech: 'adverb' }],
        'Groq Qwen 3.6 27B'
      );

      expect(result.wordSpellingSuggestion).toBe('definitely');
      expect(result.overallStatus).toBe('warning');
    });

    it('handles inaccurate definition and suggested improvements', () => {
      const mockAiOutput = {
        isWordValid: true,
        wordSpellingSuggestion: null,
        wordFeedback: 'Valid word',
        overallStatus: 'warning',
        definitions: [
          {
            index: 0,
            isAccurate: false,
            partOfSpeechMatches: false,
            feedback: 'Meaning does not match slothful.',
            suggestedDefinition: 'lazy or indolent',
            suggestedPartOfSpeech: 'adjective',
          },
        ],
      };

      const result = parseWordVerificationResponse(
        mockAiOutput,
        'slothful',
        [{ meaning: 'very quick and energetic', partOfSpeech: 'verb' }],
        'Google Gemma 4 26B'
      );

      expect(result.overallStatus).toBe('warning');
      expect(result.definitions[0].isAccurate).toBe(false);
      expect(result.definitions[0].suggestedDefinition).toBe('lazy or indolent');
      expect(result.definitions[0].suggestedPartOfSpeech).toBe('adjective');
    });

    it('extracts suggestedNewDefinition when provided', () => {
      const mockAiOutput = {
        isWordValid: true,
        overallStatus: 'valid',
        definitions: [],
        suggestedNewDefinition: {
          meaning: 'lasting for a very short time',
          partOfSpeech: 'adjective',
        },
      };

      const result = parseWordVerificationResponse(
        mockAiOutput,
        'ephemeral',
        [],
        'Google Gemma 4 26B'
      );

      expect(result.suggestedNewDefinition).toEqual({
        meaning: 'lasting for a very short time',
        partOfSpeech: 'adjective',
      });
    });
  });

  describe('verifyWordWithGoogle', () => {
    it('throws if API key is not configured', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      await expect(verifyWordWithGoogle('test', [])).rejects.toThrow(
        'Google AI API key is not configured'
      );
    });

    it('calls fetch and parses response on success', async () => {
      process.env.GEMINI_API_KEY = 'mock-key';

      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    isWordValid: true,
                    overallStatus: 'valid',
                    definitions: [
                      {
                        index: 0,
                        isAccurate: true,
                        partOfSpeechMatches: true,
                        feedback: 'Matches well',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const result = await verifyWordWithGoogle('serendipity', [
        { meaning: 'the occurrence of events by chance in a beneficial way', partOfSpeech: 'noun' },
      ]);

      expect(result.isWordValid).toBe(true);
      expect(result.overallStatus).toBe('valid');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('verifyWordWithGroq', () => {
    it('throws if API key is not configured', async () => {
      delete process.env.GROQ_API_KEY;
      await expect(verifyWordWithGroq('test', [])).rejects.toThrow(
        'Groq AI API key is not configured'
      );
    });

    it('calls fetch with model and returns parsed result', async () => {
      process.env.GROQ_API_KEY = 'mock-groq-key';

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                isWordValid: true,
                overallStatus: 'valid',
                definitions: [],
              }),
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const result = await verifyWordWithGroq('paradigm', []);
      expect(result.isWordValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer mock-groq-key' }),
        })
      );
    });
  });

  describe('verifyWordWithCloudflare', () => {
    it('throws if credentials are missing', async () => {
      delete process.env.CLOUDFLARE_API_TOKEN;
      delete process.env.CLOUDFLARE_ACCOUNT_ID;

      await expect(verifyWordWithCloudflare('test', [])).rejects.toThrow(
        'Cloudflare AI credentials are not configured'
      );
    });

    it('calls fetch and parses raw json response', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'mock-cf-token';
      process.env.CLOUDFLARE_ACCOUNT_ID = 'mock-cf-acc';

      const mockResponse = {
        result: {
          response: JSON.stringify({
            isWordValid: true,
            overallStatus: 'valid',
            definitions: [],
          }),
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      const result = await verifyWordWithCloudflare('nexus', []);
      expect(result.isWordValid).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.cloudflare.com'),
        expect.any(Object)
      );
    });
  });

  describe('verifyWordWithDictionary fallback', () => {
    it('handles dictionary api response for valid word', async () => {
      const mockDictionaryResponse = [
        {
          word: 'hello',
          meanings: [
            {
              partOfSpeech: 'noun',
              definitions: [{ definition: 'an utterance of hello as a greeting' }],
            },
          ],
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockDictionaryResponse,
      } as any);

      const result = await verifyWordWithDictionary('hello', [
        { meaning: 'a greeting', partOfSpeech: 'noun' },
      ]);

      expect(result.isWordValid).toBe(true);
      expect(result.generatorAiDetails).toContain('Dictionary Fallback');
      expect(result.definitions[0].isAccurate).toBe(true);
    });

    it('handles unrecognized words from dictionary api', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      const result = await verifyWordWithDictionary('asdkfjhasd', []);
      expect(result.isWordValid).toBe(false);
      expect(result.overallStatus).toBe('warning');
    });
  });

  describe('verifyWordAndDefinitions orchestrator', () => {
    it('falls back to dictionary API when all AI services fail', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      delete process.env.GROQ_API_KEY;
      delete process.env.CLOUDFLARE_API_TOKEN;

      const mockDictionaryResponse = [
        {
          word: 'brisk',
          meanings: [
            {
              partOfSpeech: 'adjective',
              definitions: [{ definition: 'active, fast, and energetic' }],
            },
          ],
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockDictionaryResponse,
      } as any);

      const result = await verifyWordAndDefinitions({
        word: 'brisk',
        definitions: [{ meaning: 'quick and energetic', partOfSpeech: 'adjective' }],
      });

      expect(result.isWordValid).toBe(true);
      expect(result.generatorAiDetails).toContain('Dictionary Fallback');
    });
  });
});
