import { formatCloudflareModelDetails } from './cloudflare';
import { formatGoogleModelDetails } from './google';
import { ALLOWED_GROQ_MODELS, formatGroqModelDetails } from './groq';

export type WordValidationStatus = 'valid' | 'warning' | 'invalid';

export type SingleDefinitionVerification = {
  index: number;
  isAccurate: boolean;
  partOfSpeechMatches: boolean;
  detectedPartOfSpeech?: string;
  feedback: string;
  suggestedDefinition?: string;
  suggestedPartOfSpeech?: string;
};

export type WordVerificationResult = {
  word: string;
  isWordValid: boolean;
  wordSpellingSuggestion?: string;
  wordFeedback: string;
  overallStatus: WordValidationStatus;
  definitions: SingleDefinitionVerification[];
  suggestedNewDefinition?: {
    meaning: string;
    partOfSpeech: string;
  };
  generatorAiDetails: string;
};

export type WordVerificationIssue = {
  status: 'warning' | 'invalid';
  word: string;
  isWordValid: boolean;
  wordSpellingSuggestion?: string;
  wordFeedback: string;
  overallStatus: 'warning' | 'invalid';
  definitions: SingleDefinitionVerification[];
  suggestedNewDefinition?: {
    meaning: string;
    partOfSpeech: string;
  };
  generatorAiDetails: string;
  verifiedAt: string;
};

export function getWordVerificationIssue(
  verificationIssue?:
    | string
    | WordVerificationIssue
    | { verificationIssue?: string | WordVerificationIssue | null }
    | null
): WordVerificationIssue | null {
  if (!verificationIssue) {
    return null;
  }
  if (typeof verificationIssue === 'string') {
    const trimmed = verificationIssue.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (
        parsed &&
        (parsed.status === 'warning' ||
          parsed.status === 'invalid' ||
          parsed.overallStatus === 'warning' ||
          parsed.overallStatus === 'invalid')
      ) {
        return parsed as WordVerificationIssue;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (typeof verificationIssue === 'object') {
    if ('verificationIssue' in verificationIssue) {
      return getWordVerificationIssue(
        (verificationIssue as { verificationIssue?: string | WordVerificationIssue | null })
          .verificationIssue
      );
    }
    const obj = verificationIssue as any;
    if (
      obj.status === 'warning' ||
      obj.status === 'invalid' ||
      obj.overallStatus === 'warning' ||
      obj.overallStatus === 'invalid'
    ) {
      return obj as WordVerificationIssue;
    }
  }
  return null;
}

export type WordVerificationDefinitionInput = {
  meaning: string;
  partOfSpeech?: string;
};

export type VerifyWordParams = {
  word: string;
  definitions?: WordVerificationDefinitionInput[];
  preferredProvider?: 'gemini' | 'cloudflare' | 'groq' | 'freedictionary' | 'auto';
  customGoogleApiKey?: string;
  customGroqApiKey?: string;
  customCloudflareApiToken?: string;
  customCloudflareAccountId?: string;
  groqModel?: string;
};

export const WORD_VERIFICATION_SYSTEM_INSTRUCTION =
  'You are an expert lexicographer, linguist, and English dictionary verification assistant. ' +
  'Your task is to thoroughly analyze an English word and its user-provided definitions. ' +
  'You must verify:\n' +
  '1. Word Validity & Spelling: Is this a recognized English word, term, or idiom? If misspelled or slightly off, identify the correct spelling.\n' +
  '2. Definition Accuracy: For each provided definition, determine if it accurately describes the word. Check if the designated part of speech (noun, verb, adjective, adverb, etc.) matches the definition.\n' +
  '3. Suggestions: If a definition is inaccurate, ambiguous, or if no definitions were provided, provide a clear, concise, accurate definition and part of speech.\n' +
  '4. Overall Status: Determine if the word and definitions are "valid" (word is real and definition is accurate), "warning" (minor typo or slight inaccuracy/part-of-speech mismatch), or "invalid" (nonsensical, made up, or completely incorrect definition).\n' +
  'You must output ONLY valid, raw JSON matching the specified schema. Do not include markdown code fences, comments, or explanations outside the JSON.';

export function buildWordVerificationUserPrompt(
  word: string,
  definitions: WordVerificationDefinitionInput[]
): string {
  const definitionsText =
    definitions.length > 0
      ? definitions
          .map(
            (def, i) =>
              `  Definition #${i + 1}: "${def.meaning.trim()}" (Part of speech: "${def.partOfSpeech?.trim() || 'unspecified'}")`
          )
          .join('\n')
      : '  (No definitions provided yet)';

  return (
    `Verify the following English word and definitions:\n\n` +
    `Word: "${word}"\n` +
    `Definitions provided:\n${definitionsText}\n\n` +
    `Return a JSON object strictly conforming to this structure:\n` +
    `{\n` +
    `  "isWordValid": true/false,\n` +
    `  "wordSpellingSuggestion": "corrected word if misspelled, or null",\n` +
    `  "wordFeedback": "concise feedback on word validity or spelling",\n` +
    `  "overallStatus": "valid" | "warning" | "invalid",\n` +
    `  "definitions": [\n` +
    `    {\n` +
    `      "index": 0,\n` +
    `      "isAccurate": true/false,\n` +
    `      "partOfSpeechMatches": true/false,\n` +
    `      "detectedPartOfSpeech": "noun" | "verb" | "adjective" | "adverb" | "other",\n` +
    `      "feedback": "concise feedback explaining why it is accurate or what is wrong",\n` +
    `      "suggestedDefinition": "improved/corrected concise definition if needed, or null",\n` +
    `      "suggestedPartOfSpeech": "suggested part of speech if mismatch, or null"\n` +
    `    }\n` +
    `  ],\n` +
    `  "suggestedNewDefinition": {\n` +
    `    "meaning": "a high quality primary concise definition if definitions were empty or invalid",\n` +
    `    "partOfSpeech": "noun/verb/adjective/etc."\n` +
    `  }\n` +
    `}`
  );
}

export function parseWordVerificationResponse(
  parsed: any,
  originalWord: string,
  originalDefinitions: WordVerificationDefinitionInput[],
  generatorAiDetails: string
): WordVerificationResult {
  const isWordValid = Boolean(parsed?.isWordValid ?? true);
  const wordSpellingSuggestion =
    typeof parsed?.wordSpellingSuggestion === 'string' &&
    parsed.wordSpellingSuggestion.trim().toLowerCase() !== originalWord.trim().toLowerCase()
      ? parsed.wordSpellingSuggestion.trim()
      : undefined;

  let wordFeedback = typeof parsed?.wordFeedback === 'string' ? parsed.wordFeedback.trim() : '';
  if (!wordFeedback) {
    if (wordSpellingSuggestion) {
      wordFeedback = `Possible misspelling. Did you mean "${wordSpellingSuggestion}"?`;
    } else if (isWordValid) {
      wordFeedback = 'Valid English word';
    } else {
      wordFeedback = 'Unrecognized word';
    }
  }

  const rawDefinitions = Array.isArray(parsed?.definitions) ? parsed.definitions : [];
  const verifiedDefinitions: SingleDefinitionVerification[] = originalDefinitions.map((_, idx) => {
    const rawMatch = rawDefinitions.find((d: any) => d?.index === idx) || rawDefinitions[idx];
    const isAccurate = Boolean(rawMatch?.isAccurate ?? true);
    const partOfSpeechMatches = Boolean(rawMatch?.partOfSpeechMatches ?? true);
    const detectedPartOfSpeech =
      typeof rawMatch?.detectedPartOfSpeech === 'string'
        ? rawMatch.detectedPartOfSpeech.trim().toLowerCase()
        : undefined;
    const feedback =
      typeof rawMatch?.feedback === 'string' && rawMatch.feedback.trim()
        ? rawMatch.feedback.trim()
        : isAccurate
          ? 'Accurate definition'
          : 'Definition may not match the word';
    const suggestedDefinition =
      typeof rawMatch?.suggestedDefinition === 'string' && rawMatch.suggestedDefinition.trim()
        ? rawMatch.suggestedDefinition.trim()
        : undefined;
    const suggestedPartOfSpeech =
      typeof rawMatch?.suggestedPartOfSpeech === 'string' && rawMatch.suggestedPartOfSpeech.trim()
        ? rawMatch.suggestedPartOfSpeech.trim().toLowerCase()
        : undefined;

    return {
      index: idx,
      isAccurate,
      partOfSpeechMatches,
      detectedPartOfSpeech,
      feedback,
      suggestedDefinition,
      suggestedPartOfSpeech,
    };
  });

  // Compute or sanitize overall status
  let overallStatus: WordValidationStatus = 'valid';
  if (wordSpellingSuggestion) {
    overallStatus = 'warning';
  } else if (parsed?.overallStatus === 'invalid' || !isWordValid) {
    overallStatus = 'invalid';
  } else if (
    parsed?.overallStatus === 'warning' ||
    verifiedDefinitions.some((d) => !d.isAccurate || !d.partOfSpeechMatches)
  ) {
    overallStatus = 'warning';
  } else if (parsed?.overallStatus === 'valid') {
    overallStatus = 'valid';
  }

  let suggestedNewDefinition: { meaning: string; partOfSpeech: string } | undefined;
  if (
    parsed?.suggestedNewDefinition &&
    typeof parsed.suggestedNewDefinition.meaning === 'string' &&
    parsed.suggestedNewDefinition.meaning.trim()
  ) {
    suggestedNewDefinition = {
      meaning: parsed.suggestedNewDefinition.meaning.trim(),
      partOfSpeech:
        typeof parsed.suggestedNewDefinition.partOfSpeech === 'string'
          ? parsed.suggestedNewDefinition.partOfSpeech.trim().toLowerCase()
          : 'noun',
    };
  }

  return {
    word: originalWord,
    isWordValid,
    wordSpellingSuggestion,
    wordFeedback,
    overallStatus,
    definitions: verifiedDefinitions,
    suggestedNewDefinition,
    generatorAiDetails,
  };
}

export async function verifyWordWithGoogle(
  word: string,
  definitions: WordVerificationDefinitionInput[],
  customApiKey?: string
): Promise<WordVerificationResult> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Google AI API key is not configured');
  }

  const model = process.env.GOOGLE_AI_MODEL || 'gemma-4-26b-a4b-it';
  const generatorAiDetails = formatGoogleModelDetails(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const promptText = buildWordVerificationUserPrompt(word, definitions);

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }],
      },
    ],
    systemInstruction: {
      parts: [{ text: WORD_VERIFICATION_SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google AI verification error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const textParts =
    data.candidates?.[0]?.content?.parts
      ?.filter((part: any) => !part.thought && part.text)
      .map((part: any) => part.text)
      .join('') || '';

  if (!textParts) {
    throw new Error('Google AI returned empty content');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(textParts);
  } catch {
    throw new Error('Google AI response was not valid JSON');
  }

  return parseWordVerificationResponse(parsed, word, definitions, generatorAiDetails);
}

export async function verifyWordWithGroq(
  word: string,
  definitions: WordVerificationDefinitionInput[],
  customApiKey?: string,
  selectedModel?: string
): Promise<WordVerificationResult> {
  const apiKey = customApiKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq AI API key is not configured');
  }

  const modelCandidates = selectedModel
    ? [selectedModel, ...ALLOWED_GROQ_MODELS.filter((m) => m !== selectedModel)]
    : [...ALLOWED_GROQ_MODELS];

  const promptText = buildWordVerificationUserPrompt(word, definitions);

  let lastError: Error | null = null;

  for (const model of modelCandidates) {
    try {
      const generatorAiDetails = formatGroqModelDetails(model);
      const url = 'https://api.groq.com/openai/v1/chat/completions';

      const payload = {
        model,
        messages: [
          { role: 'system', content: WORD_VERIFICATION_SYSTEM_INSTRUCTION },
          { role: 'user', content: promptText },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq AI HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Groq AI returned empty message content');
      }

      const parsed = JSON.parse(content);
      return parseWordVerificationResponse(parsed, word, definitions, generatorAiDetails);
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('All Groq candidate models failed for verification');
}

export async function verifyWordWithCloudflare(
  word: string,
  definitions: WordVerificationDefinitionInput[],
  customToken?: string,
  customAccountId?: string
): Promise<WordVerificationResult> {
  const apiToken = customToken || process.env.CLOUDFLARE_API_TOKEN;
  const accountId = customAccountId || process.env.CLOUDFLARE_ACCOUNT_ID;

  if (!apiToken || !accountId) {
    throw new Error('Cloudflare AI credentials are not configured');
  }

  const model = process.env.CLOUDFLARE_AI_MODEL || '@cf/google/gemma-4-26b-a4b-it';
  const generatorAiDetails = formatCloudflareModelDetails(model);
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const promptText = buildWordVerificationUserPrompt(word, definitions);

  const payload = {
    messages: [
      { role: 'system', content: WORD_VERIFICATION_SYSTEM_INSTRUCTION },
      { role: 'user', content: promptText },
    ],
    temperature: 0.1,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare AI HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawText =
    typeof data.result?.response === 'string'
      ? data.result.response
      : typeof data.result === 'string'
        ? data.result
        : JSON.stringify(data.result || '');

  // Extract JSON substring if needed
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('Cloudflare AI did not return a valid JSON object');
  }

  const jsonSubstring = rawText.slice(firstBrace, lastBrace + 1);
  const parsed = JSON.parse(jsonSubstring);
  return parseWordVerificationResponse(parsed, word, definitions, generatorAiDetails);
}

/**
 * Normalizes part-of-speech strings into standard canonical names
 */
export function normalizePartOfSpeech(pos: string): string {
  const p = pos.trim().toLowerCase().replace(/\.$/, '');
  if (!p) {
    return '';
  }
  if (p === 'n' || p === 'noun') {
    return 'noun';
  }
  if (p === 'v' || p === 'verb') {
    return 'verb';
  }
  if (p === 'adj' || p === 'adjective') {
    return 'adjective';
  }
  if (p === 'adv' || p === 'adverb') {
    return 'adverb';
  }
  if (p === 'prep' || p === 'preposition') {
    return 'preposition';
  }
  if (p === 'conj' || p === 'conjunction') {
    return 'conjunction';
  }
  if (p === 'interj' || p === 'int' || p === 'interjection') {
    return 'interjection';
  }
  if (p === 'pron' || p === 'pronoun') {
    return 'pronoun';
  }
  return p;
}

export type FreeDictionarySense = {
  definition: string;
  tags?: string[];
  examples?: string[];
  quotes?: Array<{ text: string; reference?: string }>;
  synonyms?: string[];
  antonyms?: string[];
  translations?: Array<{
    language: { code: string; name: string };
    word: string;
  }>;
  subsenses?: FreeDictionarySense[];
};

export type FreeDictionaryEntry = {
  language?: { code: string; name: string };
  partOfSpeech?: string;
  pronunciations?: Array<{ type: string; text: string; tags: string[] }>;
  forms?: Array<{ word: string; tags: string[] }>;
  senses?: FreeDictionarySense[];
  synonyms?: string[];
  antonyms?: string[];
};

export type FreeDictionaryResponse = {
  word: string;
  entries?: FreeDictionaryEntry[];
  source?: {
    url?: string;
    license?: { name: string; url: string };
  };
};

/**
 * Free Dictionary API (https://freedictionaryapi.com/) verification
 * Powered by Wiktionary multilingual data (8,500,000+ words).
 * Requires no API key, completely free, supports inflections, misspellings, and multilingual translations.
 */
export async function verifyWordWithFreeDictionaryApi(
  word: string,
  definitions: WordVerificationDefinitionInput[] = []
): Promise<WordVerificationResult> {
  const trimmedWord = word.trim().toLowerCase();
  if (!trimmedWord) {
    throw new Error('Word is required for verification');
  }

  const url = `https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(trimmedWord)}?translations=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok && res.status === 404) {
    return {
      word,
      isWordValid: false,
      wordFeedback: `Word "${word}" was not found in English Wiktionary (freedictionaryapi.com).`,
      overallStatus: 'warning',
      definitions: definitions.map((_, idx) => ({
        index: idx,
        isAccurate: false,
        partOfSpeechMatches: false,
        feedback: 'Cannot verify definition for unrecognized word.',
      })),
      generatorAiDetails: 'Free Dictionary API (freedictionaryapi.com)',
    };
  }

  if (!res.ok) {
    throw new Error(`Free Dictionary API returned HTTP ${res.status}`);
  }

  const data = await res.json();
  return parseFreeDictionaryResponse(data, word, definitions);
}

/**
 * Parses Free Dictionary API (freedictionaryapi.com) and legacy responses into WordVerificationResult
 */
export function parseFreeDictionaryResponse(
  data: any,
  word: string,
  definitions: WordVerificationDefinitionInput[]
): WordVerificationResult {
  // If data is array (legacy dictionaryapi.dev fallback format)
  if (Array.isArray(data)) {
    return parseLegacyDictionaryResponse(data, word, definitions);
  }

  const entries: FreeDictionaryEntry[] = Array.isArray(data?.entries) ? data.entries : [];
  if (entries.length === 0) {
    return {
      word,
      isWordValid: false,
      wordFeedback: `Word "${word}" was not found in English Wiktionary (freedictionaryapi.com).`,
      overallStatus: 'warning',
      definitions: definitions.map((_, idx) => ({
        index: idx,
        isAccurate: false,
        partOfSpeechMatches: false,
        feedback: 'Cannot verify definition for unrecognized word.',
      })),
      generatorAiDetails: 'Free Dictionary API (freedictionaryapi.com)',
    };
  }

  // Check for common misspelling senses (Wiktionary tags them with 'misspelling' or 'Misspelling of X')
  let spellingSuggestion: string | undefined;
  let isMisspelling = false;

  for (const entry of entries) {
    for (const sense of entry.senses || []) {
      const tags = Array.isArray(sense.tags) ? sense.tags : [];
      const def = typeof sense.definition === 'string' ? sense.definition : '';
      const hasMisspellingTag = tags.some((t) => t.toLowerCase() === 'misspelling');
      const match = def.match(/^Misspelling of\s+([a-zA-Z-]+)\.?/i);
      if (hasMisspellingTag || match) {
        isMisspelling = true;
        if (match && match[1]) {
          spellingSuggestion = match[1];
          break;
        }
      }
    }
    if (spellingSuggestion) {
      break;
    }
  }

  // Extract all senses and parts of speech
  const dictMeanings: Array<{
    definition: string;
    partOfSpeech: string;
    examples: string[];
    translations: string[];
    synonyms: string[];
  }> = [];

  for (const entry of entries) {
    const rawPos = typeof entry.partOfSpeech === 'string' ? entry.partOfSpeech.trim() : '';
    const pos = normalizePartOfSpeech(rawPos);
    for (const sense of entry.senses || []) {
      if (typeof sense.definition !== 'string' || !sense.definition.trim()) {
        continue;
      }
      const translations = Array.isArray(sense.translations)
        ? sense.translations
            .filter((t: any) => t.language?.code === 'bn' || t.language?.name?.toLowerCase() === 'bengali')
            .map((t: any) => (typeof t.word === 'string' ? t.word.toLowerCase().trim() : ''))
            .filter(Boolean)
        : [];
      const synonyms = (Array.isArray(sense.synonyms) ? sense.synonyms : []).concat(
        Array.isArray(entry.synonyms) ? entry.synonyms : []
      );
      dictMeanings.push({
        definition: sense.definition.trim(),
        partOfSpeech: pos,
        examples: Array.isArray(sense.examples) ? sense.examples : [],
        translations,
        synonyms,
      });
    }
  }

  const primaryDict = dictMeanings[0];

  if (isMisspelling && spellingSuggestion) {
    return {
      word,
      isWordValid: false,
      wordSpellingSuggestion: spellingSuggestion,
      wordFeedback: `"${word}" appears to be a misspelling of "${spellingSuggestion}".`,
      overallStatus: 'warning',
      definitions: definitions.map((_, idx) => ({
        index: idx,
        isAccurate: false,
        partOfSpeechMatches: true,
        feedback: `Word appears to be misspelled. Did you mean "${spellingSuggestion}"?`,
      })),
      suggestedNewDefinition: primaryDict
        ? {
            meaning: primaryDict.definition,
            partOfSpeech: primaryDict.partOfSpeech || 'noun',
          }
        : undefined,
      generatorAiDetails: 'Free Dictionary API (freedictionaryapi.com)',
    };
  }

  const isAlternativeSpelling = entries.some((e: any) =>
    e.senses?.some(
      (s: any) =>
        (Array.isArray(s.tags) &&
          s.tags.some((t: string) => t.toLowerCase() === 'alt of' || t.toLowerCase() === 'alternative')) ||
        /^(alternative|archaic|obsolete|dated)\s+(spelling|form)\s+of/i.test(s.definition || '')
    )
  );

  const wordFeedback = isAlternativeSpelling
    ? 'Valid English word (alternative or variant spelling in Wiktionary).'
    : 'Valid English word (verified via FreeDictionaryAPI / Wiktionary).';

  // Evaluate user-provided definitions
  const verifiedDefs: SingleDefinitionVerification[] = definitions.map((userDef, idx) => {
    const userMeaning = userDef.meaning.trim();
    const userMeaningLower = userMeaning.toLowerCase();
    const userPos = normalizePartOfSpeech(userDef.partOfSpeech || '');

    const partOfSpeechMatches = userPos
      ? dictMeanings.some((dm) => dm.partOfSpeech === userPos)
      : true;

    // Check Bengali / multilingual translation match
    const matchesBengaliTranslation = dictMeanings.some((dm) =>
      dm.translations.some((tr) => userMeaningLower.includes(tr) || tr.includes(userMeaningLower))
    );

    // Check English keyword overlap
    const userWords = userMeaningLower.split(/\W+/).filter((w) => w.length > 2);
    const bestEnglishMatch = dictMeanings.find((dm) => {
      const defLower = dm.definition.toLowerCase();
      const synsLower = dm.synonyms.map((s) => s.toLowerCase());
      return userWords.some((w) => defLower.includes(w) || synsLower.includes(w));
    });

    const isNonLatinMeaning = userWords.length === 0 && userMeaning.length > 0;
    const isAccurate = matchesBengaliTranslation || Boolean(bestEnglishMatch) || isNonLatinMeaning;

    let feedback = '';
    if (matchesBengaliTranslation) {
      feedback = 'Definition matches Bengali translation in Wiktionary.';
    } else if (bestEnglishMatch) {
      feedback = 'Definition is consistent with English Wiktionary senses.';
    } else if (isNonLatinMeaning) {
      feedback = 'Definition accepted for verified English word.';
    } else {
      feedback = 'Definition could not be verified against Wiktionary entries.';
    }

    if (!partOfSpeechMatches && userPos) {
      feedback += ` Part of speech "${userDef.partOfSpeech}" does not match dictionary forms.`;
    }

    const fallbackSuggested = dictMeanings[idx] || dictMeanings[0];

    return {
      index: idx,
      isAccurate,
      partOfSpeechMatches,
      detectedPartOfSpeech: bestEnglishMatch?.partOfSpeech || primaryDict?.partOfSpeech || 'noun',
      feedback,
      suggestedDefinition: isAccurate ? undefined : fallbackSuggested?.definition,
      suggestedPartOfSpeech: isAccurate ? undefined : fallbackSuggested?.partOfSpeech,
    };
  });

  const overallStatus: WordValidationStatus = verifiedDefs.some(
    (d) => !d.isAccurate || !d.partOfSpeechMatches
  )
    ? 'warning'
    : 'valid';

  return {
    word,
    isWordValid: true,
    wordFeedback,
    overallStatus,
    definitions: verifiedDefs,
    suggestedNewDefinition: primaryDict
      ? {
          meaning: primaryDict.definition,
          partOfSpeech: primaryDict.partOfSpeech || 'noun',
        }
      : undefined,
    generatorAiDetails: 'Free Dictionary API (freedictionaryapi.com)',
  };
}

/**
 * Handles legacy dictionaryapi.dev array format fallback
 */
export function parseLegacyDictionaryResponse(
  entries: any[],
  word: string,
  definitions: WordVerificationDefinitionInput[]
): WordVerificationResult {
  if (!Array.isArray(entries) || entries.length === 0) {
    return {
      word,
      isWordValid: false,
      wordFeedback: 'Word not recognized in dictionary entries.',
      overallStatus: 'warning',
      definitions: [],
      generatorAiDetails: 'Dictionary Fallback (api.dictionaryapi.dev)',
    };
  }

  const dictMeanings: Array<{ definition: string; partOfSpeech: string }> = [];
  for (const entry of entries) {
    if (Array.isArray(entry.meanings)) {
      for (const m of entry.meanings) {
        const pos = normalizePartOfSpeech(m.partOfSpeech || '');
        if (Array.isArray(m.definitions)) {
          for (const d of m.definitions) {
            if (typeof d?.definition === 'string') {
              dictMeanings.push({ definition: d.definition, partOfSpeech: pos });
            }
          }
        }
      }
    }
  }

  const verifiedDefs: SingleDefinitionVerification[] = definitions.map((userDef, idx) => {
    const userMeaning = userDef.meaning.trim().toLowerCase();
    const userPos = normalizePartOfSpeech(userDef.partOfSpeech || '');

    const userWords = userMeaning.split(/\W+/).filter((w) => w.length > 3);
    const bestMatch = dictMeanings.find((dm) => {
      const dmLower = dm.definition.toLowerCase();
      return userWords.some((w) => dmLower.includes(w));
    });

    const isAccurate = userMeaning.length > 0 && (Boolean(bestMatch) || userWords.length === 0);
    const partOfSpeechMatches = userPos
      ? dictMeanings.some((dm) => dm.partOfSpeech === userPos)
      : true;

    const fallbackSuggested = dictMeanings[idx] || dictMeanings[0];

    return {
      index: idx,
      isAccurate,
      partOfSpeechMatches,
      detectedPartOfSpeech: bestMatch?.partOfSpeech || dictMeanings[0]?.partOfSpeech,
      feedback: isAccurate
        ? 'Definition appears consistent with standard dictionary entries.'
        : 'Definition could not be verified against dictionary entries.',
      suggestedDefinition: isAccurate ? undefined : fallbackSuggested?.definition,
      suggestedPartOfSpeech: isAccurate ? undefined : fallbackSuggested?.partOfSpeech,
    };
  });

  const primaryDict = dictMeanings[0];
  const overallStatus: WordValidationStatus = verifiedDefs.some(
    (d) => !d.isAccurate || !d.partOfSpeechMatches
  )
    ? 'warning'
    : 'valid';

  return {
    word,
    isWordValid: true,
    wordFeedback: 'Valid English word (verified via dictionary).',
    overallStatus,
    definitions: verifiedDefs,
    suggestedNewDefinition: primaryDict
      ? {
          meaning: primaryDict.definition,
          partOfSpeech: primaryDict.partOfSpeech || 'noun',
        }
      : undefined,
    generatorAiDetails: 'Dictionary Fallback (api.dictionaryapi.dev)',
  };
}

/**
 * Free Dictionary API verification (with secondary fallback to api.dictionaryapi.dev)
 */
export async function verifyWordWithDictionary(
  word: string,
  definitions: WordVerificationDefinitionInput[]
): Promise<WordVerificationResult> {
  const trimmedWord = word.trim().toLowerCase();

  // 1. Primary: Free Dictionary API (freedictionaryapi.com)
  try {
    return await verifyWordWithFreeDictionaryApi(trimmedWord, definitions);
  } catch (err: any) {
    console.warn(
      'Free Dictionary API (freedictionaryapi.com) failed, trying secondary fallback:',
      err?.message || err
    );
  }

  // 2. Secondary fallback: api.dictionaryapi.dev
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(trimmedWord)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      return {
        word,
        isWordValid: false,
        wordFeedback: `Word "${word}" was not found in the standard English dictionary.`,
        overallStatus: 'warning',
        definitions: definitions.map((_, idx) => ({
          index: idx,
          isAccurate: false,
          partOfSpeechMatches: true,
          feedback: 'Cannot verify definition for unrecognized word.',
        })),
        generatorAiDetails: 'Dictionary Fallback (api.dictionaryapi.dev)',
      };
    }

    const data = await res.json();
    return parseLegacyDictionaryResponse(data, word, definitions);
  } catch {
    return {
      word,
      isWordValid: true,
      wordFeedback: 'Verification service offline or unavailable.',
      overallStatus: 'valid',
      definitions: definitions.map((_, idx) => ({
        index: idx,
        isAccurate: true,
        partOfSpeechMatches: true,
        feedback: 'Offline: could not verify against live dictionary.',
      })),
      generatorAiDetails: 'Offline Fallback',
    };
  }
}

/**
 * Unified verification orchestrator with multi-provider fallback
 */
export async function verifyWordAndDefinitions(
  params: VerifyWordParams
): Promise<WordVerificationResult> {
  const {
    word,
    definitions = [],
    preferredProvider = 'gemini',
    customGoogleApiKey,
    customGroqApiKey,
    customCloudflareApiToken,
    customCloudflareAccountId,
    groqModel,
  } = params;

  if (!word || !word.trim()) {
    throw new Error('Word is required for verification');
  }

  const cleanDefinitions = definitions.map((d) => ({
    meaning: d.meaning || '',
    partOfSpeech: d.partOfSpeech || '',
  }));

  // Direct selection of Free Dictionary API
  if (preferredProvider === 'freedictionary') {
    return await verifyWordWithFreeDictionaryApi(word, cleanDefinitions).catch(() =>
      verifyWordWithDictionary(word, cleanDefinitions)
    );
  }

  // Define execution order based on preference
  const order: Array<'gemini' | 'cloudflare' | 'groq'> =
    preferredProvider === 'groq'
      ? ['groq', 'gemini', 'cloudflare']
      : preferredProvider === 'cloudflare'
        ? ['cloudflare', 'gemini', 'groq']
        : ['gemini', 'cloudflare', 'groq'];

  for (const provider of order) {
    try {
      if (provider === 'gemini') {
        return await verifyWordWithGoogle(word, cleanDefinitions, customGoogleApiKey);
      }
      if (provider === 'cloudflare') {
        return await verifyWordWithCloudflare(
          word,
          cleanDefinitions,
          customCloudflareApiToken,
          customCloudflareAccountId
        );
      }
      if (provider === 'groq') {
        return await verifyWordWithGroq(word, cleanDefinitions, customGroqApiKey, groqModel);
      }
    } catch (err: any) {
      console.warn(
        `AI verification provider "${provider}" failed, trying next candidate:`,
        err?.message || err
      );
    }
  }

  // Fallback to Free Dictionary API (freedictionaryapi.com) if all AI providers fail
  console.warn(
    'All AI providers failed for word verification, falling back to Free Dictionary API (freedictionaryapi.com)'
  );
  return await verifyWordWithDictionary(word, cleanDefinitions);
}
