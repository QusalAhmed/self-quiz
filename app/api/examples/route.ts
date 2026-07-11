import { NextResponse } from 'next/server';
import { normalizeAiExampleCount, normalizeAiExamples } from '@/lib/examples';

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

type ExamplesPayload = {
  word?: string;
  meaning?: string;
  count?: number;
  referenceExamples?: string[];
  partOfSpeech?: string;
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

function normalizeReferenceExamples(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  ).slice(0, 5);
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

function normalizePartOfSpeech(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  let body: ExamplesPayload | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const word = body?.word?.trim();
  const meaning = body?.meaning?.trim();
  const targetCount = normalizeAiExampleCount(body?.count);
  const referenceExamples = normalizeReferenceExamples(body?.referenceExamples);
  const partOfSpeech = normalizePartOfSpeech(body?.partOfSpeech);

  if (!word || !meaning) {
    return NextResponse.json({ error: 'Word and meaning are required' }, { status: 400 });
  }

  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) {
    return NextResponse.json(
      { error: 'Cloudflare AI credentials are not configured' },
      { status: 500 }
    );
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

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiToken}` },
      method: 'POST',
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Cloudflare AI HTTP error:', response.status, errorText);
      return NextResponse.json({ error: 'Failed to generate examples' }, { status: 502 });
    }

    const data = (await response.json()) as CloudflareAIResponse;

    if (data.success === false && data.errors?.length) {
      const errMsg = data.errors.map((e) => e.message).join(', ');
      console.warn('Cloudflare AI returned errors:', errMsg);
      return NextResponse.json({ error: `AI service error: ${errMsg}` }, { status: 502 });
    }

    const examples = extractExamplesFromAiResponse(data?.result?.response, targetCount);

    return NextResponse.json({ examples });
  } catch (error) {
    console.error('Error in examples API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
