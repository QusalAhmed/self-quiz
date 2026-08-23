import {
  filterAndRankGroqModels,
  formatGroqModelDetails,
  generateGroqExamples,
  generateGroqWordFamily,
  getGroqModelCandidates,
  resetGroqWorkingModelCache,
} from './groq';

describe('groq module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    resetGroqWorkingModelCache();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('formatGroqModelDetails', () => {
    it('formats recognized Groq models nicely', () => {
      expect(formatGroqModelDetails('llama-3.3-70b-versatile')).toBe('Groq Llama 3.3 70B');
      expect(formatGroqModelDetails('llama-3.1-70b-versatile')).toBe('Groq Llama 3.1 70B');
      expect(formatGroqModelDetails('llama-3.1-8b-instant')).toBe('Groq Llama 3.1 8B');
      expect(formatGroqModelDetails('llama-3.2-11b-vision-preview')).toBe('Groq Llama 3.2 11B');
      expect(formatGroqModelDetails('llama-3.2-90b-vision-preview')).toBe('Groq Llama 3.2 90B');
      expect(formatGroqModelDetails('qwen/qwen3.6-27b')).toBe('Groq Qwen 3.6 27B');
      expect(formatGroqModelDetails('openai/gpt-oss-120b')).toBe('Groq GPT-OSS 120B');
      expect(formatGroqModelDetails('deepseek-r1-distill-llama-70b')).toBe(
        'Groq DeepSeek R1 Distill 70B'
      );
      expect(formatGroqModelDetails('gemma2-9b-it')).toBe('Groq Gemma 2 9B');
      expect(formatGroqModelDetails('custom-model')).toBe('Groq AI (custom-model)');
    });
  });

  describe('filterAndRankGroqModels', () => {
    it('excludes whisper, guard, and inactive models, and ranks largest/best models first', () => {
      const raw = [
        { id: 'whisper-large-v3', active: true },
        { id: 'llama-guard-3-8b', active: true },
        { id: 'inactive-model', active: false },
        { id: 'llama-3.1-8b-instant', active: true },
        { id: 'openai/gpt-oss-120b', active: true },
        { id: 'qwen/qwen3.6-27b', active: true },
      ];

      const ranked = filterAndRankGroqModels(raw);
      expect(ranked).not.toContain('whisper-large-v3');
      expect(ranked).not.toContain('llama-guard-3-8b');
      expect(ranked).not.toContain('inactive-model');
      expect(ranked[0]).toBe('openai/gpt-oss-120b');
      expect(ranked).toContain('qwen/qwen3.6-27b');
      expect(ranked).toContain('llama-3.1-8b-instant');
    });
  });

  describe('getGroqModelCandidates', () => {
    it('returns candidates including live models and static fallbacks', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: 'qwen/qwen3.6-27b', active: true }],
        }),
      } as any);

      try {
        const candidates = await getGroqModelCandidates('test-key');
        expect(candidates).toContain('qwen/qwen3.6-27b');
        expect(candidates).toContain('llama-3.3-70b-versatile');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('puts configured model at top of candidates', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: 'qwen/qwen3.6-27b', active: true }],
        }),
      } as any);

      try {
        const candidates = await getGroqModelCandidates('test-key', 'my-custom-model');
        expect(candidates[0]).toBe('my-custom-model');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('generateGroqWordFamily', () => {
    it('throws error when GROQ_API_KEY is not configured', async () => {
      delete process.env.GROQ_API_KEY;
      await expect(
        generateGroqWordFamily({ word: 'decide', meaning: 'to choose' })
      ).rejects.toThrow('Groq API key is not configured');
    });

    it('successfully calls Groq API and parses word family response', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';
      process.env.GROQ_AI_MODEL = 'qwen/qwen3.6-27b';

      const mockApiResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                rootUsageFrequency: 'Top 1000',
                members: [
                  {
                    word: 'decision',
                    partOfSpeech: 'noun',
                    banglaDefinition: 'সিদ্ধান্ত',
                    englishDefinition: 'a choice that you make about something',
                    examples: ['It was a difficult decision.'],
                    usageFrequency: 'Top 2000',
                  },
                  {
                    word: 'decisive',
                    partOfSpeech: 'adjective',
                    banglaDefinition: 'চূড়ান্ত',
                    englishDefinition: 'producing a definite result',
                    examples: ['She played a decisive role in the victory.'],
                    usageFrequency: 'Top 3000',
                  },
                ],
              }),
            },
          },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(async (url: string) => {
        if (url.includes('/models')) {
          return {
            ok: true,
            json: async () => ({ data: [{ id: 'qwen/qwen3.6-27b', active: true }] }),
          };
        }
        return {
          ok: true,
          json: async () => mockApiResponse,
        };
      });

      try {
        const result = await generateGroqWordFamily({ word: 'decide', meaning: 'to choose' });
        expect(result.generatorAiDetails).toBe('Groq Qwen 3.6 27B');
        expect(result.rootUsageFrequency).toBe('Top 1000');
        expect(result.members.length).toBe(2);
        expect(result.members[0].word).toBe('decision');
        expect(result.members[0].generatorAiDetails).toBe('Groq Qwen 3.6 27B');
        expect(result.members[1].word).toBe('decisive');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('falls back to next model candidate when first model returns 404 or decommissioned', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';

      const originalFetch = global.fetch;
      let completionCalls = 0;
      global.fetch = jest.fn().mockImplementation(async (url: string, options?: any) => {
        if (url.includes('/models')) {
          return {
            ok: true,
            json: async () => ({
              data: [
                { id: 'llama-3.3-70b-versatile', active: true },
                { id: 'qwen/qwen3.6-27b', active: true },
              ],
            }),
          };
        }
        completionCalls++;
        const parsedBody = JSON.parse(options.body);
        if (parsedBody.model === 'llama-3.3-70b-versatile') {
          return {
            ok: false,
            status: 404,
            text: async () =>
              JSON.stringify({
                error: {
                  message:
                    'The model `llama-3.3-70b-versatile` does not exist or you do not have access to it.',
                  type: 'invalid_request_error',
                  code: 'model_not_found',
                },
              }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    rootUsageFrequency: 'Top 1000',
                    members: [
                      {
                        word: 'decision',
                        partOfSpeech: 'noun',
                        banglaDefinition: 'সিদ্ধান্ত',
                        englishDefinition: 'a choice',
                        examples: ['A good decision.'],
                        usageFrequency: 'Top 2000',
                      },
                    ],
                  }),
                },
              },
            ],
          }),
        };
      });

      try {
        const result = await generateGroqWordFamily({ word: 'decide' });
        expect(completionCalls).toBe(2);
        expect(result.generatorAiDetails).toBe('Groq Qwen 3.6 27B');
        expect(result.members.length).toBe(1);
        expect(result.members[0].word).toBe('decision');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('handles markdown wrapped JSON responses from Groq', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';

      const mockApiResponse = {
        choices: [
          {
            message: {
              content: '```json\n{"members":[{"word":"decision","partOfSpeech":"noun"}]}\n```',
            },
          },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(async (url: string) => {
        if (url.includes('/models')) {
          return {
            ok: false,
            status: 500,
            text: async () => 'error',
          };
        }
        return {
          ok: true,
          json: async () => mockApiResponse,
        };
      });

      try {
        const result = await generateGroqWordFamily({ word: 'decide' });
        expect(result.members.length).toBe(1);
        expect(result.members[0].word).toBe('decision');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('generateGroqExamples', () => {
    it('throws error when GROQ_API_KEY is not configured', async () => {
      delete process.env.GROQ_API_KEY;
      await expect(
        generateGroqExamples({
          word: 'decide',
          meaning: 'to choose',
          targetCount: 3,
          partOfSpeech: 'verb',
          referenceExamples: [],
        })
      ).rejects.toThrow('Groq API key is not configured');
    });

    it('successfully calls Groq API and parses examples response', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';

      const mockApiResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                examples: [
                  'She decided to take the train.',
                  'We must decide what to do next.',
                  'He could not decide between the two options.',
                ],
              }),
            },
          },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(async (url: string) => {
        if (url.includes('/models')) {
          return {
            ok: false,
            status: 500,
            text: async () => 'error',
          };
        }
        return {
          ok: true,
          json: async () => mockApiResponse,
        };
      });

      try {
        const examples = await generateGroqExamples({
          word: 'decide',
          meaning: 'to choose',
          targetCount: 3,
          partOfSpeech: 'verb',
          referenceExamples: [],
        });
        expect(examples).toEqual([
          'She decided to take the train.',
          'We must decide what to do next.',
          'He could not decide between the two options.',
        ]);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('falls back to next candidate when examples encounter 404', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';

      const originalFetch = global.fetch;
      let completionCalls = 0;
      global.fetch = jest.fn().mockImplementation(async (url: string, options?: any) => {
        if (url.includes('/models')) {
          return {
            ok: true,
            json: async () => ({
              data: [
                { id: 'llama-3.3-70b-versatile', active: true },
                { id: 'qwen/qwen3.6-27b', active: true },
              ],
            }),
          };
        }
        completionCalls++;
        const parsedBody = JSON.parse(options.body);
        if (parsedBody.model === 'llama-3.3-70b-versatile') {
          return {
            ok: false,
            status: 404,
            text: async () => '{"error":{"message":"The model does not exist"}}',
          };
        }
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    examples: ['She made a decision.'],
                  }),
                },
              },
            ],
          }),
        };
      });

      try {
        const examples = await generateGroqExamples({
          word: 'decide',
          meaning: 'to choose',
          targetCount: 1,
          partOfSpeech: 'verb',
          referenceExamples: [],
        });
        expect(completionCalls).toBe(2);
        expect(examples).toEqual(['She made a decision.']);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
