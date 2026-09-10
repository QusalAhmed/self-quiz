import { supabase } from '@/lib/supabase';
import { resolveWordFrequency } from '@/lib/word-frequency';
import { POST } from './route';

jest.mock('@/lib/word-frequency', () => ({
  resolveWordFrequency: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/app/api/settings/route', () => ({
  getServerSettings: jest.fn().mockResolvedValue({
    ai: {
      preferredProvider: 'gemini',
      useCustomApiKeys: false,
    },
  }),
}));

describe('POST /api/word-frequency', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when request body is invalid JSON', async () => {
    const request = {
      json: jest.fn().mockRejectedValue(new Error('SyntaxError: Unexpected token')),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid request body');
  });

  it('returns 400 when word is empty or missing', async () => {
    const request = new Request('http://localhost:3000/api/word-frequency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: '   ' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Word is required for frequency lookup');
  });

  it('successfully retrieves frequency and returns 200 with result', async () => {
    const mockResult = {
      word: 'eloquent',
      usageFrequency: 'Top 5000',
      source: 'wordsapi' as const,
      generatorDetails: 'WordsAPI (wordsapi.com)',
      tier: 'Intermediate',
      zipf: 3.8,
      perMillion: 6.5,
      diversity: 0.4,
      explanation: 'Upper intermediate word',
    };

    (resolveWordFrequency as jest.Mock).mockResolvedValueOnce(mockResult);

    const request = new Request('http://localhost:3000/api/word-frequency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'eloquent', provider: 'wordsapi' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.word).toBe('eloquent');
    expect(data.usageFrequency).toBe('Top 5000');
    expect(data.source).toBe('wordsapi');
    expect(data.generatorDetails).toBe('WordsAPI (wordsapi.com)');
    expect(data.zipf).toBe(3.8);
    expect(data.storedInDb).toBe(false);
  });

  it('stores frequency in database when storeInDb and wordId are provided', async () => {
    const mockResult = {
      word: 'pragmatic',
      usageFrequency: 'Top 3000',
      source: 'ai' as const,
      generatorDetails: 'Google Gemini 2.5 Flash',
      tier: 'Standard',
      zipf: 4.1,
    };

    (resolveWordFrequency as jest.Mock).mockResolvedValueOnce(mockResult);

    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      update: mockUpdate,
    });

    const request = new Request('http://localhost:3000/api/word-frequency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: 'pragmatic',
        wordId: 'word-123',
        storeInDb: true,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.storedInDb).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        usage_frequency: 'Top 3000',
        generator_ai_details: 'Google Gemini 2.5 Flash',
      })
    );
  });

  it('returns 500 when frequency resolution throws error', async () => {
    (resolveWordFrequency as jest.Mock).mockRejectedValueOnce(new Error('AI provider error'));

    const request = new Request('http://localhost:3000/api/word-frequency', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'failword' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('AI provider error');
  });
});
