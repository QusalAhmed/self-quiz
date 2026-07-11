import type { WordDefinition, WordRecord } from './db';
import { getWordDefinitions } from './definitions';

export const DEFAULT_AI_EXAMPLE_COUNT = 5;
export const MIN_AI_EXAMPLE_COUNT = 1;
export const MAX_AI_EXAMPLE_COUNT = 10;

export function normalizeAiExampleCount(value: unknown): number {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : NaN;

  if (!Number.isFinite(numeric)) {
    return DEFAULT_AI_EXAMPLE_COUNT;
  }

  return Math.min(MAX_AI_EXAMPLE_COUNT, Math.max(MIN_AI_EXAMPLE_COUNT, Math.floor(numeric)));
}

export function normalizeAiExamples(value: unknown, targetCount = DEFAULT_AI_EXAMPLE_COUNT): string[] {
  const normalizedTarget = normalizeAiExampleCount(targetCount);
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  ).slice(0, normalizedTarget);
}

export function mergeAiExamples(
  existingExamples: unknown,
  nextExamples: unknown,
  targetCount = DEFAULT_AI_EXAMPLE_COUNT
): string[] {
  return normalizeAiExamples(
    [...normalizeAiExamples(existingExamples, targetCount), ...normalizeAiExamples(nextExamples, targetCount)],
    targetCount
  );
}

/** All display-ready examples for a single definition (user-authored first, then AI-generated). */
export function getDefinitionExamples(
  definition: Pick<WordDefinition, 'examples' | 'userExamples'>
): string[] {
  const user = Array.isArray(definition.userExamples) ? definition.userExamples : [];
  const generated = Array.isArray(definition.examples) ? definition.examples : [];
  return [...user, ...generated];
}

/** Flattened list of every example across all of a word's definitions. */
export function getDisplayExamples(
  record: Pick<WordRecord, 'definitions' | 'meaning'>
): string[] {
  return getWordDefinitions(record).flatMap((definition) => getDefinitionExamples(definition));
}

export function parseExampleLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}
