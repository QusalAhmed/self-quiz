import { NextResponse } from 'next/server';
import { getServerSettings } from '@/app/api/settings/route';
import { supabase } from '@/lib/supabase';
import { resolveWordFrequency, type WordFrequencyProvider } from '@/lib/word-frequency';

export type WordFrequencyApiPayload = {
  word?: string;
  meaning?: string;
  provider?: WordFrequencyProvider;
  wordId?: string;
  storeInDb?: boolean;
};

export async function POST(request: Request) {
  let body: WordFrequencyApiPayload | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const word = body?.word?.trim();
  if (!word) {
    return NextResponse.json({ error: 'Word is required for frequency lookup' }, { status: 400 });
  }

  try {
    const serverSettings = await getServerSettings();
    const preferredProvider =
      body?.provider && body.provider !== 'auto'
        ? body.provider
        : (serverSettings.ai?.verificationProvider as WordFrequencyProvider) || 'auto';

    const customGoogleApiKey = serverSettings.ai?.useCustomApiKeys
      ? serverSettings.ai?.customGeminiApiKey
      : undefined;
    const customGroqApiKey = serverSettings.ai?.useCustomApiKeys
      ? serverSettings.ai?.customGroqApiKey
      : undefined;
    const customCloudflareApiToken = serverSettings.ai?.useCustomApiKeys
      ? serverSettings.ai?.customCloudflareApiToken
      : undefined;
    const customCloudflareAccountId = serverSettings.ai?.useCustomApiKeys
      ? serverSettings.ai?.customCloudflareAccountId
      : undefined;
    const customWordsApiKey = serverSettings.ai?.useCustomApiKeys
      ? serverSettings.ai?.customWordsApiKey
      : undefined;
    const groqModel = serverSettings.ai?.groqModel;

    const result = await resolveWordFrequency({
      word,
      meaning: body?.meaning,
      provider: preferredProvider,
      customGoogleApiKey,
      customGroqApiKey,
      customCloudflareApiToken,
      customCloudflareAccountId,
      customWordsApiKey,
      groqModel,
    });

    let storedInDb = false;
    const wordId = body?.wordId?.trim();
    if (body?.storeInDb && wordId && supabase) {
      const now = new Date().toISOString();
      const { error: dbError } = await supabase
        .from('words')
        .update({
          usage_frequency: result.usageFrequency,
          generator_ai_details: result.generatorDetails || '',
          updated_at: now,
        })
        .eq('id', wordId);

      if (!dbError) {
        storedInDb = true;
      } else {
        console.warn('Could not store frequency directly in Supabase:', dbError.message);
      }
    }

    return NextResponse.json({
      success: true,
      word: result.word,
      usageFrequency: result.usageFrequency,
      source: result.source,
      generatorDetails: result.generatorDetails,
      tier: result.tier,
      zipf: result.zipf,
      perMillion: result.perMillion,
      diversity: result.diversity,
      explanation: result.explanation,
      storedInDb,
    });
  } catch (error: any) {
    console.error('Word frequency API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve word frequency' },
      { status: 500 }
    );
  }
}
