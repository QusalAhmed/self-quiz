import React from 'react';
import { DEFAULT_APP_SETTINGS } from '@/lib/settings';
import { fireEvent, render, screen } from '@/test-utils';
import { SettingsAudioTab } from './SettingsAudioTab';

describe('SettingsAudioTab component', () => {
  it('renders audio settings including Merriam-Webster section', () => {
    const onChange = jest.fn();
    render(<SettingsAudioTab settings={DEFAULT_APP_SETTINGS.audio} onChange={onChange} />);

    expect(screen.getByText(/Merriam-Webster Pronunciation & Audio/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto-fetch Audio on Word Add/i)).toBeInTheDocument();
    expect(screen.getByText(/Prefer Recorded Audio Over TTS/i)).toBeInTheDocument();
  });

  it('calls onChange when toggling Merriam-Webster settings', () => {
    const onChange = jest.fn();
    render(
      <SettingsAudioTab
        settings={{
          ...DEFAULT_APP_SETTINGS.audio,
          autoFetchMwAudioOnAdd: true,
          preferMwAudioOverTts: true,
        }}
        onChange={onChange}
      />
    );

    const switches = screen.getAllByRole('switch');
    // First is Review Sound FX, Second is Notification Chimes, Third is Auto-fetch, Fourth is Prefer MW
    expect(switches.length).toBeGreaterThanOrEqual(4);

    fireEvent.click(switches[2]);
    expect(onChange).toHaveBeenCalledWith({ autoFetchMwAudioOnAdd: false });
  });
});
