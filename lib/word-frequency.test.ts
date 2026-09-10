import {
  buildWordFrequencyUserPrompt,
  getGoogleWordFrequency,
  getGroqWordFrequency,
  parseWordFrequencyAiResponse,
  resolveWordFrequency,
  storeWordFrequencyInDb,
} from './word-frequency';

describe('lib/word-frequency', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.WORDS_API_KEY;
    delete process.env.RAPIDAPI_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.CF_API_TOKEN;
    delete process.env.CF_ACCOUNT_ID;
    (global as any).fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('buildWordFrequencyUserPrompt', () => {
    it('creates prompt for word without meaning', () => {
      const prompt = buildWordFrequencyUserPrompt('pragmatic');
      expect(prompt).toContain('pragmatic');
      expect(prompt).not.toContain('Context / Definition');
    });

    it('creates prompt for word with meaning', () => {
      const prompt = buildWordFrequencyUserPrompt('pragmatic', 'guided by practical experience');
      expect(prompt).toContain('pragmatic');
      expect(prompt).toContain('guided by practical experience');
    });
  });

  describe('parseWordFrequencyAiResponse', () => {
    it('parses valid JSON response', () => {
      const jsonStr = JSON.stringify({
        word: 'eloquent',
        usageFrequency: 'Top 5000',
        tier: 'Intermediate',
        estimatedZipf: 3.65,
        explanation: 'Common literary and academic word.',
      });

      const res = parseWordFrequencyAiResponse(jsonStr, 'eloquent', 'Test AI');
      expect(res.word).toBe('eloquent');
      expect(res.usageFrequency).toBe('Top 5000');
      expect(res.tier).toBe('Intermediate');
      expect(res.zipf).toBe(3.65);
      expect(res.explanation).toBe('Common literary and academic word.');
      expect(res.source).toBe('ai');
      expect(res.generatorDetails).toBe('Test AI');
    });

    it('parses markdown code-fenced JSON', () => {
      const fenced = '```json\n{"usageFrequency": "Top 2000", "tier": "Common"}\n```';
      const res = parseWordFrequencyAiResponse(fenced, 'active', 'Test AI');
      expect(res.usageFrequency).toBe('Top 2000');
      expect(res.tier).toBe('Common');
    });

    it('handles non-JSON string with regex fallback', () => {
      const raw =
        'Here is the response: "usageFrequency": "Top 1000", "explanation": "everyday word"';
      const res = parseWordFrequencyAiResponse(raw, 'water', 'Test AI');
      expect(res.usageFrequency).toBe('Top 1000');
    });
  });

  describe('getGoogleWordFrequency', () => {
    it('throws error if Google API key is missing', async () => {
      await expect(getGoogleWordFrequency('serendipity')).rejects.toThrow(
        'Google AI API key is not configured'
      );
    });

    it('calls Google Gemini and returns parsed frequency', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      const mockCandidate = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    word: 'ubiquitous',
                    usageFrequency: 'Top 10000',
                    tier: 'Advanced',
                    estimatedZipf: 2.8,
                    explanation: 'Formal academic word.',
                  }),
                },
              ],
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => mockCandidate,
      });

      const res = await getGoogleWordFrequency('ubiquitous');
      expect(res.word).toBe('ubiquitous');
      expect(res.usageFrequency).toBe('Top 10000');
      expect(res.generatorDetails).toContain('Google');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('getGroqWordFrequency', () => {
    it('throws error if Groq API key is missing', async () => {
      await expect(getGroqWordFrequency('meticulous')).rejects.toThrow(
        'Groq AI API key is not configured'
      );
    });

    it('calls Groq completions and returns frequency', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';
      const mockGroqResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                word: 'meticulous',
                usageFrequency: 'Top 5000',
                tier: 'Intermediate',
                estimatedZipf: 3.2,
              }),
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => mockGroqResponse,
      });

      const res = await getGroqWordFrequency('meticulous');
      expect(res.word).toBe('meticulous');
      expect(res.usageFrequency).toBe('Top 5000');
      expect(res.generatorDetails).toContain('Groq');
    });
  });

  describe('resolveWordFrequency', () => {
    it('resolves from WordsAPI when provider is wordsapi', async () => {
      const mockFreq = {
        word: 'eloquent',
        frequency: {
          zipf: 3.9,
          perMillion: 7.8,
          diversity: 0.4,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => mockFreq,
      });

      const res = await resolveWordFrequency({
        word: 'eloquent',
        provider: 'wordsapi',
        customWordsApiKey: 'words-key',
      });

      expect(res.source).toBe('wordsapi');
      expect(res.usageFrequency).toBe('Top 3000');
      expect(res.zipf).toBe(3.9);
      expect(res.perMillion).toBe(7.8);
    });

    it('falls back to AI in auto mode when no WordsAPI key is configured', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      usageFrequency: 'Top 1000',
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });

      const res = await resolveWordFrequency({
        word: 'decide',
        provider: 'auto',
      });

      expect(res.source).toBe('ai');
      expect(res.usageFrequency).toBe('Top 1000');
    });

    it('falls back to AI if WordsAPI 404s in auto mode', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      process.env.WORDS_API_KEY = 'words-key';

      // WordsAPI returns 404
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 404,
        ok: false,
      });

      // AI returns success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      usageFrequency: 'Rare',
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });

      const res = await resolveWordFrequency({
        word: 'obscureword',
        provider: 'auto',
      });

      expect(res.source).toBe('ai');
      expect(res.usageFrequency).toBe('Rare');
    });
  });

  describe('storeWordFrequencyInDb', () => {
    it('patches word doc with usageFrequency and generatorAiDetails', async () => {
      const mockDoc = {
        id: 'word-1',
        word: 'resilient',
        usageFrequency: '',
        generatorAiDetails: '',
        patch: jest.fn().mockResolvedValue(true),
      };

      const mockDb: any = {
        words: {
          findOne: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockDoc),
          }),
        },
      };

      const success = await storeWordFrequencyInDb(mockDb, 'word-1', {
        word: 'resilient',
        usageFrequency: 'Top 2000',
        source: 'wordsapi',
        generatorDetails: 'WordsAPI (wordsapi.com)',
      });

      expect(success).toBe(true);
      expect(mockDoc.patch).toHaveBeenCalledWith(
        expect.objectContaining({
          usageFrequency: 'Top 2000',
          generatorAiDetails: 'WordsAPI (wordsapi.com)',
        })
      );
    });
  });
});
