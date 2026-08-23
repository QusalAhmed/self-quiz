import type { FsrsRecord, MissedWordRecord, WordDefinition, WordRecord } from './db';
import { definitionsToMeaning, normalizeDefinitions } from './definitions';

export type ExportFormat = 'json' | 'csv' | 'txt';

export type ExportFieldOptions = {
  includeMeaning: boolean;
  includePartOfSpeech: boolean;
  includeExamples: boolean;
  includeGroups: boolean;
  includeNotes: boolean;
  includeFrequency: boolean;
  includeAiDetails: boolean;
};

export const DEFAULT_EXPORT_FIELD_OPTIONS: ExportFieldOptions = {
  includeMeaning: true,
  includePartOfSpeech: true,
  includeExamples: true,
  includeGroups: true,
  includeNotes: true,
  includeFrequency: true,
  includeAiDetails: false,
};

export type ExportableWordItem = {
  id?: string;
  word: string;
  meaning: string;
  definitions?: WordDefinition[];
  customGroups?: string[];
  notes?: string;
  usageFrequency?: string;
  generatorAiDetails?: string;
};

/**
 * Normalizes an array of arbitrary quiz or review items (WordRecord, MissedWordRecord, FsrsRecord, or QuizItem)
 * into clean ExportableWordItem structures with fallback dictionary definitions.
 */
export function normalizeExportableItems(
  items: Array<
    | WordRecord
    | MissedWordRecord
    | FsrsRecord
    | {
        id?: string;
        word: string;
        meaning?: string;
        definitions?: WordDefinition[];
        tags?: string[];
        customGroups?: string[];
        notes?: string;
        usageFrequency?: string;
        generatorAiDetails?: string;
      }
  >,
  wordsMap?: Map<string, WordRecord>
): ExportableWordItem[] {
  const result: ExportableWordItem[] = [];
  const seenWords = new Set<string>();

  for (const item of items) {
    if (!item || !item.word) {
      continue;
    }

    const wordText = item.word.trim();
    if (!wordText || seenWords.has(wordText.toLowerCase())) {
      continue;
    }
    seenWords.add(wordText.toLowerCase());

    const wordId = (item as MissedWordRecord).wordId || (item as FsrsRecord).wordId || item.id;
    const parentWord = wordId && wordsMap ? wordsMap.get(wordId) : undefined;

    const rawDefinitions =
      (item as { definitions?: WordDefinition[] }).definitions || parentWord?.definitions || [];
    const rawMeaning = (item as { meaning?: string }).meaning || parentWord?.meaning || '';

    const normalizedDefs = normalizeDefinitions(rawDefinitions, rawMeaning);
    const resolvedMeaning = definitionsToMeaning(normalizedDefs) || rawMeaning;

    const customGroups =
      (item as { customGroups?: string[] }).customGroups ||
      (item as { tags?: string[] }).tags ||
      parentWord?.customGroups ||
      [];

    const notes = (item as { notes?: string }).notes || parentWord?.notes || '';

    const usageFrequency =
      (item as { usageFrequency?: string }).usageFrequency || parentWord?.usageFrequency || '';

    const generatorAiDetails =
      (item as { generatorAiDetails?: string }).generatorAiDetails ||
      parentWord?.generatorAiDetails ||
      '';

    result.push({
      id: wordId || undefined,
      word: wordText,
      meaning: resolvedMeaning,
      definitions: normalizedDefs,
      customGroups,
      notes: notes || undefined,
      usageFrequency: usageFrequency || undefined,
      generatorAiDetails: generatorAiDetails || undefined,
    });
  }

  return result;
}

/**
 * Formats exportable words into a formatted JSON string respecting selected fields.
 */
export function formatWordsAsJson(
  items: ExportableWordItem[],
  options: ExportFieldOptions = DEFAULT_EXPORT_FIELD_OPTIONS
): string {
  const processed = items.map((item) => {
    const obj: Record<string, unknown> = {
      word: item.word,
    };

    if (options.includeMeaning) {
      obj.meaning = item.meaning;
    }

    if (options.includeMeaning || options.includePartOfSpeech || options.includeExamples) {
      if (item.definitions && item.definitions.length > 0) {
        obj.definitions = item.definitions.map((def) => {
          const defObj: Record<string, unknown> = {};
          if (options.includePartOfSpeech) {
            defObj.partOfSpeech = def.partOfSpeech;
          }
          if (options.includeMeaning) {
            defObj.meaning = def.meaning;
          }
          if (options.includeExamples) {
            defObj.examples = def.examples || [];
            if (def.userExamples && def.userExamples.length > 0) {
              defObj.userExamples = def.userExamples;
            }
          }
          return defObj;
        });
      }
    }

    if (options.includeGroups && item.customGroups && item.customGroups.length > 0) {
      obj.customGroups = item.customGroups;
    }

    if (options.includeNotes && item.notes) {
      obj.notes = item.notes;
    }

    if (options.includeFrequency && item.usageFrequency) {
      obj.usageFrequency = item.usageFrequency;
    }

    if (options.includeAiDetails && item.generatorAiDetails) {
      obj.generatorAiDetails = item.generatorAiDetails;
    }

    return obj;
  });

  return JSON.stringify(processed, null, 2);
}

/**
 * Helper to escape CSV cell contents according to RFC 4180.
 */
function escapeCsvCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return '""';
  }
  const str = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Formats exportable words into standard CSV format with dynamic columns based on user options.
 */
export function formatWordsAsCsv(
  items: ExportableWordItem[],
  options: ExportFieldOptions = DEFAULT_EXPORT_FIELD_OPTIONS
): string {
  const headers: string[] = ['Word'];
  if (options.includePartOfSpeech) {
    headers.push('Part of Speech');
  }
  if (options.includeMeaning) {
    headers.push('Meaning');
  }
  if (options.includeExamples) {
    headers.push('Examples');
  }
  if (options.includeGroups) {
    headers.push('Groups');
  }
  if (options.includeFrequency) {
    headers.push('Usage Frequency');
  }
  if (options.includeNotes) {
    headers.push('Notes');
  }
  if (options.includeAiDetails) {
    headers.push('AI Details');
  }

  const rows = items.map((item) => {
    const row: string[] = [escapeCsvCell(item.word)];

    if (options.includePartOfSpeech) {
      const partsOfSpeech = Array.from(
        new Set((item.definitions || []).map((d) => d.partOfSpeech).filter(Boolean))
      ).join(', ');
      row.push(escapeCsvCell(partsOfSpeech));
    }

    if (options.includeMeaning) {
      row.push(escapeCsvCell(item.meaning));
    }

    if (options.includeExamples) {
      const allExamples = (item.definitions || []).flatMap((d) => [
        ...(d.examples || []),
        ...(d.userExamples || []),
      ]);
      row.push(escapeCsvCell(allExamples.join('; ')));
    }

    if (options.includeGroups) {
      row.push(escapeCsvCell((item.customGroups || []).join(', ')));
    }

    if (options.includeFrequency) {
      row.push(escapeCsvCell(item.usageFrequency));
    }

    if (options.includeNotes) {
      row.push(escapeCsvCell(item.notes));
    }

    if (options.includeAiDetails) {
      row.push(escapeCsvCell(item.generatorAiDetails));
    }

    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Formats exportable words into plain text list format respecting selected fields.
 */
export function formatWordsAsTxt(
  items: ExportableWordItem[],
  options: ExportFieldOptions = DEFAULT_EXPORT_FIELD_OPTIONS
): string {
  return items
    .map((item) => {
      const partsOfSpeech = options.includePartOfSpeech
        ? Array.from(
            new Set((item.definitions || []).map((d) => d.partOfSpeech).filter(Boolean))
          ).join(', ')
        : '';

      const posSuffix = partsOfSpeech ? ` (${partsOfSpeech})` : '';
      let headerLine = item.word;
      if (options.includeMeaning && item.meaning) {
        headerLine += ` - ${item.meaning}${posSuffix}`;
      } else if (posSuffix) {
        headerLine += `${posSuffix}`;
      }

      const lines = [headerLine];

      if (options.includeExamples) {
        const allExamples = (item.definitions || []).flatMap((d) => [
          ...(d.examples || []),
          ...(d.userExamples || []),
        ]);
        if (allExamples.length > 0) {
          lines.push(...allExamples.slice(0, 3).map((ex) => `  • ${ex}`));
        }
      }

      if (options.includeGroups && item.customGroups && item.customGroups.length > 0) {
        lines.push(`  [Groups: ${item.customGroups.join(', ')}]`);
      }

      if (options.includeFrequency && item.usageFrequency) {
        lines.push(`  [Frequency: ${item.usageFrequency}]`);
      }

      if (options.includeNotes && item.notes) {
        lines.push(`  [Notes: ${item.notes}]`);
      }

      return lines.join('\n');
    })
    .join('\n\n');
}

/**
 * Generates formatted text according to selected export format and field options.
 */
export function formatExportContent(
  items: ExportableWordItem[],
  format: ExportFormat,
  options: ExportFieldOptions = DEFAULT_EXPORT_FIELD_OPTIONS
): string {
  switch (format) {
    case 'json':
      return formatWordsAsJson(items, options);
    case 'csv':
      return formatWordsAsCsv(items, options);
    case 'txt':
      return formatWordsAsTxt(items, options);
    default:
      return formatWordsAsJson(items, options);
  }
}

/**
 * Returns the MIME type corresponding to the export format.
 */
export function getExportMimeType(format: ExportFormat): string {
  switch (format) {
    case 'json':
      return 'application/json;charset=utf-8';
    case 'csv':
      return 'text/csv;charset=utf-8';
    case 'txt':
      return 'text/plain;charset=utf-8';
    default:
      return 'application/json;charset=utf-8';
  }
}

/**
 * Returns file extension for format.
 */
export function getExportFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'json':
      return '.json';
    case 'csv':
      return '.csv';
    case 'txt':
      return '.txt';
    default:
      return '.json';
  }
}

/**
 * Triggers a browser file download of the exported string.
 */
export function downloadExportFile(
  content: string,
  baseFilename: string,
  format: ExportFormat
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const mimeType = getExportMimeType(format);
  const ext = getExportFileExtension(format);
  const filename = `${baseFilename}${ext}`;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
