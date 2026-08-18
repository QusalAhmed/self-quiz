import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseRows } from '@/lib/supabase-pagination';

export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const id = body.id;
    const word_id = body.word_id || body.wordId;
    const card_id = body.card_id || body.cardId;
    const quiz_mode = body.quiz_mode || body.quizMode || 'wordToMeaning';
    const word = body.word || '';
    const meaning = body.meaning || '';
    const rating = body.rating || 'good';
    const state_before = body.state_before || body.stateBefore || 'New';
    const state_after = body.state_after || body.stateAfter || 'New';
    const reviewed_at = body.reviewed_at || body.reviewedAt || new Date().toISOString();
    const duration_ms = body.duration_ms ?? body.durationMs ?? 0;
    const stability = body.stability ?? 0;
    const difficulty = body.difficulty ?? 0;
    const elapsed_days = body.elapsed_days ?? body.elapsedDays ?? 0;
    const scheduled_days = body.scheduled_days ?? body.scheduledDays ?? 0;
    const due_at = body.due_at || body.dueAt || new Date().toISOString();
    const previous_due_at = body.previous_due_at || body.previousDueAt || null;
    const lapses = body.lapses ?? 0;
    const reps = body.reps ?? 0;
    const retrievability = body.retrievability ?? 0;
    const created_at = body.created_at || body.createdAt || new Date().toISOString();
    const updated_at = body.updated_at || body.updatedAt || new Date().toISOString();
    const deleted = body.deleted ?? body.isDeleted ?? false;

    if (!id || !word_id) {
      return NextResponse.json(
        { error: 'Missing required fields: id and word_id' },
        { status: 400 }
      );
    }

    const payload = {
      id,
      word_id,
      card_id,
      quiz_mode,
      word,
      meaning,
      rating,
      state_before,
      state_after,
      reviewed_at,
      duration_ms,
      stability,
      difficulty,
      elapsed_days,
      scheduled_days,
      due_at,
      previous_due_at,
      lapses,
      reps,
      retrievability,
      created_at,
      updated_at,
      deleted,
    };

    const { data, error } = await supabase
      .from('review_logs')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Supabase review_logs insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error('API error in /api/review-logs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wordId = searchParams.get('word_id') || searchParams.get('wordId');
    const cardId = searchParams.get('card_id') || searchParams.get('cardId');

    if (wordId) {
      const { data, error } = await supabase
        .from('review_logs')
        .select('*')
        .eq('word_id', wordId)
        .order('reviewed_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    if (cardId) {
      const { data, error } = await supabase
        .from('review_logs')
        .select('*')
        .eq('card_id', cardId)
        .order('reviewed_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ data });
    }

    const data = await fetchAllSupabaseRows('review_logs');

    return NextResponse.json(
      { data },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('API error in /api/review-logs GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
