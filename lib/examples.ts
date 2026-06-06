import type { WordRecord } from './db';

export function getDisplayExamples(
  record: Pick<WordRecord, 'examples' | 'userExamples'>
): string[] {
  const user = Array.isArray(record.userExamples) ? record.userExamples : [];
  const generated = Array.isArray(record.examples) ? record.examples : [];
  return [...user, ...generated];
}

export function parseExampleLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}
