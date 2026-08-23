import React from 'react';
import type { WordFamilyMemberRecord } from '@/lib/db';
import { act, fireEvent, render, screen, waitFor } from '@/test-utils';
import { WordFamilySection } from './WordFamilySection';

const mockMembers: WordFamilyMemberRecord[] = [
  {
    id: 'w1_decision',
    wordId: 'w1',
    word: 'decision',
    partOfSpeech: 'noun',
    banglaDefinition: 'সিদ্ধান্ত',
    englishDefinition: 'a choice or judgment reached after consideration',
    examples: ['She made a quick decision.'],
    usageFrequency: 'very_common',
    generatorAiDetails: 'Gemini 2.5 Flash',
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastSyncedAt: '',
  },
  {
    id: 'w1_decisive',
    wordId: 'w1',
    word: 'decisive',
    partOfSpeech: 'adjective',
    banglaDefinition: 'চূড়ান্ত / সিদ্ধান্তমূলক',
    englishDefinition: 'producing a definite result',
    examples: ['A decisive victory.'],
    usageFrequency: 'common',
    generatorAiDetails: 'Gemini 2.5 Flash',
    isDeleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastSyncedAt: '',
  },
];

describe('WordFamilySection component', () => {
  it('returns null when members are empty, not loading, and no onRefresh is provided', () => {
    render(<WordFamilySection wordId="w1" word="decide" members={[]} />);
    expect(screen.queryByText(/Word Family/i)).toBeNull();
  });

  it('renders generate button when members are empty and onRefresh is provided', () => {
    const handleRefresh = jest.fn();
    render(<WordFamilySection wordId="w1" word="decide" members={[]} onRefresh={handleRefresh} />);
    expect(screen.getByText('Word Family')).toBeInTheDocument();
    expect(screen.getByText('(Never generated)')).toBeInTheDocument();
    const genBtn = screen.getByRole('button', { name: /generate word family for decide/i });
    expect(genBtn).toBeInTheDocument();
    fireEvent.click(genBtn);
    expect(handleRefresh).toHaveBeenCalledWith('w1', 'decide');
  });

  it('returns null when hideWhenEmpty is true even if onRefresh is provided', () => {
    const handleRefresh = jest.fn();
    render(
      <WordFamilySection
        wordId="w1"
        word="decide"
        members={[]}
        hideWhenEmpty
        onRefresh={handleRefresh}
      />
    );
    expect(screen.queryByText(/Word Family/i)).toBeNull();
  });

  it('renders generating indicator when loading with no members', () => {
    render(<WordFamilySection wordId="w1" word="decide" members={[]} isLoading />);
    expect(screen.getByText('Word Family')).toBeInTheDocument();
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  it('renders word family count, AI model badge, and chips', () => {
    render(<WordFamilySection wordId="w1" word="decide" members={mockMembers} />);
    expect(screen.getByText('Word Family (2)')).toBeInTheDocument();
    expect(screen.getAllByText('Gemini 2.5 Flash').length).toBeGreaterThan(0);
    expect(screen.getAllByText('decision').length).toBeGreaterThan(0);
    expect(screen.getAllByText('decisive').length).toBeGreaterThan(0);
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const handleRefresh = jest.fn();
    render(
      <WordFamilySection
        wordId="w1"
        word="decide"
        members={mockMembers}
        onRefresh={handleRefresh}
      />
    );

    const refreshButton = screen.getByRole('button', {
      name: /regenerate word family for decide/i,
    });
    fireEvent.click(refreshButton);
    expect(handleRefresh).toHaveBeenCalledWith('w1', 'decide');
  });

  it('expands detailed list when summary chip is clicked', () => {
    render(<WordFamilySection wordId="w1" word="decide" members={mockMembers} />);
    const decisionChips = screen.getAllByText('decision');
    fireEvent.click(decisionChips[0]);

    expect(screen.getByText('• সিদ্ধান্ত')).toBeInTheDocument();
    expect(
      screen.getByText('a choice or judgment reached after consideration')
    ).toBeInTheDocument();
    expect(screen.getByText('"She made a quick decision."')).toBeInTheDocument();
  });

  it('opens confirmation modal and handles member deletion', async () => {
    const handleDelete = jest.fn().mockResolvedValue(undefined);
    render(
      <WordFamilySection
        wordId="w1"
        word="decide"
        members={mockMembers}
        defaultExpanded
        onDeleteMember={handleDelete}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete decision from family/i });
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Delete Word Family Member')).toBeInTheDocument();
    const confirmDeleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    await act(async () => {
      fireEvent.click(confirmDeleteBtn);
    });

    await waitFor(() => {
      expect(handleDelete).toHaveBeenCalledWith('w1_decision');
    });
  });
});
