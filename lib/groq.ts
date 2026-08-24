import { normalizeAiExamples } from './examples';
import {
  buildStoryUserPrompt,
  parseStoryGenerationResponse,
  STORY_SYSTEM_INSTRUCTION,
  type GenerateStoryParams,
  type StoryGenerationResult,
} from './story';
import {
  buildWordFamilyUserPrompt,
  extractWordFamilyGenerationResponse,
  WORD_FAMILY_SYSTEM_INSTRUCTION,
  type WordFamilyGenerationResult,
} from './word-family';

export type GenerateExamplesParams = {
  word: string;
  meaning: string;
  targetCount: number;
  partOfSpeech: string;
  referenceExamples: string[];
};

export type GenerateWordFamilyParams = {
  word: string;
  meaning?: string;
};

/**
 * Strict whitelist of allowed Groq models:
 * 1. Qwen 3.6 27B (`qwen/qwen3.6-27b`)
 * 2. GPT OSS 120B (`openai/gpt-oss-120b`)
 * 3. Groq Compound (`groq/compound`)
 */
export const ALLOWED_GROQ_MODELS = [
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-120b',
  'groq/compound',
] as const;

export type AllowedGroqModel = (typeof ALLOWED_GROQ_MODELS)[number];

export const STATIC_FALLBACK_GROQ_MODELS: string[] = [
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-120b',
  'groq/compound',
];

let cachedWorkingModel: string | null = null;
let cachedModelsList: { models: string[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function formatGroqModelDetails(model: string): string {
  const lower = model.toLowerCase();
  if (lower.includes('qwen3.6-27b') || lower.includes('qwen-3.6-27b')) {
    return 'Groq Qwen 3.6 27B';
  }
  if (lower.includes('gpt-oss-120b')) {
    return 'Groq GPT-OSS 120B';
  }
  if (lower.includes('compound')) {
    return 'Groq Compound';
  }
  return `Groq AI (${model.replace(/^.*\//, '')})`;
}

export function isAllowedGroqModel(modelId: string): boolean {
  const lower = modelId.toLowerCase().trim();
  return (
    lower === 'qwen/qwen3.6-27b' ||
    lower === 'openai/gpt-oss-120b' ||
    lower === 'groq/compound' ||
    lower.includes('qwen3.6-27b') ||
    lower.includes('gpt-oss-120b') ||
    lower === 'compound' ||
    lower === 'groq/compound'
  );
}

export function filterAndRankGroqModels(models: Array<{ id: string; active?: boolean }>): string[] {
  const valid = models
    .filter((m) => m && typeof m.id === 'string' && m.active !== false)
    .map((m) => m.id)
    .filter((id) => isAllowedGroqModel(id));

  const scoreModel = (id: string): number => {
    const lower = id.toLowerCase();
    if (lower.includes('qwen3.6-27b') || lower.includes('qwen-3.6-27b')) {
      return 3000;
    }
    if (lower.includes('gpt-oss-120b')) {
      return 2000;
    }
    if (lower.includes('compound')) {
      return 1000;
    }
    return 0;
  };

  return valid.sort((a, b) => scoreModel(b) - scoreModel(a));
}

export async function fetchLiveGroqModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedModelsList && now - cachedModelsList.timestamp < CACHE_TTL_MS) {
    return cachedModelsList.models;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.data)) {
        const ranked = filterAndRankGroqModels(data.data);
        if (ranked.length > 0) {
          cachedModelsList = {
            models: ranked,
            timestamp: now,
          };
          return ranked;
        }
      }
    }
  } catch (err: any) {
    console.warn('Failed to fetch live Groq models list:', err?.message || err);
  }

  return STATIC_FALLBACK_GROQ_MODELS;
}

export async function getGroqModelCandidates(
  apiKey: string,
  configuredModel?: string
): Promise<string[]> {
  const primary = configuredModel?.trim();
  const liveModels = await fetchLiveGroqModels(apiKey);

  const candidates: string[] = [];

  // If user configured a specific model that is allowed, prioritize it
  if (primary && isAllowedGroqModel(primary)) {
    candidates.push(primary);
  }

  if (
    cachedWorkingModel &&
    isAllowedGroqModel(cachedWorkingModel) &&
    !candidates.includes(cachedWorkingModel)
  ) {
    candidates.push(cachedWorkingModel);
  }

  for (const m of liveModels) {
    if (isAllowedGroqModel(m) && !candidates.includes(m)) {
      candidates.push(m);
    }
  }

  for (const m of STATIC_FALLBACK_GROQ_MODELS) {
    if (!candidates.includes(m)) {
      candidates.push(m);
    }
  }

  return candidates;
}

export function resetGroqWorkingModelCache(): void {
  cachedWorkingModel = null;
  cachedModelsList = null;
}

export function isReasoningModel(model: string): boolean {
  const lower = model.toLowerCase();
  return (
    lower.includes('qwen') ||
    lower.includes('gpt-oss') ||
    lower.includes('deepseek') ||
    lower.includes('r1')
  );
}

export function buildGroqPayload(
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature = 0.2,
  useJsonFormat = true
): Record<string, any> {
  const payload: Record<string, any> = {
    model,
    messages,
    temperature,
  };

  if (useJsonFormat) {
    payload.response_format = {
      type: 'json_object',
    };
  }

  if (isReasoningModel(model)) {
    payload.reasoning_format = 'hidden';
  }

  return payload;
}

export async function fetchGroqChatCompletion(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature = 0.2
): Promise<any> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const payload = buildGroqPayload(model, messages, temperature, true);

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

    // If Groq failed strict server-side JSON validation (e.g. reasoning token overlap), retry without response_format constraint
    if (
      response.status === 400 &&
      (errorText.includes('json_validate_failed') || errorText.includes('Failed to validate JSON'))
    ) {
      console.warn(
        `Groq model "${model}" failed JSON mode validation, retrying in standard text mode:`,
        errorText
      );
      const rawPayload = buildGroqPayload(model, messages, temperature, false);
      const retryResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(rawPayload),
      });

      if (retryResponse.ok) {
        return retryResponse.json();
      }

      const retryErrorText = await retryResponse.text();
      throw new Error(`Groq AI HTTP error: ${retryResponse.status} - ${retryErrorText}`);
    }

    throw new Error(`Groq AI HTTP error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export function parseJsonFromContent(content: string): any {
  let cleaned = content.trim();
  // Strip reasoning / thought blocks if present in raw model output
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      try {
        return JSON.parse(fencedMatch[1].trim());
      } catch {
        // Fall through to brace extraction
      }
    }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Could not parse JSON from Groq AI response');
  }
}

export function isModelUnavailableError(status: number, errorText: string): boolean {
  if (status === 404 || status === 429 || status === 503 || status === 400) {
    return true;
  }
  const lower = errorText.toLowerCase();
  return (
    lower.includes('model_not_found') ||
    lower.includes('does not exist') ||
    lower.includes('do not have access') ||
    lower.includes('decommissioned') ||
    lower.includes('deprecated') ||
    lower.includes('model_decommissioned') ||
    lower.includes('model_deprecated') ||
    lower.includes('not supported') ||
    lower.includes('rate_limit') ||
    lower.includes('rate limit') ||
    lower.includes('overloaded') ||
    lower.includes('json_validate_failed') ||
    lower.includes('failed to validate json')
  );
}

export async function generateGroqWordFamily(
  params: GenerateWordFamilyParams
): Promise<WordFamilyGenerationResult> {
  const { word, meaning } = params;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key is not configured');
  }

  const modelCandidates = await getGroqModelCandidates(apiKey, process.env.GROQ_AI_MODEL);
  const promptText = buildWordFamilyUserPrompt(word, meaning);
  const messages = [
    {
      role: 'system',
      content: WORD_FAMILY_SYSTEM_INSTRUCTION,
    },
    {
      role: 'user',
      content: promptText,
    },
  ];

  let lastError: Error | null = null;

  for (const model of modelCandidates) {
    try {
      const generatorAiDetails = formatGroqModelDetails(model);
      const data = await fetchGroqChatCompletion(apiKey, model, messages, 0.2);
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent || typeof rawContent !== 'string') {
        throw new Error('Groq AI response did not contain message content');
      }

      const parsed = parseJsonFromContent(rawContent);
      const result = extractWordFamilyGenerationResponse(parsed, word, generatorAiDetails);
      if (!result.members || result.members.length === 0) {
        throw new Error('Groq AI returned empty word family members');
      }

      cachedWorkingModel = model;
      return result;
    } catch (err: any) {
      console.warn(
        `Groq model "${model}" failed, trying next candidate if available:`,
        err?.message || err
      );
      if (cachedWorkingModel === model) {
        cachedWorkingModel = null;
      }
      lastError = err;
      if (modelCandidates.indexOf(model) === modelCandidates.length - 1) {
        throw err;
      }
      continue;
    }
  }

  throw lastError || new Error('Groq AI word family generation failed across all models');
}

export async function generateGroqExamples(params: GenerateExamplesParams): Promise<string[]> {
  const { word, meaning, targetCount, partOfSpeech, referenceExamples } = params;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key is not configured');
  }

  const modelCandidates = await getGroqModelCandidates(apiKey, process.env.GROQ_AI_MODEL);
  const partOfSpeechBlock = partOfSpeech ? `\nSelected part of speech: ${partOfSpeech}.` : '';
  const referenceBlock =
    referenceExamples.length > 0
      ? `\nReference user examples for this same meaning (use only as guidance, do not copy verbatim):\n${referenceExamples
          .map((example, index) => `${index + 1}. ${example}`)
          .join('\n')}\n`
      : '';

  const systemInstruction =
    'You output only raw JSON. No markdown. No explanation. No code fences. Just a JSON object. Reply with ONLY this JSON and nothing else: {"examples":["sentence 1","sentence 2","sentence 3"]}';
  const promptText =
    `Give me up to ${targetCount} example sentences in English using the word "${word}" ` +
    `(meaning: ${meaning}). Each sentence must clearly reflect this specific meaning.${
      partOfSpeechBlock
    } Prefer ${targetCount} examples if possible, but return fewer if that is more natural or accurate.${
      referenceBlock
    }\nReturn JSON ONLY.`;

  const messages = [
    {
      role: 'system',
      content: systemInstruction,
    },
    {
      role: 'user',
      content: promptText,
    },
  ];

  let lastError: Error | null = null;

  for (const model of modelCandidates) {
    try {
      const data = await fetchGroqChatCompletion(apiKey, model, messages, 0.3);
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent || typeof rawContent !== 'string') {
        throw new Error('Groq AI response did not contain message content');
      }

      const parsed = parseJsonFromContent(rawContent);
      const examples = normalizeAiExamples(parsed?.examples, targetCount);
      if (!examples || examples.length === 0) {
        throw new Error('Groq AI returned empty examples');
      }

      cachedWorkingModel = model;
      return examples;
    } catch (err: any) {
      console.warn(
        `Groq model "${model}" failed, trying next candidate if available:`,
        err?.message || err
      );
      if (cachedWorkingModel === model) {
        cachedWorkingModel = null;
      }
      lastError = err;
      if (modelCandidates.indexOf(model) === modelCandidates.length - 1) {
        throw err;
      }
      continue;
    }
  }

  throw lastError || new Error('Groq AI example generation failed across all models');
}

export async function generateGroqStory(
  params: GenerateStoryParams
): Promise<StoryGenerationResult> {
  const { targetWords } = params;
  if (!targetWords || targetWords.length === 0) {
    throw new Error('Target words are required to generate a story');
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key is not configured');
  }

  const modelCandidates = await getGroqModelCandidates(apiKey, process.env.GROQ_AI_MODEL);
  const promptText = buildStoryUserPrompt(params);
  const messages = [
    {
      role: 'system',
      content: STORY_SYSTEM_INSTRUCTION,
    },
    {
      role: 'user',
      content: promptText,
    },
  ];

  let lastError: Error | null = null;

  for (const model of modelCandidates) {
    const generatorAiDetails = formatGroqModelDetails(model);
    try {
      const data = await fetchGroqChatCompletion(apiKey, model, messages, 0.7);
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent || typeof rawContent !== 'string') {
        throw new Error('Groq AI response did not contain message content');
      }

      const parsed = parseJsonFromContent(rawContent);
      const result = parseStoryGenerationResponse(parsed, generatorAiDetails);
      cachedWorkingModel = model;
      return result;
    } catch (err: any) {
      console.warn(
        `Groq model "${model}" failed for story, trying next candidate if available:`,
        err?.message || err
      );
      if (cachedWorkingModel === model) {
        cachedWorkingModel = null;
      }
      lastError = err;
      if (modelCandidates.indexOf(model) === modelCandidates.length - 1) {
        throw err;
      }
      continue;
    }
  }

  throw lastError || new Error('Groq AI story generation failed across all models');
}
