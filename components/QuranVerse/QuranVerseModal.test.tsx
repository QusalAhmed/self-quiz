import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { type FetchedVersePayload } from '@/lib/quran-api';
import { QuranVerseModal } from './QuranVerseModal';

const mockVerseData: FetchedVersePayload = {
  key: '94:5-6',
  chapter: 94,
  verse: 5,
  verseEnd: 6,
  arabicText: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
  chapterInfo: {
    id: 94,
    nameSimple: 'Ash-Sharh',
    nameArabic: 'الشرح',
    nameComplex: 'Ash-Sharḥ',
    translatedName: 'The Relief',
    revelationPlace: 'makkah',
    versesCount: 8,
  },
  fetchedAt: '2026-08-25T00:00:00.000Z',
  englishTranslation: {
    resourceId: 20,
    translatorName: 'Saheeh International',
    text: 'For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.',
  },
  banglaTranslation: {
    resourceId: 161,
    translatorName: 'তাফসীর আহসানুল বায়ান',
    text: 'সুতরাং কষ্টের সাথেই তো স্বস্তি আছে। নিশ্চয় কষ্টের সাথেই স্বস্তি আছে।',
  },
  audio: {
    reciterId: 7,
    reciterName: 'Mishari Rashid al-Afasy',
    audioUrl: 'https://audio.qurancdn.com/wbw/094_005.mp3',
    audioUrls: [
      'https://audio.qurancdn.com/wbw/094_005.mp3',
      'https://audio.qurancdn.com/wbw/094_006.mp3',
    ],
  },
  tafsir: {
    bangla: {
      resourceId: 164,
      name: 'তাফসীর আহসানুল বায়ান',
      text: '<p>কষ্টের পর অবশ্যই সুখ ও শান্তি আসে।</p>',
    },
    english: {
      resourceId: 168,
      name: 'Tafsir Ibn Kathir',
      text: '<p>Indeed with hardship comes ease.</p>',
    },
  },
};

describe('QuranVerseModal Component', () => {
  const defaultProps = {
    opened: true,
    onClose: jest.fn(),
    verseData: mockVerseData,
    verseRecord: {
      id: '94:5-6',
      chapter: 94,
      verse: 5,
      verseEnd: 6,
      category: 'Ease & Relief',
      notes: 'Encouraging reminder during difficulty',
      status: 'active' as const,
      viewCount: 1,
      isDeleted: false,
      createdAt: '2026-08-25T00:00:00.000Z',
      updatedAt: '2026-08-25T00:00:00.000Z',
      lastSyncedAt: '',
    },
    onNextRandom: jest.fn(),
    onSnooze: jest.fn(),
  };

  const renderComponent = (props = {}) => {
    return render(
      <MantineProvider>
        <QuranVerseModal {...defaultProps} {...props} />
      </MantineProvider>
    );
  };

  it('renders Surah title, category badge, and Arabic verse text', () => {
    renderComponent();

    expect(screen.getByText('Surah Ash-Sharh')).toBeInTheDocument();
    expect(screen.getByText('Ayahs 94:5-6')).toBeInTheDocument();
    expect(screen.getByText('✨ Ease & Relief')).toBeInTheDocument();
    expect(screen.getByText('فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا')).toBeInTheDocument();
  });

  it('renders English and Bangla translations and switches tabs', () => {
    renderComponent();

    // Default tab is English
    expect(
      screen.getByText(
        '"For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease."'
      )
    ).toBeInTheDocument();

    // Switch to Bangla tab
    const banglaTab = screen.getByRole('tab', { name: /বাংলা অনুবাদ/i });
    fireEvent.click(banglaTab);

    expect(
      screen.getByText('"সুতরাং কষ্টের সাথেই তো স্বস্তি আছে। নিশ্চয় কষ্টের সাথেই স্বস্তি আছে।"')
    ).toBeInTheDocument();
  });

  it('renders reflection notes from database', () => {
    renderComponent();

    expect(screen.getByText('Reflection Note:')).toBeInTheDocument();
    expect(screen.getByText('Encouraging reminder during difficulty')).toBeInTheDocument();
  });

  it('triggers onSnooze, onNextRandom, and onClose actions', () => {
    const onSnooze = jest.fn();
    const onNextRandom = jest.fn();
    const onClose = jest.fn();

    renderComponent({ onSnooze, onNextRandom, onClose });

    const snoozeButton = screen.getByRole('button', { name: /^Snooze$/i });
    fireEvent.click(snoozeButton);
    expect(onSnooze).toHaveBeenCalledTimes(1);

    const nextButton = screen.getByRole('button', { name: /Another Verse/i });
    fireEvent.click(nextButton);
    expect(onNextRandom).toHaveBeenCalledTimes(1);

    // Header close button triggers onClose
    const closeButton = screen.getByRole('button', { name: /Close modal/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Verify bottom close button is removed
    expect(screen.queryByRole('button', { name: /^Close$/i })).not.toBeInTheDocument();
  });

  it('expands tafsir collapsible commentary when clicked', () => {
    renderComponent();

    const tafsirButton = screen.getByText(/Tafsir & Explanation/i);
    expect(tafsirButton).toBeInTheDocument();

    fireEvent.click(tafsirButton);
    expect(screen.getByText(/কষ্টের পর অবশ্যই সুখ ও শান্তি আসে/i)).toBeInTheDocument();
  });
});
