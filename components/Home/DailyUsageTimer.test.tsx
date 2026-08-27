import React from 'react';
import { act, fireEvent, render, screen } from '@/test-utils';
import { DailyUsageTimer, formatDuration, IDLE_THRESHOLD_MS } from './DailyUsageTimer';

// Mock getDatabase
jest.mock('@/lib/db', () => ({
  getDatabase: jest.fn().mockResolvedValue({
    dailyUsage: {
      find: jest.fn().mockReturnValue({
        $: {
          subscribe: jest.fn((cb) => {
            cb([]);
            return { unsubscribe: jest.fn() };
          }),
        },
      }),
      upsert: jest.fn().mockResolvedValue({}),
    },
  }),
}));

describe('formatDuration utility', () => {
  it('formats seconds, minutes, and hours properly', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(-5)).toBe('0s');
    expect(formatDuration(42)).toBe('42s');
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(125)).toBe('2m 5s');
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(3665)).toBe('1h 1m 5s');
    expect(formatDuration(7322)).toBe('2h 2m 2s');
  });
});

describe('DailyUsageTimer component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly and is active initially', async () => {
    await act(async () => {
      render(<DailyUsageTimer />);
    });

    expect(screen.getByText('DAILY STUDY TIME')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('transitions to idle after inactivity threshold and resumes instantly on user interaction', async () => {
    await act(async () => {
      render(<DailyUsageTimer />);
    });

    expect(screen.getByText('Active')).toBeInTheDocument();

    // Advance timers past the idle threshold
    act(() => {
      jest.advanceTimersByTime(IDLE_THRESHOLD_MS + 2000);
    });

    expect(screen.getByText('Idle (Paused)')).toBeInTheDocument();

    // User interacts (e.g. mousemove / click / keydown / touchstart / scroll)
    act(() => {
      fireEvent.mouseMove(window);
    });

    // Should immediately return to Active!
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('pauses when document visibility becomes hidden and resumes when visible', async () => {
    await act(async () => {
      render(<DailyUsageTimer />);
    });

    expect(screen.getByText('Active')).toBeInTheDocument();

    // Document becomes hidden (e.g. switched tab)
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      fireEvent(document, new Event('visibilitychange'));
    });

    expect(screen.getByText('Idle (Paused)')).toBeInTheDocument();

    // Document becomes visible again
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      fireEvent(document, new Event('visibilitychange'));
    });

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('pauses immediately when window loses focus (window blur) and resumes on window focus', async () => {
    await act(async () => {
      render(<DailyUsageTimer />);
    });

    expect(screen.getByText('Active')).toBeInTheDocument();

    // User leaves the app window (e.g. alt-tab / switch to another app / click outside)
    act(() => {
      jest.spyOn(document, 'hasFocus').mockReturnValue(false);
      fireEvent(window, new Event('blur'));
    });

    expect(screen.getByText('Idle (Paused)')).toBeInTheDocument();

    // User returns to the app window
    act(() => {
      jest.spyOn(document, 'hasFocus').mockReturnValue(true);
      fireEvent(window, new Event('focus'));
    });

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('stays paused on background events when window is blurred', async () => {
    await act(async () => {
      render(<DailyUsageTimer />);
    });

    expect(screen.getByText('Active')).toBeInTheDocument();

    // Blur window
    act(() => {
      jest.spyOn(document, 'hasFocus').mockReturnValue(false);
      fireEvent(window, new Event('blur'));
    });

    expect(screen.getByText('Idle (Paused)')).toBeInTheDocument();

    // Event fired while unfocused should not mark it active
    act(() => {
      fireEvent.mouseMove(window);
    });

    expect(screen.getByText('Idle (Paused)')).toBeInTheDocument();

    // Focusing window marks it active
    act(() => {
      jest.spyOn(document, 'hasFocus').mockReturnValue(true);
      fireEvent(window, new Event('focus'));
    });

    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
