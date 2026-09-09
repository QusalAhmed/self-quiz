import type {
  SingleDefinitionVerification,
  WordValidationStatus,
  WordVerificationDefinitionInput,
  WordVerificationResult,
} from './word-verification';

export const WORDS_API_BASE_URL = 'https://wordsapiv1.p.rapidapi.com';
export const WORDS_API_HOST = 'wordsapiv1.p.rapidapi.com';

export interface WordsApiResult {
  definition: string;
  partOfSpeech?: string;
  synonyms?: string[];
  typeOf?: string[];
  hasTypes?: string[];
  derivation?: string[];
  examples?: string[];
  similarTo?: string[];
  pertainsTo?: string[];
  antonyms?: string[];
}

export interface WordsApiResponse {
  word: string;
  results?: WordsApiResult[];
  syllables?: {
    count: number;
    list: string[];
  };
  pronunciation?: string | { all?: string; [key: string]: string | undefined };
  frequency?: number;
}

export interface WordsApiSearchResponse {
  total?: number;
  data?: string[];
  results?: {
    total?: number;
    data?: string[];
  };
}

/**
 * Resolves the active WordsAPI / RapidAPI key from options or environment variables.
 */
export function resolveWordsApiKey(explicitKey?: string): string {
  if (explicitKey && explicitKey.trim()) {
    return explicitKey.trim();
  }
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.WORDS_API_KEY && process.env.WORDS_API_KEY.trim()) {
      return process.env.WORDS_API_KEY.trim();
    }
    if (process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_KEY.trim()) {
      return process.env.RAPIDAPI_KEY.trim();
    }
  }
  return '';
}

/**
 * Fetches word information from WordsAPI (https://www.wordsapi.com/).
 * Returns null when word is not found in the dictionary (HTTP 404).
 */
export async function fetchWordsApiWord(
  word: string,
  apiKey?: string
): Promise<WordsApiResponse | null> {
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) {
    throw new Error('Word is required for WordsAPI lookup');
  }

  const key = resolveWordsApiKey(apiKey);
  if (!key) {
    throw new Error(
      'WordsAPI requires an API key. Configure your RapidAPI key at https://www.wordsapi.com/ via Settings or WORDS_API_KEY environment variable.'
    );
  }

  const url = `${WORDS_API_BASE_URL}/words/${encodeURIComponent(cleanWord)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': key,
      'x-rapidapi-host': WORDS_API_HOST,
      Accept: 'application/json',
    },
  });

  if (res.status === 404) {
    return null;
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(`WordsAPI authentication failed (HTTP ${res.status}): Invalid API key.`);
  }

  if (res.status === 429) {
    throw new Error('WordsAPI rate limit exceeded (HTTP 429).');
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`WordsAPI HTTP ${res.status}: ${errorText.slice(0, 150) || res.statusText}`);
  }

  const data: WordsApiResponse = await res.json();
  return data;
}

/**
 * Searches WordsAPI for spelling suggestions when a word is not found.
 */
export async function searchWordsApiSuggestions(word: string, apiKey?: string): Promise<string[]> {
  const cleanWord = word.trim().toLowerCase();
  if (cleanWord.length < 3) {
    return [];
  }

  const key = resolveWordsApiKey(apiKey);
  if (!key) {
    return [];
  }

  try {
    const prefix = cleanWord.slice(0, Math.max(3, cleanWord.length - 2));
    const minLetters = Math.max(1, cleanWord.length - 2);
    const maxLetters = cleanWord.length + 2;
    const url = `${WORDS_API_BASE_URL}/words/?letterPattern=^${encodeURIComponent(prefix)}.*&lettersMin=${minLetters}&lettersMax=${maxLetters}&limit=5`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': WORDS_API_HOST,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return [];
    }

    const json: WordsApiSearchResponse = await res.json();
    const rawList = Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.results?.data)
        ? json.results.data
        : [];

    return rawList.filter((s) => typeof s === 'string' && s.toLowerCase() !== cleanWord);
  } catch {
    return [];
  }
}

/**
 * Verifies an English word and its definitions using WordsAPI (https://www.wordsapi.com/).
 */
export async function verifyWordWithWordsApi(
  word: string,
  definitions: WordVerificationDefinitionInput[] = [],
  apiKey?: string
): Promise<WordVerificationResult> {
  const cleanWord = word.trim();
  const wordData = await fetchWordsApiWord(cleanWord, apiKey);

  if (!wordData) {
    // Word not found in WordsAPI - search for spelling suggestions
    const suggestions = await searchWordsApiSuggestions(cleanWord, apiKey);
    const topSuggestion = suggestions[0];

    return {
      word: cleanWord,
      isWordValid: false,
      wordSpellingSuggestion: topSuggestion,
      wordFeedback: topSuggestion
        ? `Possible misspelling. Did you mean "${topSuggestion}"? (WordsAPI)`
        : `Word "${cleanWord}" was not found in the WordsAPI dictionary.`,
      overallStatus: topSuggestion ? 'warning' : 'invalid',
      definitions: definitions.map((_, idx) => ({
        index: idx,
        isAccurate: false,
        partOfSpeechMatches: false,
        feedback: 'Cannot verify definition for unrecognized word in WordsAPI.',
      })),
      generatorAiDetails: 'WordsAPI (wordsapi.com)',
    };
  }

  const results = Array.isArray(wordData.results) ? wordData.results : [];
  const primaryResult = results[0];

  const verifiedDefinitions: SingleDefinitionVerification[] = definitions.map((userDef, idx) => {
    const userMeaning = (userDef.meaning || '').trim().toLowerCase();
    const userPos = (userDef.partOfSpeech || '').trim().toLowerCase();
    const userWords = userMeaning.split(/\W+/).filter((w) => w.length > 3);

    let bestMatch: WordsApiResult | undefined;
    let bestScore = 0;

    for (const item of results) {
      const defLower = (item.definition || '').toLowerCase();
      const synonyms = (item.synonyms || []).map((s) => s.toLowerCase());
      const typeOfs = (item.typeOf || []).map((t) => t.toLowerCase());
      const similarTos = (item.similarTo || []).map((s) => s.toLowerCase());

      let score = 0;
      if (userMeaning && defLower.includes(userMeaning)) {
        score += 5;
      }
      for (const token of userWords) {
        if (defLower.includes(token)) {
          score += 2;
        }
        if (synonyms.some((s) => s.includes(token))) {
          score += 2;
        }
        if (typeOfs.some((t) => t.includes(token))) {
          score += 1;
        }
        if (similarTos.some((s) => s.includes(token))) {
          score += 1;
        }
      }
      if (userPos && item.partOfSpeech?.toLowerCase() === userPos) {
        score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    // If user words are non-ASCII (e.g. Bengali translations), allow existence match
    const isAccurate =
      userMeaning.length > 0 && (bestScore >= 2 || userWords.length === 0 || results.length === 0);

    const partOfSpeechMatches = userPos
      ? results.length === 0 || results.some((r) => r.partOfSpeech?.toLowerCase() === userPos)
      : true;

    const detectedPartOfSpeech =
      bestMatch?.partOfSpeech || primaryResult?.partOfSpeech || undefined;
    const fallbackSuggested = bestMatch || results[idx] || primaryResult;

    let feedback = '';
    if (isAccurate && partOfSpeechMatches) {
      feedback = detectedPartOfSpeech
        ? `Accurate definition confirmed by WordsAPI (${detectedPartOfSpeech}).`
        : 'Accurate definition confirmed by WordsAPI.';
    } else if (!isAccurate && !partOfSpeechMatches) {
      feedback = detectedPartOfSpeech
        ? `Definition and part of speech do not match WordsAPI (expected ${detectedPartOfSpeech}).`
        : 'Definition does not match WordsAPI entries.';
    } else if (!isAccurate) {
      feedback = 'Definition may not match recognized meanings in WordsAPI.';
    } else {
      feedback = detectedPartOfSpeech
        ? `Part of speech "${userPos}" does not match WordsAPI (expected ${detectedPartOfSpeech}).`
        : `Part of speech "${userPos}" does not match WordsAPI entries.`;
    }

    return {
      index: idx,
      isAccurate,
      partOfSpeechMatches,
      detectedPartOfSpeech,
      feedback,
      suggestedDefinition: isAccurate ? undefined : fallbackSuggested?.definition,
      suggestedPartOfSpeech: isAccurate ? undefined : fallbackSuggested?.partOfSpeech,
    };
  });

  const overallStatus: WordValidationStatus = verifiedDefinitions.some(
    (d) => !d.isAccurate || !d.partOfSpeechMatches
  )
    ? 'warning'
    : 'valid';

  let wordFeedback = 'Valid English word (verified via WordsAPI).';
  if (wordData.frequency) {
    wordFeedback += ` Frequency score: ${wordData.frequency.toFixed(2)}/7.`;
  }
  if (wordData.syllables?.count) {
    const sylList = wordData.syllables.list?.join('-') || `${wordData.syllables.count} syllables`;
    wordFeedback += ` Syllables: ${sylList}.`;
  }

  return {
    word: cleanWord,
    isWordValid: true,
    wordFeedback,
    overallStatus,
    definitions: verifiedDefinitions,
    suggestedNewDefinition: primaryResult
      ? {
          meaning: primaryResult.definition,
          partOfSpeech: primaryResult.partOfSpeech || 'noun',
        }
      : undefined,
    generatorAiDetails: 'WordsAPI (wordsapi.com)',
  };
}
