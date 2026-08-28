import React from 'react';
import { fireEvent, render, screen } from '@/test-utils';
import { QuizModeSection } from './QuizModeSection';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('QuizModeSection component', () => {
  const baseProps = {
    quizRange: 'all' as const,
    quizSource: 'fsrs' as const,
    quizDirection: 'wordToMeaning' as const,
    quizGroupFilter: 'all',
    customGroups: [],
    customStart: '',
    customEnd: '',
    quizCandidatesCount: 5,
    quizQueueLength: 5,
    currentQuizItem: {
      id: 'w1',
      word: 'perseverance',
      meaning: 'persistence in doing something despite difficulty',
    },
    revealed: false,
    completed: false,
    quizIndex: 0,
    isCurrentMarkedMissed: false,
    practiceDisplayMode: 'missed' as const,
    hideMissedMeanings: false,
    hideSrsPracticeMeanings: false,
    revealedMissedWordIds: {},
    revealedSrsPracticeWordIds: {},
    missedWordsForMode: [],
    missedWordIdSet: new Set<string>(),
    generatingExampleWordIds: {},
    autoPronounceQuizWord: false,
    onSetQuizRange: jest.fn(),
    onSetQuizSource: jest.fn(),
    onSetQuizDirection: jest.fn(),
    onSetQuizGroupFilter: jest.fn(),
    onSetCustomStart: jest.fn(),
    onSetCustomEnd: jest.fn(),
    onResetQuiz: jest.fn(),
    onReveal: jest.fn(),
    onToggleMissed: jest.fn(),
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    onRefreshExamples: jest.fn(),
    onEditClick: jest.fn(),
    onSetPracticeDisplayMode: jest.fn(),
    onSetAutoPronounceQuizWord: jest.fn(),
    onSetHideMissedMeanings: jest.fn(),
    onSetHideSrsPracticeMeanings: jest.fn(),
    onSetRevealedMissedWordIds: jest.fn(),
    onSetRevealedSrsPracticeWordIds: jest.fn(),
    onUnmarkMissed: jest.fn(),
    onTogglePracticeMissed: jest.fn(),
    onOpenSrsPracticeQuiz: jest.fn(),
    onOpenClearAllMissed: jest.fn(),
  };

  it('renders "Restart Quiz" when hasAddedWords is false', () => {
    render(<QuizModeSection {...baseProps} hasAddedWords={false} />);
    expect(screen.getByRole('button', { name: /restart quiz/i })).toBeInTheDocument();
  });

  it('renders "Refresh Quiz" when hasAddedWords is true and triggers onResetQuiz on click', () => {
    const handleReset = jest.fn();
    render(
      <QuizModeSection {...baseProps} hasAddedWords addedWordsCount={3} onResetQuiz={handleReset} />
    );

    const refreshButton = screen.getByRole('button', { name: /refresh quiz/i });
    expect(refreshButton).toBeInTheDocument();
    fireEvent.click(refreshButton);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
