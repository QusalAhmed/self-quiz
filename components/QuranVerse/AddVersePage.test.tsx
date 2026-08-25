import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import AddVersePage from '@/app/quran/add/page';
import { addBatchQuranVerses } from '@/lib/quran-service';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock QuranVerse Context
jest.mock('@/components/QuranVerse', () => {
  const actual = jest.requireActual('@/components/QuranVerse');
  return {
    ...actual,
    useQuranVerse: () => ({
      verses: [
        {
          id: '2:255',
          chapter: 2,
          verse: 255,
          category: 'Protection',
          notes: '',
          status: 'active',
          viewCount: 3,
          isDeleted: false,
        },
      ],
      isLoadingVerses: false,
      refreshVerses: jest.fn().mockResolvedValue(undefined),
      showNextVerseNow: jest.fn().mockResolvedValue(undefined),
      previewVerse: jest.fn().mockResolvedValue(undefined),
    }),
  };
});

// Mock Quran Service
jest.mock('@/lib/quran-service', () => ({
  addBatchQuranVerses: jest.fn().mockResolvedValue([{ id: '94:5' }, { id: '94:6' }]),
  addQuranVerseRecord: jest.fn().mockResolvedValue({ id: '2:255' }),
}));

describe('AddVersePage (app/quran/add/page.tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MantineProvider>
        <AddVersePage />
      </MantineProvider>
    );
  };

  it('renders the header title and batch import tab', () => {
    renderComponent();
    expect(screen.getByText('Add & Batch Import Verses')).toBeInTheDocument();
    expect(screen.getByText(/1. Batch \/ Bulk Import/i)).toBeInTheDocument();
    expect(screen.getByText(/2. Single Verse Form/i)).toBeInTheDocument();
    expect(screen.getByText(/3. Chapter Range/i)).toBeInTheDocument();
    expect(screen.getByText(/4. Curated Presets/i)).toBeInTheDocument();
  });

  it('updates parsed verses dynamically when user types comma/newline separated text', async () => {
    renderComponent();
    const textarea = screen.getByLabelText(/Enter Chapter & Verse References/i);
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: '112:1-4\n113:1-2' } });

    await waitFor(() => {
      expect(screen.getByText(/6 Total Valid Ayahs Detected/i)).toBeInTheDocument();
    });
  });

  it('invokes addBatchQuranVerses on import button click', async () => {
    renderComponent();
    const textarea = screen.getByLabelText(/Enter Chapter & Verse References/i);
    fireEvent.change(textarea, { target: { value: '94:5-6' } });

    const importButton = screen.getByRole('button', {
      name: /Import 2 Verses into Database/i,
    });
    expect(importButton).toBeInTheDocument();

    fireEvent.click(importButton);

    await waitFor(() => {
      expect(addBatchQuranVerses).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ chapter: 94, verse: 5 }),
          expect.objectContaining({ chapter: 94, verse: 6 }),
        ])
      );
    });
  });
});
