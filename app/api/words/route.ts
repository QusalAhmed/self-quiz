import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 0; // Disable caching for this route

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, word, meaning, examples, user_examples, created_at, updated_at, deleted } = body;

    if (!id || !word) {
      return NextResponse.json({ error: 'Missing required fields: id and word' }, { status: 400 });
    }

    const payload = {
      id,
      word,
      meaning: meaning || '',
      examples: Array.isArray(examples) ? examples : [],
      user_examples: Array.isArray(user_examples) ? user_examples : [],
      created_at: created_at || new Date().toISOString(),
      updated_at: updated_at || new Date().toISOString(),
      deleted: deleted || false,
    };

    const { data, error } = await supabase.from('words').upsert(payload, { onConflict: 'id' });

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
      const { data, error } = await supabase.from('words').select('*').eq('id', id).single();

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

    const { data, error } = await supabase.from('words').select('*').eq('deleted', false);

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
