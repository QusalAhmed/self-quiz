'use client';

import { useCallback, useEffect, useState } from 'react';
import type { QuizDirectionKey, QuizRangeKey } from '@/app/home/constants';
import { isSoundEnabled, setSoundEnabled } from './sound';
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

export interface AppSettings {
  appearance: AppAppearanceSettings;
  studyQuiz: AppStudyQuizSettings;
  audio: AppAudioSettings;
  fsrs: AppFsrsSettings;
  ai: AppAiSettings;
  notifications: NotificationSettings;
  data: AppDataSettings;
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

  return {
    appearance,
    studyQuiz,
    audio,
    fsrs,
    ai,
    notifications,
    data,
  };
}

import { getDatabase, type AppDatabase, type SettingsRecord } from './db';

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
 * Persists app settings to RxDB client-side database
 */
export async function persistSettingsToRxDB(settings: AppSettings): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const existing = await db.settings.findOne('default').exec();
    const record: SettingsRecord = {
      id: 'default',
      appearance: settings.appearance,
      studyQuiz: settings.studyQuiz,
      audio: settings.audio,
      fsrs: settings.fsrs,
      ai: settings.ai,
      notifications: settings.notifications,
      data: settings.data,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      isDeleted: false,
      lastSyncedAt: existing?.lastSyncedAt || now,
    };
    await db.settings.upsert(record);
  } catch (err) {
    console.warn('Could not persist settings to RxDB:', err);
  }
}

let rxdbSyncInitialized = false;
let rxdbSyncSubscription: { unsubscribe: () => void } | null = null;

/**
 * Subscribes and synchronizes settings with RxDB & Supabase
 */
export async function syncSettingsWithRxDB(dbInstance?: AppDatabase): Promise<void> {
  if (typeof window === 'undefined' || rxdbSyncInitialized) {
    return;
  }
  try {
    const db = dbInstance || (await getDatabase());
    rxdbSyncInitialized = true;

    // Check if doc exists in RxDB
    const existingDoc = await db.settings.findOne('default').exec();
    if (!existingDoc) {
      // Seed RxDB with current localStorage/default settings
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
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
        lastSyncedAt: now,
      });
    } else if (!existingDoc.isDeleted) {
      // Load and apply settings from RxDB to localStorage
      const remoteSettings: AppSettings = {
        appearance: existingDoc.appearance,
        studyQuiz: existingDoc.studyQuiz,
        audio: existingDoc.audio,
        fsrs: existingDoc.fsrs,
        ai: existingDoc.ai,
        notifications: existingDoc.notifications,
        data: existingDoc.data,
      };
      saveAppSettings(remoteSettings, false);
    }

    // Subscribe to changes pulled from replication or written in other tabs
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
