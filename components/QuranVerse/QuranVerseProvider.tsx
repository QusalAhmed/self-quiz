'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  isRecurringEnabled: boolean;
  recurringIntervalMinutes: number;
  resetTimer: () => void;
}

const QuranVerseContext = createContext<QuranVerseContextType | null>(null);

export const STORAGE_LAST_SHOWN_KEY = 'self_quiz_quran_popup_last_shown_v1';
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

  // Countdown & Timer State
  const [countdownSeconds, setCountdownSeconds] = useState<number>(() => {
    if (!quranSettings.enabled) {
      return 0;
    }
    const intervalMinutes = Math.max(1, quranSettings.recurringIntervalMinutes || 15);
    return intervalMinutes * 60;
  });
  const [nextVerseTimestamp, setNextVerseTimestamp] = useState<number | null>(null);

  // Keep a ref of isModalOpen so background timers and interval checks always read the freshest state
  const isModalOpenRef = useRef<boolean>(false);
  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  // Prevent concurrent trigger
  const isTriggeringRef = useRef<boolean>(false);

  // Manual timer reset
  const resetTimer = useCallback(() => {
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(now));
    } catch {}
    const intervalMinutes = Math.max(1, quranSettings.recurringIntervalMinutes || 15);
    const intervalMs = intervalMinutes * 60 * 1000;
    setCountdownSeconds(intervalMinutes * 60);
    setNextVerseTimestamp(now + intervalMs);
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
        await recordVerseFetchSuccess(id);
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
      const intervalMs = intervalMinutes * 60 * 1000;
      const now = Date.now();

      // Don't show second verse modal if first modal is already active unless explicitly forced
      if (isModalOpenRef.current && !options?.force) {
        // Advance last shown timestamp so the next verse pops up in the next cycle
        try {
          localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(now));
        } catch {}
        setCountdownSeconds(intervalMinutes * 60);
        setNextVerseTimestamp(now + intervalMs);
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
        await recordVerseFetchSuccess(targetRecord.id);

        // Sound notification if enabled
        if (quranSettings.soundNotification && settings.audio.notificationSoundsEnabled) {
          playNotificationSound();
        }

        // Record last shown timestamp in localStorage and reset countdown
        try {
          localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(now));
        } catch {}
        setCountdownSeconds(intervalMinutes * 60);
        setNextVerseTimestamp(now + intervalMs);

        void loadVerses();
      } catch (err: any) {
        console.warn('API call failed for random Quran verse:', err);
        if (currentVerseRecord) {
          await recordVerseFetchError(currentVerseRecord.id, err?.message || 'Network error');
        }
        // "If api call fails, try next again in next cycle."
        try {
          localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(now));
        } catch {}
        setCountdownSeconds(intervalMinutes * 60);
        setNextVerseTimestamp(now + intervalMs);
        void loadVerses();
      } finally {
        setIsLoadingModalVerse(false);
        isTriggeringRef.current = false;
      }
    },
    [currentVerseRecord, quranSettings, settings.audio.notificationSoundsEnabled, loadVerses]
  );

  // Recurring Interval Timer Engine & Live Countdown (1-second tick)
  useEffect(() => {
    if (!quranSettings.enabled) {
      setCountdownSeconds(0);
      setNextVerseTimestamp(null);
      return;
    }

    const intervalMinutes = Math.max(1, quranSettings.recurringIntervalMinutes || 15);
    const intervalMs = intervalMinutes * 60 * 1000;

    const tick = () => {
      if (typeof window === 'undefined' || !quranSettings.enabled) {
        return;
      }

      let lastShown = 0;
      try {
        const stored = localStorage.getItem(STORAGE_LAST_SHOWN_KEY);
        if (stored) {
          lastShown = parseInt(stored, 10);
        }
      } catch {}

      const now = Date.now();
      if (!lastShown) {
        // First run: initialize timer for full cycle from now
        try {
          localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(now));
        } catch {}
        lastShown = now;
      }

      const target = lastShown + intervalMs;
      const remainingMs = target - now;
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

      setCountdownSeconds(remainingSecs);
      setNextVerseTimestamp(target);

      if (remainingSecs <= 0) {
        // If first modal is active, do not show second modal; defer to next cycle
        if (isModalOpenRef.current) {
          try {
            localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(now));
          } catch {}
          setCountdownSeconds(intervalMinutes * 60);
          setNextVerseTimestamp(now + intervalMs);
          return;
        }

        // Trigger next recurring verse!
        void showNextVerseNow();
      }
    };

    // Run tick immediately on effect start
    tick();

    // Run tick every 1000ms
    const intervalTimer = setInterval(tick, 1000);

    return () => clearInterval(intervalTimer);
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
      const intervalMinutes =
        validCustomMinutes ?? Math.max(1, quranSettings.recurringIntervalMinutes || 15);
      const intervalMs = intervalMinutes * 60 * 1000;

      if (currentVerseRecord?.id) {
        try {
          localStorage.setItem(STORAGE_SNOOZED_VERSE_ID_KEY, currentVerseRecord.id);
        } catch {}
      }

      try {
        localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(now));
      } catch {}
      setCountdownSeconds(intervalMinutes * 60);
      setNextVerseTimestamp(now + intervalMs);
      setIsModalOpen(false);
      appNotifications.info({
        title: 'Verse Reflection Snoozed',
        message: `Next Quran verse will appear in ${intervalMinutes} minute${
          intervalMinutes === 1 ? '' : 's'
        }.`,
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
