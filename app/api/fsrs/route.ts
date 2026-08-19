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
    const quiz_mode = body.quiz_mode || body.quizMode || 'wordToMeaning';
    let word = body.word;
    let meaning = body.meaning || '';
    const due_at = body.due_at || body.dueAt || new Date().toISOString();
    const stability = body.stability ?? 0;
    const difficulty = body.difficulty ?? 0;
    const elapsed_days = body.elapsed_days ?? body.elapsedDays ?? 0;
    const scheduled_days = body.scheduled_days ?? body.scheduledDays ?? 0;
    const learning_steps = body.learning_steps ?? body.learningSteps ?? 0;
    const reps = body.reps ?? 0;
    const lapses = body.lapses ?? 0;
    const state = body.state || 'New';
    const last_reviewed_at =
      body.last_reviewed_at ||
      body.lastReviewedAt ||
      due_at ||
      body.updated_at ||
      body.updatedAt ||
      new Date().toISOString();
    const updated_at = body.updated_at || body.updatedAt || new Date().toISOString();
    const deleted = body.deleted ?? body.isDeleted ?? false;

    if (!id || !word_id) {
      return NextResponse.json(
        { error: 'Missing required fields: id and word_id' },
        { status: 400 }
      );
    }

    // Fallback: If word is missing, resolve word and meaning from the main words table
    if (!word && word_id) {
      const { data: wordDoc } = await supabase
        .from('words')
        .select('word, meaning')
        .eq('id', word_id)
        .maybeSingle();

      if (wordDoc) {
        word = wordDoc.word;
        if (!meaning) {meaning = wordDoc.meaning || '';}
      } else {
        word = 'Unknown';
      }
    }

    const payload = {
      id,
      word_id,
      quiz_mode,
      word,
      meaning,
      due_at,
      stability,
      difficulty,
      elapsed_days,
      scheduled_days,
      learning_steps,
      reps,
      lapses,
      state,
      last_reviewed_at,
      updated_at,
      deleted,
    };

    const { data, error } = await supabase
      .from('fsrs_records')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const { data, error } = await supabase.from('fsrs_records').select('*').eq('id', id).single();

      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

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
    }

    // Fetch ALL records with pagination to bypass Supabase 1000 row limit
    const data = await fetchAllSupabaseRows('fsrs_records');

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
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
