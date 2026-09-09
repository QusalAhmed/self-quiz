import { verifyWordAndDefinitions } from '@/lib/word-verification';
import { POST } from './route';

jest.mock('@/lib/word-verification', () => ({
  verifyWordAndDefinitions: jest.fn(),
}));

jest.mock('@/app/api/settings/route', () => ({
  getServerSettings: jest.fn().mockResolvedValue({
    ai: {
      preferredProvider: 'gemini',
      useCustomApiKeys: false,
    },
  }),
}));

describe('POST /api/verify-word', () => {
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
    const request = new Request('http://localhost:3000/api/verify-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: '   ' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Word is required for verification');
  });

  it('successfully verifies word and returns 200 with result', async () => {
    const mockResult = {
      word: 'eloquent',
      isWordValid: true,
      wordFeedback: 'Valid English word',
      overallStatus: 'valid' as const,
      definitions: [
        {
          index: 0,
          isAccurate: true,
          partOfSpeechMatches: true,
          feedback: 'Accurate definition',
        },
      ],
      generatorAiDetails: 'Google Gemini 2.5 Flash',
    };

    (verifyWordAndDefinitions as jest.Mock).mockResolvedValue(mockResult);

    const request = new Request('http://localhost:3000/api/verify-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: 'eloquent',
        definitions: [{ meaning: 'fluent speaker', partOfSpeech: 'adjective' }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.word).toBe('eloquent');
    expect(data.overallStatus).toBe('valid');
    expect(data.definitions[0].isAccurate).toBe(true);
  });

  it('passes wordsapi provider parameter to verifyWordAndDefinitions', async () => {
    const mockResult = {
      word: 'soliloquy',
      isWordValid: true,
      wordFeedback: 'Valid English word (verified via WordsAPI).',
      overallStatus: 'valid' as const,
      definitions: [],
      generatorAiDetails: 'WordsAPI (wordsapi.com)',
    };

    (verifyWordAndDefinitions as jest.Mock).mockResolvedValue(mockResult);

    const request = new Request('http://localhost:3000/api/verify-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: 'soliloquy',
        provider: 'wordsapi',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(verifyWordAndDefinitions).toHaveBeenCalledWith(
      expect.objectContaining({
        word: 'soliloquy',
        preferredProvider: 'wordsapi',
      })
    );
  });

  it('returns 500 when verification fails unexpectedly', async () => {
    (verifyWordAndDefinitions as jest.Mock).mockRejectedValue(new Error('Fatal API crash'));

    const request = new Request('http://localhost:3000/api/verify-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'test' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Fatal API crash');
  });
});
