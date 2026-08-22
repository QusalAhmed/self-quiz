'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'self_quiz_sound_enabled';
const SOUND_EVENT_NAME = 'self_quiz_sound_changed';

let audioCtx: AudioContext | null = null;
let ratingAgainBuffer: AudioBuffer | null = null;
let ratingHardBuffer: AudioBuffer | null = null;
let ratingGoodBuffer: AudioBuffer | null = null;
let ratingEasyBuffer: AudioBuffer | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Creates a warm, soft woodblock/low-tone AudioBuffer for 'Again' rating.
 */
function createRatingAgainBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 0.11;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let env = 0;
    if (t < 0.004) {
      env = Math.sin((t / 0.004) * (Math.PI / 2));
    } else {
      env = Math.exp(-(t - 0.004) / 0.024);
    }

    const freq = 210 - 40 * (t / duration);
    const phase = 2 * Math.PI * freq * t;
    channelData[i] = (Math.sin(phase) + 0.2 * Math.sin(2 * phase)) * env;
  }

  return buffer;
}

/**
 * Creates a gentle neutral acoustic tone for 'Hard' rating.
 */
function createRatingHardBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 0.11;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let env = 0;
    if (t < 0.004) {
      env = Math.sin((t / 0.004) * (Math.PI / 2));
    } else {
      env = Math.exp(-(t - 0.004) / 0.024);
    }

    const freq = 310 - 45 * (t / duration);
    const phase = 2 * Math.PI * freq * t;
    channelData[i] = (Math.sin(phase) + 0.18 * Math.sin(2 * phase)) * env;
  }

  return buffer;
}

/**
 * Creates a bright, cheerful 2-note ascending chime for 'Good' rating.
 */
function createRatingGoodBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 0.18;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const channelData = buffer.getChannelData(0);

  const note1Freq = 523.25; // C5
  const note2Freq = 659.25; // E5
  const note2Offset = 0.055;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Note 1
    if (t < 0.12) {
      let env1 = 0;
      if (t < 0.003) {
        env1 = Math.sin((t / 0.003) * (Math.PI / 2));
      } else {
        env1 = Math.exp(-(t - 0.003) / 0.028);
      }
      sample += Math.sin(2 * Math.PI * note1Freq * t) * env1 * 0.7;
    }

    // Note 2
    if (t >= note2Offset) {
      const t2 = t - note2Offset;
      let env2 = 0;
      if (t2 < 0.003) {
        env2 = Math.sin((t2 / 0.003) * (Math.PI / 2));
      } else {
        env2 = Math.exp(-(t2 - 0.003) / 0.038);
      }
      sample += Math.sin(2 * Math.PI * note2Freq * t2) * env2 * 0.85;
    }

    channelData[i] = sample;
  }

  return buffer;
}

/**
 * Creates a sparkling major triad chime for 'Easy' rating.
 */
function createRatingEasyBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 0.24;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const channelData = buffer.getChannelData(0);

  const notes = [
    { freq: 523.25, offset: 0.0, decay: 0.035, gain: 0.6 }, // C5
    { freq: 659.25, offset: 0.045, decay: 0.042, gain: 0.7 }, // E5
    { freq: 783.99, offset: 0.09, decay: 0.055, gain: 0.9 }, // G5
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (const note of notes) {
      if (t >= note.offset) {
        const tn = t - note.offset;
        let env = 0;
        if (tn < 0.003) {
          env = Math.sin((tn / 0.003) * (Math.PI / 2));
        } else {
          env = Math.exp(-(tn - 0.003) / note.decay);
        }
        sample += Math.sin(2 * Math.PI * note.freq * tn) * env * note.gain;
      }
    }

    channelData[i] = sample;
  }

  return buffer;
}

function playBuffer(ctx: AudioContext, buffer: AudioBuffer, gainValue: number): void {
  try {
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(gainValue, ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0);
  } catch {
    // Fail gracefully
  }
}

/**
 * Checks if review sound effects are currently enabled.
 * Defaults to true if not set.
 */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      return true;
    }
    return stored === 'true';
  } catch {
    return true;
  }
}

/**
 * Sets whether review sound effects are enabled and broadcasts the change.
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent(SOUND_EVENT_NAME, { detail: { enabled } }));
  } catch {
    // Ignore localStorage failures in restricted contexts
  }
}

/**
 * Toggles review sound effects on or off.
 */
export function toggleSoundEnabled(): boolean {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  return next;
}

/**
 * React hook to observe and toggle sound preference.
 */
export function useSoundPreference(): {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
} {
  const [soundEnabled, setSoundState] = useState<boolean>(true);

  useEffect(() => {
    setSoundState(isSoundEnabled());

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
        setSoundState(customEvent.detail.enabled);
      } else {
        setSoundState(isSoundEnabled());
      }
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setSoundState(isSoundEnabled());
      }
    };

    window.addEventListener(SOUND_EVENT_NAME, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(SOUND_EVENT_NAME, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  const updateSound = useCallback((enabled: boolean) => {
    setSoundEnabled(enabled);
    setSoundState(enabled);
  }, []);

  const toggle = useCallback(() => {
    const next = !soundEnabled;
    updateSound(next);
  }, [soundEnabled, updateSound]);

  return {
    soundEnabled,
    setSoundEnabled: updateSound,
    toggleSound: toggle,
  };
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

/**
 * Plays distinct acoustic feedback exclusively for quiz/review rating buttons.
 * - 'again' / 'hard': Softer, warmer low/neutral tone.
 * - 'good' / 'easy': Brighter, cheerful ascending harmonic tone.
 */
export function playReviewSound(rating: ReviewRating): void {
  if (!isSoundEnabled()) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  if (rating === 'again') {
    if (!ratingAgainBuffer || ratingAgainBuffer.sampleRate !== ctx.sampleRate) {
      ratingAgainBuffer = createRatingAgainBuffer(ctx);
    }
    playBuffer(ctx, ratingAgainBuffer, 0.25);
  } else if (rating === 'hard') {
    if (!ratingHardBuffer || ratingHardBuffer.sampleRate !== ctx.sampleRate) {
      ratingHardBuffer = createRatingHardBuffer(ctx);
    }
    playBuffer(ctx, ratingHardBuffer, 0.25);
  } else if (rating === 'good') {
    if (!ratingGoodBuffer || ratingGoodBuffer.sampleRate !== ctx.sampleRate) {
      ratingGoodBuffer = createRatingGoodBuffer(ctx);
    }
    playBuffer(ctx, ratingGoodBuffer, 0.28);
  } else if (rating === 'easy') {
    if (!ratingEasyBuffer || ratingEasyBuffer.sampleRate !== ctx.sampleRate) {
      ratingEasyBuffer = createRatingEasyBuffer(ctx);
    }
    playBuffer(ctx, ratingEasyBuffer, 0.3);
  }
}

let notificationChimeBuffer: AudioBuffer | null = null;

/**
 * Creates a gentle, crystal chime for system & in-app event notifications.
 */
function createNotificationChimeBuffer(ctx: AudioContext): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const duration = 0.28;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const channelData = buffer.getChannelData(0);

  const note1Freq = 659.25; // E5
  const note2Freq = 987.77; // B5
  const note2Offset = 0.06;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Note 1 (E5)
    if (t < 0.16) {
      let env1 = 0;
      if (t < 0.003) {
        env1 = Math.sin((t / 0.003) * (Math.PI / 2));
      } else {
        env1 = Math.exp(-(t - 0.003) / 0.035);
      }
      sample +=
        (Math.sin(2 * Math.PI * note1Freq * t) + 0.2 * Math.sin(4 * Math.PI * note1Freq * t)) *
        env1 *
        0.55;
    }

    // Note 2 (B5)
    if (t >= note2Offset) {
      const t2 = t - note2Offset;
      let env2 = 0;
      if (t2 < 0.003) {
        env2 = Math.sin((t2 / 0.003) * (Math.PI / 2));
      } else {
        env2 = Math.exp(-(t2 - 0.003) / 0.045);
      }
      sample +=
        (Math.sin(2 * Math.PI * note2Freq * t2) + 0.18 * Math.sin(4 * Math.PI * note2Freq * t2)) *
        env2 *
        0.65;
    }

    channelData[i] = sample;
  }

  return buffer;
}

/**
 * Plays a warm, gentle chime for system/in-app event notifications.
 */
export function playNotificationSound(): void {
  if (!isSoundEnabled()) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  if (!notificationChimeBuffer || notificationChimeBuffer.sampleRate !== ctx.sampleRate) {
    notificationChimeBuffer = createNotificationChimeBuffer(ctx);
  }
  playBuffer(ctx, notificationChimeBuffer, 0.22);
}
