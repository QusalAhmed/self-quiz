import { normalizeAiExamples } from './examples';
import { normalizeWordFamilyMembers, type WordFamilyMember } from './word-family';

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

function repairTruncatedJson(raw: string): string | null {
  const membersIdx = raw.indexOf('"members"');
  if (membersIdx === -1) return null;
  const arrayStart = raw.indexOf('[', membersIdx);
  if (arrayStart === -1) return null;

  const lastCloseBrace = raw.lastIndexOf('}');
  if (lastCloseBrace > arrayStart) {
    return raw.slice(0, lastCloseBrace + 1) + ']}';
  }
  return null;
}

function parseWordFamilyFromRawText(rawText: unknown, excludeWord?: string): WordFamilyMember[] {
  if (typeof rawText !== 'string') {
    return [];
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return [];
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
          const members = normalizeWordFamilyMembers(reparsed, excludeWord);
          if (members.length > 0) {
            return members;
          }
        } catch {
          // Ignore
        }
        continue;
      }

      const members = normalizeWordFamilyMembers(parsed, excludeWord);
      if (members.length > 0) {
        return members;
      }
    } catch {
      // Ignore
    }
  }

  return [];
}

function extractWordFamilyFromAiResponse(result: unknown, excludeWord?: string): WordFamilyMember[] {
  if (Array.isArray(result)) {
    return normalizeWordFamilyMembers(result, excludeWord);
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

    const directMembers = normalizeWordFamilyMembers(value, excludeWord);
    if (directMembers.length > 0) {
      return directMembers;
    }

    if (value.choices?.[0]?.message?.content) {
      const choiceMembers = parseWordFamilyFromRawText(value.choices[0].message.content, excludeWord);
      if (choiceMembers.length > 0) {
        return choiceMembers;
      }
    }

    const nestedResponseMembers = parseWordFamilyFromRawText(value.response, excludeWord);
    if (nestedResponseMembers.length > 0) {
      return nestedResponseMembers;
    }

    const nestedOutputMembers = parseWordFamilyFromRawText(value.output, excludeWord);
    if (nestedOutputMembers.length > 0) {
      return nestedOutputMembers;
    }
  }

  return parseWordFamilyFromRawText(result, excludeWord);
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
): Promise<WordFamilyMember[]> {
  const { word, meaning } = params;
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare AI credentials are not configured');
  }

  const model = process.env.CF_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct';
  const meaningBlock = meaning ? `\nContext/meaning of root word: ${meaning}` : '';

  const messages: CloudflareMessage[] = [
    {
      role: 'system',
      content:
        'You are an expert lexicographer. You output only raw JSON. No markdown. No explanation. No code fences. Just a JSON object.',
    },
    {
      role: 'user',
      content:
        `Provide all derivative/related words belonging to the word family of "${word}" across various parts of speech (noun, verb, adjective, adverb, etc.).${meaningBlock}\nIMPORTANT: Do NOT include the base/main word "${word}" itself in the list; provide only other family members.\nFor each word in the family, give its part of speech, accurate Bengali/Bangla definition (বাংলা অর্থ), English definition, and 1-2 practical example sentences in English.\nReply with ONLY this JSON structure and nothing else:\n{"members":[{"word":"...","partOfSpeech":"...","banglaDefinition":"...","englishDefinition":"...","examples":["..."]}]}`,
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

  const members = extractWordFamilyFromAiResponse(data?.result, word);
  if (!members || members.length === 0) {
    throw new Error('Cloudflare AI returned empty word family');
  }

  return members;
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

  const model = process.env.CF_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct';

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
        `(meaning: ${meaning}). Each sentence must clearly reflect this specific meaning.` +
        partOfSpeechBlock +
        ` Prefer ${targetCount} examples if possible, but return fewer if that is more natural or accurate.` +
        referenceBlock +
        '\nReply with ONLY this JSON and nothing else:\n' +
        '{"examples":["sentence 1","sentence 2","sentence 3"]}',
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

