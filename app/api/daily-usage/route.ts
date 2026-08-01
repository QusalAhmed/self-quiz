import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseRows } from '@/lib/supabase-pagination';

export const revalidate = 0; // Disable caching for this route

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, date, device_id, deviceId, seconds, updated_at, updatedAt, deleted } = body;

    if (!id || !date || (!device_id && !deviceId)) {
      return NextResponse.json(
        { error: 'Missing required fields: id, date, and device_id' },
        { status: 400 }
      );
    }

    const payload = {
      id,
      date,
      device_id: device_id || deviceId,
      seconds: seconds ?? 0,
      updated_at: updated_at || updatedAt || new Date().toISOString(),
      deleted: deleted || false,
    };

    const { data, error } = await supabase
      .from('daily_usage')
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
      const { data, error } = await supabase.from('daily_usage').select('*').eq('id', id).single();

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
    const data = await fetchAllSupabaseRows('daily_usage');

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
