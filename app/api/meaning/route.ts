import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let body: { word?: string } | null;
  try {
    body = await request.json();
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const word = body?.word?.trim().toLowerCase();
  if (!word) {
    return NextResponse.json({ error: 'Word is required' }, { status: 400 });
  }

  try {
    // Use free Dictionary API (no authentication required)
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    console.log('Fetching definition for word:', word);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.warn('Dictionary API error for word:', word, 'Status:', response.status);
      return NextResponse.json(
        { error: `Definition not found for word: ${word}` },
        { status: 404 }
      );
    }

    const data = await response.json();

    // Extract meaning from the API response
    // API structure: Array of entries -> meanings array -> definitions array
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('No definition data found for word:', word);
      return NextResponse.json({ error: `No definition found for: ${word}` }, { status: 404 });
    }

    const entry = data[0];
    let meaning = '';

    // Try to get the first definition from the first meaning
    if (entry.meanings && Array.isArray(entry.meanings) && entry.meanings.length > 0) {
      const firstMeaning = entry.meanings[0];
      if (
        firstMeaning.definitions &&
        Array.isArray(firstMeaning.definitions) &&
        firstMeaning.definitions.length > 0
      ) {
        meaning = firstMeaning.definitions[0].definition?.trim() || '';
      }
    }

    if (!meaning) {
      console.warn('No definition extracted for word:', word);
      return NextResponse.json({ error: `No definition found for: ${word}` }, { status: 404 });
    }

    console.log('Successfully fetched definition for word:', word, '-', meaning);
    return NextResponse.json({ meaning });
  } catch (error) {
    console.error('Error in meaning API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

