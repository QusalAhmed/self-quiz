import React from 'react';
import { setDailyUsageState } from '@/lib/daily-usage';
import { appNotifications } from '@/lib/notifications';
import { fetchVerseFromQuranApi } from '@/lib/quran-api';
import { ensureDefaultQuranVersesSeeded, recordVerseFetchSuccess } from '@/lib/quran-service';
import { act, fireEvent, render, screen, waitFor } from '@/test-utils';
import {
  QuranVerseProvider,
  STORAGE_LAST_SHOWN_KEY,
  STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY,
  STORAGE_SNOOZED_VERSE_ID_KEY,
  useQuranVerse,
} from './QuranVerseProvider';

jest.mock('@/lib/quran-api', () => ({
  fetchVerseFromQuranApi: jest.fn().mockResolvedValue({
    chapter: 2,
    verse: 255,
    key: '2:255',
    textUthmani: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
    englishText:
      'Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence.',
    banglaText: 'আল্লাহ, যিনি ছাড়া কোনো সত্য উপাস্য নেই, তিনি চিরঞ্জীব, সবকিছুর ধারক।',
    englishTranslation: {
      id: 20,
      translatorName: 'Saheeh International',
      languageName: 'english',
      text: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence.',
    },
    banglaTranslation: {
      id: 163,
      translatorName: 'Taisirul Quran',
      languageName: 'bengali',
      text: 'আল্লাহ, যিনি ছাড়া কোনো সত্য উপাস্য নেই, তিনি চিরঞ্জীব, সবকিছুর ধারক।',
    },
    tafsir: {
      english: {
        id: 169,
        name: 'Tafsir Ibn Kathir',
        text: 'This is the Verse of the Throne (Ayat Al-Kursi), which has a tremendous status.',
      },
    },
    chapterInfo: {
      id: 2,
      nameSimple: 'Al-Baqarah',
      nameArabic: 'البقرة',
      versesCount: 286,
      revelationPlace: 'madinah',
    },
    audio: {
      audioUrl: 'https://verses.quran.com/Alafasy/002255.mp3',
      reciterName: 'Mishary Rashid Alafasy',
    },
  }),
  AVAILABLE_TRANSLATIONS: [],
  AVAILABLE_TAFSIRS: [],
  AVAILABLE_RECITERS: [],
}));

jest.mock('@/lib/quran-service', () => ({
  ensureDefaultQuranVersesSeeded: jest.fn().mockResolvedValue([
    {
      id: '2:255',
      chapter: 2,
      verse: 255,
      category: 'Inspirational',
      notes: 'Ayatul Kursi',
      status: 'active',
      viewCount: 0,
      createdAt: '2026-08-25T00:00:00.000Z',
      updatedAt: '2026-08-25T00:00:00.000Z',
      isDeleted: false,
      lastSyncedAt: '',
    },
    {
      id: '94:5',
      chapter: 94,
      verse: 5,
      category: 'Hope',
      notes: 'With hardship comes ease',
      status: 'active',
      viewCount: 0,
      createdAt: '2026-08-25T00:00:00.000Z',
      updatedAt: '2026-08-25T00:00:00.000Z',
      isDeleted: false,
      lastSyncedAt: '',
    },
  ]),
  getRandomActiveVerse: jest.fn().mockResolvedValue({
    id: '2:255',
    chapter: 2,
    verse: 255,
    category: 'Inspirational',
    notes: 'Ayatul Kursi',
    status: 'active',
    viewCount: 0,
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T00:00:00.000Z',
    isDeleted: false,
    lastSyncedAt: '',
  }),
  getQuranVerseById: jest.fn().mockImplementation((id: string) =>
    Promise.resolve({
      id,
      chapter: id === '94:5' ? 94 : 2,
      verse: id === '94:5' ? 5 : 255,
      category: 'Inspirational',
      notes: 'Test verse',
      status: 'active',
      viewCount: 0,
      createdAt: '2026-08-25T00:00:00.000Z',
      updatedAt: '2026-08-25T00:00:00.000Z',
      isDeleted: false,
      lastSyncedAt: '',
    })
  ),
  recordVerseFetchSuccess: jest.fn().mockResolvedValue(undefined),
  recordVerseFetchError: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/sound', () => ({
  playNotificationSound: jest.fn(),
}));

jest.mock('@/lib/notifications', () => ({
  appNotifications: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

function TestConsumer() {
  const {
    isModalOpen,
    showNextVerseNow,
    closeModal,
    snoozeVerse,
    currentVerseData,
    countdownSeconds,
    resetTimer,
  } = useQuranVerse();
  return (
    <div>
      <div data-testid="modal-status">{isModalOpen ? 'OPEN' : 'CLOSED'}</div>
      <div data-testid="verse-key">{currentVerseData?.key || 'NONE'}</div>
      <div data-testid="countdown-seconds">{countdownSeconds}</div>
      <button type="button" data-testid="btn-auto-trigger" onClick={() => void showNextVerseNow()}>
        Auto Trigger Next
      </button>
      <button
        type="button"
        data-testid="btn-force-trigger"
        onClick={() => void showNextVerseNow({ force: true })}
      >
        Force Trigger Next
      </button>
      <button type="button" data-testid="btn-close-modal" onClick={closeModal}>
        Close Modal
      </button>
      <button type="button" data-testid="btn-snooze-modal" onClick={() => snoozeVerse(20)}>
        Snooze Modal Custom
      </button>
      <button type="button" data-testid="btn-snooze-event-modal" onClick={snoozeVerse as any}>
        Snooze Modal Direct Event
      </button>
      <button type="button" data-testid="btn-reset-timer" onClick={resetTimer}>
        Reset Timer
      </button>
    </div>
  );
}

describe('QuranVerseProvider - Recurring Cycle & Active Modal Protection', () => {
  beforeEach(() => {
    localStorage.clear();
    setDailyUsageState(0, true);
    jest.clearAllMocks();
  });

  it('renders initial closed state and seeds verses', async () => {
    render(
      <QuranVerseProvider>
        <TestConsumer />
      </QuranVerseProvider>
    );

    expect(screen.getByTestId('modal-status').textContent).toBe('CLOSED');
    await waitFor(() => {
      expect(ensureDefaultQuranVersesSeeded).toHaveBeenCalled();
    });
  });

  it('opens modal when trigger is invoked from closed state', async () => {
    render(
      <QuranVerseProvider>
        <TestConsumer />
      </QuranVerseProvider>
    );

    fireEvent.click(screen.getByTestId('btn-auto-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('modal-status').textContent).toBe('OPEN');
      expect(screen.getByTestId('verse-key').textContent).toBe('2:255');
    });

    expect(recordVerseFetchSuccess).toHaveBeenCalledWith('2:255');
  });

  it('does NOT show second verse modal or overwrite if first modal is already active', async () => {
    render(
      <QuranVerseProvider>
        <TestConsumer />
      </QuranVerseProvider>
    );

    // Open first modal
    fireEvent.click(screen.getByTestId('btn-auto-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('modal-status').textContent).toBe('OPEN');
    });

    (fetchVerseFromQuranApi as jest.Mock).mockClear();

    // Now, while first modal is OPEN, an automatic background trigger occurs (e.g. interval timer)
    const beforeTimestamp = Date.now();
    fireEvent.click(screen.getByTestId('btn-auto-trigger'));

    // Should NOT call fetchVerseFromQuranApi again because first modal is active
    expect(fetchVerseFromQuranApi).not.toHaveBeenCalled();

    // Should update localStorage timestamp to now so it defers to the next cycle
    const stored = localStorage.getItem(STORAGE_LAST_SHOWN_KEY);
    expect(stored).toBeDefined();
    expect(Number(stored)).toBeGreaterThanOrEqual(beforeTimestamp);
  });

  it('allows forced manual refresh when user explicitly clicks Next Random button inside modal', async () => {
    render(
      <QuranVerseProvider>
        <TestConsumer />
      </QuranVerseProvider>
    );

    // Open first modal
    fireEvent.click(screen.getByTestId('btn-auto-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('modal-status').textContent).toBe('OPEN');
    });

    (fetchVerseFromQuranApi as jest.Mock).mockClear();

    // Explicit force trigger (e.g., user clicked Next Random button)
    fireEvent.click(screen.getByTestId('btn-force-trigger'));

    await waitFor(() => {
      expect(fetchVerseFromQuranApi).toHaveBeenCalled();
    });
  });

  it('snoozes active modal, remembers snoozed verse, and shows the same verse on next cycle', async () => {
    render(
      <QuranVerseProvider>
        <TestConsumer />
      </QuranVerseProvider>
    );

    // Open modal first (loads 2:255)
    fireEvent.click(screen.getByTestId('btn-auto-trigger'));
    await waitFor(() => {
      expect(screen.getByTestId('modal-status').textContent).toBe('OPEN');
      expect(screen.getByTestId('verse-key').textContent).toBe('2:255');
    });

    const beforeSnooze = Date.now();
    // Snooze the verse
    fireEvent.click(screen.getByTestId('btn-snooze-modal'));

    // Modal should close immediately
    expect(screen.getByTestId('modal-status').textContent).toBe('CLOSED');

    // Next verse timer should be reset to current timestamp and snoozed verse ID preserved
    expect(Number(localStorage.getItem(STORAGE_LAST_SHOWN_KEY))).toBeGreaterThanOrEqual(
      beforeSnooze
    );
    expect(localStorage.getItem(STORAGE_SNOOZED_VERSE_ID_KEY)).toBe('2:255');

    (fetchVerseFromQuranApi as jest.Mock).mockClear();

    // Now interval timer fires or next cycle triggers automatically
    fireEvent.click(screen.getByTestId('btn-auto-trigger'));

    // Modal opens again with the SAME snoozed verse (2:255)
    await waitFor(() => {
      expect(screen.getByTestId('modal-status').textContent).toBe('OPEN');
      expect(screen.getByTestId('verse-key').textContent).toBe('2:255');
    });

    // Fetched specifically for chapter 2 verse 255
    expect(fetchVerseFromQuranApi).toHaveBeenCalledWith(
      2,
      255,
      expect.objectContaining({ verseEnd: undefined })
    );

    // Notification should properly show formatted string, not [object Object]
    expect(appNotifications.info).toHaveBeenCalledWith({
      title: 'Verse Reflection Snoozed',
      message: expect.stringMatching(/20 minutes of active study/),
    });

    // Once displayed, the snoozed ID key is cleared from storage
    expect(localStorage.getItem(STORAGE_SNOOZED_VERSE_ID_KEY)).toBeNull();
  });

  it('safely handles direct event calls to snooze without showing [object Object]', async () => {
    render(
      <QuranVerseProvider>
        <TestConsumer />
      </QuranVerseProvider>
    );

    // Open modal first
    fireEvent.click(screen.getByTestId('btn-auto-trigger'));
    await waitFor(() => {
      expect(screen.getByTestId('modal-status').textContent).toBe('OPEN');
    });

    (appNotifications.info as jest.Mock).mockClear();

    // Click button passing click event directly
    fireEvent.click(screen.getByTestId('btn-snooze-event-modal'));

    expect(screen.getByTestId('modal-status').textContent).toBe('CLOSED');
    expect(appNotifications.info).toHaveBeenCalledWith({
      title: 'Verse Reflection Snoozed',
      message: expect.stringMatching(
        /^Next Quran verse will appear in \d+ minutes of active study\.$/
      ),
    });
    const callArg = (appNotifications.info as jest.Mock).mock.calls[0][0];
    expect(callArg.message).not.toContain('[object Object]');
  });

  it('provides countdown seconds and supports resetTimer', async () => {
    render(
      <QuranVerseProvider>
        <TestConsumer />
      </QuranVerseProvider>
    );

    const countdownEl = screen.getByTestId('countdown-seconds');
    expect(Number(countdownEl.textContent)).toBeGreaterThan(0);

    const beforeReset = Date.now();
    fireEvent.click(screen.getByTestId('btn-reset-timer'));

    expect(Number(localStorage.getItem(STORAGE_LAST_SHOWN_KEY))).toBeGreaterThanOrEqual(
      beforeReset
    );
    expect(Number(screen.getByTestId('countdown-seconds').textContent)).toBe(900); // 15m * 60s
  });

  it('tracks daily usage time of previous verse and triggers next verse when target active time is reached', async () => {
    localStorage.setItem(STORAGE_LAST_SHOWN_USAGE_SECONDS_KEY, '100');
    setDailyUsageState(100, true);
    render(
      <QuranVerseProvider>
        <TestConsumer />
      </QuranVerseProvider>
    );

    // Initial tick with base usage seconds = 100
    act(() => {
      window.dispatchEvent(
        new CustomEvent('self_quiz_daily_usage_tick', {
          detail: { secondsToday: 100, isActive: true, date: '2026-08-27' },
        })
      );
    });

    // Countdown should now be 900 seconds (15m cycle: target 100 + 900 = 1000, current 100 => 900)
    expect(screen.getByTestId('countdown-seconds').textContent).toBe('900');

    // Simulate 300 active study seconds (secondsToday = 400 => remaining 1000 - 400 = 600)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('self_quiz_daily_usage_tick', {
          detail: { secondsToday: 400, isActive: true, date: '2026-08-27' },
        })
      );
    });

    // Countdown should have decreased to 600 seconds (10m left)
    expect(screen.getByTestId('countdown-seconds').textContent).toBe('600');

    // While user is inactive/idle, NO ticks are emitted -> countdown remains paused at 600s
    expect(screen.getByTestId('countdown-seconds').textContent).toBe('600');

    (fetchVerseFromQuranApi as jest.Mock).mockClear();

    // Now user resumes active study until target (secondsToday = 1000 => 100 + 900)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('self_quiz_daily_usage_tick', {
          detail: { secondsToday: 1000, isActive: true, date: '2026-08-27' },
        })
      );
    });

    // Modal should now trigger automatically
    await waitFor(() => {
      expect(screen.getByTestId('modal-status').textContent).toBe('OPEN');
    });
  });
});
