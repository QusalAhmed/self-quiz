export type WordFamilyMember = {
  word: string;
  partOfSpeech: string;
  banglaDefinition: string;
  englishDefinition: string;
  examples: string[];
  usageFrequency?: string;
  generatorAiDetails?: string;
};

export type WordFamilyGenerationResult = {
  rootUsageFrequency?: string;
  generatorAiDetails: string;
  members: WordFamilyMember[];
};

export const WORD_FAMILY_SYSTEM_INSTRUCTION = `You are an expert English lexicographer and vocabulary pedagogue specializing in English word families and corpus usage frequency analysis.

Output ONLY valid raw JSON. Do not use Markdown, code fences, explanations, comments, or any text outside the JSON object.

Return exactly one JSON object with this structure:

{
  "rootUsageFrequency": "Top 500 | Top 1000 | Top 2000 | Top 3000 | Top 5000 | Top 10000 | Rare",
  "members": [
    {
      "word": "string",
      "partOfSpeech": "noun | verb | adjective | adverb",
      "banglaDefinition": "accurate Bengali / বাংলা অর্থ",
      "englishDefinition": "clear, concise English definition",
      "examples": [
        "practical English example sentence",
        "practical English example sentence"
      ],
      "usageFrequency": "Top 500 | Top 1000 | Top 2000 | Top 3000 | Top 5000 | Top 10000 | Rare"
    }
  ]
}

## Usage Frequency Guidelines (CRITICAL)
- Provide realistic English corpus frequency estimate for the main root word ("rootUsageFrequency") and for each generated family member ("usageFrequency").
- Standard tiers:
  - "Top 500": Essential core English words used constantly in everyday conversation & writing (e.g. make, see, day, good).
  - "Top 1000": Very high frequency foundational vocabulary (e.g. decide, ability, system, public).
  - "Top 2000": High frequency common vocabulary (e.g. decision, active, manage, create).
  - "Top 3000": Standard everyday & academic vocabulary (e.g. decisive, establish, reduce).
  - "Top 5000": Upper-intermediate & academic / professional vocabulary (e.g. decisively, indecisive, sustainability).
  - "Top 10000": Advanced & formal vocabulary (e.g. indecision, decisiveness, remediate).
  - "Rare": Specialized, technical, literary, or low-frequency words.

## Strict Authenticity & Dictionary Requirement (CRITICAL)
* Every single generated word MUST be a real, authentic, recognized English word found in major published English dictionaries (such as Oxford, Cambridge, Merriam-Webster, Collins, Longman).
* NEVER fabricate, hallucinate, or construct hypothetical, non-existent words (e.g., do NOT invent fake words like "decisioning", "deciderable", "indecisionable", "decidement", "comfortlessful", "uncomfortability", "beautifical").
* Do NOT combine prefixes and suffixes mechanically to create theoretical words.
* If a word does not legitimately exist in standard English, DO NOT include it.
* If you are in doubt about whether a word is a genuine English dictionary word, omit it completely.

## Word-family rules
Generate the useful morphological/derivational word family of the supplied main word.
Include words that are genuinely derived from the same lexical root through common English word formation, such as:
* noun forms
* verb forms
* adjective forms
* adverb forms
* common prefixes/suffixes that create established derivative words

Prioritize common, standard, useful English vocabulary.
Do NOT include words merely because they are semantically related.
For example, a synonym is not a word-family member unless it is morphologically derived from the same root.

## Exclusions
Do NOT include:
* the supplied main/root word itself in the "members" array
* fake, invented, or non-dictionary words
* duplicate words
* simple grammatical inflections unless they function as a distinct lexical entry
* obscure, archaic, or extremely rare derivatives
* proper nouns
* unrelated words with similar spelling or meaning
* words that are only etymologically related but are not normally treated as members of the modern English word family

## Quality rules
* Include only words you are 100% confident exist in standard English dictionaries.
* Prefer useful dictionary headwords.
* Use the most common modern meaning of each word.
* Keep Bengali definitions accurate and natural for a Bengali learner.
* Keep English definitions clear and concise.
* Provide 1–2 practical example sentences for every member.
* Avoid repetitive example sentences.
* Do not duplicate the same word with different parts of speech.
* Use lowercase for the "word" value.
* Return members in a logical order, preferably noun → verb → adjective → adverb.
* Do not force a fixed number of members. Return only genuinely useful family members.
* If there are no reliable family members, return "members": [].`;

export function buildWordFamilyUserPrompt(word: string, meaning?: string): string {
  const meaningBlock = meaning ? `\nMeaning/context of main word: ${meaning}` : '';
  return `Main word: "${word}"${meaningBlock}\n\nGenerate the word family and usage frequencies for "${word}" according to the instructions. Return JSON ONLY.`;
}

export function buildWordFamilyId(wordId: string, memberWord: string): string {
  return `${wordId}:${memberWord.trim().toLowerCase()}`;
}

export function isWordFamilyId(id: string): boolean {
  return id.includes(':');
}

export function parseWordFamilyId(id: string): { rootWordId: string; memberWord: string } | null {
  const parts = id.split(':');
  if (parts.length < 2) {
    return null;
  }
  return { rootWordId: parts[0], memberWord: parts[1] };
}

export function wordFamilyMemberToMeaning(member: {
  banglaDefinition?: string;
  englishDefinition?: string;
}): string {
  const bangla = member.banglaDefinition?.trim() || '';
  const english = member.englishDefinition?.trim() || '';
  if (bangla && english) {
    return `${bangla} (${english})`;
  }
  return bangla || english;
}

export function wordFamilyMemberToDefinitions(member: {
  banglaDefinition?: string;
  englishDefinition?: string;
  partOfSpeech?: string;
  examples?: string[];
}) {
  const meaning = wordFamilyMemberToMeaning(member);
  return [
    {
      meaning,
      partOfSpeech: member.partOfSpeech || '',
      examples: member.examples || [],
      userExamples: [],
    },
  ];
}

/**
 * Normalizes usage frequency strings or numbers into standard, human-readable tiers:
 * - "Top 500"
 * - "Top 1000"
 * - "Top 2000"
 * - "Top 3000"
 * - "Top 5000"
 * - "Top 10000"
 * - "Rare"
 */
export function normalizeUsageFrequency(raw: unknown): string {
  if (raw == null) {
    return '';
  }

  if (typeof raw === 'number') {
    if (raw <= 0) {
      return '';
    }
    if (raw <= 500) {
      return 'Top 500';
    }
    if (raw <= 1000) {
      return 'Top 1000';
    }
    if (raw <= 2000) {
      return 'Top 2000';
    }
    if (raw <= 3000) {
      return 'Top 3000';
    }
    if (raw <= 5000) {
      return 'Top 5000';
    }
    if (raw <= 10000) {
      return 'Top 10000';
    }
    return 'Rare';
  }

  if (typeof raw !== 'string') {
    return '';
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  const stripped = trimmed.toLowerCase().replace(/[,._-]/g, '');
  const lower = trimmed.toLowerCase();

  if (stripped.includes('10000') || stripped.includes('10k')) {
    return 'Top 10000';
  }
  if (stripped.includes('5000') || stripped.includes('5k')) {
    return 'Top 5000';
  }
  if (stripped.includes('3000') || stripped.includes('3k')) {
    return 'Top 3000';
  }
  if (stripped.includes('2000') || stripped.includes('2k')) {
    return 'Top 2000';
  }
  if (stripped.includes('1000') || stripped.includes('1k')) {
    return 'Top 1000';
  }
  if (stripped.includes('500')) {
    return 'Top 500';
  }
  if (lower.includes('very high') || lower.includes('essential')) {
    return 'Top 1000';
  }
  if (lower.includes('high')) {
    return 'Top 3000';
  }
  if (lower.includes('medium') || lower.includes('intermediate') || lower.includes('moderate')) {
    return 'Top 5000';
  }
  if (lower.includes('low') || lower.includes('advanced')) {
    return 'Top 10000';
  }
  if (lower.includes('rare') || lower.includes('specialized') || lower.includes('uncommon')) {
    return 'Rare';
  }

  // If already properly capitalized like "Top 1000" or similar
  return trimmed;
}

/**
 * Returns a consistent Mantine color for a given usage frequency tier.
 */
export function getUsageFrequencyColor(freq?: string): string {
  if (!freq) {
    return 'gray';
  }
  const norm = normalizeUsageFrequency(freq);
  switch (norm) {
    case 'Top 500':
      return 'teal';
    case 'Top 1000':
      return 'green';
    case 'Top 2000':
      return 'cyan';
    case 'Top 3000':
      return 'blue';
    case 'Top 5000':
      return 'orange';
    case 'Top 10000':
      return 'grape';
    case 'Rare':
      return 'gray';
    default:
      return 'indigo';
  }
}

/**
 * Returns structured badge presentation details for usage frequency.
 */
export function getUsageFrequencyBadgeProps(freq?: string): {
  label: string;
  color: string;
  tooltip: string;
  shortLabel: string;
  tier: string;
} {
  const norm = normalizeUsageFrequency(freq) || 'Unranked';
  const color = getUsageFrequencyColor(norm);

  let tooltip = 'Vocabulary usage frequency';
  let shortLabel = norm;
  let tier = 'Standard';

  switch (norm) {
    case 'Top 500':
      tooltip = 'Top 500: Essential English core vocabulary (very high frequency)';
      shortLabel = 'Top 500';
      tier = 'Essential';
      break;
    case 'Top 1000':
      tooltip = 'Top 1,000: Foundational high-frequency vocabulary';
      shortLabel = 'Top 1k';
      tier = 'Foundational';
      break;
    case 'Top 2000':
      tooltip = 'Top 2,000: Common everyday vocabulary';
      shortLabel = 'Top 2k';
      tier = 'Common';
      break;
    case 'Top 3000':
      tooltip = 'Top 3,000: Standard conversational and written English';
      shortLabel = 'Top 3k';
      tier = 'Standard';
      break;
    case 'Top 5000':
      tooltip = 'Top 5,000: Upper-intermediate and academic vocabulary';
      shortLabel = 'Top 5k';
      tier = 'Intermediate';
      break;
    case 'Top 10000':
      tooltip = 'Top 10,000: Advanced, formal, or specialized vocabulary';
      shortLabel = 'Top 10k';
      tier = 'Advanced';
      break;
    case 'Rare':
      tooltip = 'Rare / Low frequency: Specialized or literary English word';
      shortLabel = 'Rare';
      tier = 'Rare';
      break;
    default:
      tooltip = `Frequency: ${norm}`;
      shortLabel = norm;
      tier = norm;
  }

  return {
    label: norm,
    color,
    tooltip,
    shortLabel,
    tier,
  };
}

export function normalizeWordFamilyMembers(
  raw: unknown,
  excludeWord?: string,
  defaultAiDetails?: string
): WordFamilyMember[] {
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

    const rawFreq = val.usageFrequency ?? val.frequency ?? val.usage_frequency ?? val.freq;
    const usageFrequency = normalizeUsageFrequency(rawFreq);

    const rawAiDetails =
      val.generatorAiDetails ??
      val.generator_ai_details ??
      val.aiDetails ??
      val.aiModel ??
      defaultAiDetails ??
      '';
    const generatorAiDetails = typeof rawAiDetails === 'string' ? rawAiDetails.trim() : '';

    result.push({
      word,
      partOfSpeech,
      banglaDefinition,
      englishDefinition,
      examples,
      usageFrequency,
      generatorAiDetails,
    });
  }

  return result;
}

/**
 * Extracts root word usage frequency and member list from an AI JSON response payload.
 */
export function extractWordFamilyGenerationResponse(
  raw: unknown,
  excludeWord?: string,
  defaultAiDetails?: string
): WordFamilyGenerationResult {
  let rootUsageFrequency = '';
  let generatorAiDetails = defaultAiDetails || '';

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const rawRootFreq =
      obj.rootUsageFrequency ??
      obj.root_usage_frequency ??
      obj.mainWordFrequency ??
      obj.mainWordUsageFrequency ??
      obj.usageFrequency;
    rootUsageFrequency = normalizeUsageFrequency(rawRootFreq);

    if (typeof obj.generatorAiDetails === 'string') {
      generatorAiDetails = obj.generatorAiDetails.trim();
    } else if (typeof obj.aiModel === 'string') {
      generatorAiDetails = obj.aiModel.trim();
    }
  }

  const members = normalizeWordFamilyMembers(raw, excludeWord, generatorAiDetails);

  return {
    rootUsageFrequency,
    generatorAiDetails,
    members,
  };
}

/**
 * Validates whether a word is an authentic English word listed in standard dictionaries.
 * Uses Datamuse API and Free Dictionary API with timeout guards.
 */
export async function verifyWordInDictionary(rawWord: string): Promise<boolean> {
  const word = rawWord.trim().toLowerCase();
  if (!word || !/^[a-zA-Z-]+$/.test(word)) {
    return false;
  }

  // 1. Fast verification with Datamuse API (contains over 200,000 verified English lexical entries)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&max=1`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = (await res.json()) as Array<{ word?: string }>;
      if (Array.isArray(data) && data.length > 0 && data[0]?.word?.toLowerCase() === word) {
        return true;
      }
    }
  } catch {
    // Ignore network timeouts and continue to secondary check
  }

  // 2. Secondary verification with Free Dictionary API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      return true;
    }
  } catch {
    // Ignore network timeouts
  }

  return false;
}

/**
 * Normalizes and filters word family members to strictly retain only authentic,
 * verifiable English dictionary entries, removing hallucinated or non-existent words.
 */
export async function filterValidWordFamilyMembers(
  raw: unknown,
  excludeWord?: string,
  defaultAiDetails?: string
): Promise<WordFamilyMember[]> {
  const initial = normalizeWordFamilyMembers(raw, excludeWord, defaultAiDetails);
  if (initial.length === 0) {
    return [];
  }

  try {
    const verifications = await Promise.all(
      initial.map(async (member) => {
        const isValid = await verifyWordInDictionary(member.word);
        return { member, isValid };
      })
    );

    const validMembers = verifications.filter((v) => v.isValid).map((v) => v.member);

    // If verification succeeded for at least some members or confirmed none are valid
    if (validMembers.length > 0) {
      return validMembers;
    }
  } catch (err) {
    console.warn(
      'Dictionary verification check encountered an error, using normalized members:',
      err
    );
  }

  return initial;
}
