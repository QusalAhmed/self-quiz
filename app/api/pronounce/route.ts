import { NextResponse } from 'next/server';
import {
  buildMerriamWebsterAudioUrl,
  extractMerriamWebsterAudioFromApiResponse,
  formatPhonetic,
  isValidAudioUrl,
  normalizeMerriamWebsterAudioUrl,
} from '@/lib/pronounce';

type PronounceResult = {
  word: string;
  audioUrl: string;
  phonetic: string;
  audioSource: 'merriam-webster' | 'dictionaryapi' | 'tts-fallback';
  success: boolean;
};

// In-memory cache for fast sub-millisecond responses
const pronounceCache = new Map<string, { data: PronounceResult; expiresAt: number }>();
const MAX_CACHE_SIZE = 2000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Checks if a remote audio URL actually exists on the CDN via a fast HEAD request.
 */
async function verifyAudioUrlExists(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    clearTimeout(timeoutId);
    return response.ok && response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Attempts to fetch official Merriam-Webster audio from dictionaryapi.com using an API key.
 */
async function fetchFromMerriamWebsterApi(
  word: string,
  apiKey: string
): Promise<PronounceResult | null> {
  try {
    const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(
      word
    )}?key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const extracted = extractMerriamWebsterAudioFromApiResponse(data, word);
    if (extracted?.audioUrl) {
      return {
        word,
        audioUrl: extracted.audioUrl,
        phonetic: extracted.phonetic,
        audioSource: 'merriam-webster',
        success: true,
      };
    }
  } catch (error) {
    console.warn(`Merriam-Webster API request failed for "${word}":`, error);
  }
  return null;
}

/**
 * Zero-config AI resolver that identifies the exact Merriam-Webster audio filename
 * and verifies it against media.merriam-webster.com CDN.
 */
async function resolveMerriamWebsterViaAi(word: string): Promise<PronounceResult | null> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const cfAccountId = process.env.CF_ACCOUNT_ID;
  const cfApiToken = process.env.CF_API_TOKEN;

  const prompt = `You are a Merriam-Webster dictionary audio specialist.
For the exact English word "${word}", provide the exact Merriam-Webster audio filename base (e.g. "epheme01", "apple001", "ubiqui01", "serend02", "abject02" for abjectly, "cautio02" for cautionary, "percol03" for percolation), the phonetic spelling, and any common alternative MW audio filenames.
CRITICAL: If the word is a derivative, adverb, or run-on (e.g. ending in -ly, -ary, -tion, -ness, -ment), provide the audio filename for the EXACT derived form, NOT the root/stem headword (e.g., for "abjectly", do NOT return "abject01" which is "abject"; for "cautionary", do NOT return "cautio01" which is "caution"; for "percolation", do NOT return "percol02" which is "percolate").
Return ONLY a valid JSON object:
{
  "audioFilename": "<filename without .mp3>",
  "phonetic": "<phonetic spelling e.g. \\i-ˈfe-m(ə-)rəl\\>",
  "audioCandidates": ["<candidate1>", "<candidate2>"]
}`;

  let parsed: { audioFilename?: string; phonetic?: string; audioCandidates?: string[] } | null =
    null;

  // 1. Try Gemini
  if (geminiKey && !parsed) {
    try {
      const model = process.env.GOOGLE_AI_MODEL || 'gemini-2.0-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(geminiUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          parsed = JSON.parse(text);
        }
      }
    } catch {}
  }

  // 2. Try Groq
  if (groqKey && !parsed) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.GROQ_AI_MODEL || 'qwen/qwen3.6-27b',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          parsed = JSON.parse(content);
        }
      }
    } catch {}
  }

  // 3. Try Cloudflare
  if (cfAccountId && cfApiToken && !parsed) {
    try {
      const model = process.env.CF_AI_MODEL || '@cf/google/gemma-4-26b-a4b-it';
      const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${model}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(cfUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a dictionary specialist. Output only valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const responseText =
          typeof data?.result?.response === 'string'
            ? data.result.response
            : JSON.stringify(data?.result?.response);
        if (responseText) {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        }
      }
    } catch {}
  }

  // If AI provided filename candidates, test on MW CDN
  if (parsed?.audioFilename || (parsed?.audioCandidates && parsed.audioCandidates.length > 0)) {
    const rawCandidates = [parsed.audioFilename, ...(parsed.audioCandidates || [])].filter(
      Boolean
    ) as string[];

    // Candidates based on the full word (never truncate to 6 letters which strips suffixes)
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanWord.length >= 3) {
      rawCandidates.push(`${cleanWord}01`, `${cleanWord}001`, `${cleanWord}02`, `${cleanWord}_1`);
    }

    const uniqueCandidates = Array.from(new Set(rawCandidates));
    for (const cand of uniqueCandidates) {
      const audioUrl = buildMerriamWebsterAudioUrl(cand);
      if (audioUrl) {
        const exists = await verifyAudioUrlExists(audioUrl);
        if (exists) {
          return {
            word,
            audioUrl,
            phonetic: formatPhonetic(parsed.phonetic),
            audioSource: 'merriam-webster',
            success: true,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Fallback to free Dictionary API phonetics.
 */
async function fetchFromDictionaryApiFallback(word: string): Promise<PronounceResult | null> {
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    let audioUrl = '';
    let phonetic = '';

    const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const entry of data) {
      // Ensure the entry word matches the target word
      if (
        entry?.word &&
        typeof entry.word === 'string' &&
        entry.word.toLowerCase().replace(/[^a-z0-9]/g, '') !== cleanWord
      ) {
        continue;
      }

      if (entry.phonetic && !phonetic) {
        phonetic = entry.phonetic;
      }
      if (Array.isArray(entry.phonetics)) {
        for (const p of entry.phonetics) {
          if (p.text && !phonetic) {
            phonetic = p.text;
          }
          if (p.audio && typeof p.audio === 'string' && isValidAudioUrl(p.audio)) {
            audioUrl = p.audio.trim();
            break;
          }
        }
      }
      if (audioUrl) {
        break;
      }
    }

    if (audioUrl) {
      return {
        word,
        audioUrl,
        phonetic: formatPhonetic(phonetic),
        audioSource: 'dictionaryapi',
        success: true,
      };
    }
  } catch {}
  return null;
}

export async function POST(request: Request) {
  let body: { word?: string; apiKey?: string; forceRefresh?: boolean; refresh?: boolean } | null =
    null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const rawWord = body?.word?.trim();
  if (!rawWord) {
    return NextResponse.json({ error: 'Word is required' }, { status: 400 });
  }

  const normalizedWord = rawWord.toLowerCase();
  const forceRefresh = Boolean(body?.forceRefresh || body?.refresh);
  const customApiKey =
    body?.apiKey?.trim() ||
    process.env.MERRIAM_WEBSTER_API_KEY ||
    process.env.NEXT_PUBLIC_MERRIAM_WEBSTER_API_KEY;

  // Check in-memory cache (unless forceRefresh is requested)
  const now = Date.now();
  const cached = pronounceCache.get(normalizedWord);
  if (!forceRefresh && cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data);
  }

  let result: PronounceResult | null = null;

  // Strategy 1: Merriam-Webster official API with API key
  if (customApiKey) {
    result = await fetchFromMerriamWebsterApi(normalizedWord, customApiKey);
  }

  // Strategy 2: Zero-config Smart Resolver (AI + Merriam-Webster CDN HEAD verification)
  if (!result) {
    result = await resolveMerriamWebsterViaAi(normalizedWord);
  }

  // Strategy 3: Secondary dictionary audio fallback
  if (!result) {
    result = await fetchFromDictionaryApiFallback(normalizedWord);
  }

  // Final fallback
  if (!result) {
    result = {
      word: rawWord,
      audioUrl: '',
      phonetic: '',
      audioSource: 'tts-fallback',
      success: false,
    };
  } else {
    result.audioUrl = normalizeMerriamWebsterAudioUrl(result.audioUrl);
  }

  // Store in cache
  if (pronounceCache.size >= MAX_CACHE_SIZE) {
    const firstKey = pronounceCache.keys().next().value;
    if (firstKey) {
      pronounceCache.delete(firstKey);
    }
  }
  pronounceCache.set(normalizedWord, { data: result, expiresAt: now + CACHE_TTL_MS });

  return NextResponse.json(result);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word')?.trim();
  const apiKey = searchParams.get('apiKey')?.trim() || undefined;
  const refresh =
    searchParams.get('refresh') === 'true' || searchParams.get('forceRefresh') === 'true';

  if (!word) {
    return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
  }

  const postRequest = new Request('http://localhost/api/pronounce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, apiKey, forceRefresh: refresh }),
  });

  return POST(postRequest);
}
