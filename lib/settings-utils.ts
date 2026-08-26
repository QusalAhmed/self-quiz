/**
 * Server-safe settings utilities.
 *
 * This module contains ONLY pure types, constants, and functions that work on
 * both the server and the client. It intentionally has NO 'use client' directive
 * and NO references to browser-only APIs (localStorage, window, etc.).
 *
 * Client-specific wrappers live in `lib/settings.ts`.
 */

import type { QuizDirectionKey, QuizRangeKey } from '@/app/home/constants';

/**
 * Notification settings type — duplicated here to avoid importing from
 * `system-notifications.ts` which has `'use client'`.
 * Keep in sync with `lib/system-notifications.ts`.
 */
export interface NotificationSettings {
  systemNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  soundEnabled: boolean;
  eventSubscriptions: {
    fsrsWordAdded: boolean;
    fsrsQueueRefill: boolean;
    quizCompleted: boolean;
    dailyGoal: boolean;
    syncStatus: boolean;
    wordSaved: boolean;
  };
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  systemNotificationsEnabled: true,
  inAppNotificationsEnabled: true,
  soundEnabled: true,
  eventSubscriptions: {
    fsrsWordAdded: true,
    fsrsQueueRefill: true,
    quizCompleted: true,
    dailyGoal: true,
    syncStatus: true,
    wordSaved: true,
  },
};

export const SETTINGS_STORAGE_KEY = 'self_quiz_app_settings_v1';
export const SETTINGS_CHANGED_EVENT = 'self_quiz_app_settings_changed';

export type AccentColorKey =
  | 'indigo'
  | 'violet'
  | 'blue'
  | 'teal'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'rose';

export type AiProviderKey = 'groq' | 'cloudflare' | 'gemini';

export interface AppAppearanceSettings {
  colorScheme: 'light' | 'dark' | 'auto';
  accentColor: AccentColorKey;
  cardGlassmorphism: boolean;
  reducedMotion: boolean;
  uiDensity: 'comfortable' | 'compact';
}

export interface AppStudyQuizSettings {
  defaultQuizDirection: QuizDirectionKey;
  defaultQuizRange: QuizRangeKey;
  autoPronounceQuizWord: boolean;
  autoAdvanceOnFlip: boolean;
  autoAdvanceDelayMs: number;
  hideMissedMeaningsDefault: boolean;
  hideSrsPracticeMeaningsDefault: boolean;
  shuffleChoices: boolean;
}

export interface AppAudioSettings {
  reviewSoundEffectsEnabled: boolean;
  notificationSoundsEnabled: boolean;
  audioVolume: number; // 0 to 1
  ttsVoiceUri: string;
  ttsRate: number; // 0.5 to 2.0
  ttsPitch: number; // 0.5 to 1.5
  ttsVolume: number; // 0 to 1
  merriamWebsterApiKey?: string;
  autoFetchMwAudioOnAdd: boolean;
  preferMwAudioOverTts: boolean;
}

export interface AppFsrsSettings {
  requestRetention: number; // e.g. 0.9 (90%)
  maximumIntervalDays: number; // e.g. 36500
  enableFuzz: boolean;
  autoRefillQueue: boolean;
}

export interface AppAiSettings {
  preferredProvider: AiProviderKey;
  groqModel: string;
  exampleCount: number;
  customGroqApiKey?: string;
  customGeminiApiKey?: string;
  customCloudflareApiToken?: string;
  customCloudflareAccountId?: string;
  useCustomApiKeys: boolean;
}

export interface AppDataSettings {
  autoBackupReminderDays: number; // 0 for disabled, 7, 14, 30
  lastBackupDate?: string;
  defaultExportFormat: 'json' | 'csv' | 'txt';
}

export interface AppQuranVerseSettings {
  enabled: boolean;
  recurringIntervalMinutes: number; // minutes, e.g. 5, 10, 15, 30, 60
  autoPlayAudio: boolean;
  preferredEnglishTranslationId: number; // 20: Saheeh Int, 85: Abdel Haleem, 149: Bridges
  preferredBanglaTranslationId: number; // 163: Mujibur Rahman, 161: Taisirul Quran, 213: Abu Bakr Zakaria
  preferredTafsirId: number; // 169: Ibn Kathir English, 166: Abu Bakr Zakaria Bangla
  preferredReciterId: number; // 7: Alafasy, 2: AbdulSamad
  soundNotification: boolean;
  lastShownAt?: string;
}

export interface AppSettings {
  appearance: AppAppearanceSettings;
  studyQuiz: AppStudyQuizSettings;
  audio: AppAudioSettings;
  fsrs: AppFsrsSettings;
  ai: AppAiSettings;
  notifications: NotificationSettings;
  data: AppDataSettings;
  quranVerse: AppQuranVerseSettings;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appearance: {
    colorScheme: 'auto',
    accentColor: 'indigo',
    cardGlassmorphism: true,
    reducedMotion: false,
    uiDensity: 'comfortable',
  },
  studyQuiz: {
    defaultQuizDirection: 'wordToMeaning',
    defaultQuizRange: 'all',
    autoPronounceQuizWord: false,
    autoAdvanceOnFlip: false,
    autoAdvanceDelayMs: 1200,
    hideMissedMeaningsDefault: false,
    hideSrsPracticeMeaningsDefault: false,
    shuffleChoices: true,
  },
  audio: {
    reviewSoundEffectsEnabled: true,
    notificationSoundsEnabled: true,
    audioVolume: 0.7,
    ttsVoiceUri: '',
    ttsRate: 1.0,
    ttsPitch: 1.0,
    ttsVolume: 1.0,
    merriamWebsterApiKey: '',
    autoFetchMwAudioOnAdd: true,
    preferMwAudioOverTts: true,
  },
  fsrs: {
    requestRetention: 0.9,
    maximumIntervalDays: 36500,
    enableFuzz: false,
    autoRefillQueue: true,
  },
  ai: {
    preferredProvider: 'gemini',
    groqModel: 'qwen/qwen3.6-27b',
    exampleCount: 3,
    customGroqApiKey: '',
    customGeminiApiKey: '',
    customCloudflareApiToken: '',
    customCloudflareAccountId: '',
    useCustomApiKeys: false,
  },
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  data: {
    autoBackupReminderDays: 14,
    defaultExportFormat: 'json',
  },
  quranVerse: {
    enabled: true,
    recurringIntervalMinutes: 15,
    autoPlayAudio: false,
    preferredEnglishTranslationId: 20,
    preferredBanglaTranslationId: 163,
    preferredTafsirId: 169,
    preferredReciterId: 7,
    soundNotification: true,
  },
};

/**
 * Server-safe normalization of raw settings against the default schema.
 *
 * This function is a pure function: it does NOT access localStorage, window,
 * or any other browser-only API. When a field is missing from `raw`, it falls
 * back to `DEFAULT_APP_SETTINGS`.
 *
 * For client-side usage where you want fallbacks from localStorage (e.g.
 * `isSoundEnabled()`), use the wrapper in `lib/settings.ts` instead.
 */
export function normalizeAppSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_APP_SETTINGS };
  }

  const appearance: AppAppearanceSettings = {
    colorScheme:
      raw.appearance?.colorScheme === 'light' ||
      raw.appearance?.colorScheme === 'dark' ||
      raw.appearance?.colorScheme === 'auto'
        ? raw.appearance.colorScheme
        : DEFAULT_APP_SETTINGS.appearance.colorScheme,
    accentColor:
      raw.appearance?.accentColor &&
      ['indigo', 'violet', 'blue', 'teal', 'cyan', 'emerald', 'amber', 'rose'].includes(
        raw.appearance.accentColor
      )
        ? raw.appearance.accentColor
        : DEFAULT_APP_SETTINGS.appearance.accentColor,
    cardGlassmorphism:
      raw.appearance?.cardGlassmorphism ?? DEFAULT_APP_SETTINGS.appearance.cardGlassmorphism,
    reducedMotion: raw.appearance?.reducedMotion ?? DEFAULT_APP_SETTINGS.appearance.reducedMotion,
    uiDensity:
      raw.appearance?.uiDensity === 'compact' || raw.appearance?.uiDensity === 'comfortable'
        ? raw.appearance.uiDensity
        : DEFAULT_APP_SETTINGS.appearance.uiDensity,
  };

  const studyQuiz: AppStudyQuizSettings = {
    defaultQuizDirection:
      raw.studyQuiz?.defaultQuizDirection === 'meaningToWord' ||
      raw.studyQuiz?.defaultQuizDirection === 'spelling' ||
      raw.studyQuiz?.defaultQuizDirection === 'wordToMeaning'
        ? raw.studyQuiz.defaultQuizDirection
        : DEFAULT_APP_SETTINGS.studyQuiz.defaultQuizDirection,
    defaultQuizRange:
      raw.studyQuiz?.defaultQuizRange === 'all' ||
      raw.studyQuiz?.defaultQuizRange === 'today' ||
      raw.studyQuiz?.defaultQuizRange === 'yesterday' ||
      raw.studyQuiz?.defaultQuizRange === 'week' ||
      raw.studyQuiz?.defaultQuizRange === 'month' ||
      raw.studyQuiz?.defaultQuizRange === 'year' ||
      raw.studyQuiz?.defaultQuizRange === 'custom'
        ? raw.studyQuiz.defaultQuizRange
        : DEFAULT_APP_SETTINGS.studyQuiz.defaultQuizRange,
    autoPronounceQuizWord:
      raw.studyQuiz?.autoPronounceQuizWord ?? DEFAULT_APP_SETTINGS.studyQuiz.autoPronounceQuizWord,
    autoAdvanceOnFlip:
      raw.studyQuiz?.autoAdvanceOnFlip ?? DEFAULT_APP_SETTINGS.studyQuiz.autoAdvanceOnFlip,
    autoAdvanceDelayMs:
      typeof raw.studyQuiz?.autoAdvanceDelayMs === 'number'
        ? Math.max(300, Math.min(5000, raw.studyQuiz.autoAdvanceDelayMs))
        : DEFAULT_APP_SETTINGS.studyQuiz.autoAdvanceDelayMs,
    hideMissedMeaningsDefault:
      raw.studyQuiz?.hideMissedMeaningsDefault ??
      DEFAULT_APP_SETTINGS.studyQuiz.hideMissedMeaningsDefault,
    hideSrsPracticeMeaningsDefault:
      raw.studyQuiz?.hideSrsPracticeMeaningsDefault ??
      DEFAULT_APP_SETTINGS.studyQuiz.hideSrsPracticeMeaningsDefault,
    shuffleChoices: raw.studyQuiz?.shuffleChoices ?? DEFAULT_APP_SETTINGS.studyQuiz.shuffleChoices,
  };

  const audio: AppAudioSettings = {
    reviewSoundEffectsEnabled:
      typeof raw.audio?.reviewSoundEffectsEnabled === 'boolean'
        ? raw.audio.reviewSoundEffectsEnabled
        : DEFAULT_APP_SETTINGS.audio.reviewSoundEffectsEnabled,
    notificationSoundsEnabled:
      typeof raw.audio?.notificationSoundsEnabled === 'boolean'
        ? raw.audio.notificationSoundsEnabled
        : DEFAULT_APP_SETTINGS.audio.notificationSoundsEnabled,
    audioVolume:
      typeof raw.audio?.audioVolume === 'number'
        ? Math.max(0, Math.min(1, raw.audio.audioVolume))
        : DEFAULT_APP_SETTINGS.audio.audioVolume,
    ttsVoiceUri: raw.audio?.ttsVoiceUri ?? DEFAULT_APP_SETTINGS.audio.ttsVoiceUri,
    ttsRate:
      typeof raw.audio?.ttsRate === 'number'
        ? Math.max(0.5, Math.min(2.0, raw.audio.ttsRate))
        : DEFAULT_APP_SETTINGS.audio.ttsRate,
    ttsPitch:
      typeof raw.audio?.ttsPitch === 'number'
        ? Math.max(0.5, Math.min(1.5, raw.audio.ttsPitch))
        : DEFAULT_APP_SETTINGS.audio.ttsPitch,
    ttsVolume:
      typeof raw.audio?.ttsVolume === 'number'
        ? Math.max(0, Math.min(1, raw.audio.ttsVolume))
        : DEFAULT_APP_SETTINGS.audio.ttsVolume,
    merriamWebsterApiKey:
      typeof raw.audio?.merriamWebsterApiKey === 'string'
        ? raw.audio.merriamWebsterApiKey.trim()
        : DEFAULT_APP_SETTINGS.audio.merriamWebsterApiKey,
    autoFetchMwAudioOnAdd:
      typeof raw.audio?.autoFetchMwAudioOnAdd === 'boolean'
        ? raw.audio.autoFetchMwAudioOnAdd
        : DEFAULT_APP_SETTINGS.audio.autoFetchMwAudioOnAdd,
    preferMwAudioOverTts:
      typeof raw.audio?.preferMwAudioOverTts === 'boolean'
        ? raw.audio.preferMwAudioOverTts
        : DEFAULT_APP_SETTINGS.audio.preferMwAudioOverTts,
  };

  const fsrs: AppFsrsSettings = {
    requestRetention:
      typeof raw.fsrs?.requestRetention === 'number'
        ? Math.max(0.7, Math.min(0.97, raw.fsrs.requestRetention))
        : DEFAULT_APP_SETTINGS.fsrs.requestRetention,
    maximumIntervalDays:
      typeof raw.fsrs?.maximumIntervalDays === 'number'
        ? Math.max(1, Math.min(36500, raw.fsrs.maximumIntervalDays))
        : DEFAULT_APP_SETTINGS.fsrs.maximumIntervalDays,
    enableFuzz: raw.fsrs?.enableFuzz ?? DEFAULT_APP_SETTINGS.fsrs.enableFuzz,
    autoRefillQueue: raw.fsrs?.autoRefillQueue ?? DEFAULT_APP_SETTINGS.fsrs.autoRefillQueue,
  };

  const ai: AppAiSettings = {
    preferredProvider:
      raw.ai?.preferredProvider === 'cloudflare' || raw.ai?.preferredProvider === 'groq'
        ? raw.ai.preferredProvider
        : 'gemini',
    groqModel: raw.ai?.groqModel || DEFAULT_APP_SETTINGS.ai.groqModel,
    exampleCount:
      typeof raw.ai?.exampleCount === 'number'
        ? Math.max(1, Math.min(5, Math.round(raw.ai.exampleCount)))
        : DEFAULT_APP_SETTINGS.ai.exampleCount,
    customGroqApiKey: raw.ai?.customGroqApiKey ?? '',
    customGeminiApiKey: raw.ai?.customGeminiApiKey ?? '',
    customCloudflareApiToken: raw.ai?.customCloudflareApiToken ?? '',
    customCloudflareAccountId: raw.ai?.customCloudflareAccountId ?? '',
    useCustomApiKeys: raw.ai?.useCustomApiKeys ?? false,
  };

  const notifications = raw.notifications ? raw.notifications : DEFAULT_NOTIFICATION_SETTINGS;

  const data: AppDataSettings = {
    autoBackupReminderDays:
      typeof raw.data?.autoBackupReminderDays === 'number'
        ? raw.data.autoBackupReminderDays
        : DEFAULT_APP_SETTINGS.data.autoBackupReminderDays,
    lastBackupDate: raw.data?.lastBackupDate,
    defaultExportFormat:
      raw.data?.defaultExportFormat === 'csv' || raw.data?.defaultExportFormat === 'txt'
        ? raw.data.defaultExportFormat
        : 'json',
  };

  const quranVerse: AppQuranVerseSettings = {
    enabled:
      typeof raw.quranVerse?.enabled === 'boolean'
        ? raw.quranVerse.enabled
        : DEFAULT_APP_SETTINGS.quranVerse.enabled,
    recurringIntervalMinutes:
      typeof raw.quranVerse?.recurringIntervalMinutes === 'number'
        ? Math.max(1, Math.min(1440, Math.round(raw.quranVerse.recurringIntervalMinutes)))
        : DEFAULT_APP_SETTINGS.quranVerse.recurringIntervalMinutes,
    autoPlayAudio:
      typeof raw.quranVerse?.autoPlayAudio === 'boolean'
        ? raw.quranVerse.autoPlayAudio
        : DEFAULT_APP_SETTINGS.quranVerse.autoPlayAudio,
    preferredEnglishTranslationId:
      typeof raw.quranVerse?.preferredEnglishTranslationId === 'number'
        ? raw.quranVerse.preferredEnglishTranslationId
        : DEFAULT_APP_SETTINGS.quranVerse.preferredEnglishTranslationId,
    preferredBanglaTranslationId:
      typeof raw.quranVerse?.preferredBanglaTranslationId === 'number'
        ? raw.quranVerse.preferredBanglaTranslationId
        : DEFAULT_APP_SETTINGS.quranVerse.preferredBanglaTranslationId,
    preferredTafsirId:
      typeof raw.quranVerse?.preferredTafsirId === 'number'
        ? raw.quranVerse.preferredTafsirId
        : DEFAULT_APP_SETTINGS.quranVerse.preferredTafsirId,
    preferredReciterId:
      typeof raw.quranVerse?.preferredReciterId === 'number'
        ? raw.quranVerse.preferredReciterId
        : DEFAULT_APP_SETTINGS.quranVerse.preferredReciterId,
    soundNotification:
      typeof raw.quranVerse?.soundNotification === 'boolean'
        ? raw.quranVerse.soundNotification
        : DEFAULT_APP_SETTINGS.quranVerse.soundNotification,
    lastShownAt: raw.quranVerse?.lastShownAt,
  };

  return {
    appearance,
    studyQuiz,
    audio,
    fsrs,
    ai,
    notifications,
    data,
    quranVerse,
  };
}
