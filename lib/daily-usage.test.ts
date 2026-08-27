import {
  DAILY_USAGE_STATUS_EVENT,
  DAILY_USAGE_STORAGE_KEY,
  DAILY_USAGE_TICK_EVENT,
  getDailyUsageState,
  setDailyUsageState,
  setDailyUsageStatus,
} from './daily-usage';

describe('daily-usage utility and state', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset by setting 0
    setDailyUsageState(0, true);
  });

  it('correctly tracks and returns daily usage state', () => {
    const initial = getDailyUsageState();
    expect(initial.secondsToday).toBe(0);
    expect(initial.isActive).toBe(true);

    setDailyUsageState(120, true);
    const updated = getDailyUsageState();
    expect(updated.secondsToday).toBe(120);
    expect(updated.isActive).toBe(true);
    expect(localStorage.getItem(DAILY_USAGE_STORAGE_KEY)).toBe('120');
  });

  it('dispatches DAILY_USAGE_TICK_EVENT on setDailyUsageState', () => {
    const tickListener = jest.fn();
    window.addEventListener(DAILY_USAGE_TICK_EVENT, tickListener);

    setDailyUsageState(45, true, '2026-08-27');

    expect(tickListener).toHaveBeenCalledTimes(1);
    const event = tickListener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({
      secondsToday: 45,
      isActive: true,
      date: '2026-08-27',
    });

    window.removeEventListener(DAILY_USAGE_TICK_EVENT, tickListener);
  });

  it('dispatches DAILY_USAGE_STATUS_EVENT on setDailyUsageStatus', () => {
    const statusListener = jest.fn();
    window.addEventListener(DAILY_USAGE_STATUS_EVENT, statusListener);

    setDailyUsageStatus(false);

    expect(statusListener).toHaveBeenCalledTimes(1);
    const event = statusListener.mock.calls[0][0] as CustomEvent;
    expect(event.detail.isActive).toBe(false);

    window.removeEventListener(DAILY_USAGE_STATUS_EVENT, statusListener);
  });
});
