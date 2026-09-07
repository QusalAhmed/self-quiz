import React from 'react';
import { act, fireEvent, render, screen } from '@/test-utils';
import { FsrsRatingBar } from './FsrsRatingBar';

describe('FsrsRatingBar', () => {
  const intervals = {
    again: { dueAt: '2026-09-07T12:00:00Z', intervalText: '<1m' },
    hard: { dueAt: '2026-09-07T12:10:00Z', intervalText: '10m' },
    good: { dueAt: '2026-09-08T12:00:00Z', intervalText: '1d' },
    easy: { dueAt: '2026-09-11T12:00:00Z', intervalText: '4d' },
  };

  it('renders all four rating buttons with labels, shortcuts, and intervals', () => {
    const handleRate = jest.fn();
    render(<FsrsRatingBar intervals={intervals} onRate={handleRate} />);

    expect(screen.getByText(/Again/i)).toBeInTheDocument();
    expect(screen.getByText(/Hard/i)).toBeInTheDocument();
    expect(screen.getByText(/Good/i)).toBeInTheDocument();
    expect(screen.getByText(/Easy/i)).toBeInTheDocument();

    expect(screen.getByText('<1m')).toBeInTheDocument();
    expect(screen.getByText('10m')).toBeInTheDocument();
    expect(screen.getByText('1d')).toBeInTheDocument();
    expect(screen.getByText('4d')).toBeInTheDocument();

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('fires onRate callback when a rating button is clicked', () => {
    const handleRate = jest.fn();
    render(<FsrsRatingBar intervals={intervals} onRate={handleRate} />);

    const goodBtn = screen.getByRole('button', { name: /good/i });
    fireEvent.click(goodBtn);

    expect(handleRate).toHaveBeenCalledWith('good');
  });

  it('applies is-pressed class when pressedRating prop matches', () => {
    const handleRate = jest.fn();
    const { rerender } = render(
      <FsrsRatingBar intervals={intervals} onRate={handleRate} pressedRating="easy" />
    );

    const easyBtn = screen.getByRole('button', { name: /easy/i });
    expect(easyBtn.className).toContain('is-pressed');

    rerender(<FsrsRatingBar intervals={intervals} onRate={handleRate} pressedRating={null} />);
    const updatedEasyBtn = screen.getByRole('button', { name: /easy/i });
    expect(updatedEasyBtn.className).not.toContain('is-pressed');
  });

  it('spawns tap ripple effect element on pointerdown', () => {
    const handleRate = jest.fn();
    const { container } = render(<FsrsRatingBar intervals={intervals} onRate={handleRate} />);

    const hardBtn = screen.getByRole('button', { name: /hard/i });

    act(() => {
      fireEvent.pointerDown(hardBtn, { clientX: 50, clientY: 20 });
    });

    const ripples = container.querySelectorAll('.review-tap-ripple');
    expect(ripples.length).toBeGreaterThan(0);
  });

  it('supports string intervals dictionary like from QuizPanel', () => {
    const handleRate = jest.fn();
    render(
      <FsrsRatingBar
        intervals={{ again: '<1m', hard: '10m', good: '2d', easy: '5d' }}
        onRate={handleRate}
      />
    );

    expect(screen.getByText('2d')).toBeInTheDocument();
    expect(screen.getByText('5d')).toBeInTheDocument();
  });

  it('does not fire onRate when disabled is true', () => {
    const handleRate = jest.fn();
    render(<FsrsRatingBar intervals={intervals} onRate={handleRate} disabled />);

    const againBtn = screen.getByRole('button', { name: /again/i });
    fireEvent.click(againBtn);

    expect(handleRate).not.toHaveBeenCalled();
  });

  it('spawns ripple and applies review-btn-pop when activated by hotkey via pressedRating', () => {
    const handleRate = jest.fn();
    const { container } = render(
      <FsrsRatingBar intervals={intervals} onRate={handleRate} pressedRating="good" />
    );

    const goodBtn = screen.getByRole('button', { name: /good/i });
    expect(goodBtn.className).toContain('is-pressed');
    expect(goodBtn.className).toContain('review-btn-pop');

    const ripples = container.querySelectorAll('.review-tap-ripple');
    expect(ripples.length).toBeGreaterThan(0);
  });
});
