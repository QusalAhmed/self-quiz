import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { definitionsToMeaning, normalizeDefinitions } from '@/lib/definitions';

export const revalidate = 0; // Disable caching for this route

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      word,
      meaning,
      definitions,
      examples,
      user_examples,
      created_at,
      updated_at,
      deleted,
      custom_group,
      custom_groups,
    } = body;

    if (!id || !word) {
      return NextResponse.json({ error: 'Missing required fields: id and word' }, { status: 400 });
    }

    const normalizedGroups = Array.isArray(custom_groups)
      ? custom_groups.filter((g: unknown) => typeof g === 'string' && g.trim().length > 0)
      : custom_group?.trim()
        ? [custom_group.trim()]
        : [];
    const normalizedDefinitions = normalizeDefinitions(definitions, meaning || '');

    const payload = {
      id,
      word,
      meaning: definitionsToMeaning(normalizedDefinitions),
      definitions: normalizedDefinitions,
      examples: Array.isArray(examples) ? examples : [],
      user_examples: Array.isArray(user_examples) ? user_examples : [],
      created_at: created_at || new Date().toISOString(),
      updated_at: updated_at || new Date().toISOString(),
      deleted: deleted || false,
      custom_groups: normalizedGroups,
      custom_group: normalizedGroups[0] || '',
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

    // Return ALL records including deleted ones so other devices can
    // apply soft-deletes when they pull. The client filters isDeleted locally.
    const { data, error } = await supabase.from('words').select('*');

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
