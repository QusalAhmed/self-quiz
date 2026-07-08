import type { WordDefinition, WordRecord } from './db';

export const PARTS_OF_SPEECH = [
  'noun',
  'pronoun',
  'verb',
  'adjective',
  'adverb',
  'preposition',
  'conjunction',
  'interjection',
  'determiner',
] as const;

export function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0)
    : [];
}

export function createEmptyDefinition(): WordDefinition {
  return { meaning: '', partOfSpeech: '', examples: [], userExamples: [] };
}

export function normalizeDefinitions(
  definitions: unknown,
  fallbackMeaning = ''
): WordDefinition[] {
  const normalized = Array.isArray(definitions)
    ? definitions
        .map((item) => {
          if (typeof item === 'string') {
            const meaning = item.trim();
            return meaning ? { meaning, partOfSpeech: '', examples: [], userExamples: [] } : null;
          }

          if (!item || typeof item !== 'object') {
            return null;
          }

          const value = item as {
            meaning?: unknown;
            definition?: unknown;
            partOfSpeech?: unknown;
            examples?: unknown;
            userExamples?: unknown;
          };
          const meaning =
            typeof value.meaning === 'string'
              ? value.meaning.trim()
              : typeof value.definition === 'string'
                ? value.definition.trim()
                : '';
          const partOfSpeech =
            typeof value.partOfSpeech === 'string' ? value.partOfSpeech.trim() : '';
          const examples = normalizeStringArray(value.examples);
          const userExamples = normalizeStringArray(value.userExamples);

          return meaning ? { meaning, partOfSpeech, examples, userExamples } : null;
        })
        .filter((item): item is WordDefinition => item !== null)
    : [];

  if (normalized.length > 0) {
    return normalized;
  }

  const meaning = fallbackMeaning.trim();
  return meaning ? [{ meaning, partOfSpeech: '', examples: [], userExamples: [] }] : [];
}

/**
 * If a word's flat legacy `examples`/`userExamples` fields haven't been folded into its
 * definitions yet (e.g. data pulled from a remote source before this migration), attach them
 * to the first definition so no data is lost.
 */
export function mergeLegacyFlatExamples(
  definitions: WordDefinition[],
  legacyExamples: unknown,
  legacyUserExamples: unknown
): WordDefinition[] {
  const examples = normalizeStringArray(legacyExamples);
  const userExamples = normalizeStringArray(legacyUserExamples);
  if (examples.length === 0 && userExamples.length === 0) {
    return definitions;
  }

  const hasOwnExamples = definitions.some(
    (definition) => definition.examples.length > 0 || definition.userExamples.length > 0
  );
  if (hasOwnExamples || definitions.length === 0) {
    return definitions;
  }

  return definitions.map((definition, index) =>
    index === 0 ? { ...definition, examples, userExamples } : definition
  );
}

export function getWordDefinitions(
  word: Pick<WordRecord, 'definitions' | 'meaning'>
): WordDefinition[] {
  return normalizeDefinitions(word.definitions, word.meaning);
}

export function definitionsToMeaning(definitions: WordDefinition[]): string {
  return definitions
    .map((definition) => definition.meaning.trim())
    .filter(Boolean)
    .join('\n');
}

export function formatDefinition(definition: WordDefinition): string {
  return definition.partOfSpeech
    ? `${definition.partOfSpeech}: ${definition.meaning}`
    : definition.meaning;
}
