import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_KEY ?? '';
const MODEL_NAME = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash';

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Missing GEMINI_KEY' }, { status: 500 });
  }

  let body: { word?: string } | null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const word = body?.word?.trim();
  if (!word) {
    return NextResponse.json({ error: 'Word is required' }, { status: 400 });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Provide a concise Bangla meaning for the English word: ${word}. Return only the Bangla meaning without extra text.`,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: errorText }, { status: 500 });
  }

  const data = await response.json();
  const meaning = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!meaning) {
    return NextResponse.json({ error: 'No meaning returned' }, { status: 500 });
  }

  return NextResponse.json({ meaning });
}

