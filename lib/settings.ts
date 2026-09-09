'use client';

import { useCallback, useEffect, useState } from 'react';
import { getDatabase, type AppDatabase, type SettingsRecord } from './db';
import { isSoundEnabled, setSoundEnabled } from './sound';
import { supabase } from './supabase';
import { getNotificationSettings, saveNotificationSettings } from './system-notifications';

// Re-export all types, constants, and the server-safe normalizer from settings-utils
export {
  SETTINGS_STORAGE_KEY,
  SETTINGS_CHANGED_EVENT,
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
} from './settings-utils';

export type {
  AccentColorKey,
  AiProviderKey,
  AppAppearanceSettings,
  AppStudyQuizSettings,
  AppAudioSettings,
  AppFsrsSettings,
  AppAiSettings,
  AppDataSettings,
  AppQuranVerseSettings,
  AppSettings,
  NotificationSettings,
} from './settings-utils';

import {
  SETTINGS_STORAGE_KEY,
  SETTINGS_CHANGED_EVENT,
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  type AppSettings,
} from './settings-utils';

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
 * Directly fetches settings with metadata (such as updatedAt) from Supabase app_settings table
 */
export async function fetchSettingsWithMetaFromSupabase(): Promise<{
  settings: AppSettings;
  updatedAt: string;
} | null> {
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

        return {
          settings: normalized,
          updatedAt: data.updated_at || new Date().toISOString(),
        };
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
          return {
            settings: normalized,
            updatedAt: json.updatedAt || json.settings?.updatedAt || new Date().toISOString(),
          };
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
 * Directly fetches settings from Supabase app_settings table (with API route fallback)
 */
export async function fetchSettingsFromSupabase(): Promise<AppSettings | null> {
  const result = await fetchSettingsWithMetaFromSupabase();
  if (result) {
    saveAppSettings(result.settings, false);
    return result.settings;
  }
  return null;
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

    // 1. Check existing local RxDB doc first
    const existingDoc = await db.settings.findOne('default').exec();

    // 2. Try pulling fresh settings with timestamp from Supabase/Server if online
    const remoteResult = await fetchSettingsWithMetaFromSupabase();

    if (remoteResult) {
      const localTime = existingDoc?.updatedAt ? Date.parse(existingDoc.updatedAt) || 0 : 0;
      const remoteTime = Date.parse(remoteResult.updatedAt) || 0;

      if (existingDoc && localTime > remoteTime) {
        // Local doc is newer than remote! Do not overwrite local with stale remote settings.
        // Instead, push local settings to Supabase to bring server up to date.
        const localSettings: AppSettings = {
          appearance: existingDoc.appearance,
          studyQuiz: existingDoc.studyQuiz,
          audio: existingDoc.audio,
          fsrs: existingDoc.fsrs,
          ai: existingDoc.ai,
          notifications: existingDoc.notifications,
          data: existingDoc.data,
          quranVerse: existingDoc.quranVerse || DEFAULT_APP_SETTINGS.quranVerse,
        };
        saveAppSettings(localSettings, false);
        void pushSettingsToSupabase(localSettings);
      } else {
        // Remote is newer or equal (or no local doc exists); update RxDB and localStorage
        const remoteSettings = remoteResult.settings;
        const now = remoteResult.updatedAt || new Date().toISOString();
        await db.settings.upsert({
          id: 'default',
          appearance: remoteSettings.appearance,
          studyQuiz: remoteSettings.studyQuiz,
          audio: remoteSettings.audio,
          fsrs: remoteSettings.fsrs,
          ai: remoteSettings.ai,
          notifications: remoteSettings.notifications,
          data: remoteSettings.data,
          quranVerse: remoteSettings.quranVerse,
          createdAt: existingDoc?.createdAt || now,
          updatedAt: now,
          isDeleted: false,
          lastSyncedAt: now,
        });
        saveAppSettings(remoteSettings, false);
      }
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
            async (payload) => {
              const row = payload.new as any;
              if (row && !row.deleted && row.id === 'default') {
                const currentDoc = await db.settings.findOne('default').exec();
                const localTime = currentDoc?.updatedAt ? Date.parse(currentDoc.updatedAt) || 0 : 0;
                const remoteTime = row.updated_at ? Date.parse(row.updated_at) || 0 : 0;
                if (!currentDoc || remoteTime >= localTime) {
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
  updateSetting: <K extends keyof AppSettings>(
    section: K,
    sectionValues: Partial<AppSettings[K]>
  ) => void;
  isHydrated: boolean;
} {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setSettingsState(getAppSettings());
    setIsHydrated(true);

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
    updateSetting: updateSection,
    isHydrated,
  };
}
