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

  it('renders without error when customGroups contains duplicate or reserved group names', () => {
    expect(() => {
      render(
        <QuizModeSection
          {...baseProps}
          customGroups={['Include', 'Include', 'all', 'none', '  Include  ', 'Verbs']}
        />
      );
    }).not.toThrow();

    expect(screen.getByText('QUIZ GROUP')).toBeInTheDocument();
  });

  it('renders words whose last rating is again or hard below the review section together with missed words in allMissed mode', () => {
    const missedWord = {
      id: 'w1:wordToMeaning',
      wordId: 'w1',
      quizMode: 'wordToMeaning' as const,
      word: 'ephemeral',
      meaning: 'lasting for a very short time',
      missedAt: '2026-09-08T10:00:00.000Z',
      missedCount: 2,
      updatedAt: '2026-09-08T10:00:00.000Z',
      lastSyncedAt: '',
      isDeleted: false,
    };

    const fsrsAgainWord: any = {
      id: 'w2:fsrs:wordToMeaning',
      wordId: 'w2',
      quizMode: 'wordToMeaning',
      word: 'ubiquitous',
      meaning: 'present everywhere',
      dueAt: '2026-09-09T10:30:00.000Z',
      lastRating: 'again' as const,
      updatedAt: '2026-09-09T10:00:00.000Z',
    };

    const fsrsHardWord: any = {
      id: 'w3:fsrs:wordToMeaning',
      wordId: 'w3',
      quizMode: 'wordToMeaning',
      word: 'esoteric',
      meaning: 'understood by only a few',
      dueAt: '2026-09-09T11:00:00.000Z',
      lastRating: 'hard' as const,
      updatedAt: '2026-09-09T10:15:00.000Z',
    };

    render(
      <QuizModeSection
        {...baseProps}
        practiceDisplayMode="allMissed"
        missedWordsForMode={[missedWord]}
        fsrsForgettingWordsForMode={[fsrsAgainWord, fsrsHardWord]}
      />
    );

    // All three words should be present in the practice section
    expect(screen.getByText('ephemeral')).toBeInTheDocument();
    expect(screen.getByText('ubiquitous')).toBeInTheDocument();
    expect(screen.getByText('esoteric')).toBeInTheDocument();

    // Badges
    expect(screen.getByText('FSRS Again')).toBeInTheDocument();
    expect(screen.getByText('FSRS Hard')).toBeInTheDocument();
    expect(screen.getByText('ephemeral').closest('div')).toHaveTextContent(/missed/);
  });

  it('filters only FSRS again words when practiceDisplayMode is fsrsAgain', () => {
    const fsrsAgainWord: any = {
      id: 'w2:fsrs:wordToMeaning',
      wordId: 'w2',
      quizMode: 'wordToMeaning',
      word: 'ubiquitous',
      meaning: 'present everywhere',
      dueAt: '2026-09-09T10:30:00.000Z',
      lastRating: 'again' as const,
      updatedAt: '2026-09-09T10:00:00.000Z',
    };

    const fsrsHardWord: any = {
      id: 'w3:fsrs:wordToMeaning',
      wordId: 'w3',
      quizMode: 'wordToMeaning',
      word: 'esoteric',
      meaning: 'understood by only a few',
      dueAt: '2026-09-09T11:00:00.000Z',
      lastRating: 'hard' as const,
      updatedAt: '2026-09-09T10:15:00.000Z',
    };

    render(
      <QuizModeSection
        {...baseProps}
        practiceDisplayMode="fsrsAgain"
        missedWordsForMode={[]}
        fsrsForgettingWordsForMode={[fsrsAgainWord, fsrsHardWord]}
      />
    );

    expect(screen.getByText('ubiquitous')).toBeInTheDocument();
    expect(screen.getByText('FSRS Again')).toBeInTheDocument();
    expect(screen.queryByText('esoteric')).not.toBeInTheDocument();
  });

  it('merges word metadata when a word is both in missedWords and rated again', () => {
    const missedWord = {
      id: 'w1:wordToMeaning',
      wordId: 'w1',
      quizMode: 'wordToMeaning' as const,
      word: 'ephemeral',
      meaning: 'lasting for a very short time',
      missedAt: '2026-09-08T10:00:00.000Z',
      missedCount: 3,
      updatedAt: '2026-09-08T10:00:00.000Z',
      lastSyncedAt: '',
      isDeleted: false,
    };

    const fsrsAgainSameWord: any = {
      id: 'w1:fsrs:wordToMeaning',
      wordId: 'w1',
      quizMode: 'wordToMeaning',
      word: 'ephemeral',
      meaning: 'lasting for a very short time',
      dueAt: '2026-09-09T10:30:00.000Z',
      lastRating: 'again' as const,
      updatedAt: '2026-09-09T10:20:00.000Z',
    };

    render(
      <QuizModeSection
        {...baseProps}
        practiceDisplayMode="allMissed"
        missedWordsForMode={[missedWord]}
        fsrsForgettingWordsForMode={[fsrsAgainSameWord]}
      />
    );

    // Ephemeral should be rendered once
    expect(screen.getByText('ephemeral')).toBeInTheDocument();
    // It should have both the FSRS Again badge and the missed count badge
    expect(screen.getByText('FSRS Again')).toBeInTheDocument();
    expect(screen.getByText('ephemeral').closest('div')).toHaveTextContent(/missed/);
  });
});
