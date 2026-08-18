import { NextResponse } from 'next/server';
import { generateCloudflareWordFamily } from '@/lib/cloudflare';
import { generateGoogleWordFamily } from '@/lib/google';
import { normalizeWordFamilyMembers, type WordFamilyMember } from '@/lib/word-family';

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

    // Try Google AI (Gemma/Gemini) first
    try {
      const members = await generateGoogleWordFamily({ word, meaning });
      return NextResponse.json({ members: normalizeWordFamilyMembers(members, word) });
    } catch (googleError: any) {
      console.warn(
        'Google AI (Gemma) failed for word family, falling back to Cloudflare AI:',
        googleError.message || googleError
      );

      // Fallback to Cloudflare AI
      try {
        const members = await generateCloudflareWordFamily({ word, meaning });
        return NextResponse.json({ members: normalizeWordFamilyMembers(members, word) });
      } catch (cfError: any) {
        console.error(
          'Both Google AI and Cloudflare AI failed for word family:',
          cfError.message || cfError
        );
        return NextResponse.json(
          {
            error:
              cfError?.message || 'Failed to generate word family using AI services',
          },
          { status: 502 }
        );
      }
    }
  } catch (err: any) {
    console.error('Unhandled error in /api/word-family:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
