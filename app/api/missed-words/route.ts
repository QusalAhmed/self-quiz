import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, word_id, quiz_mode, word, meaning, missed_at, missed_count, updated_at, deleted } =
      body;

    if (!id || !word_id || !word) {
      return NextResponse.json(
        { error: 'Missing required fields: id, word_id, and word' },
        { status: 400 }
      );
    }

    const payload = {
      id,
      word_id,
      quiz_mode: quiz_mode || 'wordToMeaning',
      word,
      meaning: meaning || '',
      missed_at: missed_at || new Date().toISOString(),
      missed_count: missed_count ?? 1,
      updated_at: updated_at || new Date().toISOString(),
      deleted: deleted || false,
    };

    const { data, error } = await supabase
      .from('missed_words')
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
      const { data, error } = await supabase.from('missed_words').select('*').eq('id', id).single();

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

    // Return ALL records including deleted ones so other devices can
    // apply soft-deletes when they pull. The client filters isDeleted locally.
    const { data, error } = await supabase.from('missed_words').select('*');

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
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
