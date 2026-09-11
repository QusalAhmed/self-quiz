import { act, fireEvent, render, screen } from '@/test-utils';
import { QuizPanel, type QuizItem } from './QuizPanel';

const mockItem: QuizItem = {
  id: 'word-1',
  word: 'ephemeral',
  meaning: 'lasting for a very short time',
  definitions: [
    {
      meaning: 'lasting for a very short time',
      partOfSpeech: 'adjective',
      examples: ['ephemeral pleasures'],
      userExamples: [],
    },
  ],
};

describe('QuizPanel component', () => {
  it('renders "Undo Rating" button on completion screen when canUndo and onUndo are provided', () => {
    const handleUndo = jest.fn();
    const handleRestart = jest.fn();

    render(
      <QuizPanel
        item={null}
        quizDirection="wordToMeaning"
        revealed={false}
        onReveal={jest.fn()}
        onMarkMissed={jest.fn()}
        isMarkedMissed={false}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        completed
        hasPrevious={false}
        currentIndex={5}
        totalCount={5}
        onRestart={handleRestart}
        canUndo
        onUndo={handleUndo}
      />
    );

    expect(screen.getByText('Quiz Completed!')).toBeInTheDocument();
    const undoButton = screen.getByRole('button', { name: /undo rating/i });
    expect(undoButton).toBeInTheDocument();

    fireEvent.click(undoButton);
    expect(handleUndo).toHaveBeenCalledTimes(1);

    const restartButton = screen.getByRole('button', { name: /restart session/i });
    expect(restartButton).toBeInTheDocument();
    fireEvent.click(restartButton);
    expect(handleRestart).toHaveBeenCalledTimes(1);
  });

  it('does not render "Undo Rating" button on completion screen when canUndo is false', () => {
    const handleUndo = jest.fn();

    render(
      <QuizPanel
        item={null}
        quizDirection="wordToMeaning"
        revealed={false}
        onReveal={jest.fn()}
        onMarkMissed={jest.fn()}
        isMarkedMissed={false}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        completed
        hasPrevious={false}
        currentIndex={5}
        totalCount={5}
        onRestart={jest.fn()}
        canUndo={false}
        onUndo={handleUndo}
      />
    );

    expect(screen.getByText('Quiz Completed!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /undo rating/i })).not.toBeInTheDocument();
  });

  it('triggers onUndo when pressing "z" or "u" key while completed and canUndo is true', () => {
    const handleUndo = jest.fn();

    render(
      <QuizPanel
        item={null}
        quizDirection="wordToMeaning"
        revealed={false}
        onReveal={jest.fn()}
        onMarkMissed={jest.fn()}
        isMarkedMissed={false}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        completed
        hasPrevious={false}
        currentIndex={5}
        totalCount={5}
        onRestart={jest.fn()}
        canUndo
        onUndo={handleUndo}
      />
    );

    fireEvent.keyDown(window, { key: 'z' });
    expect(handleUndo).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'u' });
    expect(handleUndo).toHaveBeenCalledTimes(2);
  });

  it('renders "Undo Rating" button during active quiz card when canUndo is true', () => {
    const handleUndo = jest.fn();

    render(
      <QuizPanel
        item={mockItem}
        quizDirection="wordToMeaning"
        revealed
        onReveal={jest.fn()}
        onMarkMissed={jest.fn()}
        isMarkedMissed={false}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        completed={false}
        hasPrevious
        currentIndex={1}
        totalCount={5}
        canUndo
        onUndo={handleUndo}
      />
    );

    const undoButtons = screen.getAllByRole('button', { name: /undo rating/i });
    expect(undoButtons.length).toBeGreaterThan(0);

    fireEvent.click(undoButtons[0]);
    expect(handleUndo).toHaveBeenCalledTimes(1);
  });

  it('renders word action menu button and opens dropdown with actions', () => {
    const handleEdit = jest.fn();
    const handleMarkMissed = jest.fn();

    render(
      <QuizPanel
        item={mockItem}
        quizDirection="wordToMeaning"
        revealed={false}
        onReveal={jest.fn()}
        onMarkMissed={handleMarkMissed}
        isMarkedMissed={false}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        completed={false}
        hasPrevious={false}
        currentIndex={0}
        totalCount={5}
        onEditClick={handleEdit}
      />
    );

    expect(screen.getAllByText('ephemeral').length).toBeGreaterThan(0);
    const menuButtons = screen.getAllByRole('button', { name: /actions for ephemeral/i });
    expect(menuButtons.length).toBeGreaterThan(0);

    fireEvent.click(menuButtons[0]);
    expect(screen.getByText('Speak Pronunciation')).toBeInTheDocument();
    expect(screen.getByText('Copy word')).toBeInTheDocument();
    expect(screen.getByText('Edit Word')).toBeInTheDocument();
    expect(screen.getByText('Mark as Missed')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Edit Word'));
    expect(handleEdit).toHaveBeenCalledWith('word-1');
  });

  it('puts phonetic in menu dropdown rather than directly after the word title', () => {
    const itemWithPhonetic: QuizItem = {
      ...mockItem,
      phonetic: '\\i-ˈfe-m(ə-)rəl\\',
    };

    render(
      <QuizPanel
        item={itemWithPhonetic}
        quizDirection="wordToMeaning"
        revealed={false}
        onReveal={jest.fn()}
        onMarkMissed={jest.fn()}
        isMarkedMissed={false}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        completed={false}
        hasPrevious={false}
        currentIndex={0}
        totalCount={5}
      />
    );

    // Phonetic should not be visible before opening the menu
    expect(screen.queryByText(/i-ˈfe-m\(ə-\)rəl/)).not.toBeInTheDocument();

    // Open menu
    const menuButtons = screen.getAllByRole('button', { name: /actions for ephemeral/i });
    expect(menuButtons.length).toBeGreaterThan(0);
    fireEvent.click(menuButtons[0]);

    // Phonetic should now be displayed in the menu
    expect(screen.getByText(/i-ˈfe-m\(ə-\)rəl/)).toBeInTheDocument();
  });

  it('applies responsive mobile hiding to shortcut hints in QuizPanel', () => {
    const { container } = render(
      <QuizPanel
        item={mockItem}
        quizDirection="wordToMeaning"
        revealed={false}
        onReveal={jest.fn()}
        onMarkMissed={jest.fn()}
        isMarkedMissed={false}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
        completed={false}
        hasPrevious
        currentIndex={1}
        totalCount={5}
      />
    );

    const hintElements = container.querySelectorAll('.kbd-hint');
    expect(hintElements.length).toBeGreaterThan(0);
    hintElements.forEach((el) => {
      expect(el.className).toContain('mantine-visible-from-sm');
    });
  });

  describe('auto-pronounce behavior', () => {
    let speakMock: jest.Mock;
    let cancelMock: jest.Mock;

    beforeEach(() => {
      jest.useFakeTimers();
      speakMock = jest.fn();
      cancelMock = jest.fn();
      Object.defineProperty(window, 'speechSynthesis', {
        value: {
          speak: speakMock,
          cancel: cancelMock,
        },
        writable: true,
        configurable: true,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (global as any).SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
        text,
        lang: '',
        rate: 1,
        pitch: 1,
      }));
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('auto-pronounces word on presentation when autoPronounceWord is true, but does NOT pronounce on Show Definition reveal', () => {
      const handleReveal = jest.fn();
      const { rerender } = render(
        <QuizPanel
          item={mockItem}
          quizDirection="wordToMeaning"
          revealed={false}
          autoPronounceWord
          onReveal={handleReveal}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
        />
      );

      // Advance timer for the auto-pronounce delay (300ms)
      act(() => {
        jest.advanceTimersByTime(350);
      });

      // It should have spoken once on initial card presentation
      expect(speakMock).toHaveBeenCalledTimes(1);

      // Verify "Show Definition" button is visible and click it
      const showDefButton = screen.getByRole('button', { name: /show definition/i });
      expect(showDefButton).toBeInTheDocument();
      fireEvent.click(showDefButton);
      expect(handleReveal).toHaveBeenCalledTimes(1);

      // Rerender as revealed (simulating parent state update after onReveal)
      rerender(
        <QuizPanel
          item={mockItem}
          quizDirection="wordToMeaning"
          revealed
          autoPronounceWord
          onReveal={handleReveal}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
        />
      );

      // Advance timers again
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Still should only have spoken 1 time, NOT again upon reveal
      expect(speakMock).toHaveBeenCalledTimes(1);
    });

    it('does not auto-pronounce when autoPronounceWord is false in wordToMeaning mode', () => {
      render(
        <QuizPanel
          item={mockItem}
          quizDirection="wordToMeaning"
          revealed={false}
          autoPronounceWord={false}
          onReveal={jest.fn()}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
        />
      );

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(speakMock).not.toHaveBeenCalled();
    });

    it('auto-pronounces on reveal when in meaningToWord mode with autoPronounceWord', () => {
      const { rerender } = render(
        <QuizPanel
          item={mockItem}
          quizDirection="meaningToWord"
          revealed={false}
          autoPronounceWord
          onReveal={jest.fn()}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
        />
      );

      // While hidden in meaningToWord, word should NOT be spoken
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(speakMock).not.toHaveBeenCalled();

      // When revealed, word SHOULD be auto-pronounced
      rerender(
        <QuizPanel
          item={mockItem}
          quizDirection="meaningToWord"
          revealed
          autoPronounceWord
          onReveal={jest.fn()}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
        />
      );

      act(() => {
        jest.advanceTimersByTime(350);
      });
      expect(speakMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('hotkey button visual press effects', () => {
    it('applies is-pressed class to reveal button when Space is pressed', () => {
      const handleReveal = jest.fn();
      render(
        <QuizPanel
          item={mockItem}
          quizDirection="wordToMeaning"
          revealed={false}
          onReveal={handleReveal}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
        />
      );

      const revealBtn = screen.getByRole('button', { name: /show definition/i });
      expect(revealBtn.className).not.toContain('is-pressed');

      fireEvent.keyDown(window, { key: ' ', code: 'Space' });
      expect(revealBtn.className).toContain('is-pressed');
    });

    it('applies is-pressed class to next button when ArrowRight is pressed while revealed', () => {
      const handleNext = jest.fn();
      render(
        <QuizPanel
          item={mockItem}
          quizDirection="wordToMeaning"
          revealed
          onReveal={jest.fn()}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={handleNext}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
        />
      );

      const nextBtn = screen.getByRole('button', { name: /next word/i });
      expect(nextBtn.className).not.toContain('is-pressed');

      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(nextBtn.className).toContain('is-pressed');
    });

    it('applies is-pressed class to back button when ArrowLeft is pressed', () => {
      const handlePrev = jest.fn();
      render(
        <QuizPanel
          item={mockItem}
          quizDirection="wordToMeaning"
          revealed={false}
          onReveal={jest.fn()}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={handlePrev}
          completed={false}
          hasPrevious
          currentIndex={1}
          totalCount={5}
        />
      );

      const backBtn = screen.getByRole('button', { name: /back/i });
      expect(backBtn.className).not.toContain('is-pressed');

      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(backBtn.className).toContain('is-pressed');
    });

    it('renders Mantine Spoiler wrapping word family list in review state when revealed', () => {
      render(
        <QuizPanel
          item={mockItem}
          quizDirection="wordToMeaning"
          revealed
          onReveal={jest.fn()}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
          wordFamilyMembers={[
            {
              id: 'word-1_ephemerally',
              wordId: 'word-1',
              word: 'ephemerally',
              partOfSpeech: 'adverb',
              banglaDefinition: 'ক্ষণস্থায়ীভাবে',
              englishDefinition: 'in an ephemeral manner',
              examples: [],
              usageFrequency: 'common',
              generatorAiDetails: 'Gemini 2.5 Flash',
              isDeleted: false,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
              lastSyncedAt: '',
            },
          ]}
        />
      );

      const spoiler = screen.getByTestId('word-family-spoiler');
      expect(spoiler).toBeInTheDocument();
      expect(screen.getByText(/Word Family/i)).toBeInTheDocument();
      expect(screen.getAllByText('ephemerally').length).toBeGreaterThan(0);
    });
  });

  describe('spelling quiz mode with Gboard keyboard', () => {
    it('renders Gboard virtual keyboard and Listen to Word button when unrevealed', () => {
      render(
        <QuizPanel
          item={mockItem}
          quizDirection="spelling"
          revealed={false}
          onReveal={jest.fn()}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
        />
      );

      expect(screen.getByTestId('gboard-keyboard')).toBeInTheDocument();
      expect(screen.getByText(/Listen to Word/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Listen and type.../i)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Check Spelling/i }).length).toBeGreaterThan(0);
    });

    it('allows typing via Gboard keys and checking spelling', () => {
      const handleReveal = jest.fn();
      render(
        <QuizPanel
          item={{ ...mockItem, word: 'cat' }}
          quizDirection="spelling"
          revealed={false}
          onReveal={handleReveal}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
        />
      );

      const keyC = screen.getByTestId('gboard-key-c');
      const keyA = screen.getByTestId('gboard-key-a');
      const keyT = screen.getByTestId('gboard-key-t');

      fireEvent.pointerDown(keyC);
      fireEvent.pointerUp(keyC);
      fireEvent.pointerDown(keyA);
      fireEvent.pointerUp(keyA);
      fireEvent.pointerDown(keyT);
      fireEvent.pointerUp(keyT);

      const input = screen.getByPlaceholderText(/Listen and type.../i) as HTMLInputElement;
      expect(input.value).toBe('cat');

      // Click the Gboard action enter key
      const gboardEnter = screen.getByTestId('gboard-key-enter');
      fireEvent.pointerDown(gboardEnter);
      fireEvent.pointerUp(gboardEnter);

      expect(handleReveal).toHaveBeenCalled();
    });
  });

  describe('FSRS status section positioning', () => {
    const fsrsItem: QuizItem = {
      ...mockItem,
      fsrsRecord: {
        id: 'fsrs-1',
        wordId: 'word-1',
        quizMode: 'wordToMeaning',
        state: 'Review',
        reps: 5,
        lapses: 1,
        stability: 14.2,
        difficulty: 5.1,
        elapsedDays: 4,
        scheduledDays: 14,
        dueAt: new Date().toISOString(),
        lastReviewedAt: new Date().toISOString(),
        word: 'ephemeral',
        meaning: 'lasting for a very short time',
        learningSteps: 0,
        isDeleted: false,
        lastSyncedAt: '',
        updatedAt: new Date().toISOString(),
      },
    };

    it('renders FSRS status badges below session progress and above the card in wordToMeaning mode', () => {
      render(
        <QuizPanel
          item={fsrsItem}
          quizDirection="wordToMeaning"
          revealed={false}
          onReveal={jest.fn()}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
        />
      );

      const sessionProgress = screen.getByText('SESSION PROGRESS');
      const fsrsStateBadge = screen.getByText('🧠 Review');
      const wordTitles = screen.getAllByRole('heading', { level: 1, name: 'ephemeral' });

      expect(sessionProgress).toBeInTheDocument();
      expect(fsrsStateBadge).toBeInTheDocument();
      expect(screen.getByText(/Reps:/)).toBeInTheDocument();
      expect(screen.getByText(/Lapses:/)).toBeInTheDocument();
      expect(screen.getByText(/Stab:/)).toBeInTheDocument();
      expect(screen.getByText(/Diff:/)).toBeInTheDocument();

      // Verify DOM order: sessionProgress precedes fsrsStateBadge, which precedes wordTitle
      expect(sessionProgress.compareDocumentPosition(fsrsStateBadge)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
      expect(fsrsStateBadge.compareDocumentPosition(wordTitles[0])).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
    });

    it('renders FSRS status always on top in spelling mode when unrevealed and revealed', () => {
      const { rerender } = render(
        <QuizPanel
          item={fsrsItem}
          quizDirection="spelling"
          revealed={false}
          onReveal={jest.fn()}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
        />
      );

      expect(screen.getByText('🧠 Review')).toBeInTheDocument();
      expect(screen.getByTestId('gboard-keyboard')).toBeInTheDocument();

      // Re-render as revealed
      rerender(
        <QuizPanel
          item={fsrsItem}
          quizDirection="spelling"
          revealed
          onReveal={jest.fn()}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
        />
      );

      expect(screen.getByText('🧠 Review')).toBeInTheDocument();
      expect(screen.getByText('SESSION PROGRESS')).toBeInTheDocument();
    });

    it('renders FSRS status on top below session progress in meaningToWord mode', () => {
      render(
        <QuizPanel
          item={fsrsItem}
          quizDirection="meaningToWord"
          revealed={false}
          onReveal={jest.fn()}
          onMarkMissed={jest.fn()}
          isMarkedMissed={false}
          onNext={jest.fn()}
          onPrevious={jest.fn()}
          completed={false}
          hasPrevious={false}
          currentIndex={0}
          totalCount={5}
        />
      );

      const sessionProgress = screen.getByText('SESSION PROGRESS');
      const fsrsBadge = screen.getByText('🧠 Review');
      expect(fsrsBadge).toBeInTheDocument();
      expect(sessionProgress.compareDocumentPosition(fsrsBadge)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
    });
  });
});
