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

const STATIC_FALLBACK_GROQ_MODELS = [
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-20b',
  'deepseek-r1-distill-llama-70b',
  'gemma2-9b-it',
];

let cachedWorkingModel: string | null = null;
let cachedModelsList: { models: string[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function formatGroqModelDetails(model: string): string {
  const lower = model.toLowerCase();
  if (lower.includes('llama-3.3-70b')) {
    return 'Groq Llama 3.3 70B';
  }
  if (lower.includes('llama-3.1-70b')) {
    return 'Groq Llama 3.1 70B';
  }
  if (lower.includes('llama-3.1-8b')) {
    return 'Groq Llama 3.1 8B';
  }
  if (lower.includes('llama-3.2-11b')) {
    return 'Groq Llama 3.2 11B';
  }
  if (lower.includes('llama-3.2-90b')) {
    return 'Groq Llama 3.2 90B';
  }
  if (lower.includes('llama-3.2-3b')) {
    return 'Groq Llama 3.2 3B';
  }
  if (lower.includes('llama-3.2-1b')) {
    return 'Groq Llama 3.2 1B';
  }
  if (lower.includes('qwen3.6-27b') || lower.includes('qwen-3.6-27b')) {
    return 'Groq Qwen 3.6 27B';
  }
  if (lower.includes('qwen-2.5-32b') || lower.includes('qwen2.5-32b')) {
    return 'Groq Qwen 2.5 32B';
  }
  if (lower.includes('qwen')) {
    return `Groq Qwen (${model.replace(/^.*\//, '')})`;
  }
  if (lower.includes('gpt-oss-120b')) {
    return 'Groq GPT-OSS 120B';
  }
  if (lower.includes('gpt-oss-20b')) {
    return 'Groq GPT-OSS 20B';
  }
  if (lower.includes('mixtral-8x7b')) {
    return 'Groq Mixtral 8x7B';
  }
  if (lower.includes('deepseek-r1-distill-llama-70b')) {
    return 'Groq DeepSeek R1 Distill 70B';
  }
  if (lower.includes('deepseek')) {
    return `Groq DeepSeek (${model.replace(/^.*\//, '')})`;
  }
  if (lower.includes('gemma2-9b') || lower.includes('gemma-2-9b')) {
    return 'Groq Gemma 2 9B';
  }
  return `Groq AI (${model.replace(/^.*\//, '')})`;
}

export function filterAndRankGroqModels(models: Array<{ id: string; active?: boolean }>): string[] {
  const valid = models
    .filter((m) => m && typeof m.id === 'string' && m.active !== false)
    .map((m) => m.id)
    .filter((id) => {
      const lower = id.toLowerCase();
      // Exclude audio, guardrail, and embedding models
      if (
        lower.includes('whisper') ||
        lower.includes('guard') ||
        lower.includes('embed') ||
        lower.includes('tts')
      ) {
        return false;
      }
      return true;
    });

  const scoreModel = (id: string): number => {
    const lower = id.toLowerCase();
    let score = 0;

    // Parameter size & requested priority preference
    if (lower.includes('qwen3.6-27b') || lower.includes('qwen-3.6-27b')) {
      score += 2000;
    } else if (lower.includes('gpt-oss-120b')) {
      score += 1900;
    } else if (lower.includes('120b')) {
      score += 1000;
    } else if (lower.includes('70b') || lower.includes('90b')) {
      score += 900;
    } else if (lower.includes('32b') || lower.includes('27b')) {
      score += 800;
    } else if (lower.includes('14b') || lower.includes('11b') || lower.includes('12b')) {
      score += 700;
    } else if (lower.includes('8b') || lower.includes('9b') || lower.includes('7b')) {
      score += 600;
    } else if (lower.includes('3b') || lower.includes('1b')) {
      score += 400;
    } else {
      score += 500;
    }

    // Architecture preference
    if (lower.includes('llama-3.3')) {
      score += 100;
    } else if (lower.includes('llama-3.2')) {
      score += 90;
    } else if (lower.includes('llama-3.1')) {
      score += 80;
    } else if (lower.includes('qwen')) {
      score += 85;
    } else if (lower.includes('deepseek')) {
      score += 85;
    } else if (lower.includes('gpt-oss')) {
      score += 80;
    } else if (lower.includes('gemma')) {
      score += 60;
    }

    if (
      lower.includes('versatile') ||
      lower.includes('instruct') ||
      lower.includes('it') ||
      lower.includes('chat')
    ) {
      score += 20;
    }

    return score;
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
  if (primary) {
    candidates.push(primary);
  }
  if (cachedWorkingModel && cachedWorkingModel !== primary) {
    candidates.push(cachedWorkingModel);
  }

  for (const m of liveModels) {
    if (!candidates.includes(m)) {
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

function parseJsonFromContent(content: string): any {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1].trim());
    }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Could not parse JSON from Groq AI response');
  }
}

function isModelUnavailableError(status: number, errorText: string): boolean {
  if (status === 404 || status === 429 || status === 503) {
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
    lower.includes('overloaded')
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
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const promptText = buildWordFamilyUserPrompt(word, meaning);

  let lastError: Error | null = null;

  for (const model of modelCandidates) {
    try {
      const generatorAiDetails = formatGroqModelDetails(model);
      const payload = {
        model,
        messages: [
          {
            role: 'system',
            content: WORD_FAMILY_SYSTEM_INSTRUCTION,
          },
          {
            role: 'user',
            content: promptText,
          },
        ],
        response_format: {
          type: 'json_object',
        },
        temperature: 0.2,
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
        if (isModelUnavailableError(response.status, errorText)) {
          console.warn(
            `Groq model "${model}" unavailable (${response.status}), trying next candidate:`,
            errorText
          );
          if (cachedWorkingModel === model) {
            cachedWorkingModel = null;
          }
          lastError = new Error(`Groq AI HTTP error: ${response.status} - ${errorText}`);
          continue;
        }
        console.warn('Groq AI HTTP error:', response.status, errorText);
        throw new Error(`Groq AI HTTP error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent || typeof rawContent !== 'string') {
        throw new Error('Groq AI response did not contain message content');
      }

      let parsed: any;
      try {
        parsed = parseJsonFromContent(rawContent);
      } catch (err: any) {
        console.warn('Failed to parse Groq AI response as JSON:', rawContent);
        throw new Error(`Groq AI response was not valid JSON: ${err.message}`);
      }

      const result = extractWordFamilyGenerationResponse(parsed, word, generatorAiDetails);
      if (!result.members || result.members.length === 0) {
        throw new Error('Groq AI returned empty word family members');
      }

      cachedWorkingModel = model;
      return result;
    } catch (err: any) {
      lastError = err;
      if (modelCandidates.indexOf(model) === modelCandidates.length - 1) {
        throw err;
      }
      if (isModelUnavailableError(404, err.message || '')) {
        continue;
      }
      throw err;
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
  const url = 'https://api.groq.com/openai/v1/chat/completions';

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
    }`;

  let lastError: Error | null = null;

  for (const model of modelCandidates) {
    try {
      const payload = {
        model,
        messages: [
          {
            role: 'system',
            content: systemInstruction,
          },
          {
            role: 'user',
            content: promptText,
          },
        ],
        response_format: {
          type: 'json_object',
        },
        temperature: 0.3,
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
        if (isModelUnavailableError(response.status, errorText)) {
          console.warn(
            `Groq model "${model}" unavailable (${response.status}), trying next candidate:`,
            errorText
          );
          if (cachedWorkingModel === model) {
            cachedWorkingModel = null;
          }
          lastError = new Error(`Groq AI HTTP error: ${response.status} - ${errorText}`);
          continue;
        }
        console.warn('Groq AI HTTP error:', response.status, errorText);
        throw new Error(`Groq AI HTTP error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent || typeof rawContent !== 'string') {
        throw new Error('Groq AI response did not contain message content');
      }

      let parsed: any;
      try {
        parsed = parseJsonFromContent(rawContent);
      } catch (err: any) {
        console.warn('Failed to parse Groq AI response as JSON:', rawContent);
        throw new Error(`Groq AI response was not valid JSON: ${err.message}`);
      }

      const examples = normalizeAiExamples(parsed?.examples, targetCount);
      if (!examples || examples.length === 0) {
        throw new Error('Groq AI returned empty examples');
      }

      cachedWorkingModel = model;
      return examples;
    } catch (err: any) {
      lastError = err;
      if (modelCandidates.indexOf(model) === modelCandidates.length - 1) {
        throw err;
      }
      if (isModelUnavailableError(404, err.message || '')) {
        continue;
      }
      throw err;
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
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const promptText = buildStoryUserPrompt(params);

  let lastError: Error | null = null;

  for (const model of modelCandidates) {
    const generatorAiDetails = formatGroqModelDetails(model);
    try {
      const payload = {
        model,
        messages: [
          {
            role: 'system',
            content: STORY_SYSTEM_INSTRUCTION,
          },
          {
            role: 'user',
            content: promptText,
          },
        ],
        response_format: {
          type: 'json_object',
        },
        temperature: 0.7,
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
        if (isModelUnavailableError(response.status, errorText)) {
          console.warn(
            `Groq model "${model}" unavailable (${response.status}) for story, trying next candidate:`,
            errorText
          );
          if (cachedWorkingModel === model) {
            cachedWorkingModel = null;
          }
          lastError = new Error(`Groq AI HTTP error: ${response.status} - ${errorText}`);
          continue;
        }
        console.warn('Groq AI HTTP error for story:', response.status, errorText);
        throw new Error(`Groq AI HTTP error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;

      if (!rawContent || typeof rawContent !== 'string') {
        throw new Error('Groq AI response did not contain message content');
      }

      let parsed: any;
      try {
        parsed = parseJsonFromContent(rawContent);
      } catch (err: any) {
        console.warn('Failed to parse Groq AI story response as JSON:', rawContent);
        throw new Error(`Groq AI story response was not valid JSON: ${err.message}`);
      }

      const result = parseStoryGenerationResponse(parsed, generatorAiDetails);
      cachedWorkingModel = model;
      return result;
    } catch (err: any) {
      lastError = err;
      if (modelCandidates.indexOf(model) === modelCandidates.length - 1) {
        throw err;
      }
      if (isModelUnavailableError(404, err.message || '')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Groq AI story generation failed across all models');
}
