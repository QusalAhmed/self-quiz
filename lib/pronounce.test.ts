import {
  buildMerriamWebsterAudioUrl,
  extractMerriamWebsterAudioFromApiResponse,
  formatPhonetic,
  getMerriamWebsterSubdirectory,
  isValidAudioUrl,
  normalizeMerriamWebsterAudioUrl,
} from './pronounce';

describe('pronounce utilities', () => {
  describe('getMerriamWebsterSubdirectory', () => {
    it('returns bix if audio starts with bix', () => {
      expect(getMerriamWebsterSubdirectory('bixword01')).toBe('bix');
      expect(getMerriamWebsterSubdirectory('BIX123')).toBe('bix');
    });

    it('returns gg if audio starts with gg', () => {
      expect(getMerriamWebsterSubdirectory('ggword01')).toBe('gg');
      expect(getMerriamWebsterSubdirectory('GGtest')).toBe('gg');
    });

    it('returns number if audio starts with a number or symbol', () => {
      expect(getMerriamWebsterSubdirectory('1000word')).toBe('number');
      expect(getMerriamWebsterSubdirectory('9word')).toBe('number');
      expect(getMerriamWebsterSubdirectory('_test')).toBe('number');
    });

    it('returns first lowercase letter for standard audio filenames', () => {
      expect(getMerriamWebsterSubdirectory('epheme01')).toBe('e');
      expect(getMerriamWebsterSubdirectory('apple001')).toBe('a');
      expect(getMerriamWebsterSubdirectory('ubiqui01')).toBe('u');
      expect(getMerriamWebsterSubdirectory('Serend02')).toBe('s');
      expect(getMerriamWebsterSubdirectory('intole05')).toBe('i');
    });

    it('handles empty input gracefully', () => {
      expect(getMerriamWebsterSubdirectory('')).toBe('number');
    });
  });

  describe('buildMerriamWebsterAudioUrl', () => {
    it('constructs correct Merriam-Webster MP3 URL for standard words', () => {
      expect(buildMerriamWebsterAudioUrl('epheme01')).toBe(
        'https://media.merriam-webster.com/audio/prons/en/us/mp3/e/epheme01.mp3'
      );
      expect(buildMerriamWebsterAudioUrl('apple001')).toBe(
        'https://media.merriam-webster.com/audio/prons/en/us/mp3/a/apple001.mp3'
      );
      expect(buildMerriamWebsterAudioUrl('intole05')).toBe(
        'https://media.merriam-webster.com/audio/prons/en/us/mp3/i/intole05.mp3'
      );
    });

    it('normalizes internal Collegiate ref tags like "c", "me", "la" to canonical en/us', () => {
      expect(buildMerriamWebsterAudioUrl('intole05', 'c')).toBe(
        'https://media.merriam-webster.com/audio/prons/en/us/mp3/i/intole05.mp3'
      );
      expect(buildMerriamWebsterAudioUrl('epheme01', 'me')).toBe(
        'https://media.merriam-webster.com/audio/prons/en/us/mp3/e/epheme01.mp3'
      );
    });

    it('handles bix, gg, and number subdirectories correctly', () => {
      expect(buildMerriamWebsterAudioUrl('bix101')).toBe(
        'https://media.merriam-webster.com/audio/prons/en/us/mp3/bix/bix101.mp3'
      );
      expect(buildMerriamWebsterAudioUrl('ggword01')).toBe(
        'https://media.merriam-webster.com/audio/prons/en/us/mp3/gg/ggword01.mp3'
      );
      expect(buildMerriamWebsterAudioUrl('1000word')).toBe(
        'https://media.merriam-webster.com/audio/prons/en/us/mp3/number/1000word.mp3'
      );
    });

    it('strips existing .mp3 or .wav extensions if present in filename', () => {
      expect(buildMerriamWebsterAudioUrl('epheme01.mp3')).toBe(
        'https://media.merriam-webster.com/audio/prons/en/us/mp3/e/epheme01.mp3'
      );
      expect(buildMerriamWebsterAudioUrl('apple001.wav')).toBe(
        'https://media.merriam-webster.com/audio/prons/en/us/mp3/a/apple001.mp3'
      );
    });

    it('normalizes ref language parameter with underscores', () => {
      expect(buildMerriamWebsterAudioUrl('epheme01', 'en_us')).toBe(
        'https://media.merriam-webster.com/audio/prons/en/us/mp3/e/epheme01.mp3'
      );
    });

    it('returns empty string if filename is empty', () => {
      expect(buildMerriamWebsterAudioUrl('')).toBe('');
    });
  });

  describe('normalizeMerriamWebsterAudioUrl', () => {
    it('repairs legacy /prons/c/mp3/ URLs to canonical /prons/en/us/mp3/', () => {
      expect(
        normalizeMerriamWebsterAudioUrl(
          'https://media.merriam-webster.com/audio/prons/c/mp3/i/intole05.mp3'
        )
      ).toBe('https://media.merriam-webster.com/audio/prons/en/us/mp3/i/intole05.mp3');
    });

    it('repairs legacy /prons/me/mp3/ or /prons/undefined/mp3/ URLs', () => {
      expect(
        normalizeMerriamWebsterAudioUrl(
          'https://media.merriam-webster.com/audio/prons/me/mp3/e/epheme01.mp3'
        )
      ).toBe('https://media.merriam-webster.com/audio/prons/en/us/mp3/e/epheme01.mp3');
    });

    it('leaves valid canonical URLs unchanged', () => {
      const valid = 'https://media.merriam-webster.com/audio/prons/en/us/mp3/i/intole05.mp3';
      expect(normalizeMerriamWebsterAudioUrl(valid)).toBe(valid);
    });

    it('handles non-MW URLs and empty strings gracefully', () => {
      expect(normalizeMerriamWebsterAudioUrl('https://example.com/audio.mp3')).toBe(
        'https://example.com/audio.mp3'
      );
      expect(normalizeMerriamWebsterAudioUrl('')).toBe('');
      expect(normalizeMerriamWebsterAudioUrl(null)).toBe('');
    });
  });

  describe('formatPhonetic', () => {
    it('wraps unbracketed phonetic with backslashes', () => {
      expect(formatPhonetic('i-ˈfe-m(ə-)rəl')).toBe('\\i-ˈfe-m(ə-)rəl\\');
    });

    it('preserves existing slashes or backslashes', () => {
      expect(formatPhonetic('\\i-ˈfe-m(ə-)rəl\\')).toBe('\\i-ˈfe-m(ə-)rəl\\');
      expect(formatPhonetic('/ɪˈfɛmərəl/')).toBe('/ɪˈfɛmərəl/');
    });

    it('strips quotes from string', () => {
      expect(formatPhonetic('"i-ˈfe-m(ə-)rəl"')).toBe('\\i-ˈfe-m(ə-)rəl\\');
    });

    it('returns empty string on null or empty input', () => {
      expect(formatPhonetic('')).toBe('');
      expect(formatPhonetic(null)).toBe('');
    });
  });

  describe('isValidAudioUrl', () => {
    it('validates audio URLs correctly', () => {
      expect(
        isValidAudioUrl('https://media.merriam-webster.com/audio/prons/en/us/mp3/e/epheme01.mp3')
      ).toBe(true);
      expect(
        isValidAudioUrl('https://api.dictionaryapi.dev/media/pronunciations/en/test.mp3')
      ).toBe(true);
      expect(isValidAudioUrl('http://example.com/sound.wav')).toBe(true);
      expect(isValidAudioUrl('not-a-url')).toBe(false);
      expect(isValidAudioUrl('https://example.com/image.png')).toBe(false);
      expect(isValidAudioUrl('')).toBe(false);
      expect(isValidAudioUrl(null)).toBe(false);
    });
  });

  describe('extractMerriamWebsterAudioFromApiResponse', () => {
    it('extracts audio and phonetic from standard hwi.prs response with canonical URL', () => {
      const mockApiData = [
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

      const result = extractMerriamWebsterAudioFromApiResponse(mockApiData);
      expect(result).toEqual({
        audioFilename: 'epheme01',
        audioUrl: 'https://media.merriam-webster.com/audio/prons/en/us/mp3/e/epheme01.mp3',
        phonetic: '\\i-ˈfe-m(ə-)rəl\\',
      });
    });

    it('returns null if no audio is present', () => {
      const mockApiData = [{ meta: { id: 'test' } }];
      expect(extractMerriamWebsterAudioFromApiResponse(mockApiData)).toBeNull();
      expect(extractMerriamWebsterAudioFromApiResponse([])).toBeNull();
      expect(extractMerriamWebsterAudioFromApiResponse(null)).toBeNull();
    });
  });
});
