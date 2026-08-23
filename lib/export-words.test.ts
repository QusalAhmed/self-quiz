import {
  downloadExportFile,
  formatExportContent,
  formatWordsAsCsv,
  formatWordsAsJson,
  formatWordsAsTxt,
  getExportFileExtension,
  getExportMimeType,
  normalizeExportableItems,
  type ExportableWordItem,
  type ExportFieldOptions,
} from './export-words';

const mockItems: ExportableWordItem[] = [
  {
    id: 'w1',
    word: 'resilient',
    meaning: 'able to withstand or recover quickly from difficult conditions',
    definitions: [
      {
        partOfSpeech: 'adjective',
        meaning: 'able to withstand or recover quickly from difficult conditions',
        examples: ['She has a resilient personality.'],
        userExamples: ['He was resilient after the crisis.'],
      },
    ],
    customGroups: ['GRE Top', 'Vocabulary'],
    usageFrequency: 'common',
    notes: 'Important word',
    generatorAiDetails: 'Origin: Latin resilire',
  },
  {
    id: 'w2',
    word: 'serendipity',
    meaning: 'the occurrence and development of events by chance in a happy way',
    definitions: [
      {
        partOfSpeech: 'noun',
        meaning: 'the occurrence and development of events by chance in a happy way',
        examples: ['A stroke of serendipity.'],
        userExamples: [],
      },
    ],
    customGroups: ['IELTS'],
  },
];

describe('export-words utility module', () => {
  it('normalizes mixed items into ExportableWordItem format and deduplicates', () => {
    const mixed = [
      { id: '1', word: 'resilient', meaning: 'strong' },
      { id: '2', word: 'resilient', meaning: 'strong' }, // duplicate
      { id: '3', word: 'ephemeral', meaning: 'short-lived' },
    ];
    const normalized = normalizeExportableItems(mixed as any);
    expect(normalized.length).toBe(2);
    expect(normalized[0].word).toBe('resilient');
    expect(normalized[1].word).toBe('ephemeral');
  });

  it('formats words as JSON correctly with default options', () => {
    const json = formatWordsAsJson(mockItems);
    const parsed = JSON.parse(json);
    expect(parsed.length).toBe(2);
    expect(parsed[0].word).toBe('resilient');
    expect(parsed[0].meaning).toBe(
      'able to withstand or recover quickly from difficult conditions'
    );
    expect(parsed[0].customGroups).toEqual(['GRE Top', 'Vocabulary']);
  });

  it('formats words as JSON respecting custom field exclusions', () => {
    const customOptions: ExportFieldOptions = {
      includeMeaning: true,
      includePartOfSpeech: false,
      includeExamples: false,
      includeGroups: false,
      includeNotes: false,
      includeFrequency: false,
      includeAiDetails: false,
    };
    const json = formatWordsAsJson(mockItems, customOptions);
    const parsed = JSON.parse(json);
    expect(parsed[0].word).toBe('resilient');
    expect(parsed[0].meaning).toBeDefined();
    expect(parsed[0].customGroups).toBeUndefined();
    expect(parsed[0].notes).toBeUndefined();
    expect(parsed[0].usageFrequency).toBeUndefined();
    expect(parsed[0].definitions[0].examples).toBeUndefined();
  });

  it('formats words as CSV correctly with headers and escaping', () => {
    const csv = formatWordsAsCsv(mockItems);
    expect(csv).toContain('Word,Part of Speech,Meaning,Examples,Groups,Usage Frequency,Notes');
    expect(csv).toContain('"resilient","adjective"');
    expect(csv).toContain('"She has a resilient personality.; He was resilient after the crisis."');
    expect(csv).toContain('"GRE Top, Vocabulary"');
  });

  it('formats words as CSV with only selected columns', () => {
    const customOptions: ExportFieldOptions = {
      includeMeaning: true,
      includePartOfSpeech: false,
      includeExamples: false,
      includeGroups: false,
      includeNotes: false,
      includeFrequency: false,
      includeAiDetails: true,
    };
    const csv = formatWordsAsCsv(mockItems, customOptions);
    expect(csv).toContain('Word,Meaning,AI Details');
    expect(csv).not.toContain('Part of Speech');
    expect(csv).not.toContain('Examples');
    expect(csv).toContain('"Origin: Latin resilire"');
  });

  it('formats words as Plain Text correctly', () => {
    const txt = formatWordsAsTxt(mockItems);
    expect(txt).toContain(
      'resilient - able to withstand or recover quickly from difficult conditions (adjective)'
    );
    expect(txt).toContain('• She has a resilient personality.');
    expect(txt).toContain(
      'serendipity - the occurrence and development of events by chance in a happy way (noun)'
    );
  });

  it('formats words as Plain Text with words only', () => {
    const customOptions: ExportFieldOptions = {
      includeMeaning: false,
      includePartOfSpeech: false,
      includeExamples: false,
      includeGroups: false,
      includeNotes: false,
      includeFrequency: false,
      includeAiDetails: false,
    };
    const txt = formatWordsAsTxt(mockItems, customOptions);
    expect(txt).toBe('resilient\n\nserendipity');
  });

  it('supports formatExportContent for all formats', () => {
    expect(formatExportContent(mockItems, 'json')).toContain('"resilient"');
    expect(formatExportContent(mockItems, 'csv')).toContain('"resilient"');
    expect(formatExportContent(mockItems, 'txt')).toContain('resilient -');
  });

  it('returns appropriate mime types and file extensions', () => {
    expect(getExportMimeType('json')).toBe('application/json;charset=utf-8');
    expect(getExportMimeType('csv')).toBe('text/csv;charset=utf-8');
    expect(getExportMimeType('txt')).toBe('text/plain;charset=utf-8');

    expect(getExportFileExtension('json')).toBe('.json');
    expect(getExportFileExtension('csv')).toBe('.csv');
    expect(getExportFileExtension('txt')).toBe('.txt');
  });

  it('triggers browser file download safely without crashing', () => {
    const originalCreateElement = document.createElement.bind(document);
    const clickSpy = jest.fn();
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:test');
    global.URL.revokeObjectURL = jest.fn();

    downloadExportFile('{"test": true}', 'test-quiz', 'json');
    expect(clickSpy).toHaveBeenCalled();
  });
});
