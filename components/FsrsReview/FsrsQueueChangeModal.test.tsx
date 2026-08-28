import React from 'react';
import { fireEvent, render, screen } from '@/test-utils';
import { FsrsQueueChangeModal } from './FsrsQueueChangeModal';

describe('FsrsQueueChangeModal component', () => {
  const sampleRemovedItems = [
    { id: 'w1', word: 'ephemeral', meaning: 'lasting a very short time' },
    { id: 'w2', word: 'serendipity', meaning: 'finding good things without looking' },
  ];

  it('renders modal with removed words and actions when opened is true', () => {
    const handleClose = jest.fn();
    const handleRefresh = jest.fn();

    render(
      <FsrsQueueChangeModal
        opened
        onClose={handleClose}
        onRefresh={handleRefresh}
        removedItems={sampleRemovedItems}
        addedCount={3}
      />
    );

    expect(screen.getByText('Quiz Queue Updated')).toBeInTheDocument();
    expect(screen.getByText('2 words')).toBeInTheDocument();
    expect(screen.getByText('ephemeral')).toBeInTheDocument();
    expect(screen.getByText('serendipity')).toBeInTheDocument();
    expect(
      screen.getByText(/3 new due cards are also ready and will be included upon refresh/i)
    ).toBeInTheDocument();

    const refreshButton = screen.getByRole('button', { name: /refresh quiz queue/i });
    expect(refreshButton).toBeInTheDocument();
    fireEvent.click(refreshButton);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Dismiss button is clicked', () => {
    const handleClose = jest.fn();
    const handleRefresh = jest.fn();

    render(
      <FsrsQueueChangeModal
        opened
        onClose={handleClose}
        onRefresh={handleRefresh}
        removedItems={[sampleRemovedItems[0]]}
      />
    );

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();
    fireEvent.click(dismissButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleRefresh).not.toHaveBeenCalled();
  });

  it('does not render modal content when opened is false', () => {
    render(
      <FsrsQueueChangeModal
        opened={false}
        onClose={jest.fn()}
        onRefresh={jest.fn()}
        removedItems={sampleRemovedItems}
      />
    );

    expect(screen.queryByText('Quiz Queue Updated')).not.toBeInTheDocument();
  });
});
