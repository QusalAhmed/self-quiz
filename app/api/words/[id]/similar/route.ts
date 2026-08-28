import { NextRequest, NextResponse } from 'next/server';
import {
  computeAndPersistWordSimilarities,
  fetchSimilarWordsFromSupabase,
} from '@/lib/similar-words/database';
import type { SimilarityRelationshipType } from '@/lib/similar-words/types';
import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseRows } from '@/lib/supabase-pagination';

export const revalidate = 0; // Disable route caching

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const wordId = params?.id;
    if (!wordId) {
      return NextResponse.json({ error: 'Missing word ID parameter' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const minScore = parseFloat(searchParams.get('minScore') || '0.45');
    const relationshipType = searchParams.get('relationshipType') as
      | SimilarityRelationshipType
      | 'all'
      | null;
    const computeIfMissing = searchParams.get('computeIfMissing') !== 'false';

    // 1. Try to fetch precomputed relationships from database
    const precomputed = await fetchSimilarWordsFromSupabase(wordId, {
      limit,
      minScore,
      relationshipType: relationshipType || 'all',
    });

    if (precomputed.length > 0) {
      return NextResponse.json({
        wordId,
        total: precomputed.length,
        results: precomputed,
        source: 'precomputed',
      });
    }

    // 2. If no precomputed records found and computeIfMissing is true, compute live
    if (computeIfMissing) {
      // Fetch target word info
      const { data: targetWordData } = await supabase
        .from('words')
        .select('id, word')
        .eq('id', wordId)
        .single();

      if (!targetWordData || !targetWordData.word) {
        return NextResponse.json({
          wordId,
          total: 0,
          results: [],
          source: 'none',
        });
      }

      // Fetch active words from vocabulary
      const allWordsData = await fetchAllSupabaseRows('words');
      const vocabulary = (allWordsData || [])
        .filter((w: any) => !w.deleted && typeof w.word === 'string')
        .map((w: any) => ({ id: w.id, word: w.word }));

      const liveResults = await computeAndPersistWordSimilarities(
        wordId,
        targetWordData.word,
        vocabulary,
        {
          limit,
          minScore,
          relationshipType: relationshipType || 'all',
        }
      );

      return NextResponse.json({
        wordId,
        word: targetWordData.word,
        total: liveResults.length,
        results: liveResults,
        source: 'live_computed',
      });
    }

    return NextResponse.json({
      wordId,
      total: 0,
      results: [],
      source: 'empty',
    });
  } catch (error) {
    console.error('API /api/words/[id]/similar error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const wordId = params?.id;
    if (!wordId) {
      return NextResponse.json({ error: 'Missing word ID parameter' }, { status: 400 });
    }

    const { data: targetWordData, error: wordError } = await supabase
      .from('words')
      .select('id, word')
      .eq('id', wordId)
      .single();

    if (wordError || !targetWordData || !targetWordData.word) {
      return NextResponse.json({ error: 'Target word not found in database' }, { status: 404 });
    }

    const allWordsData = await fetchAllSupabaseRows('words');
    const vocabulary = (allWordsData || [])
      .filter((w: any) => !w.deleted && typeof w.word === 'string')
      .map((w: any) => ({ id: w.id, word: w.word }));

    const results = await computeAndPersistWordSimilarities(
      wordId,
      targetWordData.word,
      vocabulary,
      {
        limit: 50,
        minScore: 0.45,
      }
    );

    return NextResponse.json({
      success: true,
      wordId,
      word: targetWordData.word,
      totalDiscovered: results.length,
      results,
    });
  } catch (error) {
    console.error('POST /api/words/[id]/similar error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
