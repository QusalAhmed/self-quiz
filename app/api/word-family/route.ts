import { NextResponse } from 'next/server';
import { generateCloudflareWordFamily } from '@/lib/cloudflare';
import { generateGoogleWordFamily } from '@/lib/google';
import { generateGroqWordFamily } from '@/lib/groq';
import { filterValidWordFamilyMembers } from '@/lib/word-family';

type WordFamilyPayload = {
  word?: string;
  meaning?: string;
};

export async function POST(request: Request) {
  try {
    let body: WordFamilyPayload | null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const word = body?.word?.trim();
    const meaning = body?.meaning?.trim();

    if (!word) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }

    // 1. Try Groq AI (Llama 3.3 70B) first
    try {
      const result = await generateGroqWordFamily({ word, meaning });
      const validatedMembers = await filterValidWordFamilyMembers(
        result.members,
        word,
        result.generatorAiDetails
      );
      return NextResponse.json({
        members: validatedMembers,
        rootUsageFrequency: result.rootUsageFrequency || '',
        generatorAiDetails: result.generatorAiDetails || '',
      });
    } catch (groqError: any) {
      console.warn(
        'Groq AI failed for word family, falling back to Google AI:',
        groqError.message || groqError
      );

      // 2. Fallback to Google AI (Gemini / Gemma)
      try {
        const result = await generateGoogleWordFamily({ word, meaning });
        const validatedMembers = await filterValidWordFamilyMembers(
          result.members,
          word,
          result.generatorAiDetails
        );
        return NextResponse.json({
          members: validatedMembers,
          rootUsageFrequency: result.rootUsageFrequency || '',
          generatorAiDetails: result.generatorAiDetails || '',
        });
      } catch (googleError: any) {
        console.warn(
          'Google AI failed for word family, falling back to Cloudflare AI:',
          googleError.message || googleError
        );

        // 3. Fallback to Cloudflare AI (Llama)
        try {
          const result = await generateCloudflareWordFamily({ word, meaning });
          const validatedMembers = await filterValidWordFamilyMembers(
            result.members,
            word,
            result.generatorAiDetails
          );
          return NextResponse.json({
            members: validatedMembers,
            rootUsageFrequency: result.rootUsageFrequency || '',
            generatorAiDetails: result.generatorAiDetails || '',
          });
        } catch (cfError: any) {
          console.error(
            'All AI services (Groq, Google, Cloudflare) failed for word family:',
            cfError.message || cfError
          );
          return NextResponse.json(
            {
              error: cfError?.message || 'Failed to generate word family using AI services',
            },
            { status: 502 }
          );
        }
      }
    }
  } catch (err: any) {
    console.error('Unhandled error in /api/word-family:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
