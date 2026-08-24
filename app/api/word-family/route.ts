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

    // 1. Try Google AI (Gemma 4 26B A4B) first
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

      // 2. Fallback to Cloudflare AI (Gemma 4 26B A4B)
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
        console.warn(
          'Cloudflare AI failed for word family, falling back to Groq AI:',
          cfError.message || cfError
        );

        // 3. Fallback to Groq AI (Qwen 3.6 27B / GPT-OSS 120B)
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
          console.error(
            'All AI services (Google, Cloudflare, Groq) failed for word family:',
            groqError.message || groqError
          );
          return NextResponse.json(
            {
              error: groqError?.message || 'Failed to generate word family using AI services',
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
