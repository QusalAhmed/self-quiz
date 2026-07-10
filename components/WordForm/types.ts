import type { WordDefinition } from '@/lib/db';

export type WordFormEditValues = {
  word: string;
  meaning: string;
  definitions?: WordDefinition[];
  groups: string[];
};

/** Form-local shape for a definition being edited. `examples` (AI-generated) are carried
 * through untouched; only `userExamples` are editable here. */
export type DefinitionFormValue = {
  meaning: string;
  partOfSpeech: string;
  examples: string[];
  userExamples: string[];
};
