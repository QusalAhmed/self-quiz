import { NextResponse } from 'next/server';
import { getServerSettings } from '@/app/api/settings/route';
import { generateCloudflareStory } from '@/lib/cloudflare';
import { generateGoogleStory } from '@/lib/google';
import { generateGroqStory } from '@/lib/groq';
import type { GenerateStoryParams, GenerateStoryWordInput } from '@/lib/story';

type ExtendedStoryPayload = GenerateStoryParams & {
  provider?: 'google' | 'cloudflare' | 'groq' | 'auto';
};

export async function POST(request: Request) {
  try {
    let body: ExtendedStoryPayload | null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!body) {
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 });
    }

    const rawTargetWords = body.targetWords;
    if (!Array.isArray(rawTargetWords) || rawTargetWords.length === 0) {
      return NextResponse.json({ error: 'At least one target word is required' }, { status: 400 });
    }

    const targetWords: GenerateStoryWordInput[] = rawTargetWords
      .filter((item) => item && typeof item.word === 'string' && item.word.trim().length > 0)
      .map((item) => ({
        word: item.word.trim(),
        meaning: typeof item.meaning === 'string' ? item.meaning.trim() : '',
        partOfSpeech: typeof item.partOfSpeech === 'string' ? item.partOfSpeech.trim() : '',
        wordId: typeof item.wordId === 'string' ? item.wordId.trim() : undefined,
      }))
      .slice(0, 15);

    if (targetWords.length === 0) {
      return NextResponse.json({ error: 'No valid target words provided' }, { status: 400 });
    }

    const genre =
      typeof body.genre === 'string' && body.genre.trim() ? body.genre.trim() : undefined;
    const length =
      body.length === 'short' || body.length === 'medium' || body.length === 'long'
        ? body.length
        : 'medium';
    const difficulty =
      body.difficulty === 'beginner' ||
      body.difficulty === 'intermediate' ||
      body.difficulty === 'advanced'
        ? body.difficulty
        : 'intermediate';
    const includeBangla = body.includeBangla !== false;

    const params: GenerateStoryParams = {
      targetWords,
      genre,
      length,
      difficulty,
      includeBangla,
    };

    // Load server settings for AI routing
    const serverSettings = await getServerSettings();
    const preferredProvider = body?.provider || serverSettings.ai?.preferredProvider || 'google';

    const runners: Record<string, () => Promise<any>> = {
      google: () => generateGoogleStory(params),
      cloudflare: () => generateCloudflareStory(params),
      groq: () => generateGroqStory(params),
    };

    const order: Array<'google' | 'cloudflare' | 'groq'> =
      preferredProvider === 'groq'
        ? ['groq', 'google', 'cloudflare']
        : preferredProvider === 'cloudflare'
          ? ['cloudflare', 'google', 'groq']
          : ['google', 'cloudflare', 'groq'];

    let lastError: Error | null = null;

    for (const provider of order) {
      try {
        const result = await runners[provider]();
        return NextResponse.json(result);
      } catch (err: any) {
        console.warn(
          `Story generation with ${provider} failed, trying fallback:`,
          err?.message || err
        );
        lastError = err;
      }
    }

    console.error('All AI services failed for story generation:', lastError?.message || lastError);
    return NextResponse.json(
      {
        error: lastError?.message || 'Failed to generate story using AI services',
      },
      { status: 502 }
    );
  } catch (err: any) {
    console.error('Unhandled error in /api/story:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
