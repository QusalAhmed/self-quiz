import { NextResponse } from 'next/server';
import { getServerSettings } from '@/app/api/settings/route';
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
  provider?: 'google' | 'cloudflare' | 'groq' | 'auto';
  apiKey?: string;
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
  const referenceExamples = normalizeReferenceExamples(body?.referenceExamples);
  const partOfSpeech = normalizePartOfSpeech(body?.partOfSpeech);

  if (!word || !meaning) {
    return NextResponse.json({ error: 'Word and meaning are required' }, { status: 400 });
  }

  // Load server settings for AI preferences
  const serverSettings = await getServerSettings();
  const targetCount = normalizeAiExampleCount(body?.count ?? serverSettings.ai?.exampleCount);
  const preferredProvider = body?.provider || serverSettings.ai?.preferredProvider || 'google';

  const runners: Record<string, () => Promise<string[]>> = {
    google: () =>
      generateGoogleExamples({
        word,
        meaning,
        targetCount,
        partOfSpeech,
        referenceExamples,
      }),
    cloudflare: () =>
      generateCloudflareExamples({
        word,
        meaning,
        targetCount,
        partOfSpeech,
        referenceExamples,
      }),
    groq: () =>
      generateGroqExamples({
        word,
        meaning,
        targetCount,
        partOfSpeech,
        referenceExamples,
      }),
  };

  // Determine provider execution order based on server settings & request
  const order: Array<'google' | 'cloudflare' | 'groq'> =
    preferredProvider === 'groq'
      ? ['groq', 'google', 'cloudflare']
      : preferredProvider === 'cloudflare'
        ? ['cloudflare', 'google', 'groq']
        : ['google', 'cloudflare', 'groq'];

  let lastError: Error | null = null;

  for (const provider of order) {
    try {
      const examples = await runners[provider]();
      return NextResponse.json({ examples, provider });
    } catch (err: any) {
      console.warn(`Provider ${provider} failed, trying fallback:`, err?.message || err);
      lastError = err;
    }
  }

  console.error('All AI services failed:', lastError?.message || lastError);
  return NextResponse.json(
    { error: lastError?.message || 'Failed to generate examples using AI services' },
    { status: 502 }
  );
}
