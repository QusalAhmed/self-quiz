import React from 'react';
import type { SimilarWordCluster } from '@/lib/similar-words/clustering';
import { fireEvent, render, screen } from '@/test-utils';
import { SimilarWordClusterCard } from './SimilarWordClusterCard';

const mockCluster: SimilarWordCluster = {
  id: 'cluster-1-retail',
  name: 'retail Family',
  clusterType: 'word_family',
  hubWord: 'retail',
  hubWordId: '1',
  wordIds: ['1', '2', '3'],
  words: ['retail', 'retailer', 'retailing'],
  size: 3,
  averageScore: 0.92,
  maxScore: 0.94,
  density: 1,
  sharedFeatures: {
    commonRoot: 'retail',
    commonSubstring: 'retail',
    affixes: ['-er', '-ing'],
  },
  edges: [
    {
      sourceWordId: '1',
      targetWordId: '2',
      sourceWord: 'retail',
      targetWord: 'retailer',
      score: 0.94,
      relationshipType: 'word_family',
      explanation: 'Word family with suffix -er',
    },
    {
      sourceWordId: '1',
      targetWordId: '3',
      sourceWord: 'retail',
      targetWord: 'retailing',
      score: 0.91,
      relationshipType: 'word_family',
      explanation: 'Word family with suffix -ing',
    },
  ],
  explanation: 'Word family containing 3 words derived from base "retail".',
};

describe('SimilarWordClusterCard component', () => {
  it('renders cluster title, words, and category badge', () => {
    const handleInspect = jest.fn();
    render(<SimilarWordClusterCard cluster={mockCluster} onInspectCluster={handleInspect} />);

    expect(screen.getByText('retail Family')).toBeInTheDocument();
    expect(screen.getByText('Word Family')).toBeInTheDocument();
    expect(screen.getAllByText('retail').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('retailer')).toBeInTheDocument();
    expect(screen.getByText('retailing')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('triggers onInspectCluster when Inspect Group button is clicked', () => {
    const handleInspect = jest.fn();
    render(<SimilarWordClusterCard cluster={mockCluster} onInspectCluster={handleInspect} />);

    const inspectBtn = screen.getByRole('button', { name: /inspect group/i });
    fireEvent.click(inspectBtn);

    expect(handleInspect).toHaveBeenCalledWith(mockCluster);
  });

  it('triggers onStudyCluster when Study Quiz button is clicked', () => {
    const handleStudy = jest.fn();
    render(
      <SimilarWordClusterCard
        cluster={mockCluster}
        onInspectCluster={jest.fn()}
        onStudyCluster={handleStudy}
      />
    );

    const studyBtn = screen.getByRole('button', { name: /study quiz/i });
    fireEvent.click(studyBtn);

    expect(handleStudy).toHaveBeenCalledWith(mockCluster);
  });
});
