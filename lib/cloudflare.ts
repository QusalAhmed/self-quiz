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

type CloudflareMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type CloudflareAIResponse = {
  result?: {
    response?: unknown;
  };
  success?: boolean;
  errors?: Array<{ message: string }>;
};

export function formatCloudflareModelDetails(model: string): string {
  if (model.includes('gemma-4-26b') || model.includes('gemma-4')) {
    return 'Cloudflare Gemma 4 26B';
  }
  if (model.includes('llama-3.3-70b')) {
    return 'Cloudflare Llama 3.3 70B';
  }
  if (model.includes('llama-3.1-8b')) {
    return 'Cloudflare Llama 3.1 8B';
  }
  if (model.includes('llama-3.1-70b')) {
    return 'Cloudflare Llama 3.1 70B';
  }
  return `Cloudflare AI (${model.replace(/^@cf\//, '')})`;
}

function repairTruncatedJson(raw: string): string | null {
  const membersIdx = raw.indexOf('"members"');
  if (membersIdx === -1) {
    return null;
  }
  const arrayStart = raw.indexOf('[', membersIdx);
  if (arrayStart === -1) {
    return null;
  }

  const lastCloseBrace = raw.lastIndexOf('}');
  if (lastCloseBrace > arrayStart) {
    return `${raw.slice(0, lastCloseBrace + 1)}]}`;
  }
  return null;
}

function parseWordFamilyFromRawText(
  rawText: unknown,
  excludeWord?: string,
  generatorAiDetails?: string
): WordFamilyGenerationResult {
  const empty: WordFamilyGenerationResult = {
    rootUsageFrequency: '',
    generatorAiDetails: generatorAiDetails || '',
    members: [],
  };

  if (typeof rawText !== 'string') {
    return empty;
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return empty;
  }

  const candidates = [trimmed];
  const repaired = repairTruncatedJson(trimmed);
  if (repaired) {
    candidates.push(repaired);
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const fenced = fencedMatch[1].trim();
    candidates.unshift(fenced);
    const repairedFenced = repairTruncatedJson(fenced);
    if (repairedFenced) {
      candidates.push(repairedFenced);
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed === 'string') {
        try {
          const reparsed = JSON.parse(parsed);
          const result = extractWordFamilyGenerationResponse(
            reparsed,
            excludeWord,
            generatorAiDetails
          );
          if (result.members.length > 0) {
            return result;
          }
        } catch {
          // Ignore
        }
        continue;
      }

      const result = extractWordFamilyGenerationResponse(parsed, excludeWord, generatorAiDetails);
      if (result.members.length > 0) {
        return result;
      }
    } catch {
      // Ignore
    }
  }

  return empty;
}

function extractWordFamilyFromAiResponse(
  result: unknown,
  excludeWord?: string,
  generatorAiDetails?: string
): WordFamilyGenerationResult {
  if (Array.isArray(result)) {
    return extractWordFamilyGenerationResponse(result, excludeWord, generatorAiDetails);
  }

  if (result && typeof result === 'object') {
    const value = result as {
      members?: unknown;
      words?: unknown;
      family?: unknown;
      response?: unknown;
      output?: unknown;
      choices?: Array<{ message?: { content?: unknown } }>;
    };

    const directResult = extractWordFamilyGenerationResponse(
      value,
      excludeWord,
      generatorAiDetails
    );
    if (directResult.members.length > 0) {
      return directResult;
    }

    if (value.choices?.[0]?.message?.content) {
      const choiceResult = parseWordFamilyFromRawText(
        value.choices[0].message.content,
        excludeWord,
        generatorAiDetails
      );
      if (choiceResult.members.length > 0) {
        return choiceResult;
      }
    }

    const nestedResponseResult = parseWordFamilyFromRawText(
      value.response,
      excludeWord,
      generatorAiDetails
    );
    if (nestedResponseResult.members.length > 0) {
      return nestedResponseResult;
    }

    const nestedOutputResult = parseWordFamilyFromRawText(
      value.output,
      excludeWord,
      generatorAiDetails
    );
    if (nestedOutputResult.members.length > 0) {
      return nestedOutputResult;
    }
  }

  return parseWordFamilyFromRawText(result, excludeWord, generatorAiDetails);
}

function parseExamplesFromRawText(rawText: unknown, targetCount: number): string[] {
  if (typeof rawText !== 'string') {
    return [];
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return [];
  }

  const candidates = [trimmed];
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    candidates.unshift(fencedMatch[1].trim());
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as { examples?: unknown } | string;
      if (typeof parsed === 'string') {
        try {
          const reparsed = JSON.parse(parsed) as { examples?: unknown };
          const examples = normalizeAiExamples(reparsed?.examples, targetCount);
          if (examples.length > 0) {
            return examples;
          }
        } catch {
          // Ignore and continue to the next parse strategy.
        }
        continue;
      }

      const examples = normalizeAiExamples(parsed?.examples, targetCount);
      if (examples.length > 0) {
        return examples;
      }
    } catch {
      // Ignore and continue to the next parse strategy.
    }
  }

  return [];
}

function extractExamplesFromAiResponse(result: unknown, targetCount: number): string[] {
  if (Array.isArray(result)) {
    return normalizeAiExamples(result, targetCount);
  }

  if (result && typeof result === 'object') {
    const value = result as {
      examples?: unknown;
      response?: unknown;
      output?: unknown;
    };

    const directExamples = normalizeAiExamples(value.examples, targetCount);
    if (directExamples.length > 0) {
      return directExamples;
    }

    const nestedResponseExamples = parseExamplesFromRawText(value.response, targetCount);
    if (nestedResponseExamples.length > 0) {
      return nestedResponseExamples;
    }

    const nestedOutputExamples = normalizeAiExamples(value.output, targetCount);
    if (nestedOutputExamples.length > 0) {
      return nestedOutputExamples;
    }
  }

  return parseExamplesFromRawText(result, targetCount);
}

export async function generateCloudflareWordFamily(
  params: GenerateWordFamilyParams
): Promise<WordFamilyGenerationResult> {
  const { word, meaning } = params;
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare AI credentials are not configured');
  }

  const model = process.env.CF_AI_MODEL || '@cf/google/gemma-4-26b-a4b-it';
  const generatorAiDetails = formatCloudflareModelDetails(model);

  const messages: CloudflareMessage[] = [
    {
      role: 'system',
      content: WORD_FAMILY_SYSTEM_INSTRUCTION,
    },
    {
      role: 'user',
      content: buildWordFamilyUserPrompt(word, meaning),
    },
  ];

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiToken}` },
    method: 'POST',
    body: JSON.stringify({ messages, max_tokens: 1500 }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn('Cloudflare AI HTTP error:', response.status, errorText);
    throw new Error(`Cloudflare AI HTTP error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as CloudflareAIResponse;

  if (data.success === false && data.errors?.length) {
    const errMsg = data.errors.map((e) => e.message).join(', ');
    console.warn('Cloudflare AI returned errors:', errMsg);
    throw new Error(`AI service error: ${errMsg}`);
  }

  const result = extractWordFamilyFromAiResponse(data?.result, word, generatorAiDetails);
  if (!result.members || result.members.length === 0) {
    throw new Error('Cloudflare AI returned empty word family');
  }

  return result;
}

export async function generateCloudflareExamples(
  params: GenerateExamplesParams
): Promise<string[]> {
  const { word, meaning, targetCount, partOfSpeech, referenceExamples } = params;
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare AI credentials are not configured');
  }

  const model = process.env.CF_AI_MODEL || '@cf/google/gemma-4-26b-a4b-it';

  const partOfSpeechBlock = partOfSpeech ? `\nSelected part of speech: ${partOfSpeech}.` : '';
  const referenceBlock =
    referenceExamples.length > 0
      ? `\nReference user examples for this same meaning (use only as guidance, do not copy verbatim):\n${referenceExamples
          .map((example, index) => `${index + 1}. ${example}`)
          .join('\n')}\n`
      : '';

  const messages: CloudflareMessage[] = [
    {
      role: 'system',
      content:
        'You output only raw JSON. No markdown. No explanation. No code fences. Just a JSON object.',
    },
    {
      role: 'user',
      content:
        `Give me up to ${targetCount} example sentences in English using the word "${word}" ` +
        `(meaning: ${meaning}). Each sentence must clearly reflect this specific meaning.${
          partOfSpeechBlock
        } Prefer ${targetCount} examples if possible, but return fewer if that is more natural or accurate.${
          referenceBlock
        }\nReply with ONLY this JSON and nothing else:\n` +
        `{"examples":["sentence 1","sentence 2","sentence 3"]}`,
    },
  ];

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiToken}` },
    method: 'POST',
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn('Cloudflare AI HTTP error:', response.status, errorText);
    throw new Error(`Cloudflare AI HTTP error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as CloudflareAIResponse;

  if (data.success === false && data.errors?.length) {
    const errMsg = data.errors.map((e) => e.message).join(', ');
    console.warn('Cloudflare AI returned errors:', errMsg);
    throw new Error(`AI service error: ${errMsg}`);
  }

  const examples = extractExamplesFromAiResponse(data?.result?.response, targetCount);
  if (!examples || examples.length === 0) {
    throw new Error('Cloudflare AI returned empty examples');
  }

  return examples;
}

export async function generateCloudflareStory(
  params: GenerateStoryParams
): Promise<StoryGenerationResult> {
  const { targetWords } = params;
  if (!targetWords || targetWords.length === 0) {
    throw new Error('Target words are required to generate a story');
  }

  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare AI credentials are not configured');
  }

  const model = process.env.CF_AI_MODEL || '@cf/google/gemma-4-26b-a4b-it';
  const generatorAiDetails = formatCloudflareModelDetails(model);
  const promptText = buildStoryUserPrompt(params);

  const messages: CloudflareMessage[] = [
    {
      role: 'system',
      content: STORY_SYSTEM_INSTRUCTION,
    },
    {
      role: 'user',
      content: promptText,
    },
  ];

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiToken}` },
    method: 'POST',
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn('Cloudflare AI HTTP error for story:', response.status, errorText);
    throw new Error(`Cloudflare AI HTTP error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as CloudflareAIResponse;

  if (data.success === false && data.errors?.length) {
    const errMsg = data.errors.map((e) => e.message).join(', ');
    console.warn('Cloudflare AI returned errors for story:', errMsg);
    throw new Error(`AI service error: ${errMsg}`);
  }

  const rawResponse = data?.result?.response;
  let parsed: any;

  if (typeof rawResponse === 'object' && rawResponse !== null) {
    parsed = rawResponse;
  } else if (typeof rawResponse === 'string') {
    const trimmed = rawResponse.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonStr = fencedMatch ? fencedMatch[1].trim() : trimmed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (err: any) {
      console.warn('Failed to parse Cloudflare AI story response as JSON:', rawResponse);
      throw new Error(`Cloudflare AI story response was not valid JSON: ${err.message}`);
    }
  } else {
    throw new Error('Cloudflare AI returned unexpected response structure');
  }

  return parseStoryGenerationResponse(parsed, generatorAiDetails);
}
