'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { type QuranVerseRecord } from '@/lib/db';
import { fetchVerseFromQuranApi, type FetchedVersePayload } from '@/lib/quran-api';
import {
  ensureDefaultQuranVersesSeeded,
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
  currentVerseData: FetchedVersePayload | null;
  currentVerseRecord: QuranVerseRecord | null;
  isLoadingModalVerse: boolean;
}

const QuranVerseContext = createContext<QuranVerseContextType | null>(null);

export const STORAGE_LAST_SHOWN_KEY = 'self_quiz_quran_popup_last_shown_v1';

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

  // Keep a ref of isModalOpen so background timers and interval checks always read the freshest state
  const isModalOpenRef = useRef<boolean>(false);
  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  // Prevent concurrent trigger
  const isTriggeringRef = useRef<boolean>(false);

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
      // Don't show second verse modal if first modal is already active unless explicitly forced
      if (isModalOpenRef.current && !options?.force) {
        // Advance last shown timestamp so the next verse pops up in the next cycle
        try {
          localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(Date.now()));
        } catch {}
        return;
      }

      if (isTriggeringRef.current) {
        return;
      }
      isTriggeringRef.current = true;
      setIsLoadingModalVerse(true);
      setIsModalOpen(true);

      try {
        const randomRecord = await getRandomActiveVerse(currentVerseRecord?.id);
        if (!randomRecord) {
          setIsLoadingModalVerse(false);
          isTriggeringRef.current = false;
          return;
        }

        setCurrentVerseRecord(randomRecord);

        const payload = await fetchVerseFromQuranApi(randomRecord.chapter, randomRecord.verse, {
          verseEnd: randomRecord.verseEnd,
          englishTranslationId: quranSettings.preferredEnglishTranslationId,
          banglaTranslationId: quranSettings.preferredBanglaTranslationId,
          englishTafsirId: quranSettings.preferredTafsirId,
          reciterId: quranSettings.preferredReciterId,
        });

        setCurrentVerseData(payload);

        // Record success in database
        await recordVerseFetchSuccess(randomRecord.id);

        // Sound notification if enabled
        if (quranSettings.soundNotification && settings.audio.notificationSoundsEnabled) {
          playNotificationSound();
        }

        // Record last shown timestamp in localStorage
        try {
          localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(Date.now()));
        } catch {}

        void loadVerses();
      } catch (err: any) {
        console.warn('API call failed for random Quran verse:', err);
        if (currentVerseRecord) {
          await recordVerseFetchError(currentVerseRecord.id, err?.message || 'Network error');
        }
        // "If api call fails, try next again in next cycle."
        try {
          localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(Date.now()));
        } catch {}
        void loadVerses();
      } finally {
        setIsLoadingModalVerse(false);
        isTriggeringRef.current = false;
      }
    },
    [currentVerseRecord, quranSettings, settings.audio.notificationSoundsEnabled, loadVerses]
  );

  // Recurring Interval Timer Engine
  useEffect(() => {
    if (!quranSettings.enabled) {
      return;
    }

    const intervalMinutes = Math.max(1, quranSettings.recurringIntervalMinutes || 15);
    const intervalMs = intervalMinutes * 60 * 1000;

    // Check timer every 10 seconds
    const intervalTimer = setInterval(() => {
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
        return;
      }

      const elapsed = now - lastShown;
      if (elapsed >= intervalMs) {
        // If first modal is active, do not show second modal; defer to next cycle
        if (isModalOpenRef.current) {
          try {
            localStorage.setItem(STORAGE_LAST_SHOWN_KEY, String(now));
          } catch {}
          return;
        }

        // Trigger next recurring verse!
        void showNextVerseNow();
      }
    }, 10000);

    return () => clearInterval(intervalTimer);
  }, [quranSettings.enabled, quranSettings.recurringIntervalMinutes, showNextVerseNow]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

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
        currentVerseData,
        currentVerseRecord,
        isLoadingModalVerse,
      }}
    >
      {children}

      {/* Global Quran Verse Modal Popup */}
      <QuranVerseModal
        opened={isModalOpen}
        onClose={closeModal}
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
