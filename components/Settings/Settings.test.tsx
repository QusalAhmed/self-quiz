import React from 'react';
import { DEFAULT_APP_SETTINGS } from '@/lib/settings';
import { render, screen, fireEvent } from '@/test-utils';
import { SettingsAboutTab } from './SettingsAboutTab';
import { SettingsAiTab } from './SettingsAiTab';
import { SettingsAppearanceTab } from './SettingsAppearanceTab';
import { SettingsAudioTab } from './SettingsAudioTab';
import { SettingsDataTab } from './SettingsDataTab';
import { SettingsFsrsTab } from './SettingsFsrsTab';
import { SettingsHeader } from './SettingsHeader';
import { SettingsNotificationsTab } from './SettingsNotificationsTab';
import { SettingsStudyQuizTab } from './SettingsStudyQuizTab';
import { SettingsSyncTab } from './SettingsSyncTab';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(''),
}));

// Mock sound module
jest.mock('@/lib/sound', () => ({
  isSoundEnabled: jest.fn(() => true),
  setSoundEnabled: jest.fn(),
  playReviewSound: jest.fn(),
  playNotificationSound: jest.fn(),
}));

describe('Settings Components', () => {
  describe('SettingsHeader', () => {
    it('renders title and export button', () => {
      const resetMock = jest.fn();
      render(<SettingsHeader settings={DEFAULT_APP_SETTINGS} onResetAll={resetMock} />);

      expect(screen.getByText('Application Settings')).toBeInTheDocument();
      expect(screen.getByText('Reset All Defaults')).toBeInTheDocument();
    });

    it('triggers reset handler when clicked', () => {
      const resetMock = jest.fn();
      render(<SettingsHeader settings={DEFAULT_APP_SETTINGS} onResetAll={resetMock} />);

      fireEvent.click(screen.getByText('Reset All Defaults'));
      expect(resetMock).toHaveBeenCalled();
    });
  });

  describe('SettingsAppearanceTab', () => {
    it('renders color mode and accent swatches', () => {
      const changeMock = jest.fn();
      render(
        <SettingsAppearanceTab settings={DEFAULT_APP_SETTINGS.appearance} onChange={changeMock} />
      );

      expect(screen.getByText('Color Mode & Theme')).toBeInTheDocument();
      expect(screen.getByText('Light Theme')).toBeInTheDocument();
      expect(screen.getByText('Dark Theme')).toBeInTheDocument();
      expect(screen.getByText('Accent Color Palette')).toBeInTheDocument();
    });
  });

  describe('SettingsStudyQuizTab', () => {
    it('renders quiz direction options, batch range selector, and keyboard shortcuts config', () => {
      const changeMock = jest.fn();
      render(
        <SettingsStudyQuizTab settings={DEFAULT_APP_SETTINGS.studyQuiz} onChange={changeMock} />
      );

      expect(screen.getByText('Default Quiz Direction & Mode')).toBeInTheDocument();
      expect(screen.getByText('Word → Meaning')).toBeInTheDocument();
      expect(screen.getByText('Meaning → Word')).toBeInTheDocument();
      expect(screen.getByText('Spelling Practice')).toBeInTheDocument();
      expect(screen.getByText('Keyboard Shortcuts & Hotkeys')).toBeInTheDocument();
      expect(screen.getByText('Enable Keyboard Shortcuts')).toBeInTheDocument();
      expect(screen.getByText('Show Shortcut Hints on Desktop')).toBeInTheDocument();
    });
  });

  describe('SettingsAudioTab', () => {
    it('renders soundboard buttons and voice controls', () => {
      const changeMock = jest.fn();
      render(<SettingsAudioTab settings={DEFAULT_APP_SETTINGS.audio} onChange={changeMock} />);

      expect(screen.getByText('Audio Feedback & Sound Effects')).toBeInTheDocument();
      expect(screen.getByText('Again')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('Speak Sample')).toBeInTheDocument();
    });
  });

  describe('SettingsFsrsTab', () => {
    it('renders target retention rate and algorithm explanations', () => {
      const changeMock = jest.fn();
      const resetMock = jest.fn();
      render(
        <SettingsFsrsTab
          settings={DEFAULT_APP_SETTINGS.fsrs}
          onChange={changeMock}
          onResetFsrs={resetMock}
        />
      );

      expect(screen.getByText(/Target Retention Rate/)).toBeInTheDocument();
      expect(screen.getByText('FSRS Algorithm Tuning')).toBeInTheDocument();
      expect(screen.getByText('Reset FSRS Settings')).toBeInTheDocument();
    });
  });

  describe('SettingsNotificationsTab', () => {
    it('renders permissions and delivery channels', () => {
      const changeMock = jest.fn();
      render(
        <SettingsNotificationsTab
          settings={DEFAULT_APP_SETTINGS.notifications}
          onChange={changeMock}
        />
      );

      expect(screen.getByText('Operating System Push Permission')).toBeInTheDocument();
      expect(screen.getByText('Notification Delivery Channels')).toBeInTheDocument();
      expect(screen.getByText('Send Test Notification')).toBeInTheDocument();
    });
  });

  describe('SettingsAiTab', () => {
    it('renders AI providers and model selectors', () => {
      const changeMock = jest.fn();
      render(<SettingsAiTab settings={DEFAULT_APP_SETTINGS.ai} onChange={changeMock} />);

      expect(screen.getByText('AI Generation Engine')).toBeInTheDocument();
      expect(screen.getByText('Groq Cloud AI')).toBeInTheDocument();
      expect(screen.getByText('Cloudflare Workers AI')).toBeInTheDocument();
      expect(screen.getByText('Google Gemma AI')).toBeInTheDocument();
      expect(screen.getByText('Test AI Connection')).toBeInTheDocument();
    });
  });

  describe('SettingsSyncTab', () => {
    it('renders cloud sync status and collections table', () => {
      render(
        <SettingsSyncTab
          onlineStatus
          isSyncing={false}
          collectionCounts={{
            words: 15,
            groups: 3,
            missedWords: 2,
            wordFamilies: 5,
            fsrsRecords: 10,
            reviewLogs: 20,
          }}
        />
      );

      expect(screen.getByText('Supabase Cloud Replication')).toBeInTheDocument();
      expect(screen.getByText('Synchronized Collections')).toBeInTheDocument();
      expect(screen.getByText('Dictionary Words')).toBeInTheDocument();
    });
  });

  describe('SettingsDataTab', () => {
    it('renders storage metrics and backup export buttons', () => {
      render(
        <SettingsDataTab
          words={[]}
          groups={[]}
          missedWords={[]}
          wordFamilies={{}}
          fsrsCount={0}
          reviewLogsCount={0}
        />
      );

      expect(screen.getByText('Local Storage & Database Metrics')).toBeInTheDocument();
      expect(screen.getByText('Data Export & Offline Backups')).toBeInTheDocument();
      expect(screen.getByText('Export Full Backup (.JSON)')).toBeInTheDocument();
      expect(screen.getByText('Danger Zone & Data Purging')).toBeInTheDocument();
    });
  });

  describe('SettingsAboutTab', () => {
    it('renders technology stack and keyboard shortcuts', () => {
      render(<SettingsAboutTab />);

      expect(screen.getByText('English Word Memorizer & Quiz Companion')).toBeInTheDocument();
      expect(screen.getByText('Keyboard Shortcuts Cheatsheet')).toBeInTheDocument();
      expect(screen.getByText('System Diagnostics & Runtime Capabilities')).toBeInTheDocument();

      // Verify newly added shortcuts in cheatsheet
      expect(screen.getByText('Z / U')).toBeInTheDocument();
      expect(screen.getByText('R')).toBeInTheDocument();
      expect(screen.getByText('M')).toBeInTheDocument();
      expect(screen.getByText('N')).toBeInTheDocument();
      expect(screen.getByText('H / ?')).toBeInTheDocument();
    });
  });
});
