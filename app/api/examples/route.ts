import { NextResponse } from 'next/server';

type CloudflareMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// Native /AI/run endpoint response shape
type CloudflareAIResponse = {
  result?: {
    response?: string;
  };
  success?: boolean;
  errors?: Array<{ message: string }>;
};

type ExamplesPayload = {
  word?: string;
  meaning?: string;
};

function normalizeExamples(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 5);
}

function parseExamplesFromRawText(rawText: string): string[] {
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
          const examples = normalizeExamples(reparsed?.examples);
          if (examples.length > 0) {
            return examples;
          }
        } catch {
          // Ignore and continue to the next parse strategy.
        }
        continue;
      }

      const examples = normalizeExamples(parsed?.examples);
      if (examples.length > 0) {
        return examples;
      }
    } catch {
      // Ignore and continue to the next parse strategy.
    }
  }

  return [];
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

  const messages: CloudflareMessage[] = [
    {
      role: 'system',
      content:
        'You output only raw JSON. No markdown. No explanation. No code fences. Just a JSON object.',
    },
    {
      role: 'user',
      content:
        `Give me between 3 and 5 example sentences in English using the word "${word}" ` +
        `(meaning: ${meaning}). Each sentence must clearly reflect this specific meaning.\n` +
        'Reply with ONLY this JSON and nothing else:\n' +
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

    // Native endpoint returns the text directly in result.response
    const rawText = data?.result?.response ?? '';
    // const examples = parseExamplesFromRawText(rawText);

    // return NextResponse.json({ examples });
    //
    console.log('Raw AI response:', NextResponse.json(rawText));
    return NextResponse.json(rawText);
  } catch (error) {
    console.error('Error in examples API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
