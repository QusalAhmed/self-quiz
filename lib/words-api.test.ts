import {
  fetchWordsApiFrequency,
  fetchWordsApiWord,
  getWordsApiUsageFrequency,
  perMillionToUsageFrequency,
  resolveWordsApiKey,
  searchWordsApiSuggestions,
  verifyWordWithWordsApi,
  WORDS_API_BASE_URL,
  WORDS_API_HOST,
  zipfToUsageFrequency,
} from './words-api';

describe('lib/words-api', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.WORDS_API_KEY;
    delete process.env.RAPIDAPI_KEY;
    // Clear global fetch mock
    (global as any).fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('resolveWordsApiKey', () => {
    it('prefers explicit key parameter', () => {
      process.env.WORDS_API_KEY = 'env-words-key';
      expect(resolveWordsApiKey('custom-key')).toBe('custom-key');
    });

    it('falls back to WORDS_API_KEY env var', () => {
      process.env.WORDS_API_KEY = 'env-words-key';
      expect(resolveWordsApiKey()).toBe('env-words-key');
    });

    it('falls back to RAPIDAPI_KEY env var if WORDS_API_KEY is not set', () => {
      process.env.RAPIDAPI_KEY = 'rapidapi-key';
      expect(resolveWordsApiKey()).toBe('rapidapi-key');
    });

    it('returns empty string when no key is configured', () => {
      expect(resolveWordsApiKey()).toBe('');
      expect(resolveWordsApiKey('  ')).toBe('');
    });
  });

  describe('fetchWordsApiWord', () => {
    it('throws error when word is empty', async () => {
      await expect(fetchWordsApiWord('', 'my-key')).rejects.toThrow(
        'Word is required for WordsAPI lookup'
      );
    });

    it('throws error when no API key is available', async () => {
      await expect(fetchWordsApiWord('serendipity')).rejects.toThrow(
        'WordsAPI requires an API key'
      );
    });

    it('successfully fetches and parses word data from WordsAPI', async () => {
      const mockData = {
        word: 'soliloquy',
        results: [
          {
            definition: 'speech you make to yourself',
            partOfSpeech: 'noun',
            synonyms: ['monologue'],
          },
        ],
        syllables: {
          count: 4,
          list: ['so', 'lil', 'o', 'quy'],
        },
        frequency: 2.5,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchWordsApiWord('soliloquy', 'test-key');
      expect(result).toEqual(mockData);

      expect(global.fetch).toHaveBeenCalledWith(
        `${WORDS_API_BASE_URL}/words/soliloquy`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'x-rapidapi-key': 'test-key',
            'x-rapidapi-host': WORDS_API_HOST,
          }),
        })
      );
    });

    it('returns null when word is not found (HTTP 404)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 404,
        ok: false,
      });

      const result = await fetchWordsApiWord('nonexistentword123', 'test-key');
      expect(result).toBeNull();
    });

    it('throws meaningful error on authentication failure (HTTP 401)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 401,
        ok: false,
      });

      await expect(fetchWordsApiWord('test', 'invalid-key')).rejects.toThrow(
        'WordsAPI authentication failed (HTTP 401): Invalid API key.'
      );
    });

    it('throws meaningful error on rate limit (HTTP 429)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 429,
        ok: false,
      });

      await expect(fetchWordsApiWord('test', 'test-key')).rejects.toThrow(
        'WordsAPI rate limit exceeded (HTTP 429).'
      );
    });
  });

  describe('searchWordsApiSuggestions', () => {
    it('returns suggestions matching prefix from search endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          data: ['soliloquy', 'solitude', 'solitary'],
        }),
      });

      const suggestions = await searchWordsApiSuggestions('soliloqui', 'test-key');
      expect(suggestions).toContain('soliloquy');
      expect(suggestions).toContain('solitude');
    });

    it('returns empty array when cleanWord length is less than 3', async () => {
      const suggestions = await searchWordsApiSuggestions('hi', 'test-key');
      expect(suggestions).toEqual([]);
    });
  });

  describe('verifyWordWithWordsApi', () => {
    it('verifies a valid English word with matching definition and part of speech', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          word: 'eloquent',
          results: [
            {
              definition: 'fluent or persuasive in speaking or writing',
              partOfSpeech: 'adjective',
              synonyms: ['fluent', 'articulate'],
            },
          ],
          frequency: 3.2,
          syllables: {
            count: 3,
            list: ['el', 'o', 'quent'],
          },
        }),
      });

      const result = await verifyWordWithWordsApi(
        'eloquent',
        [
          {
            meaning: 'fluent or persuasive in speaking',
            partOfSpeech: 'adjective',
          },
        ],
        'test-key'
      );

      expect(result.isWordValid).toBe(true);
      expect(result.overallStatus).toBe('valid');
      expect(result.generatorAiDetails).toBe('WordsAPI (wordsapi.com)');
      expect(result.definitions[0].isAccurate).toBe(true);
      expect(result.definitions[0].partOfSpeechMatches).toBe(true);
      expect(result.suggestedNewDefinition?.meaning).toBe(
        'fluent or persuasive in speaking or writing'
      );
    });

    it('flags warning when part of speech does not match WordsAPI', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          word: 'eloquent',
          results: [
            {
              definition: 'fluent or persuasive in speaking or writing',
              partOfSpeech: 'adjective',
            },
          ],
        }),
      });

      const result = await verifyWordWithWordsApi(
        'eloquent',
        [
          {
            meaning: 'fluent or persuasive in speaking or writing',
            partOfSpeech: 'noun', // mismatch: adjective, not noun
          },
        ],
        'test-key'
      );

      expect(result.isWordValid).toBe(true);
      expect(result.overallStatus).toBe('warning');
      expect(result.definitions[0].partOfSpeechMatches).toBe(false);
      expect(result.definitions[0].feedback).toContain('Part of speech "noun" does not match');
    });

    it('returns spelling suggestions and warning when word is misspelled (HTTP 404 with suggestions)', async () => {
      // 1. Fetch word returns 404
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 404,
        ok: false,
      });

      // 2. Search suggestions returns suggestion
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          data: ['soliloquy'],
        }),
      });

      const result = await verifyWordWithWordsApi(
        'soliloqui',
        [{ meaning: 'talking to yourself', partOfSpeech: 'noun' }],
        'test-key'
      );

      expect(result.isWordValid).toBe(false);
      expect(result.wordSpellingSuggestion).toBe('soliloquy');
      expect(result.overallStatus).toBe('warning');
      expect(result.wordFeedback).toContain('Did you mean "soliloquy"?');
      expect(result.generatorAiDetails).toBe('WordsAPI (wordsapi.com)');
    });

    it('returns invalid status when word is not found and has no suggestions', async () => {
      // 1. Fetch word returns 404
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 404,
        ok: false,
      });

      // 2. Search suggestions returns empty
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          data: [],
        }),
      });

      const result = await verifyWordWithWordsApi(
        'asdfqwertyzxcv',
        [{ meaning: 'random nonsense', partOfSpeech: 'noun' }],
        'test-key'
      );

      expect(result.isWordValid).toBe(false);
      expect(result.overallStatus).toBe('invalid');
      expect(result.wordFeedback).toContain('was not found in the WordsAPI dictionary');
    });
  });

  describe('zipfToUsageFrequency', () => {
    it('maps high zipf scores to Top 500 and Top 1000', () => {
      expect(zipfToUsageFrequency(6.5)).toBe('Top 500');
      expect(zipfToUsageFrequency(6.0)).toBe('Top 500');
      expect(zipfToUsageFrequency(5.5)).toBe('Top 1000');
      expect(zipfToUsageFrequency(5.0)).toBe('Top 1000');
    });

    it('maps intermediate zipf scores to Top 2000, Top 3000, and Top 5000', () => {
      expect(zipfToUsageFrequency(4.6)).toBe('Top 2000');
      expect(zipfToUsageFrequency(4.3)).toBe('Top 2000');
      expect(zipfToUsageFrequency(4.0)).toBe('Top 3000');
      expect(zipfToUsageFrequency(3.8)).toBe('Top 3000');
      expect(zipfToUsageFrequency(3.4)).toBe('Top 5000');
      expect(zipfToUsageFrequency(3.0)).toBe('Top 5000');
    });

    it('maps low zipf scores to Top 10000 and Rare', () => {
      expect(zipfToUsageFrequency(2.5)).toBe('Top 10000');
      expect(zipfToUsageFrequency(2.0)).toBe('Top 10000');
      expect(zipfToUsageFrequency(1.8)).toBe('Rare');
      expect(zipfToUsageFrequency(0)).toBe('Rare');
      expect(zipfToUsageFrequency(-1)).toBe('Rare');
      expect(zipfToUsageFrequency(NaN)).toBe('Rare');
    });
  });

  describe('perMillionToUsageFrequency', () => {
    it('maps perMillion values correctly across standard tiers', () => {
      expect(perMillionToUsageFrequency(200)).toBe('Top 500');
      expect(perMillionToUsageFrequency(50)).toBe('Top 1000');
      expect(perMillionToUsageFrequency(15)).toBe('Top 2000');
      expect(perMillionToUsageFrequency(5)).toBe('Top 3000');
      expect(perMillionToUsageFrequency(1.2)).toBe('Top 5000');
      expect(perMillionToUsageFrequency(0.3)).toBe('Top 10000');
      expect(perMillionToUsageFrequency(0.05)).toBe('Rare');
    });
  });

  describe('fetchWordsApiFrequency & getWordsApiUsageFrequency', () => {
    it('throws error when word is empty or no API key is provided', async () => {
      await expect(fetchWordsApiFrequency('', 'test-key')).rejects.toThrow(
        'Word is required for WordsAPI lookup'
      );
      await expect(fetchWordsApiFrequency('hello')).rejects.toThrow('WordsAPI requires an API key');
    });

    it('fetches frequency successfully from the dedicated frequency endpoint', async () => {
      const mockFreqData = {
        word: 'eloquent',
        frequency: {
          zipf: 3.85,
          perMillion: 7.1,
          diversity: 0.42,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => mockFreqData,
      });

      const res = await fetchWordsApiFrequency('eloquent', 'test-key');
      expect(res).toEqual(mockFreqData);

      expect(global.fetch).toHaveBeenCalledWith(
        `${WORDS_API_BASE_URL}/words/eloquent/frequency`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'x-rapidapi-key': 'test-key',
          }),
        })
      );
    });

    it('falls back to main word endpoint if /frequency endpoint returns non-200', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 400,
        ok: false,
      });

      const mockWordData = {
        word: 'pragmatic',
        results: [{ definition: 'practical' }],
        frequency: 4.15,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => mockWordData,
      });

      const res = await fetchWordsApiFrequency('pragmatic', 'test-key');
      expect(res).toEqual({
        word: 'pragmatic',
        frequency: 4.15,
      });
    });

    it('getWordsApiUsageFrequency converts zipf and perMillion into standard tier', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          word: 'resilient',
          frequency: {
            zipf: 4.4,
            perMillion: 25.3,
            diversity: 0.35,
          },
        }),
      });

      const res = await getWordsApiUsageFrequency('resilient', 'test-key');
      expect(res).not.toBeNull();
      expect(res?.word).toBe('resilient');
      expect(res?.usageFrequency).toBe('Top 2000');
      expect(res?.zipf).toBe(4.4);
      expect(res?.perMillion).toBe(25.3);
      expect(res?.source).toBe('WordsAPI (wordsapi.com)');
    });

    it('returns null when word is not found (404)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        status: 404,
        ok: false,
      });

      const res = await fetchWordsApiFrequency('nonexistentword123', 'test-key');
      expect(res).toBeNull();
    });
  });
});
