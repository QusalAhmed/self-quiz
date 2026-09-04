import {
  buildMerriamWebsterAudioUrl,
  extractMerriamWebsterAudioFromApiResponse,
  formatPhonetic,
  getMerriamWebsterSubdirectory,
  isDictionaryWordMatch,
  isValidAudioUrl,
  normalizeDictionaryWord,
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

  describe('normalizeDictionaryWord and isDictionaryWordMatch', () => {
    it('normalizes syllable dots, homograph numbers, and casing', () => {
      expect(normalizeDictionaryWord('ab*ject*ly')).toBe('abjectly');
      expect(normalizeDictionaryWord('cau*tion:1')).toBe('caution');
      expect(normalizeDictionaryWord('per*co*la*tion')).toBe('percolation');
      expect(normalizeDictionaryWord('')).toBe('');
      expect(normalizeDictionaryWord(null)).toBe('');
    });

    it('matches words across varying formats while preserving word boundaries', () => {
      expect(isDictionaryWordMatch('ab*ject*ly', 'abjectly')).toBe(true);
      expect(isDictionaryWordMatch('cau*tion*ary', 'cautionary')).toBe(true);
      expect(isDictionaryWordMatch('cau*tion:1', 'cautionary')).toBe(false);
      expect(isDictionaryWordMatch('ab*ject', 'abjectly')).toBe(false);
      expect(isDictionaryWordMatch('drag*on', 'drag on')).toBe(false);
      expect(isDictionaryWordMatch('apple-pie', 'apple pie')).toBe(true);
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

    it('extracts exact run-on (uro) audio when targetWord is a derived form like abjectly, cautionary, percolation', () => {
      const mockAbjectlyData = [
        {
          meta: { id: 'abject' },
          hwi: {
            hw: 'ab*ject',
            prs: [{ mw: 'ˈab-ˌjekt', sound: { audio: 'abject01', ref: 'c' } }],
          },
          uros: [
            {
              ure: 'ab*ject*ly',
              prs: [{ mw: 'ˈab-ˌjek(t)-lē', sound: { audio: 'abject02', ref: 'c' } }],
            },
          ],
        },
      ];

      const result = extractMerriamWebsterAudioFromApiResponse(mockAbjectlyData, 'abjectly');
      expect(result).toEqual({
        audioFilename: 'abject02',
        audioUrl: 'https://media.merriam-webster.com/audio/prons/en/us/mp3/a/abject02.mp3',
        phonetic: '\\ˈab-ˌjek(t)-lē\\',
      });
    });

    it('extracts exact run-on audio for cautionary and percolation', () => {
      const mockCautionaryData = [
        {
          meta: { id: 'caution:1' },
          hwi: {
            hw: 'cau*tion',
            prs: [{ mw: 'ˈkȯ-shən', sound: { audio: 'cautio01', ref: 'c' } }],
          },
          uros: [
            {
              ure: 'cau*tion*ary',
              prs: [{ mw: 'ˈkȯ-shə-ˌner-ē', sound: { audio: 'cautio02', ref: 'c' } }],
            },
          ],
        },
      ];

      const resultCautionary = extractMerriamWebsterAudioFromApiResponse(
        mockCautionaryData,
        'cautionary'
      );
      expect(resultCautionary?.audioFilename).toBe('cautio02');
      expect(resultCautionary?.phonetic).toBe('\\ˈkȯ-shə-ˌner-ē\\');

      const mockPercolationData = [
        {
          meta: { id: 'percolate' },
          hwi: {
            hw: 'per*co*late',
            prs: [{ mw: 'ˈpər-kə-ˌlāt', sound: { audio: 'percol02', ref: 'c' } }],
          },
          uros: [
            {
              ure: 'per*co*la*tion',
              prs: [{ mw: 'ˌpər-kə-ˈlā-shən', sound: { audio: 'percol03', ref: 'c' } }],
            },
          ],
        },
      ];

      const resultPercolation = extractMerriamWebsterAudioFromApiResponse(
        mockPercolationData,
        'percolation'
      );
      expect(resultPercolation?.audioFilename).toBe('percol03');
      expect(resultPercolation?.phonetic).toBe('\\ˌpər-kə-ˈlā-shən\\');
    });

    it('does not return root headword audio when targetWord does not match headword and has no run-on audio', () => {
      const mockData = [
        {
          meta: { id: 'dragon' },
          hwi: {
            hw: 'drag*on',
            prs: [{ mw: 'ˈdra-gən', sound: { audio: 'dragon01', ref: 'c' } }],
          },
        },
      ];

      // "drag on" should NOT match "dragon"
      const result = extractMerriamWebsterAudioFromApiResponse(mockData, 'drag on');
      expect(result).toBeNull();
    });

    it('returns null if no audio is present', () => {
      const mockApiData = [{ meta: { id: 'test' } }];
      expect(extractMerriamWebsterAudioFromApiResponse(mockApiData)).toBeNull();
      expect(extractMerriamWebsterAudioFromApiResponse([])).toBeNull();
      expect(extractMerriamWebsterAudioFromApiResponse(null)).toBeNull();
    });
  });
});
