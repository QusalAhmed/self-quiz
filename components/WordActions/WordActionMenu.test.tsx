import React from 'react';
import { fireEvent, render, screen } from '@/test-utils';
import { WordActionMenu } from './WordActionMenu';

describe('WordActionMenu component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders target action icon button with appropriate aria-label and action.png icon', () => {
    render(<WordActionMenu word="ephemeral" size="lg" />);
    const button = screen.getByRole('button', { name: /actions for ephemeral/i });
    expect(button).toBeInTheDocument();
    const img = button.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/icon/action.png');
    expect(img).toHaveAttribute('width', '30');
    expect(img).toHaveAttribute('height', '30');
  });

  it('respects custom iconSize prop', () => {
    render(<WordActionMenu word="ephemeral" iconSize={36} />);
    const button = screen.getByRole('button', { name: /actions for ephemeral/i });
    const img = button.querySelector('img');
    expect(img).toHaveAttribute('width', '36');
    expect(img).toHaveAttribute('height', '36');
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
    expect(screen.getByText('Re-fetch MW Audio')).toBeInTheDocument();
    expect(screen.getByText('Remove from Missed')).toBeInTheDocument();
  });

  it('displays Fetch MW Audio and triggers onFetchAudio when clicked', () => {
    const handleFetch = jest.fn();

    render(<WordActionMenu word="perspicacious" onFetchAudio={handleFetch} />);

    const targetBtn = screen.getByRole('button', { name: /actions for perspicacious/i });
    fireEvent.click(targetBtn);

    const fetchBtn = screen.getByText('Fetch MW Audio');
    expect(fetchBtn).toBeInTheDocument();

    fireEvent.click(fetchBtn);
    expect(handleFetch).toHaveBeenCalledTimes(1);
    expect(handleFetch).toHaveBeenCalledWith('perspicacious', undefined);
  });

  it('displays Re-fetch MW Audio when audioUrl is present and calls onFetchAudio', () => {
    const handleFetch = jest.fn();

    render(
      <WordActionMenu
        word="perspicacious"
        wordId="word-123"
        audioUrl="https://example.com/audio.mp3"
        onFetchAudio={handleFetch}
      />
    );

    const targetBtn = screen.getByRole('button', { name: /actions for perspicacious/i });
    fireEvent.click(targetBtn);

    const refetchBtn = screen.getByText('Re-fetch MW Audio');
    expect(refetchBtn).toBeInTheDocument();

    fireEvent.click(refetchBtn);
    expect(handleFetch).toHaveBeenCalledTimes(1);
    expect(handleFetch).toHaveBeenCalledWith('perspicacious', 'word-123');
  });

  it('hides Fetch Audio item when showFetchAudio is false', () => {
    render(<WordActionMenu word="perspicacious" showFetchAudio={false} />);

    const targetBtn = screen.getByRole('button', { name: /actions for perspicacious/i });
    fireEvent.click(targetBtn);

    expect(screen.queryByText('Fetch MW Audio')).not.toBeInTheDocument();
    expect(screen.queryByText('Re-fetch MW Audio')).not.toBeInTheDocument();
  });
});
