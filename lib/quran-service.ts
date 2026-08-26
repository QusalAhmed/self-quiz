import { getDatabase, type QuranVerseRecord } from './db';
import { CURATED_INSPIRATIONAL_VERSES, getChapterMetadata } from './quran-api';
import { supabase } from './supabase';

/**
 * Safely executes a Supabase query in background without throwing unhandled rejections
 */
export async function safeSupabaseSync(task: () => PromiseLike<any>): Promise<void> {
  if (supabase && (typeof navigator === 'undefined' || navigator.onLine)) {
    try {
      const res = await task();
      if (res && res.error) {
        console.warn('Supabase Quran verses sync warning/error:', res.error);
      }
    } catch (err) {
      console.warn('Supabase Quran verses sync warning:', err);
    }
  }
}

/**
 * Tracks if the remote Supabase table schema supports 'verse_end'.
 * If PostgREST returns PGRST204 on verse_end, this flips to false and automatically
 * falls back to standard columns without erroring.
 */
let isVerseEndSupportedInSupabase = true;

/**
 * Resets or overrides verse_end schema support for testing
 */
export function setVerseEndSchemaSupportForTesting(supported = true): void {
  isVerseEndSupportedInSupabase = supported;
}

/**
 * Safely normalizes optional timestamp strings to a valid ISO string or null for PostgreSQL.
 * Empty strings, whitespace, or invalid date strings are always converted to null.
 */
export function normalizeNullableTimestamp(val: any): string | null {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString();
  }
  return null;
}

/**
 * Safely normalizes required timestamp strings to a valid ISO string for PostgreSQL.
 */
export function normalizeRequiredTimestamp(val: any): string {
  return normalizeNullableTimestamp(val) || new Date().toISOString();
}

/**
 * Robustly upserts Quran verse records to Supabase.
 * If the remote table has not been migrated with 'verse_end' column yet (PGRST204),
 * it gracefully strips 'verse_end' and retries without error.
 */
export async function upsertQuranVersesToSupabase(
  rows: Record<string, any> | Record<string, any>[]
): Promise<{ data: any; error: any }> {
  if (!supabase) {
    return { data: null, error: null };
  }

  const list = Array.isArray(rows) ? rows : [rows];
  if (list.length === 0) {
    return { data: null, error: null };
  }

  const formatPayload = (item: Record<string, any>, includeVerseEnd: boolean) => {
    const rawLastViewed = item.lastViewedAt ?? item.last_viewed_at;
    const rawCreatedAt = item.createdAt ?? item.created_at;
    const rawUpdatedAt = item.updatedAt ?? item.updated_at;
    const rawLastError = item.lastError ?? item.last_error;

    const payload: Record<string, any> = {
      id: String(item.id),
      chapter: Number(item.chapter),
      verse: Number(item.verse),
      category: item.category || 'Inspirational',
      notes: item.notes || '',
      status: item.status || 'active',
      view_count: Number(item.viewCount ?? item.view_count ?? 0),
      last_viewed_at: normalizeNullableTimestamp(rawLastViewed),
      last_error:
        typeof rawLastError === 'string' && rawLastError.trim() !== '' ? rawLastError.trim() : null,
      created_at: normalizeRequiredTimestamp(rawCreatedAt),
      updated_at: normalizeRequiredTimestamp(rawUpdatedAt),
      deleted: Boolean(item.isDeleted ?? item.deleted),
    };

    if (includeVerseEnd && (item.verseEnd !== undefined || item.verse_end !== undefined)) {
      const vEnd = item.verseEnd ?? item.verse_end;
      payload.verse_end = vEnd !== null && vEnd !== undefined && vEnd !== '' ? Number(vEnd) : null;
    }

    return payload;
  };

  if (isVerseEndSupportedInSupabase) {
    const payloads = list.map((item) => formatPayload(item, true));
    const res = await supabase.from('quran_verses').upsert(payloads, { onConflict: 'id' });

    if (!res.error) {
      return res;
    }

    const isMissingVerseEndCol =
      res.error.code === 'PGRST204' ||
      (typeof res.error.message === 'string' && res.error.message.includes("'verse_end'"));

    if (isMissingVerseEndCol) {
      isVerseEndSupportedInSupabase = false;
      const fallbackPayloads = list.map((item) => formatPayload(item, false));
      const fallbackRes = await supabase
        .from('quran_verses')
        .upsert(fallbackPayloads, { onConflict: 'id' });
      return fallbackRes;
    }

    return res;
  }

  const fallbackPayloads = list.map((item) => formatPayload(item, false));
  return await supabase.from('quran_verses').upsert(fallbackPayloads, { onConflict: 'id' });
}

/**
 * Ensures initial curated motivational verses are seeded in local RxDB and Supabase if empty
 */
export async function ensureDefaultQuranVersesSeeded(): Promise<QuranVerseRecord[]> {
  try {
    const db = await getDatabase();
    const existing = await db.quranVerses.find().exec();

    if (existing && existing.length > 0) {
      const active = existing.filter((doc) => !doc.isDeleted);
      const mappedActive = active.map((doc) => doc.toJSON() as QuranVerseRecord);

      // In background, ensure existing local verses are mirrored to Supabase if missing
      void safeSupabaseSync(() => upsertQuranVersesToSupabase(mappedActive));

      return mappedActive;
    }

    // Try fetching from Supabase first
    if (supabase && (typeof navigator === 'undefined' || navigator.onLine)) {
      try {
        const { data: supaData, error } = await supabase
          .from('quran_verses')
          .select('*')
          .eq('deleted', false);

        if (!error && supaData && supaData.length > 0) {
          const mapped: QuranVerseRecord[] = supaData.map((row: any) => {
            let verseEnd: number | undefined = undefined;
            if (row.verse_end) {
              verseEnd = Number(row.verse_end);
            } else if (typeof row.id === 'string' && row.id.includes('-')) {
              const match = row.id.match(/^\d+:(\d+)-(\d+)$/);
              if (match) {
                verseEnd = parseInt(match[2], 10);
              }
            }
            return {
              id: row.id,
              chapter: Number(row.chapter),
              verse: Number(row.verse),
              verseEnd,
              category: row.category || 'Inspirational',
              notes: row.notes || '',
              status: (row.status as any) || 'active',
              viewCount: Number(row.view_count || 0),
              lastViewedAt: row.last_viewed_at || undefined,
              lastError: row.last_error || undefined,
              createdAt: row.created_at || new Date().toISOString(),
              updatedAt: row.updated_at || new Date().toISOString(),
              isDeleted: Boolean(row.deleted),
              lastSyncedAt: new Date().toISOString(),
            };
          });

          for (const r of mapped) {
            await db.quranVerses.upsert(r);
          }
          return mapped;
        }
      } catch (err) {
        console.warn('Could not pull initial verses from Supabase:', err);
      }
    }

    // Seed curated defaults
    const now = new Date().toISOString();
    const seeds: QuranVerseRecord[] = CURATED_INSPIRATIONAL_VERSES.map((preset) => ({
      id: preset.key,
      chapter: preset.chapter,
      verse: preset.verse,
      verseEnd: preset.verseEnd,
      category: preset.theme,
      notes: `${preset.title}: ${preset.description}`,
      status: 'active',
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      lastSyncedAt: '',
    }));

    for (const seed of seeds) {
      await db.quranVerses.upsert(seed);
    }

    // Push seeds to Supabase in background
    void safeSupabaseSync(() => upsertQuranVersesToSupabase(seeds));

    return seeds;
  } catch (error) {
    console.error('Failed to ensure default Quran verses:', error);
    return [];
  }
}

/**
 * Gets all active and non-deleted Quran verse records
 */
export async function getAllQuranVerses(): Promise<QuranVerseRecord[]> {
  try {
    const db = await getDatabase();
    const allDocs = await db.quranVerses.find().exec();
    if (allDocs.length === 0) {
      await ensureDefaultQuranVersesSeeded();
    }
    const nonDeleted = await db.quranVerses.find({ selector: { isDeleted: { $ne: true } } }).exec();
    return nonDeleted.map((d) => d.toJSON() as QuranVerseRecord);
  } catch (err) {
    console.error('Error fetching Quran verses from RxDB:', err);
    return [];
  }
}

/**
 * Adds a new Quran verse record (single verse or verse range)
 */
export async function addQuranVerseRecord(params: {
  chapter: number;
  verse: number;
  verseEnd?: number;
  category?: string;
  notes?: string;
}): Promise<QuranVerseRecord> {
  const { chapter, verse, verseEnd, category = 'Inspirational', notes = '' } = params;
  const meta = getChapterMetadata(chapter);
  if (!meta) {
    throw new Error(`Invalid Surah number: ${chapter}`);
  }
  if (verse < 1 || verse > meta.versesCount) {
    throw new Error(
      `Invalid Ayah number ${verse} for Surah ${meta.nameSimple} (max ${meta.versesCount})`
    );
  }
  if (verseEnd && (verseEnd < 1 || verseEnd > meta.versesCount || verseEnd < verse)) {
    throw new Error(
      `Invalid Ayah range ${verse}-${verseEnd} for Surah ${meta.nameSimple} (max ${meta.versesCount})`
    );
  }

  const isRange = typeof verseEnd === 'number' && verseEnd > verse;
  const id = isRange ? `${chapter}:${verse}-${verseEnd}` : `${chapter}:${verse}`;
  const now = new Date().toISOString();
  const record: QuranVerseRecord = {
    id,
    chapter,
    verse,
    ...(isRange ? { verseEnd } : {}),
    category,
    notes,
    status: 'active',
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    lastSyncedAt: '',
  };

  const db = await getDatabase();
  await db.quranVerses.upsert(record);

  // Sync to Supabase in background
  void safeSupabaseSync(() => upsertQuranVersesToSupabase(record));

  return record;
}

/**
 * Adds multiple Quran verses at once (batch mode, supports ranges)
 */
export async function addBatchQuranVerses(
  items: {
    chapter: number;
    verse: number;
    verseEnd?: number;
    category?: string;
    notes?: string;
  }[]
): Promise<QuranVerseRecord[]> {
  const results: QuranVerseRecord[] = [];
  const now = new Date().toISOString();
  const db = await getDatabase();

  for (const item of items) {
    const meta = getChapterMetadata(item.chapter);
    if (!meta || item.verse < 1 || item.verse > meta.versesCount) {
      continue;
    }
    if (
      item.verseEnd &&
      (item.verseEnd < 1 || item.verseEnd > meta.versesCount || item.verseEnd < item.verse)
    ) {
      continue;
    }

    const isRange = typeof item.verseEnd === 'number' && item.verseEnd > item.verse;
    const id = isRange
      ? `${item.chapter}:${item.verse}-${item.verseEnd}`
      : `${item.chapter}:${item.verse}`;

    const record: QuranVerseRecord = {
      id,
      chapter: item.chapter,
      verse: item.verse,
      ...(isRange ? { verseEnd: item.verseEnd } : {}),
      category: item.category || 'Inspirational',
      notes: item.notes || '',
      status: 'active',
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      lastSyncedAt: '',
    };

    await db.quranVerses.upsert(record);
    results.push(record);
  }

  if (results.length > 0) {
    void safeSupabaseSync(() => upsertQuranVersesToSupabase(results));
  }

  return results;
}

/**
 * Deletes a Quran verse (soft delete)
 */
export async function deleteQuranVerseRecord(id: string): Promise<void> {
  const db = await getDatabase();
  const doc = await db.quranVerses.findOne({ selector: { id } }).exec();
  const now = new Date().toISOString();

  if (doc) {
    await doc.patch({
      isDeleted: true,
      updatedAt: now,
    });
  }

  void safeSupabaseSync(() =>
    supabase.from('quran_verses').update({ deleted: true, updated_at: now }).eq('id', id)
  );
}

/**
 * Toggles a verse between active and paused status
 */
export async function toggleQuranVerseStatus(id: string, active: boolean): Promise<void> {
  const db = await getDatabase();
  const doc = await db.quranVerses.findOne({ selector: { id } }).exec();
  const now = new Date().toISOString();
  const newStatus = active ? 'active' : 'paused';

  if (doc) {
    await doc.patch({
      status: newStatus,
      updatedAt: now,
    });
  }

  void safeSupabaseSync(() =>
    supabase.from('quran_verses').update({ status: newStatus, updated_at: now }).eq('id', id)
  );
}

/**
 * Updates status when an API call succeeds
 */
export async function recordVerseFetchSuccess(id: string): Promise<void> {
  const db = await getDatabase();
  const doc = await db.quranVerses.findOne({ selector: { id } }).exec();
  const now = new Date().toISOString();

  if (doc) {
    const currentCount = doc.viewCount || 0;
    await doc.patch({
      status: 'active',
      viewCount: currentCount + 1,
      lastViewedAt: now,
      lastError: '',
      updatedAt: now,
    });
  }

  void safeSupabaseSync(() =>
    supabase
      .from('quran_verses')
      .update({
        status: 'active',
        view_count: (doc?.viewCount || 0) + 1,
        last_viewed_at: now,
        last_error: null,
        updated_at: now,
      })
      .eq('id', id)
  );
}

/**
 * Updates status when an API call fails
 */
export async function recordVerseFetchError(id: string, errorMessage: string): Promise<void> {
  const db = await getDatabase();
  const doc = await db.quranVerses.findOne({ selector: { id } }).exec();
  const now = new Date().toISOString();

  if (doc) {
    await doc.patch({
      status: 'error',
      lastError: errorMessage,
      updatedAt: now,
    });
  }

  void safeSupabaseSync(() =>
    supabase
      .from('quran_verses')
      .update({
        status: 'error',
        last_error: errorMessage,
        updated_at: now,
      })
      .eq('id', id)
  );
}

/**
 * Chooses a random active verse record
 */
export async function getRandomActiveVerse(excludeId?: string): Promise<QuranVerseRecord | null> {
  const all = await getAllQuranVerses();
  const activeVerses = all.filter((v) => !v.isDeleted && v.status !== 'paused');

  if (activeVerses.length === 0) {
    // If none are active, try unpausing or using any non-deleted
    const fallback = all.filter((v) => !v.isDeleted);
    if (fallback.length === 0) {
      return null;
    }
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  const candidates =
    activeVerses.length > 1 && excludeId
      ? activeVerses.filter((v) => v.id !== excludeId)
      : activeVerses;

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return chosen;
}

/**
 * Retrieves a single Quran verse record by ID
 */
export async function getQuranVerseById(id: string): Promise<QuranVerseRecord | null> {
  try {
    const db = await getDatabase();
    const doc = await db.quranVerses.findOne({ selector: { id, isDeleted: { $ne: true } } }).exec();
    if (doc) {
      return doc.toJSON() as QuranVerseRecord;
    }
    return null;
  } catch (err) {
    console.error('Error fetching Quran verse by ID:', err);
    return null;
  }
}

/**
 * Explicitly pushes all local Quran verse records from RxDB to Supabase
 */
export async function pushAllLocalQuranVersesToSupabase(): Promise<{
  pushed: number;
  error?: string;
}> {
  try {
    const db = await getDatabase();
    const all = await db.quranVerses.find().exec();
    if (!all || all.length === 0) {
      return { pushed: 0 };
    }

    if (!supabase) {
      return { pushed: 0, error: 'Supabase client not configured' };
    }

    const rows = all.map((doc) => doc.toJSON() as QuranVerseRecord);
    const { error } = await upsertQuranVersesToSupabase(rows);
    if (error) {
      console.error('Failed to sync local Quran verses to Supabase:', error);
      return { pushed: 0, error: error.message || String(error) };
    }

    return { pushed: rows.length };
  } catch (err: any) {
    console.error('Error pushing local Quran verses to Supabase:', err);
    return { pushed: 0, error: err?.message || String(err) };
  }
}
