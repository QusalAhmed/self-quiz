import { formatCloudflareModelDetails } from './cloudflare';
import { type AppDatabase, safePatchDoc } from './db';
import { formatGoogleModelDetails } from './google';
import { ALLOWED_GROQ_MODELS, formatGroqModelDetails } from './groq';
import { normalizeUsageFrequency } from './word-family';
import { getWordsApiUsageFrequency, resolveWordsApiKey } from './words-api';

export type WordFrequencyTier =
  | 'Top 500'
  | 'Top 1000'
  | 'Top 2000'
  | 'Top 3000'
  | 'Top 5000'
  | 'Top 10000'
  | 'Rare';

export type WordFrequencyProvider = 'auto' | 'wordsapi' | 'ai' | 'gemini' | 'groq' | 'cloudflare';

export interface WordFrequencyResult {
  word: string;
  usageFrequency: string; // "Top 500" | "Top 1000" | "Top 2000" | "Top 3000" | "Top 5000" | "Top 10000" | "Rare"
  source: 'wordsapi' | 'ai';
  generatorDetails: string;
  tier?: string;
  zipf?: number;
  perMillion?: number;
  diversity?: number;
  explanation?: string;
  raw?: unknown;
}

export interface ResolveWordFrequencyParams {
  word: string;
  meaning?: string;
  provider?: WordFrequencyProvider;
  allowFallback?: boolean;
  customWordsApiKey?: string;
  customGoogleApiKey?: string;
  customGroqApiKey?: string;
  customCloudflareApiToken?: string;
  customCloudflareAccountId?: string;
  groqModel?: string;
}

export const WORD_FREQUENCY_SYSTEM_INSTRUCTION =
  'You are an expert English lexicographer, corpus linguist, and vocabulary pedagogue specializing in English corpus usage frequency analysis (e.g. COCA, BNC, Subtlex).\n\n' +
  'Your task is to analyze an English word and accurately classify its usage frequency in contemporary English into one of the following standard frequency tiers:\n' +
  '- "Top 500": Essential core English words used constantly in everyday conversation & writing (e.g. make, see, day, good, time, people, work).\n' +
  '- "Top 1000": Very high frequency foundational vocabulary (e.g. decide, ability, system, public, power, develop).\n' +
  '- "Top 2000": High frequency common vocabulary (e.g. decision, active, manage, create, concept, policy).\n' +
  '- "Top 3000": Standard everyday & academic vocabulary (e.g. decisive, establish, reduce, significant, factor).\n' +
  '- "Top 5000": Upper-intermediate & academic / professional vocabulary (e.g. decisively, indecisive, sustainability, eloquent, pragmatic).\n' +
  '- "Top 10000": Advanced & formal vocabulary (e.g. indecision, decisiveness, remediate, meticulous, ubiquitous).\n' +
  '- "Rare": Specialized, technical, literary, archaic, or low-frequency words (e.g. sesquipedalian, perspicacious, tenebrous).\n\n' +
  'Output ONLY valid raw JSON. Do not include markdown code fences, comments, or explanations outside the JSON object.\n' +
  'Required JSON format:\n' +
  '{\n' +
  '  "word": "string",\n' +
  '  "usageFrequency": "Top 500 | Top 1000 | Top 2000 | Top 3000 | Top 5000 | Top 10000 | Rare",\n' +
  '  "tier": "Essential | Foundational | Common | Standard | Intermediate | Advanced | Rare",\n' +
  '  "estimatedZipf": number,\n' +
  '  "explanation": "short 1-2 sentence explanation of the word frequency and register in English"\n' +
  '}';

export function buildWordFrequencyUserPrompt(word: string, meaning?: string): string {
  const cleanWord = word.trim();
  const meaningPart = meaning?.trim() ? `\nContext / Definition: "${meaning.trim()}"` : '';
  return `Analyze and classify the contemporary English usage frequency for the word: "${cleanWord}".${meaningPart}\n\nReturn strictly valid raw JSON matching the required schema.`;
}

export function parseWordFrequencyAiResponse(
  raw: unknown,
  targetWord: string,
  generatorDetails: string
): WordFrequencyResult {
  const cleanWord = targetWord.trim();
  let parsed: any = null;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const cleanStr = trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      parsed = JSON.parse(cleanStr);
    } catch {
      // Fallback regex search for usageFrequency
      const match = cleanStr.match(/"usageFrequency"\s*:\s*"([^"]+)"/i);
      if (match) {
        parsed = { usageFrequency: match[1] };
      }
    }
  } else if (raw && typeof raw === 'object') {
    parsed = raw;
  }

  const rawFreq =
    parsed?.usageFrequency ??
    parsed?.usage_frequency ??
    parsed?.frequency ??
    parsed?.freq ??
    'Rare';

  const normalizedFreq = normalizeUsageFrequency(String(rawFreq)) || 'Rare';
  const tier = typeof parsed?.tier === 'string' ? parsed.tier.trim() : undefined;
  const estimatedZipf =
    typeof parsed?.estimatedZipf === 'number'
      ? parsed.estimatedZipf
      : typeof parsed?.zipf === 'number'
        ? parsed.zipf
        : undefined;
  const explanation =
    typeof parsed?.explanation === 'string' ? parsed.explanation.trim() : undefined;

  return {
    word: cleanWord,
    usageFrequency: normalizedFreq,
    tier,
    zipf: estimatedZipf,
    explanation,
    source: 'ai',
    generatorDetails,
    raw: parsed,
  };
}

/**
 * Retrieves frequency for a word using Google Gemini API.
 */
export async function getGoogleWordFrequency(
  word: string,
  meaning?: string,
  customApiKey?: string
): Promise<WordFrequencyResult> {
  const cleanWord = word.trim();
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('Google AI API key is not configured');
  }

  const model = process.env.GOOGLE_AI_MODEL || 'gemma-4-26b-a4b-it';
  const generatorDetails = formatGoogleModelDetails(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const promptText = buildWordFrequencyUserPrompt(cleanWord, meaning);

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }],
      },
    ],
    systemInstruction: {
      parts: [{ text: WORD_FREQUENCY_SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Google AI HTTP error ${res.status}: ${errorText.slice(0, 150)}`);
  }

  const data = await res.json();
  const textParts =
    data.candidates?.[0]?.content?.parts
      ?.filter((part: any) => !part.thought && part.text)
      .map((part: any) => part.text)
      .join('') || '';

  if (!textParts) {
    throw new Error('Google AI response did not contain text content');
  }

  return parseWordFrequencyAiResponse(textParts, cleanWord, generatorDetails);
}

/**
 * Retrieves frequency for a word using Groq API.
 */
export async function getGroqWordFrequency(
  word: string,
  meaning?: string,
  customApiKey?: string,
  preferredModel?: string
): Promise<WordFrequencyResult> {
  const cleanWord = word.trim();
  const apiKey = customApiKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq AI API key is not configured');
  }

  const models: string[] = preferredModel
    ? [preferredModel, ...ALLOWED_GROQ_MODELS.filter((m) => m !== preferredModel)]
    : process.env.GROQ_AI_MODEL
      ? [
          process.env.GROQ_AI_MODEL,
          ...ALLOWED_GROQ_MODELS.filter((m) => m !== process.env.GROQ_AI_MODEL),
        ]
      : [...ALLOWED_GROQ_MODELS];

  const promptText = buildWordFrequencyUserPrompt(cleanWord, meaning);
  const messages = [
    { role: 'system', content: WORD_FREQUENCY_SYSTEM_INSTRUCTION },
    { role: 'user', content: promptText },
  ];

  let lastError: Error | null = null;
  for (const model of models) {
    try {
      const generatorDetails = formatGroqModelDetails(model);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Groq HTTP error ${res.status}: ${errText.slice(0, 150)}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Groq response empty');
      }

      return parseWordFrequencyAiResponse(content, cleanWord, generatorDetails);
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('All Groq models failed for frequency retrieval');
}

/**
 * Retrieves frequency for a word using Cloudflare Workers AI.
 */
export async function getCloudflareWordFrequency(
  word: string,
  meaning?: string,
  customApiToken?: string,
  customAccountId?: string
): Promise<WordFrequencyResult> {
  const cleanWord = word.trim();
  const apiToken = customApiToken || process.env.CF_API_TOKEN;
  const accountId = customAccountId || process.env.CF_ACCOUNT_ID;
  if (!apiToken || !accountId) {
    throw new Error('Cloudflare AI credentials are not configured');
  }

  const model = process.env.CF_AI_MODEL || '@cf/google/gemma-4-26b-a4b-it';
  const generatorDetails = formatCloudflareModelDetails(model);
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const promptText = buildWordFrequencyUserPrompt(cleanWord, meaning);
  const messages = [
    { role: 'system', content: WORD_FREQUENCY_SYSTEM_INSTRUCTION },
    { role: 'user', content: promptText },
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, max_tokens: 350 }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Cloudflare AI HTTP error ${res.status}: ${errorText.slice(0, 150)}`);
  }

  const data = await res.json();
  const rawText = data?.result?.response || '';
  if (!rawText) {
    throw new Error('Cloudflare AI returned empty response');
  }

  return parseWordFrequencyAiResponse(rawText, cleanWord, generatorDetails);
}

/**
 * Retrieves word frequency from AI with multi-provider fallback (Gemini -> Groq -> Cloudflare).
 */
export async function getAiWordFrequency(params: {
  word: string;
  meaning?: string;
  preferredAi?: 'gemini' | 'groq' | 'cloudflare';
  customGoogleApiKey?: string;
  customGroqApiKey?: string;
  customCloudflareApiToken?: string;
  customCloudflareAccountId?: string;
  groqModel?: string;
}): Promise<WordFrequencyResult> {
  const {
    word,
    meaning,
    preferredAi = 'gemini',
    customGoogleApiKey,
    customGroqApiKey,
    customCloudflareApiToken,
    customCloudflareAccountId,
    groqModel,
  } = params;

  const order: Array<'gemini' | 'groq' | 'cloudflare'> =
    preferredAi === 'groq'
      ? ['groq', 'gemini', 'cloudflare']
      : preferredAi === 'cloudflare'
        ? ['cloudflare', 'gemini', 'groq']
        : ['gemini', 'groq', 'cloudflare'];

  let lastError: Error | null = null;

  for (const provider of order) {
    try {
      if (provider === 'gemini') {
        return await getGoogleWordFrequency(word, meaning, customGoogleApiKey);
      }
      if (provider === 'groq') {
        return await getGroqWordFrequency(word, meaning, customGroqApiKey, groqModel);
      }
      if (provider === 'cloudflare') {
        return await getCloudflareWordFrequency(
          word,
          meaning,
          customCloudflareApiToken,
          customCloudflareAccountId
        );
      }
    } catch (err: any) {
      console.warn(`Word frequency AI provider "${provider}" failed:`, err?.message || err);
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('All AI providers failed to resolve word frequency');
}

/**
 * Unified resolver for word usage frequency:
 * Supports WordsAPI (https://www.wordsapi.com/), AI (Gemini, Groq, Cloudflare), or Auto.
 */
export async function resolveWordFrequency(
  params: ResolveWordFrequencyParams
): Promise<WordFrequencyResult> {
  const {
    word,
    meaning,
    provider = 'auto',
    allowFallback = true,
    customWordsApiKey,
    customGoogleApiKey,
    customGroqApiKey,
    customCloudflareApiToken,
    customCloudflareAccountId,
    groqModel,
  } = params;

  const cleanWord = word.trim();
  if (!cleanWord) {
    throw new Error('Word is required for frequency resolution');
  }

  const wordsApiKey = resolveWordsApiKey(customWordsApiKey);

  // Mode 1: Explicit WordsAPI requested
  if (provider === 'wordsapi') {
    try {
      const wordsApiRes = await getWordsApiUsageFrequency(cleanWord, wordsApiKey);
      if (wordsApiRes && wordsApiRes.usageFrequency) {
        return {
          word: cleanWord,
          usageFrequency: wordsApiRes.usageFrequency,
          source: 'wordsapi',
          generatorDetails: wordsApiRes.source,
          zipf: wordsApiRes.zipf,
          perMillion: wordsApiRes.perMillion,
          diversity: wordsApiRes.diversity,
          raw: wordsApiRes.rawFrequency,
        };
      }
      if (!allowFallback) {
        throw new Error(`Word "${cleanWord}" not found in WordsAPI frequency database`);
      }
    } catch (err) {
      if (!allowFallback) {
        throw err;
      }
      console.warn('WordsAPI frequency failed, falling back to AI:', err);
    }
  }

  // Mode 2: Explicit AI provider requested (or fallback from WordsAPI)
  if (
    provider === 'ai' ||
    provider === 'gemini' ||
    provider === 'groq' ||
    provider === 'cloudflare'
  ) {
    const preferredAi =
      provider === 'gemini'
        ? 'gemini'
        : provider === 'groq'
          ? 'groq'
          : provider === 'cloudflare'
            ? 'cloudflare'
            : undefined;
    return await getAiWordFrequency({
      word: cleanWord,
      meaning,
      preferredAi,
      customGoogleApiKey,
      customGroqApiKey,
      customCloudflareApiToken,
      customCloudflareAccountId,
      groqModel,
    });
  }

  // Mode 3: 'auto'
  // If WordsAPI key is available, query WordsAPI first
  if (wordsApiKey) {
    try {
      const wordsApiRes = await getWordsApiUsageFrequency(cleanWord, wordsApiKey);
      if (wordsApiRes && wordsApiRes.usageFrequency) {
        return {
          word: cleanWord,
          usageFrequency: wordsApiRes.usageFrequency,
          source: 'wordsapi',
          generatorDetails: wordsApiRes.source,
          zipf: wordsApiRes.zipf,
          perMillion: wordsApiRes.perMillion,
          diversity: wordsApiRes.diversity,
          raw: wordsApiRes.rawFrequency,
        };
      }
    } catch (err) {
      console.warn('WordsAPI lookup error in auto mode, continuing to AI:', err);
    }
  }

  // Otherwise query AI
  return await getAiWordFrequency({
    word: cleanWord,
    meaning,
    customGoogleApiKey,
    customGroqApiKey,
    customCloudflareApiToken,
    customCloudflareAccountId,
    groqModel,
  });
}

/**
 * Helper to store frequency in RxDB database (automatically syncs to Supabase via replication).
 */
export async function storeWordFrequencyInDb(
  db: AppDatabase,
  wordId: string,
  frequencyResult: WordFrequencyResult
): Promise<boolean> {
  if (!db || !wordId) {
    return false;
  }
  try {
    const doc = await db.words.findOne(wordId).exec();
    if (!doc) {
      return false;
    }

    await safePatchDoc(doc, {
      usageFrequency: frequencyResult.usageFrequency,
      generatorAiDetails: frequencyResult.generatorDetails || doc.generatorAiDetails || '',
      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.warn('Could not store word frequency in RxDB:', err);
    return false;
  }
}
