import { isSoundEnabled, playReviewSound, setSoundEnabled, toggleSoundEnabled } from './sound';

describe('Sound utility (Quiz/Review sounds only)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('defaults to enabled when nothing is in localStorage', () => {
    expect(isSoundEnabled()).toBe(true);
  });

  it('sets and retrieves sound preference in localStorage', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    expect(localStorage.getItem('self_quiz_sound_enabled')).toBe('false');

    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
    expect(localStorage.getItem('self_quiz_sound_enabled')).toBe('true');
  });

  it('toggles sound preference', () => {
    setSoundEnabled(true);
    const toggled = toggleSoundEnabled();
    expect(toggled).toBe(false);
    expect(isSoundEnabled()).toBe(false);

    const toggledAgain = toggleSoundEnabled();
    expect(toggledAgain).toBe(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it('dispatches custom event on sound state change', () => {
    const listener = jest.fn();
    window.addEventListener('self_quiz_sound_changed', listener);

    setSoundEnabled(false);
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener('self_quiz_sound_changed', listener);
  });

  describe('Audio playback for review section without crashing in test environment', () => {
    it('does not throw for all review rating sounds', () => {
      expect(() => playReviewSound('again')).not.toThrow();
      expect(() => playReviewSound('hard')).not.toThrow();
      expect(() => playReviewSound('good')).not.toThrow();
      expect(() => playReviewSound('easy')).not.toThrow();
    });

    it('bypasses audio when sound is disabled', () => {
      setSoundEnabled(false);
      expect(() => {
        playReviewSound('good');
      }).not.toThrow();
    });
  });
});
