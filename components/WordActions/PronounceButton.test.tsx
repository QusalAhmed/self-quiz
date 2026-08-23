import React from 'react';
import { fireEvent, render, screen } from '@/test-utils';
import { PronounceButton } from './PronounceButton';

describe('PronounceButton component', () => {
  it('renders with volume icon and tooltip/aria-label', () => {
    render(<PronounceButton word="ephemeral" />);
    const btn = screen.getByRole('button', { name: /pronounce ephemeral/i });
    expect(btn).toBeInTheDocument();
  });

  it('triggers speech synthesis upon click', () => {
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
  });
});
