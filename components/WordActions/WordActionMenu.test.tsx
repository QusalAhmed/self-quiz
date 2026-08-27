import React from 'react';
import { fireEvent, render, screen } from '@/test-utils';
import { WordActionMenu } from './WordActionMenu';

describe('WordActionMenu component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders target action icon button with appropriate aria-label and action.png icon', () => {
    render(<WordActionMenu word="ephemeral" />);
    const button = screen.getByRole('button', { name: /actions for ephemeral/i });
    expect(button).toBeInTheDocument();
    const img = button.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/icon/action.png');
  });

  it('opens menu with action items when clicked and triggers callbacks', () => {
    const handleSpeak = jest.fn();
    const handleEdit = jest.fn();
    const handleToggleMissed = jest.fn();
    const handleDeleteFsrs = jest.fn();

    render(
      <WordActionMenu
        word="serendipity"
        onSpeak={handleSpeak}
        onEdit={handleEdit}
        isMissed={false}
        onToggleMissed={handleToggleMissed}
        onDeleteFsrs={handleDeleteFsrs}
      />
    );

    const targetBtn = screen.getByRole('button', { name: /actions for serendipity/i });
    fireEvent.click(targetBtn);

    // Verify menu items appear
    expect(screen.getByText('Speak Pronunciation')).toBeInTheDocument();
    expect(screen.getByText('Copy word')).toBeInTheDocument();
    expect(screen.getByText('Edit Word')).toBeInTheDocument();
    expect(screen.getByText('Mark as Missed')).toBeInTheDocument();
    expect(screen.getByText('Delete FSRS Record')).toBeInTheDocument();

    // Click Speak
    fireEvent.click(screen.getByText('Speak Pronunciation'));
    expect(handleSpeak).toHaveBeenCalledTimes(1);

    // Reopen menu & Click Edit
    fireEvent.click(targetBtn);
    fireEvent.click(screen.getByText('Edit Word'));
    expect(handleEdit).toHaveBeenCalledTimes(1);

    // Reopen menu & Click Mark as Missed
    fireEvent.click(targetBtn);
    fireEvent.click(screen.getByText('Mark as Missed'));
    expect(handleToggleMissed).toHaveBeenCalledTimes(1);

    // Reopen menu & Click Delete FSRS Record
    fireEvent.click(targetBtn);
    fireEvent.click(screen.getByText('Delete FSRS Record'));
    expect(handleDeleteFsrs).toHaveBeenCalledTimes(1);
  });

  it('displays audio label when audioUrl is present and unmark text when isMissed is true', () => {
    const handleToggleMissed = jest.fn();

    render(
      <WordActionMenu
        word="mellifluous"
        audioUrl="https://example.com/audio.mp3"
        onSpeak={jest.fn()}
        isMissed
        onToggleMissed={handleToggleMissed}
        missedLabel={{ unmark: 'Remove from Missed' }}
      />
    );

    const targetBtn = screen.getByRole('button', { name: /actions for mellifluous/i });
    fireEvent.click(targetBtn);

    expect(screen.getByText('Play Audio (MW)')).toBeInTheDocument();
    expect(screen.getByText('Remove from Missed')).toBeInTheDocument();
  });
});
