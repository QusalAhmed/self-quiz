import React from 'react';
import { fireEvent, render, screen } from '@/test-utils';
import {
  formatCountdownHuman,
  formatCountdownTime,
  NextVerseCountdown,
  RollingCountdownDisplay,
} from './NextVerseCountdown';

const mockShowNextVerseNow = jest.fn();
const mockResetTimer = jest.fn();

let mockContextValue = {
  countdownSeconds: 845,
  nextVerseTimestamp: Date.now() + 845000,
  isStudyTimerActive: true,
  isRecurringEnabled: true,
  recurringIntervalMinutes: 15,
  resetTimer: mockResetTimer,
  showNextVerseNow: mockShowNextVerseNow,
};

jest.mock('./QuranVerseProvider', () => ({
  useQuranVerse: () => mockContextValue,
}));

describe('NextVerseCountdown helper functions', () => {
  it('formats seconds into MM:SS or H:MM:SS format correctly', () => {
    expect(formatCountdownTime(0)).toBe('00:00');
    expect(formatCountdownTime(-5)).toBe('00:00');
    expect(formatCountdownTime(45)).toBe('00:45');
    expect(formatCountdownTime(60)).toBe('01:00');
    expect(formatCountdownTime(900)).toBe('15:00');
    expect(formatCountdownTime(3600)).toBe('1:00:00');
    expect(formatCountdownTime(3665)).toBe('1:01:05');
  });

  it('formats seconds into human readable duration strings', () => {
    expect(formatCountdownHuman(0)).toBe('Due now');
    expect(formatCountdownHuman(-1)).toBe('Due now');
    expect(formatCountdownHuman(45)).toBe('45s');
    expect(formatCountdownHuman(900)).toBe('15m');
    expect(formatCountdownHuman(3665)).toBe('1h 1m 5s');
  });
});

describe('RollingCountdownDisplay Component', () => {
  it('renders Due now when totalSeconds <= 0', () => {
    render(<RollingCountdownDisplay totalSeconds={0} />);
    expect(screen.getByText(/Due now/i)).toBeInTheDocument();
  });

  it('renders animated units when totalSeconds > 0', () => {
    render(<RollingCountdownDisplay totalSeconds={845} />);
    expect(screen.getByLabelText('14m')).toBeInTheDocument();
    expect(screen.getByLabelText('5s')).toBeInTheDocument();
  });

  it('renders digital format with colons when requested', () => {
    render(<RollingCountdownDisplay totalSeconds={845} format="digital" />);
    expect(screen.getByLabelText('14')).toBeInTheDocument();
    expect(screen.getByText(':')).toBeInTheDocument();
    expect(screen.getByLabelText('5')).toBeInTheDocument();
  });
});

describe('NextVerseCountdown Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextValue = {
      countdownSeconds: 845,
      nextVerseTimestamp: Date.now() + 845000,
      isStudyTimerActive: true,
      isRecurringEnabled: true,
      recurringIntervalMinutes: 15,
      resetTimer: mockResetTimer,
      showNextVerseNow: mockShowNextVerseNow,
    };
  });

  it('renders pill variant with ticking countdown', () => {
    render(<NextVerseCountdown variant="pill" />);
    expect(screen.getByTestId('next-verse-countdown-pill')).toBeInTheDocument();
    expect(screen.getByText(/Next Verse:/i)).toBeInTheDocument();
    expect(screen.getByLabelText('14m')).toBeInTheDocument();
    expect(screen.getByLabelText('5s')).toBeInTheDocument();
  });

  it('renders stat card variant for stats grid', () => {
    render(<NextVerseCountdown variant="stat" />);
    expect(screen.getByTestId('next-verse-countdown-stat')).toBeInTheDocument();
    expect(screen.getByText(/NEXT POPUP COUNTDOWN/i)).toBeInTheDocument();
    expect(screen.getByLabelText('14m')).toBeInTheDocument();
    expect(screen.getByLabelText('5s')).toBeInTheDocument();
    expect(screen.getByText('(14:05)')).toBeInTheDocument();
  });

  it('renders banner card variant with detailed time and controls', () => {
    render(<NextVerseCountdown variant="banner" />);
    expect(screen.getByTestId('next-verse-countdown-banner')).toBeInTheDocument();
    expect(screen.getByText(/Next reflection in/i)).toBeInTheDocument();
    expect(screen.getByLabelText('14m')).toBeInTheDocument();
    expect(screen.getByLabelText('5s')).toBeInTheDocument();
    expect(screen.getByText(/Every 15m/i)).toBeInTheDocument();
    expect(screen.getByText('14:05')).toBeInTheDocument();
  });

  it('calls resetTimer when clicking reset icon', () => {
    render(<NextVerseCountdown variant="pill" />);
    const resetBtn = screen.getByRole('button', { name: /Reset countdown timer/i });
    fireEvent.click(resetBtn);
    expect(mockResetTimer).toHaveBeenCalledTimes(1);
  });

  it('calls onShowRandomNow when clicking show now button', () => {
    const onShow = jest.fn();
    render(<NextVerseCountdown variant="stat" onShowRandomNow={onShow} />);
    const triggerBtn = screen.getByRole('button', { name: /Show verse now/i });
    fireEvent.click(triggerBtn);
    expect(onShow).toHaveBeenCalledTimes(1);
  });

  it('renders paused state gracefully when recurring popups are disabled', () => {
    mockContextValue = {
      ...mockContextValue,
      isRecurringEnabled: false,
      countdownSeconds: 0,
    };

    render(<NextVerseCountdown variant="pill" />);
    expect(screen.getByText(/Popups Paused/i)).toBeInTheDocument();
  });

  it('renders idle pause indicator when user is inactive', () => {
    mockContextValue = {
      ...mockContextValue,
      isStudyTimerActive: false,
    };

    render(<NextVerseCountdown variant="banner" />);
    expect(screen.getByText(/Timer Paused \(Idle\)/i)).toBeInTheDocument();

    render(<NextVerseCountdown variant="stat" />);
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });
});
