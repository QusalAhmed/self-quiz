import {
  ALLOWED_GROQ_MODELS,
  buildGroqPayload,
  filterAndRankGroqModels,
  formatGroqModelDetails,
  generateGroqExamples,
  generateGroqWordFamily,
  getGroqModelCandidates,
  isAllowedGroqModel,
  isReasoningModel,
  parseJsonFromContent,
  resetGroqWorkingModelCache,
  STATIC_FALLBACK_GROQ_MODELS,
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

  describe('ALLOWED_GROQ_MODELS and isAllowedGroqModel', () => {
    it('defines only the 3 permitted models', () => {
      expect(ALLOWED_GROQ_MODELS).toEqual([
        'qwen/qwen3.6-27b',
        'openai/gpt-oss-120b',
        'groq/compound',
      ]);
      expect(STATIC_FALLBACK_GROQ_MODELS).toEqual([
        'qwen/qwen3.6-27b',
        'openai/gpt-oss-120b',
        'groq/compound',
      ]);
    });

    it('correctly validates allowed vs unallowed models', () => {
      expect(isAllowedGroqModel('qwen/qwen3.6-27b')).toBe(true);
      expect(isAllowedGroqModel('openai/gpt-oss-120b')).toBe(true);
      expect(isAllowedGroqModel('groq/compound')).toBe(true);
      expect(isAllowedGroqModel('llama-3.3-70b-versatile')).toBe(false);
      expect(isAllowedGroqModel('llama-3.1-8b-instant')).toBe(false);
      expect(isAllowedGroqModel('whisper-large-v3')).toBe(false);
    });
  });

  describe('formatGroqModelDetails', () => {
    it('formats recognized Groq models nicely', () => {
      expect(formatGroqModelDetails('qwen/qwen3.6-27b')).toBe('Groq Qwen 3.6 27B');
      expect(formatGroqModelDetails('openai/gpt-oss-120b')).toBe('Groq GPT-OSS 120B');
      expect(formatGroqModelDetails('groq/compound')).toBe('Groq Compound');
      expect(formatGroqModelDetails('custom-model')).toBe('Groq AI (custom-model)');
    });
  });

  describe('filterAndRankGroqModels', () => {
    it('only keeps allowed models and ranks them in strict priority order', () => {
      const raw = [
        { id: 'whisper-large-v3', active: true },
        { id: 'llama-guard-3-8b', active: true },
        { id: 'inactive-model', active: false },
        { id: 'llama-3.1-8b-instant', active: true },
        { id: 'groq/compound', active: true },
        { id: 'openai/gpt-oss-120b', active: true },
        { id: 'qwen/qwen3.6-27b', active: true },
      ];

      const ranked = filterAndRankGroqModels(raw);
      expect(ranked).toEqual(['qwen/qwen3.6-27b', 'openai/gpt-oss-120b', 'groq/compound']);
    });
  });

  describe('getGroqModelCandidates', () => {
    it('returns candidates drawn strictly from the allowed models', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 'qwen/qwen3.6-27b', active: true },
            { id: 'llama-3.3-70b-versatile', active: true },
          ],
        }),
      } as any);

      try {
        const candidates = await getGroqModelCandidates('test-key');
        expect(candidates).toEqual(['qwen/qwen3.6-27b', 'openai/gpt-oss-120b', 'groq/compound']);
        expect(candidates).not.toContain('llama-3.3-70b-versatile');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('puts allowed configured model at top of candidates', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: 'qwen/qwen3.6-27b', active: true },
            { id: 'openai/gpt-oss-120b', active: true },
            { id: 'groq/compound', active: true },
          ],
        }),
      } as any);

      try {
        const candidates = await getGroqModelCandidates('test-key', 'groq/compound');
        expect(candidates[0]).toBe('groq/compound');
        expect(candidates).toContain('qwen/qwen3.6-27b');
        expect(candidates).toContain('openai/gpt-oss-120b');
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
                { id: 'qwen/qwen3.6-27b', active: true },
                { id: 'openai/gpt-oss-120b', active: true },
              ],
            }),
          };
        }
        completionCalls++;
        const parsedBody = JSON.parse(options.body);
        if (parsedBody.model === 'qwen/qwen3.6-27b') {
          return {
            ok: false,
            status: 404,
            text: async () =>
              JSON.stringify({
                error: {
                  message:
                    'The model `qwen/qwen3.6-27b` does not exist or you do not have access to it.',
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
        expect(result.generatorAiDetails).toBe('Groq GPT-OSS 120B');
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
                { id: 'qwen/qwen3.6-27b', active: true },
                { id: 'openai/gpt-oss-120b', active: true },
              ],
            }),
          };
        }
        completionCalls++;
        const parsedBody = JSON.parse(options.body);
        if (parsedBody.model === 'qwen/qwen3.6-27b') {
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

    it('automatically retries in standard text mode when Groq returns 400 json_validate_failed', async () => {
      process.env.GROQ_API_KEY = 'test-groq-key';

      const originalFetch = global.fetch;
      let calls = 0;
      global.fetch = jest.fn().mockImplementation(async (url: string, options?: any) => {
        if (url.includes('/models')) {
          return {
            ok: true,
            json: async () => ({ data: [{ id: 'qwen/qwen3.6-27b', active: true }] }),
          };
        }
        calls++;
        const parsedBody = JSON.parse(options.body);
        // First attempt with response_format triggers 400 json_validate_failed
        if (parsedBody.response_format) {
          return {
            ok: false,
            status: 400,
            text: async () =>
              JSON.stringify({
                error: {
                  message: 'Failed to validate JSON. Please adjust your prompt.',
                  type: 'invalid_request_error',
                  code: 'json_validate_failed',
                  failed_generation: '',
                },
              }),
          };
        }
        // Retry attempt without response_format succeeds with markdown/thinking output
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content:
                    '<think>Thinking about examples</think>\n```json\n{"examples":["She decided quickly."]}\n```',
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
        expect(calls).toBe(2);
        expect(examples).toEqual(['She decided quickly.']);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('isReasoningModel', () => {
    it('identifies reasoning models correctly', () => {
      expect(isReasoningModel('qwen/qwen3.6-27b')).toBe(true);
      expect(isReasoningModel('openai/gpt-oss-120b')).toBe(true);
      expect(isReasoningModel('groq/compound')).toBe(false);
    });
  });

  describe('buildGroqPayload', () => {
    it('includes reasoning_format: hidden for reasoning models', () => {
      const payload = buildGroqPayload('qwen/qwen3.6-27b', [{ role: 'user', content: 'test' }]);
      expect(payload.reasoning_format).toBe('hidden');
      expect(payload.response_format).toEqual({ type: 'json_object' });
    });

    it('does not include reasoning_format for compound model', () => {
      const payload = buildGroqPayload('groq/compound', [{ role: 'user', content: 'test' }]);
      expect(payload.reasoning_format).toBeUndefined();
      expect(payload.response_format).toEqual({ type: 'json_object' });
    });

    it('omits response_format when useJsonFormat is false', () => {
      const payload = buildGroqPayload(
        'qwen/qwen3.6-27b',
        [{ role: 'user', content: 'test' }],
        0.2,
        false
      );
      expect(payload.response_format).toBeUndefined();
      expect(payload.reasoning_format).toBe('hidden');
    });
  });

  describe('parseJsonFromContent', () => {
    it('strips <think> tags before parsing JSON', () => {
      const raw =
        '<think>I need to construct a word family JSON.</think>{"members":[{"word":"decision","partOfSpeech":"noun"}]}';
      const parsed = parseJsonFromContent(raw);
      expect(parsed.members[0].word).toBe('decision');
    });

    it('parses JSON from markdown fences containing think tags', () => {
      const raw =
        '<think>Let me format as json</think>\n```json\n{"members":[{"word":"decision","partOfSpeech":"noun"}]}\n```';
      const parsed = parseJsonFromContent(raw);
      expect(parsed.members[0].word).toBe('decision');
    });
  });
});
