import { NextRequest, NextResponse } from 'next/server';
import { ALGORITHM_VERSION } from '@/lib/similar-words/config';
import { upsertWordSimilaritiesToSupabase } from '@/lib/similar-words/database';
import { similarWordsEngine } from '@/lib/similar-words/engine';
import { fetchAllSupabaseRows } from '@/lib/supabase-pagination';

export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    let minScore = 0.45;
    try {
      const body = await request.json();
      if (body && typeof body.minScore === 'number') {
        minScore = body.minScore;
      }
    } catch {
      // Use defaults if empty body
    }

    const allWordsData = await fetchAllSupabaseRows('words');
    const vocabulary = (allWordsData || [])
      .filter((w: any) => !w.deleted && typeof w.word === 'string')
      .map((w: any) => ({ id: w.id, word: w.word }));

    if (vocabulary.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No vocabulary words found to process',
        totalWords: 0,
        discoveredRelationships: 0,
      });
    }

    const { records, metrics } = similarWordsEngine.batchComputeAll(vocabulary, minScore);

    // Save records to database in batches
    if (records.length > 0) {
      await upsertWordSimilaritiesToSupabase(records);
    }

    return NextResponse.json({
      success: true,
      algorithmVersion: ALGORITHM_VERSION,
      metrics,
      totalDiscovered: records.length,
    });
  } catch (error) {
    console.error('POST /api/words/similar/batch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
