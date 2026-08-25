import {
  cleanQuranText,
  findChapterByName,
  getChapterMetadata,
  parseVerseInput,
  QURAN_CHAPTERS,
} from './quran-api';

describe('Quran API & Metadata Utilities', () => {
  describe('Chapter Metadata', () => {
    it('contains all 114 Surahs', () => {
      expect(QURAN_CHAPTERS.length).toBe(114);
      expect(QURAN_CHAPTERS[0].id).toBe(1);
      expect(QURAN_CHAPTERS[0].nameSimple).toBe('Al-Fatihah');
      expect(QURAN_CHAPTERS[113].id).toBe(114);
      expect(QURAN_CHAPTERS[113].nameSimple).toBe('An-Nas');
    });

    it('retrieves chapter metadata by number', () => {
      const baqarah = getChapterMetadata(2);
      expect(baqarah).toBeDefined();
      expect(baqarah?.nameSimple).toBe('Al-Baqarah');
      expect(baqarah?.versesCount).toBe(286);
      expect(baqarah?.revelationPlace).toBe('madinah');

      const ikhlas = getChapterMetadata(112);
      expect(ikhlas?.nameSimple).toBe('Al-Ikhlas');
      expect(ikhlas?.versesCount).toBe(4);
    });

    it('finds chapter by name or transliteration', () => {
      const baqarah = findChapterByName('Baqarah');
      expect(baqarah?.id).toBe(2);

      const fatihah = findChapterByName('The Opener');
      expect(fatihah?.id).toBe(1);

      const mulk = findChapterByName('Al-Mulk');
      expect(mulk?.id).toBe(67);
    });
  });

  describe('cleanQuranText', () => {
    it('strips footnote tags and raw HTML correctly', () => {
      const raw =
        '<p>Allāh - there is no deity except Him<sup foot_note=196031>1</sup>, the Ever-Living.<sup foot_note=196030>2</sup></p>';
      const cleaned = cleanQuranText(raw);
      expect(cleaned).toBe('Allāh - there is no deity except Him, the Ever-Living.');
    });

    it('handles empty or undefined strings', () => {
      expect(cleanQuranText('')).toBe('');
      expect(cleanQuranText(undefined as any)).toBe('');
    });
  });

  describe('parseVerseInput', () => {
    it('parses single chapter:verse input', () => {
      const result = parseVerseInput('2:255');
      expect(result).toEqual([{ chapter: 2, verse: 255, key: '2:255' }]);
    });

    it('parses range notation like 94:1-4', () => {
      const result = parseVerseInput('94:1-4');
      expect(result.length).toBe(4);
      expect(result.map((r) => r.key)).toEqual(['94:1', '94:2', '94:3', '94:4']);
    });

    it('parses multiple comma-separated verse keys', () => {
      const result = parseVerseInput('2:255, 3:139, 94:5');
      expect(result.length).toBe(3);
      expect(result.map((r) => r.key)).toEqual(['2:255', '3:139', '94:5']);
    });

    it('parses textual inputs like "Surah Baqarah 255"', () => {
      const result = parseVerseInput('Surah Baqarah 255');
      expect(result).toEqual([{ chapter: 2, verse: 255, key: '2:255' }]);
    });

    it('ignores invalid verse boundaries', () => {
      // Surah 112 (Al-Ikhlas) has only 4 verses
      const result = parseVerseInput('112:10');
      expect(result.length).toBe(0);
    });
  });
});
