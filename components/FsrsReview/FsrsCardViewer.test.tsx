import React from 'react';
import type { WordFamilyMemberRecord } from '@/lib/db';
import type { FsrsRating, FsrsRecord } from '@/lib/fsrs';
import { fireEvent, render, screen } from '@/test-utils';
import { FsrsCardViewer } from './FsrsCardViewer';

const mockCard: FsrsRecord = {
  id: 'w1:fsrs:wordToMeaning',
  wordId: 'w1',
  quizMode: 'wordToMeaning',
  word: 'decide',
  meaning: 'to make a choice about something',
  dueAt: new Date().toISOString(),
  stability: 2,
  difficulty: 3,
  elapsedDays: 1,
  scheduledDays: 1,
  learningSteps: 0,
  reps: 1,
  lapses: 0,
  state: 'Review',
  lastReviewedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastSyncedAt: '',
  isDeleted: false,
};

const mockIntervals: Record<FsrsRating, { dueAt: string; intervalText: string }> = {
  again: { dueAt: new Date().toISOString(), intervalText: '<1m' },
  hard: { dueAt: new Date().toISOString(), intervalText: '10m' },
  good: { dueAt: new Date().toISOString(), intervalText: '1d' },
  easy: { dueAt: new Date().toISOString(), intervalText: '4d' },
};

const mockFamilyMembers: WordFamilyMemberRecord[] = [
  {
    id: 'w1_decision',
    wordId: 'w1',
    word: 'decision',
    partOfSpeech: 'noun',
    banglaDefinition: 'সিদ্ধান্ত',
    englishDefinition: 'a choice or judgment reached after consideration',
    examples: ['She made a quick decision.'],
    usageFrequency: 'very_common',
    generatorAiDetails: 'Gemini 2.5 Flash',
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastSyncedAt: '',
  },
  {
    id: 'w1_decisive',
    wordId: 'w1',
    word: 'decisive',
    partOfSpeech: 'adjective',
    banglaDefinition: 'চূড়ান্ত / সিদ্ধান্তমূলক',
    englishDefinition: 'producing a definite result',
    examples: ['A decisive victory.'],
    usageFrequency: 'common',
    generatorAiDetails: 'Gemini 2.5 Flash',
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastSyncedAt: '',
  },
];

describe('FsrsCardViewer component', () => {
  it('renders unrevealed card with Show Answer button', () => {
    const handleReveal = jest.fn();
    render(
      <FsrsCardViewer
        card={mockCard}
        isRevealed={false}
        intervals={mockIntervals}
        newCount={1}
        learningCount={0}
        reviewCount={5}
        onReveal={handleReveal}
        onRate={jest.fn()}
      />
    );

    const showAnswerBtn = screen.getByRole('button', { name: /show answer/i });
    expect(showAnswerBtn).toBeInTheDocument();
    fireEvent.click(showAnswerBtn);
    expect(handleReveal).toHaveBeenCalledTimes(1);
  });

  it('renders Mantine Spoiler wrapping word family list in review section when revealed', () => {
    render(
      <FsrsCardViewer
        card={mockCard}
        isRevealed
        intervals={mockIntervals}
        newCount={1}
        learningCount={0}
        reviewCount={5}
        wordFamilyMembers={mockFamilyMembers}
        onReveal={jest.fn()}
        onRate={jest.fn()}
      />
    );

    const spoiler = screen.getByTestId('word-family-spoiler');
    expect(spoiler).toBeInTheDocument();

    expect(screen.getByText(/Word Family/i)).toBeInTheDocument();
    expect(screen.getAllByText('decision').length).toBeGreaterThan(0);
    expect(screen.getAllByText('decisive').length).toBeGreaterThan(0);
  });

  it('does not render word-family-spoiler when revealed with no members and no refresh handler', () => {
    render(
      <FsrsCardViewer
        card={mockCard}
        isRevealed
        intervals={mockIntervals}
        newCount={1}
        learningCount={0}
        reviewCount={5}
        wordFamilyMembers={[]}
        onReveal={jest.fn()}
        onRate={jest.fn()}
      />
    );

    expect(screen.queryByTestId('word-family-spoiler')).toBeNull();
  });

  it('calls onRate when a rating button is pressed on revealed review card', () => {
    const handleRate = jest.fn();
    render(
      <FsrsCardViewer
        card={mockCard}
        isRevealed
        intervals={mockIntervals}
        newCount={1}
        learningCount={0}
        reviewCount={5}
        wordFamilyMembers={mockFamilyMembers}
        onReveal={jest.fn()}
        onRate={handleRate}
      />
    );

    const goodBtn = screen.getByRole('button', { name: /good/i });
    fireEvent.click(goodBtn);
    expect(handleRate).toHaveBeenCalledWith('good');
  });

  describe('hotkey button visual animations', () => {
    it('applies is-pressed and review-btn-pop to Show Answer button when Space is pressed', () => {
      render(
        <FsrsCardViewer
          card={mockCard}
          isRevealed={false}
          intervals={mockIntervals}
          newCount={1}
          learningCount={0}
          reviewCount={5}
          onReveal={jest.fn()}
          onRate={jest.fn()}
        />
      );

      const showAnswerBtn = screen.getByRole('button', { name: /show answer/i });
      expect(showAnswerBtn.className).not.toContain('is-pressed');

      fireEvent.keyDown(window, { key: ' ', code: 'Space' });
      expect(showAnswerBtn.className).toContain('is-pressed');
      expect(showAnswerBtn.className).toContain('review-btn-pop');
    });

    it('applies is-pressed and review-btn-pop to rating button when 1/2/3/4 is pressed on revealed card', () => {
      render(
        <FsrsCardViewer
          card={mockCard}
          isRevealed
          intervals={mockIntervals}
          newCount={1}
          learningCount={0}
          reviewCount={5}
          wordFamilyMembers={[]}
          onReveal={jest.fn()}
          onRate={jest.fn()}
        />
      );

      const goodBtn = screen.getByRole('button', { name: /good/i });
      expect(goodBtn.className).not.toContain('is-pressed');

      fireEvent.keyDown(window, { key: '3' });
      expect(goodBtn.className).toContain('is-pressed');
      expect(goodBtn.className).toContain('review-btn-pop');
    });

    it('applies is-pressed class to Undo button when Z is pressed and canUndo is true', () => {
      render(
        <FsrsCardViewer
          card={mockCard}
          isRevealed
          intervals={mockIntervals}
          newCount={1}
          learningCount={0}
          reviewCount={5}
          wordFamilyMembers={[]}
          onReveal={jest.fn()}
          onRate={jest.fn()}
          canUndo
          onUndo={jest.fn()}
        />
      );

      const undoBtn = screen.getByRole('button', { name: /undo/i });
      expect(undoBtn.className).not.toContain('is-pressed');

      fireEvent.keyDown(window, { key: 'z' });
      expect(undoBtn.className).toContain('is-pressed');
      expect(undoBtn.className).toContain('review-btn-pop');
    });
  });
});
