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

  it('renders Group Quiz banner and calls onClearGroupQuiz when Exit is clicked', () => {
    const handleClearGroup = jest.fn();
    render(
      <QuizModeSection
        {...baseProps}
        clusterContext={{
          clusterName: 'retail Family',
          clusterType: 'word_family',
          hubWord: 'retail',
          explanation: 'Word family with suffix -er',
        }}
        onClearGroupQuiz={handleClearGroup}
      />
    );

    expect(screen.getByText('Group Quiz: retail Family')).toBeInTheDocument();
    expect(screen.getByText(/Word family with suffix -er/i)).toBeInTheDocument();

    const exitBtn = screen.getByRole('button', { name: /exit group quiz/i });
    fireEvent.click(exitBtn);
    expect(handleClearGroup).toHaveBeenCalledTimes(1);
  });

  it('renders Similar Word Group selection dropdown when quizSource is similarGroups', () => {
    const handleSetGroup = jest.fn();
    render(
      <QuizModeSection
        {...baseProps}
        quizSource="similarGroups"
        selectedGroupId="cluster-1"
        similarClusters={[
          {
            id: 'cluster-1',
            name: 'retail Family',
            clusterType: 'word_family',
            hubWord: 'retail',
            hubWordId: 'w1',
            words: ['retail', 'retailer', 'retailing'],
            wordIds: ['w1', 'w2', 'w3'],
            edges: [],
            averageScore: 0.95,
            maxScore: 0.95,
            density: 1,
            size: 3,
            explanation: 'Word family',
            sharedFeatures: {},
          },
        ]}
        onSetSelectedGroupId={handleSetGroup}
      />
    );

    expect(screen.getByText(/SELECT SIMILAR-WORD GROUP \/ CLUSTER/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Groups Available/i)).toBeInTheDocument();
  });

  it('renders fallback cluster in select options when similarClusters is empty but clusterContext is active', () => {
    render(
      <QuizModeSection
        {...baseProps}
        quizSource="similarGroups"
        selectedGroupId="cluster-trial-trail"
        clusterContext={{
          clusterId: 'cluster-trial-trail',
          clusterName: 'trial ↔ trail Pair',
          clusterType: 'transposition',
          hubWord: 'trial',
          words: ['trial', 'trail'],
        }}
        similarClusters={[]}
      />
    );

    expect(screen.getByText(/SELECT SIMILAR-WORD GROUP \/ CLUSTER/i)).toBeInTheDocument();
    expect(screen.getAllByText(/trial ↔ trail Pair/i).length).toBeGreaterThanOrEqual(1);
  });
});
