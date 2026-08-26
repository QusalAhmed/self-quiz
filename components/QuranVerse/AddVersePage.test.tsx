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

// Mock QuranVerse Context with existing verse 2:255
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
      countdownSeconds: 900,
      nextVerseTimestamp: null,
      isRecurringEnabled: true,
      recurringIntervalMinutes: 15,
      resetTimer: jest.fn(),
    }),
  };
});

// Mock Quran Service
jest.mock('@/lib/quran-service', () => ({
  addBatchQuranVerses: jest.fn().mockResolvedValue([{ id: '94:5-6' }]),
  addQuranVerseRecord: jest.fn().mockResolvedValue({ id: '2:255' }),
}));

describe('AddVersePage (app/quran/add/page.tsx)', () => {
  jest.setTimeout(15000);

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

  it('correctly calculates and displays Already in Library count for duplicate verses', async () => {
    renderComponent();
    // Default text contains 2:255 (which is in existing verses) plus 94:5-6, 65:2-3, 39:53, 13:28
    await waitFor(() => {
      expect(screen.getByText('Already in Library')).toBeInTheDocument();
      expect(screen.getByText(/1 verse already in DB/i)).toBeInTheDocument();
    });
  });

  it('updates parsed verses dynamically when user types comma/newline separated text', async () => {
    renderComponent();
    const textarea = screen.getByLabelText(/Enter Chapter & Verse References/i);
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: '112:1-4\n113:1-2' } });

    await waitFor(() => {
      expect(screen.getByText(/2 Total Valid Ayahs Detected/i)).toBeInTheDocument();
    });
  });

  it('invokes addBatchQuranVerses on import button click with range preserved', async () => {
    renderComponent();
    const textarea = screen.getByLabelText(/Enter Chapter & Verse References/i);
    fireEvent.change(textarea, { target: { value: '94:5-6' } });

    const importButton = screen.getByRole('button', {
      name: /Import 1 Verse into Database/i,
    });
    expect(importButton).toBeInTheDocument();

    fireEvent.click(importButton);

    await waitFor(() => {
      expect(addBatchQuranVerses).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ chapter: 94, verse: 5, verseEnd: 6 })])
      );
    });
  });
});
