'use client';

import { useCallback, useEffect, useState } from 'react';
import type { QuizDirectionKey, QuizRangeKey } from '@/app/home/constants';
import { getDatabase, type AppDatabase, type SettingsRecord } from './db';
import { isSoundEnabled, setSoundEnabled } from './sound';
import { supabase } from './supabase';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getNotificationSettings,
  type NotificationSettings,
  saveNotificationSettings,
} from './system-notifications';

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
 * Normalizes and validates raw settings against default schema
 */
export function normalizeAppSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_APP_SETTINGS,
      audio: {
        ...DEFAULT_APP_SETTINGS.audio,
        reviewSoundEffectsEnabled: isSoundEnabled(),
      },
      notifications: getNotificationSettings(),
    };
  }

  const appearance: AppAppearanceSettings = {
    colorScheme:
      raw.appearance?.colorScheme === 'light' ||
      raw.appearance?.colorScheme === 'dark' ||
      raw.appearance?.colorScheme === 'auto'
        ? raw.appearance.colorScheme
        : DEFAULT_APP_SETTINGS.appearance.colorScheme,
    accentColor: raw.appearance?.accentColor ?? DEFAULT_APP_SETTINGS.appearance.accentColor,
    cardGlassmorphism:
      raw.appearance?.cardGlassmorphism ?? DEFAULT_APP_SETTINGS.appearance.cardGlassmorphism,
    reducedMotion: raw.appearance?.reducedMotion ?? DEFAULT_APP_SETTINGS.appearance.reducedMotion,
    uiDensity:
      raw.appearance?.uiDensity === 'compact'
        ? 'compact'
        : DEFAULT_APP_SETTINGS.appearance.uiDensity,
  };

  const studyQuiz: AppStudyQuizSettings = {
    defaultQuizDirection:
      raw.studyQuiz?.defaultQuizDirection ?? DEFAULT_APP_SETTINGS.studyQuiz.defaultQuizDirection,
    defaultQuizRange:
      raw.studyQuiz?.defaultQuizRange ?? DEFAULT_APP_SETTINGS.studyQuiz.defaultQuizRange,
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
    reviewSoundEffectsEnabled: raw.audio?.reviewSoundEffectsEnabled ?? isSoundEnabled(),
    notificationSoundsEnabled:
      raw.audio?.notificationSoundsEnabled ?? DEFAULT_APP_SETTINGS.audio.notificationSoundsEnabled,
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

  const notifications = raw.notifications ? raw.notifications : getNotificationSettings();

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

/**
 * Loads App Settings from LocalStorage
 */
export function getAppSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_APP_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_APP_SETTINGS,
        audio: {
          ...DEFAULT_APP_SETTINGS.audio,
          reviewSoundEffectsEnabled: isSoundEnabled(),
        },
        notifications: getNotificationSettings(),
      };
    }
    const parsed = JSON.parse(raw);
    return normalizeAppSettings(parsed);
  } catch (err) {
    console.warn('Failed to parse app settings from localStorage:', err);
    return DEFAULT_APP_SETTINGS;
  }
}

/**
 * Directly pushes settings to Supabase app_settings table (and /api/settings fallback)
 */
export async function pushSettingsToSupabase(settings: AppSettings): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return;
  }
  const normalized = normalizeAppSettings(settings);
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

  try {
    if (supabase) {
      const { error } = await supabase.from('app_settings').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn(
          'Could not push settings directly to Supabase table, trying API route fallback:',
          error.message || error
        );
        if (typeof fetch !== 'undefined') {
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ settings: normalized }),
          });
        }
      }
    } else if (typeof fetch !== 'undefined') {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: normalized }),
      });
    }
  } catch (err) {
    console.warn('Error pushing settings to Supabase / server:', err);
  }
}

/**
 * Directly fetches settings from Supabase app_settings table (with API route fallback)
 */
export async function fetchSettingsFromSupabase(): Promise<AppSettings | null> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return null;
  }
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 'default')
        .eq('deleted', false)
        .maybeSingle();

      if (!error && data) {
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

        saveAppSettings(normalized, false);
        return normalized;
      }
    }

    // Fallback to /api/settings if direct supabase query returned null or failed
    if (typeof fetch !== 'undefined') {
      const response = await fetch('/api/settings', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (response.ok) {
        const json = await response.json();
        if (json?.settings) {
          const normalized = normalizeAppSettings(json.settings);
          saveAppSettings(normalized, false);
          return normalized;
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('Error fetching settings from Supabase / server:', err);
    return null;
  }
}

/**
 * Persists app settings to RxDB client-side database & Supabase
 */
export async function persistSettingsToRxDB(settings: AppSettings): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  const normalized = normalizeAppSettings(settings);
  try {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const existing = await db.settings.findOne('default').exec();
    const record: SettingsRecord = {
      id: 'default',
      appearance: normalized.appearance,
      studyQuiz: normalized.studyQuiz,
      audio: normalized.audio,
      fsrs: normalized.fsrs,
      ai: normalized.ai,
      notifications: normalized.notifications,
      data: normalized.data,
      quranVerse: normalized.quranVerse,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      isDeleted: false,
      lastSyncedAt: existing?.lastSyncedAt || now,
    };
    await db.settings.upsert(record);
    void pushSettingsToSupabase(normalized);
  } catch (err) {
    console.warn('Could not persist settings to RxDB:', err);
    void pushSettingsToSupabase(normalized);
  }
}

let rxdbSyncInitialized = false;
let rxdbSyncSubscription: { unsubscribe: () => void } | null = null;
let supabaseRealtimeSubscribed = false;

/**
 * Eagerly initializes settings synchronization between local and server Supabase
 */
export async function initAppSettingsSync(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    await syncSettingsWithRxDB();
  } catch (err) {
    console.warn('Failed to initialize app settings sync:', err);
  }
}

/**
 * Subscribes and synchronizes settings with RxDB & Supabase
 */
export async function syncSettingsWithRxDB(dbInstance?: AppDatabase): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const db = dbInstance || (await getDatabase());

    // 1. Try pulling fresh settings from Supabase/Server if online
    const remoteSupabaseSettings = await fetchSettingsFromSupabase();

    // 2. Check RxDB doc
    const existingDoc = await db.settings.findOne('default').exec();

    if (remoteSupabaseSettings) {
      // Supabase had settings; update RxDB and localStorage
      const now = new Date().toISOString();
      await db.settings.upsert({
        id: 'default',
        appearance: remoteSupabaseSettings.appearance,
        studyQuiz: remoteSupabaseSettings.studyQuiz,
        audio: remoteSupabaseSettings.audio,
        fsrs: remoteSupabaseSettings.fsrs,
        ai: remoteSupabaseSettings.ai,
        notifications: remoteSupabaseSettings.notifications,
        data: remoteSupabaseSettings.data,
        quranVerse: remoteSupabaseSettings.quranVerse,
        createdAt: existingDoc?.createdAt || now,
        updatedAt: now,
        isDeleted: false,
        lastSyncedAt: now,
      });
      saveAppSettings(remoteSupabaseSettings, false);
    } else if (!existingDoc) {
      // Seed RxDB and Supabase with current localStorage/default settings
      const current = getAppSettings();
      const now = new Date().toISOString();
      await db.settings.upsert({
        id: 'default',
        appearance: current.appearance,
        studyQuiz: current.studyQuiz,
        audio: current.audio,
        fsrs: current.fsrs,
        ai: current.ai,
        notifications: current.notifications,
        data: current.data,
        quranVerse: current.quranVerse,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
        lastSyncedAt: now,
      });
      void pushSettingsToSupabase(current);
    } else if (!existingDoc.isDeleted) {
      // Load and apply settings from RxDB to localStorage & push to Supabase
      const remoteSettings: AppSettings = {
        appearance: existingDoc.appearance,
        studyQuiz: existingDoc.studyQuiz,
        audio: existingDoc.audio,
        fsrs: existingDoc.fsrs,
        ai: existingDoc.ai,
        notifications: existingDoc.notifications,
        data: existingDoc.data,
        quranVerse: existingDoc.quranVerse || DEFAULT_APP_SETTINGS.quranVerse,
      };
      saveAppSettings(remoteSettings, false);
      void pushSettingsToSupabase(remoteSettings);
    }

    if (rxdbSyncInitialized) {
      return;
    }
    rxdbSyncInitialized = true;

    // 3. Set up Realtime listener on Supabase for live multi-device settings sync
    if (!supabaseRealtimeSubscribed && supabase && typeof navigator !== 'undefined') {
      supabaseRealtimeSubscribed = true;
      try {
        supabase
          .channel('app_settings-live-sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'app_settings' },
            (payload) => {
              const row = payload.new as any;
              if (row && !row.deleted && row.id === 'default') {
                const normalized = normalizeAppSettings({
                  appearance: row.appearance,
                  studyQuiz: row.study_quiz ?? row.studyQuiz,
                  audio: row.audio,
                  fsrs: row.fsrs,
                  ai: row.ai,
                  notifications: row.notifications,
                  data: row.data,
                  quranVerse: row.quran_verse ?? row.quranVerse,
                });
                saveAppSettings(normalized, false);
              }
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Could not subscribe to Supabase settings realtime channel:', e);
      }
    }

    // 4. Subscribe to changes pulled from RxDB replication or written in other tabs
    if (!rxdbSyncSubscription) {
      rxdbSyncSubscription = db.settings.findOne('default').$.subscribe((doc) => {
        if (doc && !doc.isDeleted) {
          const updatedSettings: AppSettings = {
            appearance: doc.appearance,
            studyQuiz: doc.studyQuiz,
            audio: doc.audio,
            fsrs: doc.fsrs,
            ai: doc.ai,
            notifications: doc.notifications,
            data: doc.data,
            quranVerse: doc.quranVerse || DEFAULT_APP_SETTINGS.quranVerse,
          };
          saveAppSettings(updatedSettings, false);
        }
      });
    }
  } catch (err) {
    console.warn('Failed to sync settings with RxDB:', err);
  }
}

/**
 * Saves App Settings to LocalStorage and synchronizes with RxDB database
 */
export function saveAppSettings(settings: AppSettings, syncToDb = true): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const normalized = normalizeAppSettings(settings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));

    // Sync sound preference
    if (normalized.audio.reviewSoundEffectsEnabled !== isSoundEnabled()) {
      setSoundEnabled(normalized.audio.reviewSoundEffectsEnabled);
    }

    // Sync system notification settings
    saveNotificationSettings(normalized.notifications);

    // Broadcast change
    window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: normalized }));

    // Persist to RxDB (triggers Supabase push replication)
    if (syncToDb) {
      void persistSettingsToRxDB(normalized);
    }
  } catch (err) {
    console.error('Failed to save app settings to localStorage:', err);
  }
}

/**
 * Updates partial settings
 */
export function updateAppSettings(
  partial: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)
): AppSettings {
  const current = getAppSettings();
  const next = typeof partial === 'function' ? partial(current) : { ...current, ...partial };
  const normalized = normalizeAppSettings(next);
  saveAppSettings(normalized);
  return normalized;
}

/**
 * Resets all settings to defaults
 */
export function resetAppSettings(): AppSettings {
  const defaults = DEFAULT_APP_SETTINGS;
  saveAppSettings(defaults);
  return defaults;
}

/**
 * React hook to observe and update application settings with real-time reactivity
 */
export function useAppSettings(): {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)) => void;
  resetSettings: () => void;
  updateSection: <K extends keyof AppSettings>(
    section: K,
    sectionValues: Partial<AppSettings[K]>
  ) => void;
} {
  const [settings, setSettingsState] = useState<AppSettings>(() => getAppSettings());

  useEffect(() => {
    setSettingsState(getAppSettings());

    const handleSettingsChanged = (event: Event) => {
      const customEvent = event as CustomEvent<AppSettings>;
      if (customEvent.detail) {
        setSettingsState(customEvent.detail);
      } else {
        setSettingsState(getAppSettings());
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SETTINGS_STORAGE_KEY) {
        setSettingsState(getAppSettings());
      }
    };

    window.addEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
    window.addEventListener('storage', handleStorage);

    // Synchronize settings with RxDB & Supabase replication
    void syncSettingsWithRxDB();

    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const update = useCallback(
    (partial: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)) => {
      const next = updateAppSettings(partial);
      setSettingsState(next);
    },
    []
  );

  const updateSection = useCallback(
    <K extends keyof AppSettings>(section: K, sectionValues: Partial<AppSettings[K]>) => {
      update((prev) => ({
        ...prev,
        [section]: {
          ...(prev[section] as object),
          ...sectionValues,
        },
      }));
    },
    [update]
  );

  const reset = useCallback(() => {
    const defaults = resetAppSettings();
    setSettingsState(defaults);
  }, []);

  return {
    settings,
    updateSettings: update,
    resetSettings: reset,
    updateSection,
  };
}
