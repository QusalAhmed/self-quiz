import { GET, POST } from './route';

describe('Pronounce API Route (/api/pronounce)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when word is missing in POST body', async () => {
    const request = new Request('http://localhost/api/pronounce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Word is required');
  });

  it('returns 400 when word is missing in GET query', async () => {
    const request = new Request('http://localhost/api/pronounce');
    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Word parameter is required');
  });

  it('resolves Merriam-Webster audio when API key is provided and API responds', async () => {
    const mockMwData = [
      {
        meta: { id: 'ephemeral' },
        hwi: {
          hw: 'ephem*er*al',
          prs: [
            {
              mw: 'i-ˈfe-m(ə-)rəl',
              sound: {
                audio: 'epheme01',
                ref: 'c',
              },
            },
          ],
        },
      },
    ];

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('dictionaryapi.com')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockMwData),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      });
    });

    const request = new Request('http://localhost/api/pronounce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'ephemeral', apiKey: 'test-api-key' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.word).toBe('ephemeral');
    expect(data.audioUrl).toBe(
      'https://media.merriam-webster.com/audio/prons/en/us/mp3/e/epheme01.mp3'
    );
    expect(data.phonetic).toBe('\\i-ˈfe-m(ə-)rəl\\');
    expect(data.audioSource).toBe('merriam-webster');
    expect(data.success).toBe(true);
  });
});
