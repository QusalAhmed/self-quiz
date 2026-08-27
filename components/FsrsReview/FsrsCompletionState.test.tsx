import React from 'react';
import { fireEvent, render, screen } from '@/test-utils';
import { FsrsCompletionState } from './FsrsCompletionState';

describe('FsrsCompletionState component', () => {
  it('renders "Undo Rating" button when canUndo and onUndo are provided', () => {
    const handleUndo = jest.fn();
    const handleRestart = jest.fn();

    render(
      <FsrsCompletionState
        reviewedCount={12}
        onRestartSession={handleRestart}
        canUndo
        onUndo={handleUndo}
      />
    );

    expect(screen.getByText('Review Session Complete!')).toBeInTheDocument();
    const undoButton = screen.getByRole('button', { name: /undo rating/i });
    expect(undoButton).toBeInTheDocument();

    fireEvent.click(undoButton);
    expect(handleUndo).toHaveBeenCalledTimes(1);

    const restartButton = screen.getByRole('button', { name: /review deck again/i });
    expect(restartButton).toBeInTheDocument();
    fireEvent.click(restartButton);
    expect(handleRestart).toHaveBeenCalledTimes(1);
  });

  it('does not render "Undo Rating" button when canUndo is false', () => {
    const handleUndo = jest.fn();

    render(
      <FsrsCompletionState
        reviewedCount={10}
        onRestartSession={jest.fn()}
        canUndo={false}
        onUndo={handleUndo}
      />
    );

    expect(screen.getByText('Review Session Complete!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /undo rating/i })).not.toBeInTheDocument();
  });

  it('triggers onUndo when pressing "z" or "u" key when canUndo is true', () => {
    const handleUndo = jest.fn();

    render(
      <FsrsCompletionState
        reviewedCount={5}
        onRestartSession={jest.fn()}
        canUndo
        onUndo={handleUndo}
      />
    );

    fireEvent.keyDown(window, { key: 'z' });
    expect(handleUndo).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'u' });
    expect(handleUndo).toHaveBeenCalledTimes(2);
  });
});
