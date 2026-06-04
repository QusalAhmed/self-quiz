import { NextResponse } from 'next/server';

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type ExamplesPayload = {
  word?: string;
  meaning?: string;
};

function extractJson(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function normalizeExamples(examples: string[]): string[] {
  const cleaned = examples
    .map((value) => value.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean);

  const unique = Array.from(new Set(cleaned));
  return unique.slice(0, 5);
}

export async function POST(request: Request) {
  let body: ExamplesPayload | null;
  try {
    body = await request.json();
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const word = body?.word?.trim();
  const meaning = body?.meaning?.trim();
  if (!word || !meaning) {
    return NextResponse.json({ error: 'Word and meaning are required' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_KEY is not configured' }, { status: 500 });
  }

  const model = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash';
  const prompt = [
    'Generate 3 to 5 short example sentences that use the word correctly.',
    `Word: ${word}`,
    `Meaning: ${meaning}`,
    'Return JSON only in this shape:',
    '{"examples": ["Sentence 1.", "Sentence 2."]}',
  ].join('\n');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 256,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Gemini API error:', response.status, errorText);
      return NextResponse.json({ error: 'Failed to generate examples' }, { status: 502 });
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n') ?? '';
    const jsonText = extractJson(text);

    let examples: string[] = [];
    if (jsonText) {
      try {
        const parsed = JSON.parse(jsonText) as { examples?: string[] };
        if (Array.isArray(parsed.examples)) {
          examples = parsed.examples;
        }
      } catch (error) {
        console.warn('Failed to parse Gemini JSON:', error);
      }
    }

    if (examples.length === 0) {
      examples = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    }

    const normalized = normalizeExamples(examples);

    if (normalized.length < 3) {
      return NextResponse.json({ error: 'Insufficient examples returned' }, { status: 502 });
    }

    return NextResponse.json({ examples: normalized });
  } catch (error) {
    console.error('Error in examples API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

