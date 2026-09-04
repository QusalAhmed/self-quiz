import React from 'react';
import { fireEvent, render, screen } from '@/test-utils';
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
});
