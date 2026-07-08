import type { WordDefinition, WordRecord } from './db';
import { getWordDefinitions } from './definitions';

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
