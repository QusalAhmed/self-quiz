'use client';

export const DAILY_USAGE_TICK_EVENT = 'self_quiz_daily_usage_tick';
export const DAILY_USAGE_STATUS_EVENT = 'self_quiz_daily_usage_status';
export const DAILY_USAGE_STORAGE_KEY = 'self_quiz_daily_usage_today_seconds_v1';
export const DAILY_USAGE_DATE_STORAGE_KEY = 'self_quiz_daily_usage_today_date_v1';

export interface DailyUsageTickDetail {
  secondsToday: number;
  isActive: boolean;
  date: string;
}

export interface DailyUsageStatusDetail {
  isActive: boolean;
  secondsToday: number;
}

let inMemoryDailyUsageSeconds = 0;
let inMemoryIsActive = true;

/**
 * Returns current in-memory / persisted daily study usage state
 */
export function getDailyUsageState(): { secondsToday: number; isActive: boolean; date: string } {
  const todayDate = new Date().toLocaleDateString('en-CA');
  if (typeof window !== 'undefined') {
    try {
      const storedDate = localStorage.getItem(DAILY_USAGE_DATE_STORAGE_KEY);
      if (storedDate && storedDate !== todayDate) {
        inMemoryDailyUsageSeconds = 0;
        localStorage.setItem(DAILY_USAGE_DATE_STORAGE_KEY, todayDate);
        localStorage.setItem(DAILY_USAGE_STORAGE_KEY, '0');
      } else {
        const stored = localStorage.getItem(DAILY_USAGE_STORAGE_KEY);
        if (stored !== null) {
          const parsed = parseInt(stored, 10);
          if (!Number.isNaN(parsed) && parsed >= 0) {
            inMemoryDailyUsageSeconds = Math.max(inMemoryDailyUsageSeconds, parsed);
          }
        }
      }
    } catch {}
  }
  return {
    secondsToday: inMemoryDailyUsageSeconds,
    isActive: inMemoryIsActive,
    date: todayDate,
  };
}

/**
 * Updates daily usage seconds and dispatches tick event for subscribers (like QuranVerseProvider)
 */
export function setDailyUsageState(
  secondsToday: number,
  isActive: boolean = true,
  date?: string
): void {
  const todayDate = date || new Date().toLocaleDateString('en-CA');
  inMemoryDailyUsageSeconds = Math.max(0, secondsToday);
  inMemoryIsActive = isActive;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DAILY_USAGE_DATE_STORAGE_KEY, todayDate);
      localStorage.setItem(DAILY_USAGE_STORAGE_KEY, String(inMemoryDailyUsageSeconds));
    } catch {}

    window.dispatchEvent(
      new CustomEvent<DailyUsageTickDetail>(DAILY_USAGE_TICK_EVENT, {
        detail: {
          secondsToday: inMemoryDailyUsageSeconds,
          isActive: inMemoryIsActive,
          date: todayDate,
        },
      })
    );
  }
}

/**
 * Updates active/idle status and dispatches status event
 */
export function setDailyUsageStatus(isActive: boolean): void {
  inMemoryIsActive = isActive;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<DailyUsageStatusDetail>(DAILY_USAGE_STATUS_EVENT, {
        detail: {
          isActive: inMemoryIsActive,
          secondsToday: inMemoryDailyUsageSeconds,
        },
      })
    );
  }
}
