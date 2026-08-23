import {
  DEFAULT_APP_SETTINGS,
  getAppSettings,
  normalizeAppSettings,
  resetAppSettings,
  saveAppSettings,
  SETTINGS_CHANGED_EVENT,
  updateAppSettings,
} from './settings';

describe('lib/settings.ts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default settings when none stored in localStorage', () => {
    const settings = getAppSettings();
    expect(settings.appearance.accentColor).toBe('indigo');
    expect(settings.studyQuiz.defaultQuizDirection).toBe('wordToMeaning');
    expect(settings.fsrs.requestRetention).toBe(0.9);
    expect(settings.ai.preferredProvider).toBe('groq');
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
    });

    expect(normalized.appearance.colorScheme).toBe('auto');
    expect(normalized.appearance.accentColor).toBe('rose');
    expect(normalized.appearance.uiDensity).toBe('compact');
    expect(normalized.fsrs.requestRetention).toBe(0.97);
    expect(normalized.fsrs.maximumIntervalDays).toBe(1);
    expect(normalized.fsrs.enableFuzz).toBe(true);
    expect(normalized.ai.preferredProvider).toBe('gemini');
    expect(normalized.ai.exampleCount).toBe(5);
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
      },
    });

    const stored = getAppSettings();
    expect(stored.appearance.accentColor).toBe('emerald');
    expect(stored.studyQuiz.defaultQuizDirection).toBe('spelling');
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
});
