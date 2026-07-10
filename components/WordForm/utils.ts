import type { WordDefinition } from '@/lib/db';
import type { DefinitionFormValue } from './types';

function normalizeExamples(values: string[]): string[] {
  const trimmed = values.map((value) => value.trim()).filter(Boolean);
  return trimmed.length > 0 ? trimmed : [''];
}

export function createEmptyDefinitionFormValue(): DefinitionFormValue {
  return { meaning: '', partOfSpeech: '', examples: [], userExamples: [''] };
}

export function definitionsToFormValues(definitions: WordDefinition[]): DefinitionFormValue[] {
  if (definitions.length === 0) {
    return [createEmptyDefinitionFormValue()];
  }
  return definitions.map((definition) => ({
    meaning: definition.meaning,
    partOfSpeech: definition.partOfSpeech,
    examples: Array.isArray(definition.examples) ? definition.examples : [],
    userExamples: normalizeExamples(
      Array.isArray(definition.userExamples) ? definition.userExamples : []
    ),
  }));
}
