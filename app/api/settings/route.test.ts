import { DEFAULT_APP_SETTINGS } from '@/lib/settings-utils';
import { supabase } from '@/lib/supabase';
import { GET, getServerSettings, POST } from './route';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('app/api/settings/route.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getServerSettings', () => {
    it('returns default settings when database returns null or error', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest
                .fn()
                .mockResolvedValue({ data: null, error: new Error('DB error') }),
            }),
          }),
        }),
      });

      const settings = await getServerSettings();
      expect(settings.appearance.accentColor).toBe(DEFAULT_APP_SETTINGS.appearance.accentColor);
      expect(settings.studyQuiz.defaultQuizDirection).toBe(
        DEFAULT_APP_SETTINGS.studyQuiz.defaultQuizDirection
      );
    });

    it('returns normalized settings when record found in database', async () => {
      const mockRecord = {
        id: 'default',
        appearance: { accentColor: 'teal', colorScheme: 'dark' },
        study_quiz: { defaultQuizDirection: 'spelling' },
        audio: { audioVolume: 0.8 },
        fsrs: { requestRetention: 0.95 },
        ai: { preferredProvider: 'groq' },
        notifications: {},
        data: {},
        quran_verse: { enabled: true, recurringIntervalMinutes: 20 },
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockRecord, error: null }),
            }),
          }),
        }),
      });

      const settings = await getServerSettings();
      expect(settings.appearance.accentColor).toBe('teal');
      expect(settings.appearance.colorScheme).toBe('dark');
      expect(settings.studyQuiz.defaultQuizDirection).toBe('spelling');
      expect(settings.audio.audioVolume).toBe(0.8);
      expect(settings.fsrs.requestRetention).toBe(0.95);
      expect(settings.ai.preferredProvider).toBe('groq');
      expect(settings.quranVerse.recurringIntervalMinutes).toBe(20);
    });
  });

  describe('GET /api/settings', () => {
    it('returns settings when found in Supabase', async () => {
      const mockRecord = {
        id: 'default',
        appearance: { accentColor: 'cyan', colorScheme: 'light' },
        study_quiz: { defaultQuizDirection: 'wordToMeaning' },
        audio: {},
        fsrs: {},
        ai: {},
        notifications: {},
        data: {},
        quran_verse: {},
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockRecord, error: null }),
            }),
          }),
        }),
      });

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.settings.appearance.accentColor).toBe('cyan');
    });

    it('seeds default settings when no row exists in Supabase', async () => {
      const upsertMock = jest.fn().mockResolvedValue({ data: null, error: null });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'app_settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            upsert: upsertMock,
          };
        }
        return {};
      });

      const response = await GET();
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.seeded).toBe(true);
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'default',
          appearance: expect.any(Object),
        }),
        { onConflict: 'id' }
      );
    });
  });

  describe('POST /api/settings', () => {
    it('upserts normalized settings into Supabase app_settings', async () => {
      const upsertMock = jest.fn().mockResolvedValue({ data: { id: 'default' }, error: null });
      (supabase.from as jest.Mock).mockReturnValue({
        upsert: upsertMock,
      });

      const payload = {
        settings: {
          appearance: { accentColor: 'violet' },
          studyQuiz: { defaultQuizDirection: 'spelling' },
        },
      };

      const mockReq = {
        json: async () => payload,
      };

      const response = await POST(mockReq as unknown as Request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.settings.appearance.accentColor).toBe('violet');
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'default',
          appearance: expect.objectContaining({ accentColor: 'violet' }),
          study_quiz: expect.objectContaining({ defaultQuizDirection: 'spelling' }),
        }),
        { onConflict: 'id' }
      );
    });
  });
});
