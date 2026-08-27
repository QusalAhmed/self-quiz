'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  DAILY_USAGE_STATUS_EVENT,
  DAILY_USAGE_TICK_EVENT,
  getDailyUsageState,
  type DailyUsageStatusDetail,
  type DailyUsageTickDetail,
} from '@/lib/daily-usage';
import { type QuranVerseRecord } from '@/lib/db';
import { appNotifications } from '@/lib/notifications';
import { fetchVerseFromQuranApi, type FetchedVersePayload } from '@/lib/quran-api';
import {
  ensureDefaultQuranVersesSeeded,
  getQuranVerseById,
  getRandomActiveVerse,
  recordVerseFetchError,
  recordVerseFetchSuccess,
} from '@/lib/quran-service';
import { useAppSettings } from '@/lib/settings';
import { playNotificationSound } from '@/lib/sound';
import { QuranVerseModal } from './QuranVerseModal';

export interface QuranVerseContextType {
  verses: QuranVerseRecord[];
  isLoadingVerses: boolean;
  refreshVerses: () => Promise<void>;
  showNextVerseNow: (options?: { force?: boolean }) => Promise<void>;
  previewVerse: (
    chapter: number,
    verse: number,
    record?: QuranVerseRecord,
    verseEnd?: number
  ) => Promise<void>;
  isModalOpen: boolean;
  closeModal: () => void;
  snoozeVerse: (customMinutes?: number) => void;
  currentVerseData: FetchedVersePayload | null;
  currentVerseRecord: QuranVerseRecord | null;
  isLoadingModalVerse: boolean;
  // Countdown & Timer state
  countdownSeconds: number;
  nextVerseTimestamp: number | null;
  isStudyTimerActive: boolean;
  isRecurringEnabled: boolean;
  recurringIntervalMinutes: number;
  resetTimer: () => void;
}

const QuranVerseContext = createContext<QuranVerseContextType | null>(null);

export const STORAGE_LAST_SHOWN_KEY = 'self_quiz_quran_popup_last_shown_v1';
export const STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY = 'self_quiz_quran_last_shown_usage_seconds_v1';
export const STORAGE_SNOOZED_VERSE_ID_KEY = 'self_quiz_quran_popup_snoozed_verse_id_v1';

export function QuranVerseProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useAppSettings();
  const quranSettings = settings.quranVerse;

  const [verses, setVerses] = useState<QuranVerseRecord[]>([]);
  const [isLoadingVerses, setIsLoadingVerses] = useState<boolean>(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentVerseData, setCurrentVerseData] = useState<FetchedVersePayload | null>(null);
  const [currentVerseRecord, setCurrentVerseRecord] = useState<QuranVerseRecord | null>(null);
  const [isLoadingModalVerse, setIsLoadingModalVerse] = useState<boolean>(false);

  // Active / Idle state from daily usage tracker
  const [isStudyTimerActive, setIsStudyTimerActive] = useState<boolean>(
    () => getDailyUsageState().isActive
  );

  // Countdown & Timer State based on active study seconds
  const [countdownSeconds, setCountdownSeconds] = useState<number>(() => {
    if (!quranSettings.enabled) {
      return 0;
    }
    const intervalSeconds = Math.max(1, quranSettings.recurringIntervalMinutes || 15) * 60;
    if (typeof window === 'undefined') {
      return intervalSeconds;
    }
    try {
      const currentUsage = getDailyUsageState().secondsToday;
      const stored = localStorage.getItem(STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY);
      let lastShown = stored !== null ? parseInt(stored, 10) : currentUsage;
      if (Number.isNaN(lastShown) || currentUsage < lastShown) {
        lastShown = currentUsage;
        localStorage.setItem(STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY, String(lastShown));
      }
      const target = lastShown + intervalSeconds;
      return Math.max(0, target - currentUsage);
    } catch {
      return intervalSeconds;
    }
  });

  const [nextVerseTimestamp, setNextVerseTimestamp] = useState<number | null>(() => {
    if (!quranSettings.enabled) {
      return null;
    }
    const intervalSeconds = Math.max(1, quranSettings.recurringIntervalMinutes || 15) * 60;
    return Date.now() + intervalSeconds * 1000;
  });

  // Keep a ref of isModalOpen so background events and checks always read the freshest state
  const isModalOpenRef = useRef<boolean>(false);
  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  // Prevent concurrent trigger
  const isTriggeringRef = useRef<boolean>(false);

  // Manual timer reset
  const resetTimer = useCallback(() => {
    const currentUsage = getDailyUsageState().secondsToday;
    const now = Date.now();
    const intervalMinutes = Math.max(1, quranSettings.recurringIntervalMinutes || 15);
    const intervalSeconds = intervalMinutes * 60;

    try {
      localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(now));
      localStorage.setItem(STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY, String(currentUsage));
    } catch {}

    setCountdownSeconds(intervalSeconds);
    setNextVerseTimestamp(now + intervalSeconds * 1000);
  }, [quranSettings.recurringIntervalMinutes]);

  // Load / Seed Verses on Mount
  const loadVerses = useCallback(async () => {
    setIsLoadingVerses(true);
    try {
      const data = await ensureDefaultQuranVersesSeeded();
      setVerses(data);
    } catch (err) {
      console.error('Error loading Quran verses:', err);
    } finally {
      setIsLoadingVerses(false);
    }
  }, []);

  useEffect(() => {
    void loadVerses();
  }, [loadVerses]);

  // Fetches and displays a specific verse or verse range in the modal
  const previewVerse = useCallback(
    async (chapter: number, verse: number, record?: QuranVerseRecord, verseEndParam?: number) => {
      setIsLoadingModalVerse(true);
      setIsModalOpen(true);
      setCurrentVerseRecord(record || null);

      const effectiveEnd = verseEndParam || record?.verseEnd;

      try {
        const payload = await fetchVerseFromQuranApi(chapter, verse, {
          verseEnd: effectiveEnd,
          englishTranslationId: quranSettings.preferredEnglishTranslationId,
          banglaTranslationId: quranSettings.preferredBanglaTranslationId,
          englishTafsirId: quranSettings.preferredTafsirId,
          reciterId: quranSettings.preferredReciterId,
        });

        setCurrentVerseData(payload);

        // Update database record status
        const id =
          record?.id ||
          (effectiveEnd && effectiveEnd > verse
            ? `${chapter}:${verse}-${effectiveEnd}`
            : `${chapter}:${verse}`);
        try {
          await recordVerseFetchSuccess(id);
        } catch (dbErr) {
          console.warn('Could not record verse fetch success in DB:', dbErr);
        }
        void loadVerses();
      } catch (err: any) {
        console.error(`Failed to fetch verse ${chapter}:${verse}:`, err);
        const id =
          record?.id ||
          (effectiveEnd && effectiveEnd > verse
            ? `${chapter}:${verse}-${effectiveEnd}`
            : `${chapter}:${verse}`);
        await recordVerseFetchError(id, err?.message || 'API fetch error');
        void loadVerses();
      } finally {
        setIsLoadingModalVerse(false);
      }
    },
    [quranSettings, loadVerses]
  );

  // Picks a random active verse and shows it
  const showNextVerseNow = useCallback(
    async (options?: { force?: boolean }) => {
      const intervalMinutes = Math.max(1, quranSettings.recurringIntervalMinutes || 15);
      const intervalSeconds = intervalMinutes * 60;
      const now = Date.now();
      const currentUsage = getDailyUsageState().secondsToday;

      // Don't show second verse modal if first modal is already active unless explicitly forced
      if (isModalOpenRef.current && !options?.force) {
        // Advance last shown daily usage seconds so next verse pops up after another full study cycle
        try {
          localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(now));
          localStorage.setItem(STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY, String(currentUsage));
        } catch {}
        setCountdownSeconds(intervalSeconds);
        setNextVerseTimestamp(now + intervalSeconds * 1000);
        return;
      }

      if (isTriggeringRef.current) {
        return;
      }
      isTriggeringRef.current = true;
      setIsLoadingModalVerse(true);
      setIsModalOpen(true);

      try {
        let targetRecord: QuranVerseRecord | null = null;

        if (options?.force) {
          // Explicitly forced (e.g. "Another Verse"): clear any pending snoozed verse and pick random
          try {
            localStorage.removeItem(STORAGE_SNOOZED_VERSE_ID_KEY);
          } catch {}
          targetRecord = await getRandomActiveVerse(currentVerseRecord?.id);
        } else {
          // Automatic cycle or popup trigger: check if there is a snoozed verse to show
          let snoozedId: string | null = null;
          try {
            snoozedId = localStorage.getItem(STORAGE_SNOOZED_VERSE_ID_KEY);
          } catch {}

          if (snoozedId) {
            targetRecord = await getQuranVerseById(snoozedId);
            // Clear the snoozed item from storage once loaded for display
            try {
              localStorage.removeItem(STORAGE_SNOOZED_VERSE_ID_KEY);
            } catch {}
          }

          if (!targetRecord) {
            targetRecord = await getRandomActiveVerse(currentVerseRecord?.id);
          }
        }

        if (!targetRecord) {
          setIsLoadingModalVerse(false);
          isTriggeringRef.current = false;
          return;
        }

        setCurrentVerseRecord(targetRecord);

        const payload = await fetchVerseFromQuranApi(targetRecord.chapter, targetRecord.verse, {
          verseEnd: targetRecord.verseEnd,
          englishTranslationId: quranSettings.preferredEnglishTranslationId,
          banglaTranslationId: quranSettings.preferredBanglaTranslationId,
          englishTafsirId: quranSettings.preferredTafsirId,
          reciterId: quranSettings.preferredReciterId,
        });

        setCurrentVerseData(payload);

        // Record success in database
        try {
          await recordVerseFetchSuccess(targetRecord.id);
        } catch (dbErr) {
          console.warn('Could not record verse fetch success in DB:', dbErr);
        }

        // Sound notification if enabled
        if (quranSettings.soundNotification && settings.audio.notificationSoundsEnabled) {
          playNotificationSound();
        }

        // Record last shown daily usage seconds in localStorage and reset countdown
        try {
          localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(now));
          localStorage.setItem(STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY, String(currentUsage));
        } catch {}
        setCountdownSeconds(intervalSeconds);
        setNextVerseTimestamp(now + intervalSeconds * 1000);

        void loadVerses();
      } catch (err: any) {
        console.warn('API call failed for random Quran verse:', err);
        if (currentVerseRecord) {
          await recordVerseFetchError(currentVerseRecord.id, err?.message || 'Network error');
        }
        // "If api call fails, try next again in next cycle."
        try {
          localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(now));
          localStorage.setItem(STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY, String(currentUsage));
        } catch {}
        setCountdownSeconds(intervalSeconds);
        setNextVerseTimestamp(now + intervalSeconds * 1000);
        void loadVerses();
      } finally {
        setIsLoadingModalVerse(false);
        isTriggeringRef.current = false;
      }
    },
    [currentVerseRecord, quranSettings, settings.audio.notificationSoundsEnabled, loadVerses]
  );

  // Subscribe to central Daily Usage Timer (pauses automatically on inactivity, runs NO extra timer)
  useEffect(() => {
    if (!quranSettings.enabled) {
      setCountdownSeconds(0);
      setNextVerseTimestamp(null);
      return;
    }

    const intervalSeconds = Math.max(1, quranSettings.recurringIntervalMinutes || 15) * 60;

    const evaluateAndSetRemaining = (currentUsageSecs: number) => {
      if (typeof window === 'undefined' || !quranSettings.enabled) {
        return;
      }

      let lastShown = 0;
      try {
        const stored = localStorage.getItem(STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY);
        if (stored !== null) {
          lastShown = parseInt(stored, 10);
        } else {
          lastShown = currentUsageSecs;
          localStorage.setItem(STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY, String(lastShown));
        }
      } catch {
        lastShown = currentUsageSecs;
      }

      // Midnight rollover or invalid value check
      if (Number.isNaN(lastShown) || currentUsageSecs < lastShown) {
        lastShown = currentUsageSecs;
        try {
          localStorage.setItem(STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY, String(lastShown));
        } catch {}
      }

      const targetUsage = lastShown + intervalSeconds;
      const remainingSecs = Math.max(0, targetUsage - currentUsageSecs);

      setCountdownSeconds(remainingSecs);
      setNextVerseTimestamp(Date.now() + remainingSecs * 1000);

      if (remainingSecs <= 0) {
        // If modal is currently active, defer to next cycle
        if (isModalOpenRef.current) {
          try {
            localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(Date.now()));
            localStorage.setItem(STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY, String(currentUsageSecs));
          } catch {}
          setCountdownSeconds(intervalSeconds);
          setNextVerseTimestamp(Date.now() + intervalSeconds * 1000);
          return;
        }

        // Trigger next recurring verse!
        void showNextVerseNow();
      }
    };

    // Initial evaluation from current daily usage state
    const initialState = getDailyUsageState();
    setIsStudyTimerActive(initialState.isActive);
    evaluateAndSetRemaining(initialState.secondsToday);

    const handleTick = (event: Event) => {
      const customEvent = event as CustomEvent<DailyUsageTickDetail>;
      if (customEvent.detail) {
        setIsStudyTimerActive(customEvent.detail.isActive);
        evaluateAndSetRemaining(customEvent.detail.secondsToday);
      }
    };

    const handleStatus = (event: Event) => {
      const customEvent = event as CustomEvent<DailyUsageStatusDetail>;
      if (customEvent.detail) {
        setIsStudyTimerActive(customEvent.detail.isActive);
      }
    };

    window.addEventListener(DAILY_USAGE_TICK_EVENT, handleTick);
    window.addEventListener(DAILY_USAGE_STATUS_EVENT, handleStatus);

    return () => {
      window.removeEventListener(DAILY_USAGE_TICK_EVENT, handleTick);
      window.removeEventListener(DAILY_USAGE_STATUS_EVENT, handleStatus);
    };
  }, [quranSettings.enabled, quranSettings.recurringIntervalMinutes, showNextVerseNow]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const snoozeVerse = useCallback(
    (customMinutes?: number) => {
      const now = Date.now();
      const validCustomMinutes =
        typeof customMinutes === 'number' && Number.isFinite(customMinutes) && customMinutes > 0
          ? Math.round(customMinutes)
          : null;
      const snoozeMinutes =
        validCustomMinutes ?? Math.max(1, quranSettings.recurringIntervalMinutes || 15);
      const snoozeSeconds = snoozeMinutes * 60;
      const intervalSeconds = Math.max(1, quranSettings.recurringIntervalMinutes || 15) * 60;

      if (currentVerseRecord?.id) {
        try {
          localStorage.setItem(STORAGE_SNOOZED_VERSE_ID_KEY, currentVerseRecord.id);
        } catch {}
      }

      const currentUsage = getDailyUsageState().secondsToday;
      // Record effective last shown usage seconds so next countdown target equals currentUsage + snoozeSeconds
      const effectiveLastShown = currentUsage + snoozeSeconds - intervalSeconds;

      try {
        localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(now));
        localStorage.setItem(STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY, String(effectiveLastShown));
      } catch {}

      setCountdownSeconds(snoozeSeconds);
      setNextVerseTimestamp(now + snoozeSeconds * 1000);
      setIsModalOpen(false);
      appNotifications.info({
        title: 'Verse Reflection Snoozed',
        message: `Next Quran verse will appear in ${snoozeMinutes} minute${
          snoozeMinutes === 1 ? '' : 's'
        } of active study.`,
      });
    },
    [currentVerseRecord?.id, quranSettings.recurringIntervalMinutes]
  );

  const handleNextRandomFromModal = useCallback(() => {
    void showNextVerseNow({ force: true });
  }, [showNextVerseNow]);

  return (
    <QuranVerseContext.Provider
      value={{
        verses,
        isLoadingVerses,
        refreshVerses: loadVerses,
        showNextVerseNow,
        previewVerse,
        isModalOpen,
        closeModal,
        snoozeVerse,
        currentVerseData,
        currentVerseRecord,
        isLoadingModalVerse,
        countdownSeconds,
        nextVerseTimestamp,
        isStudyTimerActive,
        isRecurringEnabled: Boolean(quranSettings.enabled),
        recurringIntervalMinutes: Math.max(1, quranSettings.recurringIntervalMinutes || 15),
        resetTimer,
      }}
    >
      {children}

      {/* Global Quran Verse Modal Popup */}
      <QuranVerseModal
        opened={isModalOpen}
        onClose={closeModal}
        onSnooze={snoozeVerse}
        verseData={currentVerseData}
        verseRecord={currentVerseRecord}
        isLoading={isLoadingModalVerse}
        onNextRandom={handleNextRandomFromModal}
        autoPlayAudio={quranSettings.autoPlayAudio}
      />
    </QuranVerseContext.Provider>
  );
}

export function useQuranVerse(): QuranVerseContextType {
  const ctx = useContext(QuranVerseContext);
  if (!ctx) {
    throw new Error('useQuranVerse must be used within a QuranVerseProvider');
  }
  return ctx;
}
