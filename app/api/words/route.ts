import { NextRequest, NextResponse } from 'next/server';
import { definitionsToMeaning, normalizeDefinitions } from '@/lib/definitions';
import { normalizeAiExampleCount } from '@/lib/examples';
import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseRows } from '@/lib/supabase-pagination';

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
      ai_example_count,
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
      ai_example_count: normalizeAiExampleCount(ai_example_count),
      notes: typeof body.notes === 'string' ? body.notes : '',
      usage_frequency:
        typeof body.usage_frequency === 'string'
          ? body.usage_frequency
          : typeof body.usageFrequency === 'string'
            ? body.usageFrequency
            : '',
      generator_ai_details:
        typeof body.generator_ai_details === 'string'
          ? body.generator_ai_details
          : typeof body.generatorAiDetails === 'string'
            ? body.generatorAiDetails
            : '',
    };

    let { data, error } = await supabase.from('words').upsert(payload, { onConflict: 'id' });

    // Fallback if remote Supabase schema has not been updated with 'notes' or 'usage_frequency' columns yet
    if (
      error &&
      (error.message?.includes('notes') ||
        error.message?.includes('usage_frequency') ||
        error.message?.includes('generator_ai_details') ||
        error.message?.includes('schema cache') ||
        error.code === 'PGRST204')
    ) {
      console.warn(
        'Supabase notice: newer columns missing in remote words table. Retrying upsert with compatible payload.'
      );
      const compatiblePayload = { ...payload };
      if (error.message?.includes('notes')) {
        delete (compatiblePayload as Record<string, unknown>).notes;
      }
      if (error.message?.includes('usage_frequency')) {
        delete (compatiblePayload as Record<string, unknown>).usage_frequency;
      }
      if (error.message?.includes('generator_ai_details')) {
        delete (compatiblePayload as Record<string, unknown>).generator_ai_details;
      }
      const retryResult = await supabase
        .from('words')
        .upsert(compatiblePayload, { onConflict: 'id' });
      data = retryResult.data;
      error = retryResult.error;
    }

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

    // Fetch ALL records with pagination to bypass Supabase 1000 row limit
    const data = await fetchAllSupabaseRows('words');

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
