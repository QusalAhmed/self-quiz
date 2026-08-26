import { NextResponse } from 'next/server';
import { DEFAULT_APP_SETTINGS, normalizeAppSettings, type AppSettings } from '@/lib/settings-utils';
import { supabase } from '@/lib/supabase';

export const revalidate = 0; // Disable static caching for dynamic settings

/**
 * Server-side helper to fetch current application settings directly from Supabase
 */
export async function getServerSettings(): Promise<AppSettings> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 'default')
      .eq('deleted', false)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_APP_SETTINGS;
    }

    return normalizeAppSettings({
      appearance: data.appearance,
      studyQuiz: data.study_quiz ?? data.studyQuiz,
      audio: data.audio,
      fsrs: data.fsrs,
      ai: data.ai,
      notifications: data.notifications,
      data: data.data,
      quranVerse: data.quran_verse ?? data.quranVerse,
    });
  } catch (err) {
    console.warn('Error in getServerSettings:', err);
    return DEFAULT_APP_SETTINGS;
  }
}

/**
 * GET /api/settings
 * Retrieves the application settings from the Supabase database.
 * If no settings exist yet, automatically seeds the default settings.
 */
export async function GET(): Promise<Response> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 'default')
      .eq('deleted', false)
      .maybeSingle();

    if (error) {
      console.warn('Supabase error fetching settings in /api/settings:', error);
      return NextResponse.json(
        { settings: DEFAULT_APP_SETTINGS, fromDefault: true },
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    if (!data) {
      // Seed default settings into Supabase
      const now = new Date().toISOString();
      const initialPayload = {
        id: 'default',
        appearance: DEFAULT_APP_SETTINGS.appearance,
        study_quiz: DEFAULT_APP_SETTINGS.studyQuiz,
        audio: DEFAULT_APP_SETTINGS.audio,
        fsrs: DEFAULT_APP_SETTINGS.fsrs,
        ai: DEFAULT_APP_SETTINGS.ai,
        notifications: DEFAULT_APP_SETTINGS.notifications,
        data: DEFAULT_APP_SETTINGS.data,
        quran_verse: DEFAULT_APP_SETTINGS.quranVerse,
        created_at: now,
        updated_at: now,
        deleted: false,
      };

      const { error: insertError } = await supabase
        .from('app_settings')
        .upsert(initialPayload, { onConflict: 'id' });

      if (insertError) {
        console.warn('Could not seed initial settings to Supabase:', insertError);
      }

      return NextResponse.json(
        { settings: DEFAULT_APP_SETTINGS, seeded: true },
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
    }

    const normalized = normalizeAppSettings({
      appearance: data.appearance,
      studyQuiz: data.study_quiz ?? data.studyQuiz,
      audio: data.audio,
      fsrs: data.fsrs,
      ai: data.ai,
      notifications: data.notifications,
      data: data.data,
      quranVerse: data.quran_verse ?? data.quranVerse,
    });

    return NextResponse.json(
      { settings: normalized, success: true },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('API error in GET /api/settings:', error);
    return NextResponse.json(
      {
        settings: DEFAULT_APP_SETTINGS,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Updates or creates application settings in Supabase database.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const rawSettings = body?.settings || body;
    const normalized = normalizeAppSettings(rawSettings);

    const now = new Date().toISOString();
    const payload = {
      id: 'default',
      appearance: normalized.appearance,
      study_quiz: normalized.studyQuiz,
      audio: normalized.audio,
      fsrs: normalized.fsrs,
      ai: normalized.ai,
      notifications: normalized.notifications,
      data: normalized.data,
      quran_verse: normalized.quranVerse,
      updated_at: now,
      deleted: false,
    };

    const { data, error } = await supabase
      .from('app_settings')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Supabase error saving settings in /api/settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: normalized, success: true, data });
  } catch (error) {
    console.error('API error in POST /api/settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
