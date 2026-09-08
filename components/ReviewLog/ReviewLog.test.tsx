import React from 'react';
import type { ReviewLogRecord } from '@/lib/db';
import { fireEvent, render, screen } from '@/test-utils';
import { ReviewLogFilters } from './ReviewLogFilters';
import { ReviewLogTable } from './ReviewLogTable';
import { ReviewStatsStrip } from './ReviewStatsStrip';

const mockLogs: ReviewLogRecord[] = [
  {
    id: 'log-1',
    wordId: 'w-1',
    cardId: 'c-1',
    quizMode: 'wordToMeaning',
    word: 'resilient',
    meaning: 'able to withstand or recover quickly from difficult conditions',
    rating: 'good',
    stateBefore: 'Learning',
    stateAfter: 'Review',
    scheduledDays: 3,
    stability: 3.5,
    difficulty: 5.0,
    elapsedDays: 1,
    dueAt: '2026-09-11T10:00:00.000Z',
    reviewedAt: '2026-09-08T10:00:00.000Z',
    durationMs: 2400,
    lapses: 0,
    reps: 2,
    isDeleted: false,
    createdAt: '2026-09-08T10:00:00.000Z',
    updatedAt: '2026-09-08T10:00:00.000Z',
    lastSyncedAt: '',
  },
  {
    id: 'log-2',
    wordId: 'w-2',
    cardId: 'c-2',
    quizMode: 'meaningToWord',
    word: 'ephemeral',
    meaning: 'lasting for a very short time',
    rating: 'again',
    stateBefore: 'Review',
    stateAfter: 'Learning',
    scheduledDays: 0,
    stability: 0.5,
    difficulty: 7.2,
    elapsedDays: 4,
    dueAt: '2026-09-08T11:05:00.000Z',
    reviewedAt: '2026-09-08T11:00:00.000Z',
    durationMs: 8200,
    lapses: 1,
    reps: 3,
    isDeleted: false,
    createdAt: '2026-09-08T11:00:00.000Z',
    updatedAt: '2026-09-08T11:00:00.000Z',
    lastSyncedAt: '',
  },
  {
    id: 'log-3',
    wordId: 'w-3',
    cardId: 'c-3',
    quizMode: 'wordToMeaning',
    word: 'lucid',
    meaning: 'expressed clearly; easy to understand',
    rating: 'easy',
    stateBefore: 'Review',
    stateAfter: 'Review',
    scheduledDays: 12,
    stability: 14.0,
    difficulty: 3.1,
    elapsedDays: 5,
    dueAt: '2026-09-20T12:00:00.000Z',
    reviewedAt: '2026-09-08T12:00:00.000Z',
    durationMs: 1200,
    lapses: 0,
    reps: 5,
    isDeleted: false,
    createdAt: '2026-09-08T12:00:00.000Z',
    updatedAt: '2026-09-08T12:00:00.000Z',
    lastSyncedAt: '',
  },
];

describe('ReviewStatsStrip', () => {
  it('calculates counts, recall accuracy, and response distribution correctly', () => {
    render(<ReviewStatsStrip reviewLogs={mockLogs} />);

    // Total Reviews: 3
    expect(screen.getByText('TOTAL REVIEWS')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '3' })).toBeInTheDocument();

    // Recall Accuracy: 2 / 3 = 67%
    expect(screen.getByText('RECALL ACCURACY')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '67%' })).toBeInTheDocument();

    // Response ratings
    expect(screen.getByText(/1 Easy/)).toBeInTheDocument();
    expect(screen.getByText(/1 Good/)).toBeInTheDocument();
    expect(screen.getByText(/1 Again/)).toBeInTheDocument();
  });
});

describe('ReviewLogTable', () => {
  it('renders table headers and rows accurately without RollingNumber overhead', () => {
    const onInspect = jest.fn();
    const onSelectWord = jest.fn();

    render(<ReviewLogTable logs={mockLogs} onInspectLog={onInspect} onSelectWord={onSelectWord} />);

    // Verify headers
    expect(screen.getByText('TIME')).toBeInTheDocument();
    expect(screen.getByText('WORD & MEANING')).toBeInTheDocument();
    expect(screen.getByText('RATING')).toBeInTheDocument();

    // Verify row contents
    expect(screen.getByText('resilient')).toBeInTheDocument();
    expect(screen.getByText('ephemeral')).toBeInTheDocument();
    expect(screen.getByText('lucid')).toBeInTheDocument();

    // Fast formatted values (scheduledDays & duration)
    expect(screen.getByText('3d')).toBeInTheDocument();
    expect(screen.getByText('12d')).toBeInTheDocument();
    expect(screen.getByText('<1d')).toBeInTheDocument();
    expect(screen.getByText('2.4s')).toBeInTheDocument();
    expect(screen.getByText('8.2s')).toBeInTheDocument();
    expect(screen.getByText('1.2s')).toBeInTheDocument();

    // Inspect click
    const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
    expect(inspectButtons.length).toBe(3);
    fireEvent.click(inspectButtons[0]);
    expect(onInspect).toHaveBeenCalledWith(mockLogs[0]);
  });

  it('renders empty state when no logs match', () => {
    render(<ReviewLogTable logs={[]} onInspectLog={jest.fn()} />);
    expect(screen.getByText('No Review Events Found')).toBeInTheDocument();
  });
});

describe('ReviewLogFilters', () => {
  it('renders search input and allows debounced search query changes', () => {
    jest.useFakeTimers();
    const onFiltersChange = jest.fn();

    render(
      <ReviewLogFilters
        filters={{
          searchQuery: '',
          ratingFilter: 'all',
          stateFilter: 'all',
          modeFilter: 'all',
          datePreset: 'all',
          groupFilter: 'all',
          sortBy: 'newest',
        }}
        onFiltersChange={onFiltersChange}
        availableGroups={['Gre Vocabulary', 'Daily Words']}
        totalLogsCount={3}
        filteredLogsCount={3}
      />
    );

    const input = screen.getByPlaceholderText('Search word or meaning in review log...');
    fireEvent.change(input, { target: { value: 'resi' } });

    // Should not fire immediately before debounce
    expect(onFiltersChange).not.toHaveBeenCalled();

    // Advance debounce timer
    jest.advanceTimersByTime(200);

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        searchQuery: 'resi',
      })
    );

    jest.useRealTimers();
  });
});
