import React from 'react';
import { fireEvent, render, screen } from '@/test-utils';
import { StatsDashboard } from './StatsDashboard';

describe('StatsDashboard component', () => {
  const defaultProps = {
    totalWords: 42,
    todayCount: 5,
    fsrsMeaningDueTodayCount: 8,
    fsrsMeaningNextDueText: 'Next in 2h',
    onOpenFsrsMeaningQuiz: jest.fn(),
    fsrsSpellingDueTodayCount: 3,
    fsrsSpellingNextDueText: 'Next in 30m',
    onOpenFsrsSpellingQuiz: jest.fn(),
    onOpenAllWordsQuiz: jest.fn(),
    onOpenTodayQuiz: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 4 cards with titles and counts', () => {
    render(<StatsDashboard {...defaultProps} />);

    expect(screen.getByText('TOTAL WORDS')).toBeInTheDocument();
    expect(screen.getByLabelText('42')).toBeInTheDocument();

    expect(screen.getByText('ADDED TODAY')).toBeInTheDocument();
    expect(screen.getByLabelText('5')).toBeInTheDocument();

    expect(screen.getByText('FSRS MEANING')).toBeInTheDocument();
    expect(screen.getByLabelText('8')).toBeInTheDocument();
    expect(screen.getByText(/Next in 2h/i)).toBeInTheDocument();

    expect(screen.getByText('FSRS SPELLING')).toBeInTheDocument();
    expect(screen.getByLabelText('3')).toBeInTheDocument();
    expect(screen.getByText(/Next in 30m/i)).toBeInTheDocument();
  });

  it('handles clicks on FSRS Meaning and FSRS Spelling cards', () => {
    render(<StatsDashboard {...defaultProps} />);

    const meaningCard = screen.getByText('FSRS MEANING').closest('.mantine-Card-root');
    expect(meaningCard).toBeInTheDocument();
    fireEvent.click(meaningCard!);
    expect(defaultProps.onOpenFsrsMeaningQuiz).toHaveBeenCalledTimes(1);

    const spellingCard = screen.getByText('FSRS SPELLING').closest('.mantine-Card-root');
    expect(spellingCard).toBeInTheDocument();
    fireEvent.click(spellingCard!);
    expect(defaultProps.onOpenFsrsSpellingQuiz).toHaveBeenCalledTimes(1);
  });

  it('falls back gracefully to legacy props when provided', () => {
    const onOpenFsrsQuiz = jest.fn();
    render(
      <StatsDashboard
        totalWords={10}
        todayCount={2}
        fsrsDueTodayCount={7}
        fsrsNextDueText="All due now"
        onOpenFsrsQuiz={onOpenFsrsQuiz}
        onOpenAllWordsQuiz={jest.fn()}
        onOpenTodayQuiz={jest.fn()}
      />
    );

    expect(screen.getByText('FSRS MEANING')).toBeInTheDocument();
    expect(screen.getByLabelText('7')).toBeInTheDocument();
    expect(screen.getByText(/All due now/i)).toBeInTheDocument();

    const meaningCard = screen.getByText('FSRS MEANING').closest('.mantine-Card-root');
    expect(meaningCard).toBeInTheDocument();
    fireEvent.click(meaningCard!);
    expect(onOpenFsrsQuiz).toHaveBeenCalledTimes(1);
  });
});
