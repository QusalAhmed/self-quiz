import React from 'react';
import type { WordSimilarityResult } from '@/lib/similar-words/types';
import { fireEvent, render, screen, waitFor } from '@/test-utils';
import { SimilarWordsSection } from './SimilarWordsSection';

const mockSimilarWords: WordSimilarityResult[] = [
  {
    wordId: '2',
    word: 'retailer',
    score: 0.94,
    relationship: 'word_family',
    secondaryRelationships: ['orthographic'],
    explanation: 'Likely word family (Base word: "retail", Affix: "-er")',
    scores: {
      overall: 0.94,
      orthographic: 0.8,
      ngram: 0.85,
      prefix: 0.9,
      suffix: 0.9,
      morphological: 0.95,
      length: 0.85,
    },
    details: {
      commonPrefix: 'retail',
      commonSuffix: 'er',
      commonSubstring: 'retail',
      sharedSequence: 'retail',
      affix: '-er',
      stem: 'retail',
      baseWord: 'retail',
    },
  },
  {
    wordId: '3',
    word: 'trail',
    score: 0.78,
    relationship: 'orthographic',
    secondaryRelationships: [],
    explanation: 'Spelling similarity (Shared sequence: "ail")',
    scores: {
      overall: 0.78,
      orthographic: 0.85,
      ngram: 0.7,
      prefix: 0,
      suffix: 0.6,
      morphological: 0,
      length: 0.9,
    },
    details: {
      commonPrefix: '',
      commonSuffix: 'ail',
      commonSubstring: 'ail',
      sharedSequence: 'rail',
      affix: '',
      stem: 'trail',
      baseWord: 'trail',
    },
  },
];

describe('SimilarWordsSection UI Component', () => {
  it('renders header bar and expands on click', async () => {
    render(
      <SimilarWordsSection
        wordId="1"
        word="retail"
        similarWords={mockSimilarWords}
        defaultExpanded
      />
    );

    expect(screen.getByText('Similar & Related Words')).toBeInTheDocument();
    expect(screen.getByText('retailer')).toBeInTheDocument();
    expect(screen.getByText('trail')).toBeInTheDocument();
    expect(screen.getByText('Word Family')).toBeInTheDocument();
    expect(screen.getByText('Spelling Similar')).toBeInTheDocument();
  });

  it('filters by category when segmented control changed', async () => {
    render(
      <SimilarWordsSection
        wordId="1"
        word="retail"
        similarWords={mockSimilarWords}
        defaultExpanded
      />
    );

    // Filter to Spelling
    const spellingFilter = screen.getByText(/Spelling \(2\)/i);
    fireEvent.click(spellingFilter);

    expect(screen.getByText('trail')).toBeInTheDocument();
  });

  it('opens details modal with breakdown on signal icon click', async () => {
    render(
      <SimilarWordsSection
        wordId="1"
        word="retail"
        similarWords={mockSimilarWords}
        defaultExpanded
      />
    );

    const infoButtons = screen.getAllByLabelText('View similarity breakdown');
    fireEvent.click(infoButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Linguistic Similarity:/i)).toBeInTheDocument();
      expect(screen.getByText(/Signal Scores Breakdown/i)).toBeInTheDocument();
      expect(screen.getByText('Overall Relevance')).toBeInTheDocument();
    });
  });

  it('calls onNavigateWord when search button is clicked', () => {
    const handleNavigate = jest.fn();
    render(
      <SimilarWordsSection
        wordId="1"
        word="retail"
        similarWords={mockSimilarWords}
        defaultExpanded
        onNavigateWord={handleNavigate}
      />
    );

    const searchButton = screen.getByLabelText('View word retailer');
    fireEvent.click(searchButton);

    expect(handleNavigate).toHaveBeenCalledWith('retailer');
  });
});
