import React from 'react';
import type { WordRecord } from '@/lib/db';
import { fireEvent, render, screen } from '@/test-utils';
import { WordList } from './WordList';

const mockWords: WordRecord[] = [
  {
    id: 'w1',
    word: 'serendipity',
    meaning: 'fortunate happenstance',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastSyncedAt: '',
    isDeleted: false,
    aiExampleCount: 3,
    customGroups: [],
    definitions: [
      {
        meaning: 'fortunate happenstance',
        partOfSpeech: 'noun',
        examples: ['Finding this book was serendipity.'],
        userExamples: [],
      },
    ],
  },
];

describe('WordList component', () => {
  it('renders word with pronunciation button and speaks on click', () => {
    const speakMock = jest.fn();
    const cancelMock = jest.fn();
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

    render(
      <WordList
        words={mockWords}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
        onRefreshExamples={jest.fn()}
        customGroups={[]}
      />
    );

    expect(screen.getByText('serendipity')).toBeInTheDocument();
    const pronounceBtn = screen.getByRole('button', { name: /pronounce serendipity/i });
    expect(pronounceBtn).toBeInTheDocument();

    fireEvent.click(pronounceBtn);
    expect(cancelMock).toHaveBeenCalled();
    expect(speakMock).toHaveBeenCalled();
  });
});
