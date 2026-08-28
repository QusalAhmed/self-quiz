import React from 'react';
import { getDatabase } from '@/lib/db';
import { useAppDispatch } from '@/lib/redux/hooks';
import { fireEvent, render, screen, waitFor } from '@/test-utils';
import SimilarWordsPage from './page';

const mockRouterPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

jest.mock('@/lib/redux/hooks', () => ({
  useAppDispatch: jest.fn(),
}));

jest.mock('@/lib/replication', () => ({
  setupSupabaseReplication: jest.fn(),
}));

jest.mock('@/lib/db', () => {
  const actual = jest.requireActual('@/lib/db');
  return {
    ...actual,
    getDatabase: jest.fn(),
  };
});

describe('SimilarWordsPage (/similar-words)', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAppDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);

    const mockWords = [
      { id: '1', word: 'retail', meaning: 'selling goods', isDeleted: false },
      { id: '2', word: 'retailer', meaning: 'one who sells', isDeleted: false },
      { id: '3', word: 'trail', meaning: 'path', isDeleted: false },
    ];

    const mockSims = [
      {
        id: '1:2',
        sourceWordId: '1',
        targetWordId: '2',
        sourceWord: 'retail',
        targetWord: 'retailer',
        overallScore: 0.94,
        relationshipType: 'word_family',
        explanation: 'Word family with suffix -er',
        isDeleted: false,
      },
    ];

    const mockDb = {
      words: {
        find: jest.fn().mockReturnValue({
          $: {
            subscribe: jest.fn((cb) => {
              cb(mockWords.map((w) => ({ toJSON: () => w })));
              return { unsubscribe: jest.fn() };
            }),
          },
        }),
      },
      wordSimilarities: {
        find: jest.fn().mockReturnValue({
          $: {
            subscribe: jest.fn((cb) => {
              cb(mockSims.map((s) => ({ toJSON: () => s })));
              return { unsubscribe: jest.fn() };
            }),
          },
        }),
      },
    };

    (getDatabase as jest.Mock).mockResolvedValue(mockDb);
  });

  it('renders header, metrics, and discovered similarity clusters', async () => {
    render(<SimilarWordsPage />);

    await waitFor(() => {
      expect(screen.getByText('Similar Word Groups & Clusters')).toBeInTheDocument();
      expect(screen.getByText(/Discovered Groups/i)).toBeInTheDocument();
    });

    expect(screen.getByText('retail Family')).toBeInTheDocument();
    expect(screen.getAllByText('retail').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('retailer')).toBeInTheDocument();
  });

  it('filters clusters when search text is entered', async () => {
    render(<SimilarWordsPage />);

    await waitFor(() => {
      expect(screen.getByText('retail Family')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by word, stem root/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistentword' } });

    expect(screen.getByText(/No Similar Word Groups Found/i)).toBeInTheDocument();
  });

  it('triggers startGroupQuiz when Study Quiz on a cluster card is clicked', async () => {
    render(<SimilarWordsPage />);

    await waitFor(() => {
      expect(screen.getByText('retail Family')).toBeInTheDocument();
    });

    const studyBtn = screen.getByRole('button', { name: /study quiz/i });
    fireEvent.click(studyBtn);

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'quiz/startGroupQuiz',
        payload: expect.objectContaining({
          clusterName: 'retail Family',
          clusterType: 'word_family',
        }),
      })
    );

    expect(mockRouterPush).toHaveBeenCalledWith(
      expect.stringContaining('/quiz?source=similarGroups&clusterId=')
    );
  });
});
