import {
  DEFAULT_APP_SETTINGS,
  fetchSettingsFromSupabase,
  getAppSettings,
  normalizeAppSettings,
  pushSettingsToSupabase,
  resetAppSettings,
  saveAppSettings,
  SETTINGS_CHANGED_EVENT,
  syncSettingsWithRxDB,
  updateAppSettings,
} from './settings';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    }),
  },
}));

describe('lib/settings.ts', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('returns default settings when none stored in localStorage', () => {
    const settings = getAppSettings();
    expect(settings.appearance.accentColor).toBe('indigo');
    expect(settings.studyQuiz.defaultQuizDirection).toBe('wordToMeaning');
    expect(settings.fsrs.requestRetention).toBe(0.9);
    expect(settings.ai.preferredProvider).toBe('gemini');
    expect(settings.quranVerse.enabled).toBe(true);
    expect(settings.quranVerse.recurringIntervalMinutes).toBe(15);
    expect(settings.quranVerse.preferredEnglishTranslationId).toBe(20);
    expect(settings.quranVerse.preferredBanglaTranslationId).toBe(163);
  });

  it('normalizes partial and invalid settings correctly', () => {
    const normalized = normalizeAppSettings({
      appearance: {
        colorScheme: 'invalid' as any,
        accentColor: 'rose',
        cardGlassmorphism: false,
        reducedMotion: true,
        uiDensity: 'compact',
      },
      fsrs: {
        requestRetention: 1.5, // should clamp to max 0.97
        maximumIntervalDays: -10, // should clamp to min 1
        enableFuzz: true,
        autoRefillQueue: false,
      },
      ai: {
        preferredProvider: 'gemini',
        groqModel: 'qwen3.6-27b',
        exampleCount: 10, // should clamp to 5
        useCustomApiKeys: true,
      },
      quranVerse: {
        enabled: true,
        recurringIntervalMinutes: 5000, // should clamp to 1440
        autoPlayAudio: true,
        preferredEnglishTranslationId: 85,
        preferredBanglaTranslationId: 161,
        preferredTafsirId: 169,
        preferredReciterId: 2,
        soundNotification: false,
      },
    });

    expect(normalized.appearance.colorScheme).toBe('auto');
    expect(normalized.appearance.accentColor).toBe('rose');
    expect(normalized.appearance.uiDensity).toBe('compact');
    expect(normalized.fsrs.requestRetention).toBe(0.97);
    expect(normalized.fsrs.maximumIntervalDays).toBe(1);
    expect(normalized.fsrs.enableFuzz).toBe(true);
    expect(normalized.ai.preferredProvider).toBe('gemini');
    expect(normalized.ai.exampleCount).toBe(5);
    expect(normalized.quranVerse.recurringIntervalMinutes).toBe(1440);
    expect(normalized.quranVerse.preferredEnglishTranslationId).toBe(85);
    expect(normalized.quranVerse.preferredBanglaTranslationId).toBe(161);
  });

  it('saves and retrieves updated settings', () => {
    updateAppSettings({
      appearance: {
        ...DEFAULT_APP_SETTINGS.appearance,
        accentColor: 'emerald',
      },
      studyQuiz: {
        ...DEFAULT_APP_SETTINGS.studyQuiz,
        defaultQuizDirection: 'spelling',
        enableKeyboardShortcuts: false,
        showKeyboardShortcutHints: false,
      },
    });

    const stored = getAppSettings();
    expect(stored.appearance.accentColor).toBe('emerald');
    expect(stored.studyQuiz.defaultQuizDirection).toBe('spelling');
    expect(stored.studyQuiz.enableKeyboardShortcuts).toBe(false);
    expect(stored.studyQuiz.showKeyboardShortcutHints).toBe(false);
  });

  it('dispatches custom event on saveAppSettings', () => {
    const listener = jest.fn();
    window.addEventListener(SETTINGS_CHANGED_EVENT, listener);

    saveAppSettings({
      ...DEFAULT_APP_SETTINGS,
      audio: {
        ...DEFAULT_APP_SETTINGS.audio,
        ttsRate: 1.5,
      },
    });

    expect(listener).toHaveBeenCalled();
    window.removeEventListener(SETTINGS_CHANGED_EVENT, listener);
  });

  it('resets settings back to defaults', () => {
    updateAppSettings({
      appearance: {
        ...DEFAULT_APP_SETTINGS.appearance,
        accentColor: 'amber',
      },
    });

    expect(getAppSettings().appearance.accentColor).toBe('amber');

    resetAppSettings();
    expect(getAppSettings().appearance.accentColor).toBe('indigo');
  });

  it('pushes settings to Supabase app_settings table', async () => {
    const upsertSpy = jest.fn().mockResolvedValue({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue({
      upsert: upsertSpy,
    });

    await pushSettingsToSupabase(DEFAULT_APP_SETTINGS);

    expect(supabase.from).toHaveBeenCalledWith('app_settings');
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'default',
        appearance: DEFAULT_APP_SETTINGS.appearance,
        study_quiz: DEFAULT_APP_SETTINGS.studyQuiz,
        audio: DEFAULT_APP_SETTINGS.audio,
        fsrs: DEFAULT_APP_SETTINGS.fsrs,
        ai: DEFAULT_APP_SETTINGS.ai,
        notifications: DEFAULT_APP_SETTINGS.notifications,
        data: DEFAULT_APP_SETTINGS.data,
        quran_verse: DEFAULT_APP_SETTINGS.quranVerse,
        deleted: false,
      }),
      { onConflict: 'id' }
    );
  });

  it('fetches settings from Supabase app_settings table and applies them', async () => {
    const mockRow = {
      id: 'default',
      appearance: { colorScheme: 'dark', accentColor: 'teal' },
      study_quiz: { defaultQuizDirection: 'meaningToWord' },
      audio: { audioVolume: 0.5 },
      fsrs: { requestRetention: 0.95 },
      ai: { preferredProvider: 'groq' },
      notifications: { quietHoursEnabled: true },
      data: { defaultExportFormat: 'csv' },
      quran_verse: { enabled: true, recurringIntervalMinutes: 30 },
      updated_at: '2026-08-25T10:00:00.000Z',
      deleted: false,
    };

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: mockRow, error: null }),
          }),
        }),
      }),
    });

    const result = await fetchSettingsFromSupabase();
    expect(result).toBeDefined();
    expect(result?.appearance.colorScheme).toBe('dark');
    expect(result?.appearance.accentColor).toBe('teal');
    expect(result?.studyQuiz.defaultQuizDirection).toBe('meaningToWord');
    expect(result?.quranVerse.recurringIntervalMinutes).toBe(30);

    const storedInLocalStorage = getAppSettings();
    expect(storedInLocalStorage.appearance.accentColor).toBe('teal');
  });

  it('synchronizes and seeds settings with RxDB when collection is empty', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    const upsertMock = jest.fn().mockResolvedValue(undefined);
    const mockDb: any = {
      settings: {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
          $: {
            subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
          },
        }),
        upsert: upsertMock,
      },
    };

    await syncSettingsWithRxDB(mockDb);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'default',
        appearance: expect.any(Object),
        studyQuiz: expect.any(Object),
      })
    );
  });

  it('falls back to /api/settings fetch when Supabase query returns null or fails', async () => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: new Error('Network error') }),
          }),
        }),
      }),
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: {
          appearance: { accentColor: 'cyan' },
          studyQuiz: { defaultQuizDirection: 'spelling' },
        },
      }),
    } as any);

    const result = await fetchSettingsFromSupabase();
    expect(result).toBeDefined();
    expect(result?.appearance.accentColor).toBe('cyan');
    expect(result?.studyQuiz.defaultQuizDirection).toBe('spelling');
  });
});
