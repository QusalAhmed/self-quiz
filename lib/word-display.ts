import type { WordRecord } from './db';

export type WordTextRecord = {
  wordId: string;
  word: string;
  meaning: string;
};

export function resolveWordTextFromMainTable<T extends WordTextRecord>(
  record: T,
  wordsById: ReadonlyMap<string, WordRecord>
): T | null {
  const currentWord = wordsById.get(record.wordId);
  if (!currentWord) {
    return null;
  }

  return {
    ...record,
    word: currentWord.word,
    meaning: currentWord.meaning,
  };
}
