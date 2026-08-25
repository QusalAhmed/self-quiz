import React from 'react';
import type { WordRecord } from '@/lib/db';
import { act, fireEvent, render, screen, waitFor } from '@/test-utils';
import { BatchWordFamilyModal } from './BatchWordFamilyModal';

const mockWords: WordRecord[] = [
  {
    id: 'w1',
    word: 'accomplish',
    meaning: 'সাধন করা',
    definitions: [
      {
        meaning: 'সাধন করা',
        partOfSpeech: 'verb',
        examples: ['He accomplished the goal.'],
        userExamples: [],
      },
    ],
    aiExampleCount: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isDeleted: false,
    lastSyncedAt: '',
    customGroups: [],
  },
  {
    id: 'w2',
    word: 'persist',
    meaning: 'লেগে থাকা',
    definitions: [
      {
        meaning: 'লেগে থাকা',
        partOfSpeech: 'verb',
        examples: ['She persisted through hardships.'],
        userExamples: [],
      },
    ],
    aiExampleCount: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isDeleted: false,
    lastSyncedAt: '',
    customGroups: [],
  },
];

describe('BatchWordFamilyModal component', () => {
  it('renders modal when opened with word count', () => {
    render(
      <BatchWordFamilyModal
        opened
        onClose={jest.fn()}
        allMissingWords={mockWords}
        filteredMissingWords={mockWords}
        onGenerateWordFamily={jest.fn()}
      />
    );

    expect(screen.getByText('Batch Generate Word Families')).toBeInTheDocument();
    expect(screen.getByText('All Words Missing Word Families')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Generation/i })).toBeInTheDocument();
  });

  it('handles batch execution successfully', async () => {
    const handleGenerate = jest.fn().mockResolvedValue(undefined);
    const handleComplete = jest.fn();

    render(
      <BatchWordFamilyModal
        opened
        onClose={jest.fn()}
        allMissingWords={mockWords}
        filteredMissingWords={mockWords}
        onGenerateWordFamily={handleGenerate}
        onBatchComplete={handleComplete}
      />
    );

    const startBtn = screen.getByRole('button', { name: /Start Generation/i });
    await act(async () => {
      fireEvent.click(startBtn);
    });

    await waitFor(() => {
      expect(handleGenerate).toHaveBeenCalledTimes(2);
      expect(handleGenerate).toHaveBeenCalledWith('w1', 'accomplish', 'সাধন করা');
      expect(handleGenerate).toHaveBeenCalledWith('w2', 'persist', 'লেগে থাকা');
      expect(screen.getByText(/Generated/i)).toBeInTheDocument();
      expect(handleComplete).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
    });
  });

  it('handles generation errors gracefully', async () => {
    const handleGenerate = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('AI Service rate limited'));

    render(
      <BatchWordFamilyModal
        opened
        onClose={jest.fn()}
        allMissingWords={mockWords}
        filteredMissingWords={mockWords}
        onGenerateWordFamily={handleGenerate}
      />
    );

    const startBtn = screen.getByRole('button', { name: /Start Generation/i });
    await act(async () => {
      fireEvent.click(startBtn);
    });

    await waitFor(
      () => {
        expect(screen.getByText(/Generated/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Failed/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/word\(s\) failed/i)).toBeInTheDocument();
        expect(screen.getByText(/AI Service rate limited/i)).toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });
});
