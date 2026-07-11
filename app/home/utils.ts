import type { WordDefinition, WordRecord } from '@/lib/db';
import { definitionsToMeaning, normalizeDefinitions } from '@/lib/definitions';
import { getWordGroups } from '@/lib/groups';
import {
  DEFAULT_AI_EXAMPLE_COUNT,
  mergeAiExamples,
  normalizeAiExampleCount,
  normalizeAiExamples,
} from '@/lib/examples';
import type { QuizRangeKey } from './constants';

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getRangeStart(range: QuizRangeKey, customStart?: string | null): Date | null {
  if (range === 'custom') {
    return customStart ? new Date(customStart) : null;
  }
  const now = new Date();
  if (range === 'all') {
    return null;
  }
  if (range === 'year') {
    return new Date(now.getFullYear(), 0, 1);
  }
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (range === 'yesterday') {
    const start = new Date(now);
    start.setDate(now.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  const days = range === 'week' ? 7 : 30;
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getRangeEnd(range: QuizRangeKey, customEnd?: string | null): Date | null {
  if (range === 'custom') {
    return customEnd ? new Date(customEnd) : null;
  }
  const now = new Date();
  if (range === 'all') {
    return null;
  }
  if (range === 'today') {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end.setHours(23, 59, 59, 999);
    return end;
  }
  if (range === 'yesterday') {
    const end = new Date(now);
    end.setDate(now.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  return now;
}

export function formatDateTimeLocal(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function getInitialCustomStart(): string {
  const date = new Date();
  date.setDate(date.getDate() - 2);
  date.setHours(0, 0, 0, 0);
  return formatDateTimeLocal(date);
}

export function getInitialCustomEnd(): string {
  return formatDateTimeLocal(new Date());
}

export function toMutableWordRecord(record: any): WordRecord {
  const definitions = normalizeDefinitions(record.definitions, record.meaning ?? '');
  return {
    ...record,
    meaning: definitionsToMeaning(definitions),
    definitions,
    customGroups: getWordGroups(record),
    aiExampleCount: normalizeAiExampleCount(record.aiExampleCount ?? record.ai_example_count),
  } as WordRecord;
}

export function capitalizeWord(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

export async function requestExamples(
  word: string,
  meaning: string,
  targetCount = DEFAULT_AI_EXAMPLE_COUNT,
  referenceExamples: string[] = [],
  partOfSpeech = ''
): Promise<string[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return [];
  }

  const response = await fetch('/api/examples', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word,
      meaning,
      count: normalizeAiExampleCount(targetCount),
      referenceExamples,
      partOfSpeech,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn('Examples API error:', response.status, errorText);
    return [];
  }

  const data = await response.json();
  return normalizeAiExamples(data?.examples, targetCount);
}

export async function requestExamplesForDefinitions(
  word: string,
  definitions: WordDefinition[],
  targetCount = DEFAULT_AI_EXAMPLE_COUNT
): Promise<string[][]> {
  return Promise.all(
    definitions.map((definition) =>
      requestExamples(
        word,
        definition.meaning,
        targetCount,
        definition.userExamples ?? [],
        definition.partOfSpeech ?? ''
      )
    )
  );
}

export function mergeExamplesIntoDefinitions(
  definitions: WordDefinition[],
  examplesPerDefinition: string[][],
  targetCount = DEFAULT_AI_EXAMPLE_COUNT
): WordDefinition[] {
  return definitions.map((definition, index) => {
    const nextExamples = examplesPerDefinition[index];
    return {
      ...definition,
      examples:
        Array.isArray(nextExamples) && nextExamples.length > 0
          ? normalizeAiExamples(nextExamples, targetCount)
          : normalizeAiExamples(definition.examples ?? [], targetCount),
    };
  });
}

export function getMissingAiExampleDefinitionIndexes(
  definitions: WordDefinition[],
  targetCount = DEFAULT_AI_EXAMPLE_COUNT
): number[] {
  const normalizedTarget = normalizeAiExampleCount(targetCount);

  return definitions
    .map((definition, index) => ({ definition, index }))
    .filter(
      ({ definition }) =>
        definition.meaning.trim().length > 0 &&
        mergeAiExamples([], definition.examples ?? [], normalizedTarget).length < normalizedTarget
    )
    .map(({ index }) => index);
}
