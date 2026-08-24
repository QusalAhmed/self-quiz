import type {
  FsrsRecord,
  MissedWordRecord,
  StoryDifficultyLevel,
  StoryWordReference,
  WordRecord,
} from './db';
import { normalizeDefinitions } from './definitions';

export type { StoryDifficultyLevel };

export type StoryDifficultyOption = {
  key: StoryDifficultyLevel;
  label: string;
  description: string;
  cefrLevel: string;
};

export const STORY_DIFFICULTY_OPTIONS: StoryDifficultyOption[] = [
  {
    key: 'beginner',
    label: 'Beginner (A1–A2)',
    description: 'Simple sentences, direct context, and accessible vocabulary',
    cefrLevel: 'A1–A2',
  },
  {
    key: 'intermediate',
    label: 'Intermediate (B1–B2)',
    description: 'Natural narrative, compound sentences, and balanced prose',
    cefrLevel: 'B1–B2',
  },
  {
    key: 'advanced',
    label: 'Advanced (C1–C2 / GRE)',
    description: 'Sophisticated syntax, literary prose, and nuanced context',
    cefrLevel: 'C1–C2',
  },
];

export type StoryGenre =
  | 'Mystery & Suspense'
  | 'Daily Life & Slice of Life'
  | 'Sci-Fi & Future Tech'
  | 'Work & Business'
  | 'Academic & Essay'
  | 'Adventure & Exploration'
  | 'Humorous & Fun'
  | 'Historical & Folklore';

export const STORY_GENRES: StoryGenre[] = [
  'Mystery & Suspense',
  'Daily Life & Slice of Life',
  'Sci-Fi & Future Tech',
  'Work & Business',
  'Academic & Essay',
  'Adventure & Exploration',
  'Humorous & Fun',
  'Historical & Folklore',
];

export type StoryLengthKey = 'short' | 'medium' | 'long';

export type StoryLengthOption = {
  key: StoryLengthKey;
  label: string;
  wordCount: string;
  approxMinutes: string;
};

export const STORY_LENGTH_OPTIONS: StoryLengthOption[] = [
  { key: 'short', label: 'Bite-sized', wordCount: '~100 words', approxMinutes: '1 min read' },
  { key: 'medium', label: 'Standard', wordCount: '~200 words', approxMinutes: '2 min read' },
  { key: 'long', label: 'Detailed', wordCount: '~350 words', approxMinutes: '4 min read' },
];

export type GenerateStoryWordInput = {
  word: string;
  meaning: string;
  partOfSpeech?: string;
  wordId?: string;
};

export type GenerateStoryParams = {
  targetWords: GenerateStoryWordInput[];
  genre?: string;
  length?: StoryLengthKey;
  difficulty?: StoryDifficultyLevel;
  includeBangla?: boolean;
};

export type StoryGenerationResult = {
  title: string;
  content: string;
  banglaTranslation?: string;
  generatorAiDetails: string;
};

export const STORY_SYSTEM_INSTRUCTION = `You are a master English storyteller and vocabulary educator.
Your task is to write an engaging, natural, and coherent English story that seamlessly incorporates a specific list of target vocabulary words.

CRITICAL RULES:
1. Every target word provided MUST be used at least once in the story in a grammatically correct and contextually appropriate manner.
2. MORPHOLOGICAL VARIETY & DIVERSE WORD FORMS (STRICT REQUIREMENT): DO NOT always use the exact base or dictionary form of the words. Actively mix and transform the target words into their natural grammatical parts of speech (e.g., nouns, verbs, adjectives, adverbs, gerunds, past/present participles) wherever it creates natural, expressive, and authentic prose.
3. The context of each sentence must illuminate and reinforce the meaning of the target word.
4. The story must have an interesting narrative arc, dialogue, or vivid description.
5. RANDOMIZED WORD ORDER (STRICT REQUIREMENT): DO NOT use the target words in the same order as they appear in the list. Scatter, shuffle, and weave the words naturally and unpredictably throughout the story so that the sequence of words in the text does NOT follow the list order.
6. Output MUST be strictly a valid JSON object. No Markdown code fences, no introductory or concluding text.
7. If includeBangla is true, provide a fluent Bengali (Bangla) translation/summary that captures the nuances of the story.`;

/**
 * Shuffles an array randomly using Fisher-Yates algorithm
 */
export function shuffleWords<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

export function buildStoryUserPrompt(params: GenerateStoryParams): string {
  const {
    targetWords,
    genre = 'Daily Life & Slice of Life',
    length = 'medium',
    difficulty = 'intermediate',
    includeBangla = true,
  } = params;

  let lengthGuidance = 'around 180 to 220 words';
  if (length === 'short') {
    lengthGuidance = 'around 90 to 120 words (compact and punchy)';
  } else if (length === 'long') {
    lengthGuidance = 'around 300 to 380 words (rich and descriptive)';
  }

  let difficultyGuidance =
    'Intermediate (B1–B2) level: Write natural, engaging prose with a mix of simple, compound, and complex sentences. Use standard vocabulary and clear context clues.';
  if (difficulty === 'beginner') {
    difficultyGuidance =
      'Beginner (A1–A2) level: Write using short, simple sentences with elementary surrounding vocabulary and straightforward grammar. Avoid complex idioms or convoluted clauses. Make each target word’s meaning immediately clear and obvious from the direct context.';
  } else if (difficulty === 'advanced') {
    difficultyGuidance =
      'Advanced (C1–C2 / GRE) level: Write sophisticated, literary, and intellectually stimulating prose suitable for GRE/SAT preparation and advanced English mastery. Use varied sentence syntax, evocative metaphors, and subtle context clues.';
  }

  // Shuffle prompt words list so prompt presentation is also non-linear
  const shuffledTargetWords = shuffleWords(targetWords);

  const wordsList = shuffledTargetWords
    .map((item, i) => {
      const pos = item.partOfSpeech ? ` [${item.partOfSpeech}]` : '';
      return `${i + 1}. "${item.word}"${pos} — Meaning: ${item.meaning}`;
    })
    .join('\n');

  return `Write a creative short story with the following requirements:
- Genre / Theme: ${genre}
- Target Length: ${lengthGuidance}
- Difficulty Level: ${difficultyGuidance}
- Target Vocabulary Words (MUST USE ALL of these in the story):
${wordsList}

- MORPHOLOGICAL VARIETY RULE: Do NOT always use the exact base/dictionary form of the target words. Feel free and encouraged to blend base words with their natural grammatical transformations (e.g. noun forms, verb forms, adjectives, adverbs, past/continuous tenses) to fit the narrative seamlessly.
- CRITICAL WORD SEQUENCE RULE: Incorporate the target words in a RANDOMIZED, UNPREDICTABLE, and ORGANIC sequence throughout the story. DO NOT introduce or use them in the 1, 2, 3... order shown above.

${includeBangla ? 'Also provide a natural Bangla translation under the "banglaTranslation" key.' : 'Set "banglaTranslation" to empty string if not needed.'}

Return ONLY this JSON structure:
{
  "title": "Title of the Story",
  "content": "Story paragraph 1...\\n\\nStory paragraph 2...",
  "banglaTranslation": "বাংলা অনুবাদ..."
}`;
}

export function parseStoryGenerationResponse(
  rawJson: any,
  generatorAiDetails: string
): StoryGenerationResult {
  const title = typeof rawJson?.title === 'string' ? rawJson.title.trim() : 'Vocabulary Story';
  const content = typeof rawJson?.content === 'string' ? rawJson.content.trim() : '';
  const banglaTranslation =
    typeof rawJson?.banglaTranslation === 'string' ? rawJson.banglaTranslation.trim() : '';

  if (!content) {
    throw new Error('AI returned an empty story content');
  }

  return {
    title,
    content,
    banglaTranslation,
    generatorAiDetails,
  };
}

/**
 * Story Token for Interactive Reader & Cloze Mode
 */
export type StoryToken =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'target_word';
      tokenIndex: number;
      originalText: string;
      matchedWord: string;
      wordId?: string;
      meaning?: string;
      partOfSpeech?: string;
    };

/**
 * Normalizes a word string for fuzzy root matching (removes punctuation, lowercases, strips common derivational & inflectional suffixes).
 */
export function getWordStem(word: string): string {
  let clean = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.length <= 3) {
    return clean;
  }

  // Multi-step suffix stripping from longest to shortest
  if (clean.endsWith('istically') && clean.length > 9) {
    clean = clean.slice(0, -9);
  } else if (clean.endsWith('ically') && clean.length > 6) {
    clean = clean.slice(0, -6);
  } else if (clean.endsWith('lessly') && clean.length > 6) {
    clean = clean.slice(0, -6);
  } else if (clean.endsWith('fully') && clean.length > 5) {
    clean = clean.slice(0, -5);
  } else if (clean.endsWith('ingly') && clean.length > 5) {
    clean = clean.slice(0, -5);
  } else if (clean.endsWith('edly') && clean.length > 4) {
    clean = clean.slice(0, -4);
  } else if (clean.endsWith('ously') && clean.length > 5) {
    clean = clean.slice(0, -5);
  } else if (clean.endsWith('ively') && clean.length > 5) {
    clean = clean.slice(0, -5);
  } else if (clean.endsWith('ability') && clean.length > 7) {
    clean = clean.slice(0, -7);
  } else if (clean.endsWith('ibility') && clean.length > 7) {
    clean = clean.slice(0, -7);
  } else if (clean.endsWith('ation') && clean.length > 5) {
    clean = clean.slice(0, -5);
  } else if (clean.endsWith('ition') && clean.length > 5) {
    clean = clean.slice(0, -5);
  } else if (clean.endsWith('ution') && clean.length > 5) {
    clean = clean.slice(0, -5);
  } else if (clean.endsWith('sion') && clean.length > 4) {
    clean = clean.slice(0, -4);
  } else if (clean.endsWith('tion') && clean.length > 4) {
    clean = clean.slice(0, -4);
  } else if (clean.endsWith('ment') && clean.length > 4) {
    clean = clean.slice(0, -4);
  } else if (clean.endsWith('ness') && clean.length > 4) {
    clean = clean.slice(0, -4);
  } else if (clean.endsWith('ious') && clean.length > 4) {
    clean = clean.slice(0, -4);
  } else if (clean.endsWith('uous') && clean.length > 4) {
    clean = clean.slice(0, -4);
  } else if (clean.endsWith('eous') && clean.length > 4) {
    clean = clean.slice(0, -4);
  } else if (clean.endsWith('ous') && clean.length > 3) {
    clean = clean.slice(0, -3);
  } else if (clean.endsWith('ful') && clean.length > 3) {
    clean = clean.slice(0, -3);
  } else if (clean.endsWith('less') && clean.length > 4) {
    clean = clean.slice(0, -4);
  } else if (clean.endsWith('able') && clean.length > 4) {
    clean = clean.slice(0, -4);
  } else if (clean.endsWith('ible') && clean.length > 4) {
    clean = clean.slice(0, -4);
  } else if (clean.endsWith('ity') && clean.length > 3) {
    clean = clean.slice(0, -3);
  } else if (clean.endsWith('ism') && clean.length > 3) {
    clean = clean.slice(0, -3);
  } else if (clean.endsWith('ist') && clean.length > 3) {
    clean = clean.slice(0, -3);
  } else if (clean.endsWith('ive') && clean.length > 3) {
    clean = clean.slice(0, -3);
  } else if (clean.endsWith('ize') && clean.length > 3) {
    clean = clean.slice(0, -3);
  } else if (clean.endsWith('ise') && clean.length > 3) {
    clean = clean.slice(0, -3);
  } else if (clean.endsWith('ies') && clean.length > 3) {
    clean = `${clean.slice(0, -3)}y`;
  } else if (clean.endsWith('es') && clean.length > 3) {
    clean = clean.slice(0, -2);
  } else if (clean.endsWith('ing') && clean.length > 4) {
    clean = clean.slice(0, -3);
  } else if (clean.endsWith('ed') && clean.length > 3) {
    clean = clean.slice(0, -2);
  } else if (clean.endsWith('ly') && clean.length > 3) {
    clean = clean.slice(0, -2);
  } else if (clean.endsWith('s') && !clean.endsWith('ss') && clean.length > 3) {
    clean = clean.slice(0, -1);
  }

  // Normalize trailing silent 'e' or doubled consonants at the root
  if (clean.endsWith('e') && clean.length > 3) {
    clean = clean.slice(0, -1);
  }
  if (
    clean.length > 3 &&
    !clean.endsWith('ss') &&
    !clean.endsWith('ll') &&
    !clean.endsWith('ff') &&
    !clean.endsWith('zz') &&
    clean[clean.length - 1] === clean[clean.length - 2]
  ) {
    clean = clean.slice(0, -1); // running -> runn -> run, hitting -> hitt -> hit
  }

  return clean;
}

/**
 * Tokenizes story content by detecting occurrences of target words.
 */
export function tokenizeStory(content: string, targetWords: StoryWordReference[]): StoryToken[] {
  if (!content) {
    return [];
  }
  if (!targetWords || targetWords.length === 0) {
    return [{ type: 'text', text: content }];
  }

  // Build lookup maps for fast matching
  const targetMap = new Map<string, StoryWordReference>();
  const stemMap = new Map<string, StoryWordReference>();

  for (const tw of targetWords) {
    const cleanWord = tw.word.trim().toLowerCase();
    targetMap.set(cleanWord, tw);
    const validForms = getValidWordForms(cleanWord);
    for (const form of validForms) {
      if (!targetMap.has(form)) {
        targetMap.set(form, tw);
      }
    }
    const stem = getWordStem(cleanWord);
    if (stem.length >= 3 && !stemMap.has(stem)) {
      stemMap.set(stem, tw);
    }
  }

  // Regex to match words and surrounding whitespace/punctuation
  const wordRegex = /\b([a-zA-Z0-9'-]+)\b/g;
  const tokens: StoryToken[] = [];
  let lastIndex = 0;
  let tokenCounter = 0;

  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(content)) !== null) {
    const wordText = match[1];
    const matchStart = match.index;
    const matchEnd = matchStart + wordText.length;

    // Any text preceding this word
    if (matchStart > lastIndex) {
      tokens.push({
        type: 'text',
        text: content.slice(lastIndex, matchStart),
      });
    }

    const lowerWord = wordText.toLowerCase();
    const stem = getWordStem(lowerWord);

    const matchedRef = targetMap.get(lowerWord) || stemMap.get(stem);

    if (matchedRef) {
      tokens.push({
        type: 'target_word',
        tokenIndex: tokenCounter++,
        originalText: wordText,
        matchedWord: matchedRef.word,
        wordId: matchedRef.wordId,
        meaning: matchedRef.meaning,
        partOfSpeech: matchedRef.partOfSpeech,
      });
    } else {
      tokens.push({
        type: 'text',
        text: wordText,
      });
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < content.length) {
    tokens.push({
      type: 'text',
      text: content.slice(lastIndex),
    });
  }

  return tokens;
}

/**
 * Returns a set of all valid word forms (base, plurals, past tense, progressive, adverbs)
 * for a given English vocabulary word.
 */
export function getValidWordForms(word: string): Set<string> {
  const forms = new Set<string>();
  const base = word
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9'-]/g, '');
  if (!base) {
    return forms;
  }

  forms.add(base);

  // Plurals and 3rd-person singular (-s, -es)
  forms.add(`${base}s`);
  if (
    base.endsWith('s') ||
    base.endsWith('sh') ||
    base.endsWith('ch') ||
    base.endsWith('x') ||
    base.endsWith('z')
  ) {
    forms.add(`${base}es`);
  }

  // Base words ending in 'e' (e.g. captivate, solitude, create)
  if (base.endsWith('e') && base.length > 2) {
    const root = base.slice(0, -1);
    forms.add(`${base}d`); // captivated
    forms.add(`${root}ing`); // captivating
    forms.add(`${root}ingly`); // captivatingly
    forms.add(`${root}ion`); // captivation
    forms.add(`${root}ive`); // captive
  } else {
    // Base words not ending in 'e'
    forms.add(`${base}ed`);
    forms.add(`${base}ing`);
    forms.add(`${base}ingly`);
  }

  // Base words ending in 'y' (e.g. serendipity, mystery, copy)
  if (base.endsWith('y') && base.length > 2) {
    const root = base.slice(0, -1);
    forms.add(`${root}ies`); // mysteries
    forms.add(`${root}ied`); // copied
    forms.add(`${root}ier`); // happier
    forms.add(`${root}iest`); // happiest
    forms.add(`${root}ily`); // merrily
    forms.add(`${root}ous`); // serendipitous
    forms.add(`${root}ously`); // serendipitously
  }

  // Adverb form (-ly)
  forms.add(`${base}ly`);
  if (base.endsWith('l')) {
    forms.add(`${base}y`); // accidentally
  }

  return forms;
}

/**
 * Checks if a Cloze answer is correct (strictly checks against the required form in the sentence context).
 */
export function isClozeAnswerCorrect(
  userInput: string,
  _targetWord: string,
  originalText: string
): boolean {
  const cleanInput = userInput
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9'-]/g, '');
  const cleanOriginal = originalText
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9'-]/g, '');

  if (!cleanInput) {
    return false;
  }

  return cleanInput === cleanOriginal;
}

/**
 * Checks if a user's typed word belongs to any word in the story's target word list (exact, inflected, or original token text).
 * When left in the input box, missing characters or incomplete words will return false to trigger error warning.
 */
export function isWordInTargetList(
  userInput: string,
  targetWords: StoryWordReference[],
  additionalValidWords: string[] = []
): boolean {
  const cleanInput = userInput
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9'-]/g, '');
  if (!cleanInput || !targetWords || targetWords.length === 0) {
    return true;
  }

  // Check against all target words and their valid complete inflections
  for (const tw of targetWords) {
    const validForms = getValidWordForms(tw.word);
    if (validForms.has(cleanInput)) {
      return true;
    }
  }

  // Check additional valid words from the story (e.g. originalText of tokens)
  for (const w of additionalValidWords) {
    const validForms = getValidWordForms(w);
    if (validForms.has(cleanInput)) {
      return true;
    }
  }

  return false;
}

// -------------------------------------------------------------
// Word Selection Preset Algorithms
// -------------------------------------------------------------

export type WordPresetType = 'due' | 'missed' | 'difficult' | 'recent' | 'group' | 'random';

export function getDueWordsForStory(
  fsrsRecords: FsrsRecord[],
  words: WordRecord[],
  limit = 6
): StoryWordReference[] {
  const now = new Date().toISOString();
  const wordsById = new Map(words.map((w) => [w.id, w]));

  const dueFsrs = fsrsRecords
    .filter((r) => !r.isDeleted && r.dueAt && r.dueAt <= now)
    .sort((a, b) => (a.dueAt || '').localeCompare(b.dueAt || ''));

  const result: StoryWordReference[] = [];
  const seenWordIds = new Set<string>();

  for (const r of dueFsrs) {
    if (seenWordIds.has(r.wordId)) {
      continue;
    }
    const wordRec = wordsById.get(r.wordId);
    if (!wordRec || wordRec.isDeleted) {
      continue;
    }

    seenWordIds.add(r.wordId);
    const defs = normalizeDefinitions(wordRec.definitions);
    const firstDef = defs[0];
    result.push({
      wordId: wordRec.id,
      word: wordRec.word,
      meaning: firstDef?.meaning || wordRec.meaning || '',
      partOfSpeech: firstDef?.partOfSpeech || '',
    });

    if (result.length >= limit) {
      break;
    }
  }

  // If not enough due words, top up with recent words
  if (result.length < limit) {
    const recent = getRecentWordsForStory(words, limit - result.length, seenWordIds);
    result.push(...recent);
  }

  return result;
}

export function getMissedWordsForStory(
  missedWords: MissedWordRecord[],
  words: WordRecord[],
  limit = 6
): StoryWordReference[] {
  const wordsById = new Map(words.map((w) => [w.id, w]));
  const seenWordIds = new Set<string>();

  // Aggregate missed counts by wordId (strictly for 'wordToMeaning' quiz mode)
  const missedCountMap = new Map<string, { count: number; lastMissedAt: string }>();
  for (const m of missedWords) {
    if (m.isDeleted) {
      continue;
    }
    // Only include missed words from 'wordToMeaning' quiz mode
    if (m.quizMode && m.quizMode !== 'wordToMeaning') {
      continue;
    }
    const current = missedCountMap.get(m.wordId) || { count: 0, lastMissedAt: '' };
    const count = current.count + (m.missedCount || 1);
    const itemDate = m.missedAt || m.updatedAt || '';
    const lastMissedAt = itemDate > current.lastMissedAt ? itemDate : current.lastMissedAt;
    missedCountMap.set(m.wordId, { count, lastMissedAt });
  }

  // Sort candidates by count desc, then most recently missed
  const sortedWordIds = Array.from(missedCountMap.entries())
    .sort((a, b) => b[1].count - a[1].count || b[1].lastMissedAt.localeCompare(a[1].lastMissedAt))
    .map(([wordId]) => wordId);

  const result: StoryWordReference[] = [];
  for (const wordId of sortedWordIds) {
    const wordRec = wordsById.get(wordId);
    if (!wordRec || wordRec.isDeleted) {
      continue;
    }

    seenWordIds.add(wordId);
    const defs = normalizeDefinitions(wordRec.definitions);
    const firstDef = defs[0];
    result.push({
      wordId: wordRec.id,
      word: wordRec.word,
      meaning: firstDef?.meaning || wordRec.meaning || '',
      partOfSpeech: firstDef?.partOfSpeech || '',
    });

    if (result.length >= limit) {
      break;
    }
  }

  // If not enough missed words, top up with recent words
  if (result.length < limit) {
    const recent = getRecentWordsForStory(words, limit - result.length, seenWordIds);
    result.push(...recent);
  }

  return result;
}

export function getDifficultWordsForStory(
  fsrsRecords: FsrsRecord[],
  missedWords: MissedWordRecord[],
  words: WordRecord[],
  limit = 6
): StoryWordReference[] {
  const wordsById = new Map(words.map((w) => [w.id, w]));
  const seenWordIds = new Set<string>();
  const candidates: Array<{ wordId: string; score: number }> = [];

  // Score from missed words count
  const missedCountMap = new Map<string, number>();
  for (const m of missedWords) {
    if (m.isDeleted) {
      continue;
    }
    missedCountMap.set(m.wordId, (missedCountMap.get(m.wordId) || 0) + (m.missedCount || 1));
  }

  for (const [wordId, count] of missedCountMap.entries()) {
    candidates.push({ wordId, score: count * 10 });
    seenWordIds.add(wordId);
  }

  // Score from FSRS lapses or high difficulty
  for (const r of fsrsRecords) {
    if (r.isDeleted) {
      continue;
    }
    const lapses = r.lapses || 0;
    const difficulty = r.difficulty || 5;
    const score = lapses * 15 + difficulty * 2;
    if (score > 10) {
      if (!seenWordIds.has(r.wordId)) {
        candidates.push({ wordId: r.wordId, score });
        seenWordIds.add(r.wordId);
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const result: StoryWordReference[] = [];
  for (const cand of candidates) {
    const wordRec = wordsById.get(cand.wordId);
    if (!wordRec || wordRec.isDeleted) {
      continue;
    }

    const defs = normalizeDefinitions(wordRec.definitions);
    const firstDef = defs[0];
    result.push({
      wordId: wordRec.id,
      word: wordRec.word,
      meaning: firstDef?.meaning || wordRec.meaning || '',
      partOfSpeech: firstDef?.partOfSpeech || '',
    });

    if (result.length >= limit) {
      break;
    }
  }

  if (result.length < limit) {
    const recent = getRecentWordsForStory(
      words,
      limit - result.length,
      new Set(result.map((r) => r.wordId))
    );
    result.push(...recent);
  }

  return result;
}

export function getRecentWordsForStory(
  words: WordRecord[],
  limit = 6,
  excludeWordIds = new Set<string>()
): StoryWordReference[] {
  const activeWords = words
    .filter((w) => !w.isDeleted && !excludeWordIds.has(w.id))
    .sort((a, b) =>
      (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
    );

  const result: StoryWordReference[] = [];
  for (const w of activeWords) {
    const defs = normalizeDefinitions(w.definitions);
    const firstDef = defs[0];
    result.push({
      wordId: w.id,
      word: w.word,
      meaning: firstDef?.meaning || w.meaning || '',
      partOfSpeech: firstDef?.partOfSpeech || '',
    });
    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

export function getWordsByGroupForStory(
  words: WordRecord[],
  groupName: string,
  limit = 6
): StoryWordReference[] {
  const matchingWords = words.filter(
    (w) =>
      !w.isDeleted &&
      Array.isArray(w.customGroups) &&
      w.customGroups.some((g) => g.toLowerCase() === groupName.toLowerCase())
  );

  const shuffled = shuffleWords(matchingWords);

  return shuffled.slice(0, limit).map((w) => {
    const defs = normalizeDefinitions(w.definitions);
    const firstDef = defs[0];
    return {
      wordId: w.id,
      word: w.word,
      meaning: firstDef?.meaning || w.meaning || '',
      partOfSpeech: firstDef?.partOfSpeech || '',
    };
  });
}

export function getRandomWordsForStory(
  words: WordRecord[],
  limit = 6,
  excludeWordIds = new Set<string>()
): StoryWordReference[] {
  const activeWords = words.filter((w) => !w.isDeleted && !excludeWordIds.has(w.id));
  const shuffled = shuffleWords(activeWords);

  return shuffled.slice(0, limit).map((w) => {
    const defs = normalizeDefinitions(w.definitions);
    const firstDef = defs[0];
    return {
      wordId: w.id,
      word: w.word,
      meaning: firstDef?.meaning || w.meaning || '',
      partOfSpeech: firstDef?.partOfSpeech || '',
    };
  });
}

export type ParsedPastedWordsResult = {
  recognized: StoryWordReference[];
  unrecognized: Array<{ word: string; meaning: string; partOfSpeech?: string }>;
};

/**
 * Parses raw pasted text (comma-, space-, newline-, or semicolon-separated)
 * and matches against existing library words in RxDB.
 */
export function parsePastedWords(rawText: string, words: WordRecord[]): ParsedPastedWordsResult {
  if (!rawText || !rawText.trim()) {
    return { recognized: [], unrecognized: [] };
  }

  // Split by commas, semicolons, newlines, or bullets
  const rawTokens = rawText
    .split(/[\n,;•\t]+/)
    .map((t) =>
      t
        .trim()
        .replace(/^[-*\d.)\s]+/, '')
        .trim()
    )
    .filter((t) => t.length > 0 && /^[a-zA-Z0-9'-]+$/.test(t));

  // Deduplicate case-insensitively
  const uniqueWords: string[] = [];
  const seen = new Set<string>();
  for (const token of rawTokens) {
    const lower = token.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueWords.push(token);
    }
  }

  const wordsMap = new Map<string, WordRecord>();
  for (const w of words) {
    if (!w.isDeleted) {
      wordsMap.set(w.word.toLowerCase(), w);
    }
  }

  const recognized: StoryWordReference[] = [];
  const unrecognized: Array<{ word: string; meaning: string; partOfSpeech?: string }> = [];

  for (const wordStr of uniqueWords) {
    const matched = wordsMap.get(wordStr.toLowerCase());
    if (matched) {
      const defs = normalizeDefinitions(matched.definitions);
      const firstDef = defs[0];
      recognized.push({
        wordId: matched.id,
        word: matched.word,
        meaning: firstDef?.meaning || matched.meaning || '',
        partOfSpeech: firstDef?.partOfSpeech || '',
      });
    } else {
      unrecognized.push({
        word: wordStr,
        meaning: '',
        partOfSpeech: '',
      });
    }
  }

  return { recognized, unrecognized };
}
