export type WordFamilyMember = {
  word: string;
  partOfSpeech: string;
  banglaDefinition: string;
  englishDefinition: string;
  examples: string[];
};

export function buildWordFamilyId(wordId: string, memberWord: string): string {
  return `${wordId}:${memberWord.trim().toLowerCase()}`;
}

export function normalizeWordFamilyMembers(raw: unknown, excludeWord?: string): WordFamilyMember[] {
  if (!raw) {
    return [];
  }

  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.members)) {
      items = obj.members;
    } else if (Array.isArray(obj.words)) {
      items = obj.words;
    } else if (Array.isArray(obj.family)) {
      items = obj.family;
    } else if (Array.isArray(obj.wordFamily)) {
      items = obj.wordFamily;
    }
  }

  const normalizedExclude = excludeWord ? excludeWord.trim().toLowerCase() : '';
  const result: WordFamilyMember[] = [];
  const seenWords = new Set<string>();

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const val = item as Record<string, unknown>;
    const word = typeof val.word === 'string' ? val.word.trim() : '';
    if (!word) {
      continue;
    }

    const lower = word.toLowerCase();
    if (normalizedExclude && lower === normalizedExclude) {
      continue;
    }
    if (seenWords.has(lower)) {
      continue;
    }
    seenWords.add(lower);

    const partOfSpeech =
      typeof val.partOfSpeech === 'string'
        ? val.partOfSpeech.trim()
        : typeof val.pos === 'string'
          ? val.pos.trim()
          : '';

    const banglaDefinition =
      typeof val.banglaDefinition === 'string'
        ? val.banglaDefinition.trim()
        : typeof val.banglaMeaning === 'string'
          ? val.banglaMeaning.trim()
          : typeof val.bangla === 'string'
            ? val.bangla.trim()
            : typeof val.meaningBengali === 'string'
              ? val.meaningBengali.trim()
              : '';

    const englishDefinition =
      typeof val.englishDefinition === 'string'
        ? val.englishDefinition.trim()
        : typeof val.englishMeaning === 'string'
          ? val.englishMeaning.trim()
          : typeof val.definition === 'string'
            ? val.definition.trim()
            : typeof val.meaning === 'string'
              ? val.meaning.trim()
              : '';

    let examples: string[] = [];
    if (Array.isArray(val.examples)) {
      examples = val.examples
        .map((e) => (typeof e === 'string' ? e.trim() : ''))
        .filter((e) => e.length > 0);
    } else if (typeof val.example === 'string' && val.example.trim()) {
      examples = [val.example.trim()];
    } else if (typeof val.examples === 'string' && val.examples.trim()) {
      examples = [val.examples.trim()];
    }

    result.push({
      word,
      partOfSpeech,
      banglaDefinition,
      englishDefinition,
      examples,
    });
  }

  return result;
}
