import { NextResponse } from 'next/server';
import { generateCloudflareStory } from '@/lib/cloudflare';
import { generateGoogleStory } from '@/lib/google';
import { generateGroqStory } from '@/lib/groq';
import type { GenerateStoryParams, GenerateStoryWordInput } from '@/lib/story';

export async function POST(request: Request) {
  try {
    let body: GenerateStoryParams | null;
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

    // 1. Try Google AI (Gemma 4 26B A4B) (Tier 1)
    try {
      const result = await generateGoogleStory(params);
      return NextResponse.json(result);
    } catch (googleError: any) {
      console.warn(
        'Google AI failed for story generation, falling back to Cloudflare AI:',
        googleError?.message || googleError
      );

      // 2. Fallback to Cloudflare AI (Gemma 4 26B A4B) (Tier 2)
      try {
        const result = await generateCloudflareStory(params);
        return NextResponse.json(result);
      } catch (cfError: any) {
        console.warn(
          'Cloudflare AI failed for story generation, falling back to Groq AI:',
          cfError?.message || cfError
        );

        // 3. Fallback to Groq AI (Qwen 3.6 27B / GPT-OSS 120B) (Tier 3)
        try {
          const result = await generateGroqStory(params);
          return NextResponse.json(result);
        } catch (groqError: any) {
          console.error(
            'All AI services (Google, Cloudflare, Groq) failed for story generation:',
            groqError?.message || groqError
          );
          return NextResponse.json(
            {
              error: groqError?.message || 'Failed to generate story using AI services',
            },
            { status: 502 }
          );
        }
      }
    }
  } catch (err: any) {
    console.error('Unhandled error in /api/story:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
