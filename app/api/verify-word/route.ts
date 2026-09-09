import { NextResponse } from 'next/server';
import { getServerSettings } from '@/app/api/settings/route';
import {
  verifyWordAndDefinitions,
  type WordVerificationDefinitionInput,
} from '@/lib/word-verification';

type VerifyWordPayload = {
  word?: string;
  definitions?: WordVerificationDefinitionInput[];
  provider?: 'gemini' | 'cloudflare' | 'groq' | 'wordsapi' | 'auto';
};

export async function POST(request: Request) {
  let body: VerifyWordPayload | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const word = body?.word?.trim();
  if (!word) {
    return NextResponse.json({ error: 'Word is required for verification' }, { status: 400 });
  }

  const rawDefinitions = Array.isArray(body?.definitions) ? body.definitions : [];
  const definitions: WordVerificationDefinitionInput[] = rawDefinitions.map((d) => ({
    meaning: typeof d?.meaning === 'string' ? d.meaning.trim() : '',
    partOfSpeech: typeof d?.partOfSpeech === 'string' ? d.partOfSpeech.trim() : '',
  }));

  try {
    const serverSettings = await getServerSettings();
    const preferredProvider =
      body?.provider && body.provider !== 'auto'
        ? body.provider
        : serverSettings.ai?.verificationProvider ||
          (serverSettings.ai?.preferredProvider as any) ||
          'wordsapi';

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

    const result = await verifyWordAndDefinitions({
      word,
      definitions,
      preferredProvider,
      customGoogleApiKey,
      customGroqApiKey,
      customCloudflareApiToken,
      customCloudflareAccountId,
      customWordsApiKey,
      groqModel,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Word verification API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify word and definition' },
      { status: 500 }
    );
  }
}
