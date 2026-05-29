import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_KEY ?? '';
const MODEL_NAME = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    console.error('Missing GEMINI_KEY in environment');
    return NextResponse.json({ error: 'Missing GEMINI_KEY' }, { status: 500 });
  }

  let body: { word?: string } | null;
  try {
    body = await request.json();
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const word = body?.word?.trim();
  if (!word) {
    return NextResponse.json({ error: 'Word is required' }, { status: 400 });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    console.log('Calling Gemini API for word:', word, 'with model:', MODEL_NAME);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Provide a concise Bangla meaning for the English word: "${word}". Return only the Bangla meaning without any extra text or explanation.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Gemini API error: ${response.status} ${errorText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('Gemini API response:', JSON.stringify(data));

    const meaning = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!meaning) {
      console.error('No meaning found in Gemini response:', JSON.stringify(data));
      return NextResponse.json({ error: 'No meaning returned from AI' }, { status: 500 });
    }

    console.log('Successfully fetched meaning for word:', word, '-', meaning);
    return NextResponse.json({ meaning });
  } catch (error) {
    console.error('Error in meaning API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

