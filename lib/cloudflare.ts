import { normalizeAiExamples } from './examples';

export type GenerateExamplesParams = {
  word: string;
  meaning: string;
  targetCount: number;
  partOfSpeech: string;
  referenceExamples: string[];
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

export async function generateCloudflareExamples(params: GenerateExamplesParams): Promise<string[]> {
  const { word, meaning, targetCount, partOfSpeech, referenceExamples } = params;
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare AI credentials are not configured');
  }

  const model = process.env.CF_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct';

  const partOfSpeechBlock = partOfSpeech
    ? `\nSelected part of speech: ${partOfSpeech}.`
    : '';
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
