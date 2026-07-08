import type { WordDefinition, WordRecord } from './db';
import { definitionsToMeaning, getWordDefinitions } from './definitions';

export type WordTextRecord = {
  wordId: string;
  word: string;
  meaning: string;
  definitions?: WordDefinition[];
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
    meaning: definitionsToMeaning(getWordDefinitions(currentWord)),
    definitions: getWordDefinitions(currentWord),
  };
}
