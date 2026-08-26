import React from 'react';
import * as soundModule from '@/lib/sound';
import { fireEvent, render, screen } from '@/test-utils';
import { PronounceButton } from './PronounceButton';

jest.mock('@/lib/sound', () => {
  const actual = jest.requireActual('@/lib/sound');
  return {
    ...actual,
    playWordAudio: jest.fn().mockImplementation((_url, _vol, onEnd) => {
      onEnd?.();
      return Promise.resolve();
    }),
  };
});

describe('PronounceButton component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with volume icon and tooltip/aria-label', () => {
    render(<PronounceButton word="ephemeral" />);
    const btn = screen.getByRole('button', { name: /pronounce ephemeral/i });
    expect(btn).toBeInTheDocument();
  });

  it('triggers speech synthesis upon click when no audioUrl is provided', () => {
    const speakMock = jest.fn();
    const cancelMock = jest.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: speakMock,
        cancel: cancelMock,
      },
      writable: true,
      configurable: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
      text,
      lang: '',
      rate: 1,
      pitch: 1,
    }));

    render(<PronounceButton word="ubiquitous" />);
    const btn = screen.getByRole('button', { name: /pronounce ubiquitous/i });
    fireEvent.click(btn);

    expect(cancelMock).toHaveBeenCalled();
    expect(speakMock).toHaveBeenCalled();
    expect(soundModule.playWordAudio).not.toHaveBeenCalled();
  });

  it('plays recorded Merriam-Webster audio when valid audioUrl is provided', () => {
    const audioUrl = 'https://media.merriam-webster.com/audio/prons/en/us/mp3/e/epheme01.mp3';
    render(<PronounceButton word="ephemeral" audioUrl={audioUrl} phonetic="\\i-ˈfe-m(ə-)rəl\\" />);
    const btn = screen.getByRole('button', { name: /pronounce ephemeral/i });
    fireEvent.click(btn);

    expect(soundModule.playWordAudio).toHaveBeenCalledWith(
      audioUrl,
      expect.any(Number),
      expect.any(Function)
    );
  });
});
