import { CURATED_INSPIRATIONAL_VERSES } from './quran-api';
import {
  addBatchQuranVerses,
  addQuranVerseRecord,
  deleteQuranVerseRecord,
  ensureDefaultQuranVersesSeeded,
  getAllQuranVerses,
  getRandomActiveVerse,
  recordVerseFetchError,
  recordVerseFetchSuccess,
  toggleQuranVerseStatus,
} from './quran-service';

// In-Memory store for tests
let inMemoryVerses: Record<string, any> = {};

jest.mock('./db', () => ({
  getDatabase: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      quranVerses: {
        find: jest.fn().mockImplementation((query?: any) => ({
          exec: jest.fn().mockImplementation(() => {
            let list = Object.values(inMemoryVerses);
            if (query?.selector?.isDeleted) {
              list = list.filter((v: any) => !v.isDeleted);
            }
            return Promise.resolve(
              list.map((item: any) => ({
                ...item,
                toJSON: () => item,
              }))
            );
          }),
        })),
        findOne: jest.fn().mockImplementation(({ selector }: any) => ({
          exec: jest.fn().mockImplementation(() => {
            const item = inMemoryVerses[selector.id];
            if (!item) {
              return Promise.resolve(null);
            }
            return Promise.resolve({
              ...item,
              toJSON: () => item,
              patch: jest.fn().mockImplementation((patchData: any) => {
                inMemoryVerses[selector.id] = { ...inMemoryVerses[selector.id], ...patchData };
                return Promise.resolve();
              }),
            });
          }),
        })),
        upsert: jest.fn().mockImplementation((record: any) => {
          inMemoryVerses[record.id] = { ...record };
          return Promise.resolve(record);
        }),
      },
    });
  }),
}));

jest.mock('./supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  },
}));

describe('lib/quran-service.ts', () => {
  beforeEach(() => {
    inMemoryVerses = {};
  });

  it('seeds default curated verses when database is empty', async () => {
    const seeded = await ensureDefaultQuranVersesSeeded();
    expect(seeded.length).toBe(CURATED_INSPIRATIONAL_VERSES.length);
    expect(seeded.some((v) => v.id === '2:255')).toBe(true);
    expect(seeded.some((v) => v.id === '94:5')).toBe(true);
  });

  it('adds a single valid Quran verse record', async () => {
    const record = await addQuranVerseRecord({
      chapter: 3,
      verse: 139,
      category: 'Courage',
      notes: 'Do not lose heart',
    });

    expect(record.id).toBe('3:139');
    expect(record.chapter).toBe(3);
    expect(record.verse).toBe(139);
    expect(record.category).toBe('Courage');
    expect(record.status).toBe('active');
    expect(record.viewCount).toBe(0);

    const all = await getAllQuranVerses();
    expect(all.some((v) => v.id === '3:139')).toBe(true);
  });

  it('rejects invalid chapter or verse numbers', async () => {
    await expect(
      addQuranVerseRecord({
        chapter: 999, // Invalid chapter
        verse: 1,
      })
    ).rejects.toThrow('Invalid Surah number');

    await expect(
      addQuranVerseRecord({
        chapter: 1, // Al-Fatihah has 7 verses
        verse: 25, // Invalid verse
      })
    ).rejects.toThrow('Invalid Ayah number');
  });

  it('adds batch Quran verses', async () => {
    const items = [
      { chapter: 94, verse: 1 },
      { chapter: 94, verse: 2 },
      { chapter: 94, verse: 3 },
    ];

    const added = await addBatchQuranVerses(items);
    expect(added.length).toBe(3);
    expect(added.map((v) => v.id)).toEqual(['94:1', '94:2', '94:3']);
  });

  it('toggles verse active and paused status', async () => {
    await addQuranVerseRecord({ chapter: 2, verse: 255 });
    await toggleQuranVerseStatus('2:255', false);
    expect(inMemoryVerses['2:255'].status).toBe('paused');

    await toggleQuranVerseStatus('2:255', true);
    expect(inMemoryVerses['2:255'].status).toBe('active');
  });

  it('records fetch success by updating view count and lastViewedAt', async () => {
    await addQuranVerseRecord({ chapter: 2, verse: 255 });
    await recordVerseFetchSuccess('2:255');

    expect(inMemoryVerses['2:255'].viewCount).toBe(1);
    expect(inMemoryVerses['2:255'].status).toBe('active');
    expect(inMemoryVerses['2:255'].lastViewedAt).toBeDefined();
  });

  it('records fetch error in database', async () => {
    await addQuranVerseRecord({ chapter: 2, verse: 255 });
    await recordVerseFetchError('2:255', 'API rate limit or network offline');

    expect(inMemoryVerses['2:255'].status).toBe('error');
    expect(inMemoryVerses['2:255'].lastError).toBe('API rate limit or network offline');
  });

  it('deletes a Quran verse (soft delete)', async () => {
    await addQuranVerseRecord({ chapter: 2, verse: 255 });
    await deleteQuranVerseRecord('2:255');

    expect(inMemoryVerses['2:255'].isDeleted).toBe(true);
    const all = await getAllQuranVerses();
    expect(all.some((v) => v.id === '2:255')).toBe(false);
  });

  it('selects a random active verse from the pool', async () => {
    await addQuranVerseRecord({ chapter: 2, verse: 255 });
    await addQuranVerseRecord({ chapter: 94, verse: 5 });

    const random = await getRandomActiveVerse();
    expect(random).toBeDefined();
    expect(['2:255', '94:5']).toContain(random?.id);
  });
});
