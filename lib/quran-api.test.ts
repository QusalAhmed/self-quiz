import {
  cleanQuranText,
  findChapterByName,
  getChapterMetadata,
  parseVerseBatchDetailed,
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

  describe('parseVerseBatchDetailed', () => {
    it('returns structured report for valid, invalid, and range tokens', () => {
      const input = '2:255, 94:1-3\n65:2-3\n112:10\ninvalid_token';
      const report = parseVerseBatchDetailed(input);

      expect(report.totalTokensCount).toBe(5);
      expect(report.validVerses.length).toBe(6); // 2:255 (1) + 94:1-3 (3) + 65:2-3 (2)
      expect(report.invalidTokens.length).toBe(2); // 112:10 (out of bounds) + invalid_token

      const validKeys = report.validVerses.map((v) => v.key);
      expect(validKeys).toEqual(['2:255', '94:1', '94:2', '94:3', '65:2', '65:3']);

      expect(report.invalidTokens[0].token).toBe('112:10');
      expect(report.invalidTokens[0].reason).toContain('Surah Al-Ikhlas only contains 4 Ayahs');
      expect(report.invalidTokens[1].token).toBe('invalid_token');
    });

    it('handles empty and whitespace input gracefully', () => {
      const report = parseVerseBatchDetailed('   \n  ,  ');
      expect(report.validVerses.length).toBe(0);
      expect(report.invalidTokens.length).toBe(0);
      expect(report.totalTokensCount).toBe(0);
    });
  });
});
