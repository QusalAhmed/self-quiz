import { getDatabase, type QuranVerseRecord } from './db';
import { CURATED_INSPIRATIONAL_VERSES, getChapterMetadata } from './quran-api';
import { supabase } from './supabase';

/**
 * Safely executes a Supabase query in background without throwing unhandled rejections
 */
async function safeSupabaseSync(task: () => PromiseLike<any>): Promise<void> {
  if (supabase && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      await task();
    } catch (err) {
      console.warn('Supabase Quran verses sync warning:', err);
    }
  }
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
      return active.map((doc) => doc.toJSON() as QuranVerseRecord);
    }

    // Try fetching from Supabase first
    if (supabase && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const { data: supaData, error } = await supabase
          .from('quran_verses')
          .select('*')
          .eq('deleted', false);

        if (!error && supaData && supaData.length > 0) {
          const mapped: QuranVerseRecord[] = supaData.map((row: any) => ({
            id: row.id,
            chapter: row.chapter,
            verse: row.verse,
            verseEnd: row.verse_end || undefined,
            category: row.category || 'Inspirational',
            notes: row.notes || '',
            status: (row.status as any) || 'active',
            viewCount: row.view_count || 0,
            lastViewedAt: row.last_viewed_at || undefined,
            lastError: row.last_error || undefined,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
            isDeleted: Boolean(row.deleted),
            lastSyncedAt: new Date().toISOString(),
          }));

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
    void safeSupabaseSync(() =>
      supabase.from('quran_verses').upsert(
        seeds.map((s) => ({
          id: s.id,
          chapter: s.chapter,
          verse: s.verse,
          verse_end: s.verseEnd || null,
          category: s.category,
          notes: s.notes,
          status: s.status,
          view_count: s.viewCount,
          created_at: s.createdAt,
          updated_at: s.updatedAt,
          deleted: s.isDeleted,
        }))
      )
    );

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
  void safeSupabaseSync(() =>
    supabase.from('quran_verses').upsert({
      id: record.id,
      chapter: record.chapter,
      verse: record.verse,
      verse_end: record.verseEnd || null,
      category: record.category,
      notes: record.notes,
      status: record.status,
      view_count: record.viewCount,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
      deleted: record.isDeleted,
    })
  );

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
  const supabaseRows: any[] = [];

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

    supabaseRows.push({
      id: record.id,
      chapter: record.chapter,
      verse: record.verse,
      verse_end: record.verseEnd || null,
      category: record.category,
      notes: record.notes,
      status: record.status,
      view_count: record.viewCount,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
      deleted: record.isDeleted,
    });
  }

  if (supabaseRows.length > 0) {
    void safeSupabaseSync(() => supabase.from('quran_verses').upsert(supabaseRows));
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
