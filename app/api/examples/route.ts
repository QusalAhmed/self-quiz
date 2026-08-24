import { NextResponse } from 'next/server';
import { generateCloudflareExamples } from '@/lib/cloudflare';
import { normalizeAiExampleCount } from '@/lib/examples';
import { generateGoogleExamples } from '@/lib/google';
import { generateGroqExamples } from '@/lib/groq';

type ExamplesPayload = {
  word?: string;
  meaning?: string;
  count?: number;
  referenceExamples?: string[];
  partOfSpeech?: string;
};

function normalizeReferenceExamples(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean))
  ).slice(0, 5);
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

  // 1. Try Google AI (Gemma 4 26B A4B) first
  try {
    const examples = await generateGoogleExamples({
      word,
      meaning,
      targetCount,
      partOfSpeech,
      referenceExamples,
    });
    return NextResponse.json({ examples });
  } catch (googleError: any) {
    console.warn(
      'Google AI failed, falling back to Cloudflare AI:',
      googleError.message || googleError
    );

    // 2. Fallback to Cloudflare AI (Gemma 4 26B A4B)
    try {
      const examples = await generateCloudflareExamples({
        word,
        meaning,
        targetCount,
        partOfSpeech,
        referenceExamples,
      });
      return NextResponse.json({ examples });
    } catch (cfError: any) {
      console.warn('Cloudflare AI failed, falling back to Groq AI:', cfError.message || cfError);

      // 3. Fallback to Groq AI (Qwen 3.6 27B / GPT-OSS 120B)
      try {
        const examples = await generateGroqExamples({
          word,
          meaning,
          targetCount,
          partOfSpeech,
          referenceExamples,
        });
        return NextResponse.json({ examples });
      } catch (groqError: any) {
        console.error(
          'All AI services (Google, Cloudflare, Groq) failed:',
          groqError.message || groqError
        );
        return NextResponse.json(
          { error: groqError?.message || 'Failed to generate examples using AI services' },
          { status: 502 }
        );
      }
    }
  }
}
