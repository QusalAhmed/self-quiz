import { NextResponse } from 'next/server';

type CachedMeaningResult = {
  meaning: string;
  definitions: { meaning: string; partOfSpeech: string }[];
};

// In-memory cache for fast sub-millisecond dictionary responses
const meaningCache = new Map<string, { data: CachedMeaningResult; expiresAt: number }>();
const MAX_CACHE_SIZE = 1500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

  // Check cache first
  const now = Date.now();
  const cached = meaningCache.get(word);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data);
  }

  try {
    // Use free Dictionary API (no authentication required)
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

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

    const definitions: { meaning: string; partOfSpeech: string }[] = [];

    for (const entry of data) {
      if (!entry.meanings || !Array.isArray(entry.meanings)) {
        continue;
      }

      for (const apiMeaning of entry.meanings) {
        const partOfSpeech =
          typeof apiMeaning.partOfSpeech === 'string' ? apiMeaning.partOfSpeech.trim() : '';
        if (!Array.isArray(apiMeaning.definitions)) {
          continue;
        }

        for (const definition of apiMeaning.definitions) {
          const meaning = definition?.definition?.trim() || '';
          if (!meaning) {
            continue;
          }
          if (definitions.some((item) => item.meaning.toLowerCase() === meaning.toLowerCase())) {
            continue;
          }
          definitions.push({ meaning, partOfSpeech });
          if (definitions.length >= 6) {
            break;
          }
        }

        if (definitions.length >= 6) {
          break;
        }
      }

      if (definitions.length >= 6) {
        break;
      }
    }

    const meaning = definitions.map((definition) => definition.meaning).join('\n');

    if (!meaning) {
      console.warn('No definition extracted for word:', word);
      return NextResponse.json({ error: `No definition found for: ${word}` }, { status: 404 });
    }

    const result: CachedMeaningResult = { meaning, definitions };

    // Store in cache (with LRU eviction when max size is reached)
    if (meaningCache.size >= MAX_CACHE_SIZE) {
      const firstKey = meaningCache.keys().next().value;
      if (firstKey) {
        meaningCache.delete(firstKey);
      }
    }
    meaningCache.set(word, { data: result, expiresAt: now + CACHE_TTL_MS });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in meaning API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
