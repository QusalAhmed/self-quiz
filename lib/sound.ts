'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'self_quiz_sound_enabled';
const SOUND_EVENT_NAME = 'self_quiz_sound_changed';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export const SOUND_FILES: Record<ReviewRating | 'notification', string> = {
  again: '/sounds/review-again.wav',
  hard: '/sounds/review-hard.wav',
  good: '/sounds/review-good.wav',
  easy: '/sounds/review-easy.wav',
  notification: '/sounds/notification.wav',
};

let audioCtx: AudioContext | null = null;
const audioBufferCache = new Map<string, AudioBuffer>();
const audioElements = new Map<string, HTMLAudioElement>();

let isUnlockRegistered = false;

function registerUserGestureAudioUnlock(): void {
  if (typeof window === 'undefined' || isUnlockRegistered) {
    return;
  }
  isUnlockRegistered = true;

  const unlock = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      void audioCtx.resume().catch(() => {});
    }
    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((ev) => window.removeEventListener(ev, unlock));
  };

  const events = ['pointerdown', 'keydown', 'touchstart'];
  events.forEach((ev) => window.addEventListener(ev, unlock, { once: true, passive: true }));
}

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
    return audioCtx;
  } catch {
    return null;
  }
}

async function fetchAndDecodeAudio(url: string, ctx: AudioContext): Promise<AudioBuffer | null> {
  if (audioBufferCache.has(url)) {
    return audioBufferCache.get(url) || null;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    audioBufferCache.set(url, audioBuffer);
    return audioBuffer;
  } catch {
    return null;
  }
}

function playBuffer(ctx: AudioContext, buffer: AudioBuffer, gainValue: number): void {
  try {
    const play = () => {
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
    };

    if (ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(play)
        .catch(() => {
          play();
        });
      return;
    }

    play();
  } catch {
    // Fail gracefully
  }
}

function playAudioElementFallback(url: string, volume = 0.5): void {
  try {
    let audio = audioElements.get(url);
    if (!audio) {
      audio = new Audio(url);
      audioElements.set(url, audio);
    }
    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(1, volume));
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      void playPromise.catch(() => {});
    }
  } catch {
    // Fail gracefully
  }
}

async function playExternalSound(url: string, volume = 0.5): Promise<void> {
  if (!isSoundEnabled() || typeof window === 'undefined') {
    return;
  }

  const ctx = getAudioContext();
  if (ctx) {
    const buffer = audioBufferCache.get(url) || (await fetchAndDecodeAudio(url, ctx));
    if (buffer) {
      playBuffer(ctx, buffer, volume);
      return;
    }
  }

  // Fallback to standard HTMLAudioElement
  playAudioElementFallback(url, volume);
}

/**
 * Preloads all external review sound files for zero-latency playback.
 */
export function preloadSoundAssets(): void {
  if (typeof window === 'undefined') {
    return;
  }
  registerUserGestureAudioUnlock();
  const ctx = getAudioContext();
  Object.values(SOUND_FILES).forEach((url) => {
    if (ctx) {
      void fetchAndDecodeAudio(url, ctx);
    }
    try {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audioElements.set(url, audio);
    } catch {
      // Ignore in non-DOM/test environments
    }
  });
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
    preloadSoundAssets();

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

/**
 * Plays external sound file for quiz/review rating buttons.
 * - 'again': /sounds/review-again.wav
 * - 'hard': /sounds/review-hard.wav
 * - 'good': /sounds/review-good.wav
 * - 'easy': /sounds/review-easy.wav
 */
export function playReviewSound(rating: ReviewRating): void {
  const fileUrl = SOUND_FILES[rating];
  if (fileUrl) {
    void playExternalSound(fileUrl, 0.7);
  }
}

/**
 * Plays external sound file for system/in-app notifications.
 * - /sounds/notification.wav
 */
export function playNotificationSound(): void {
  void playExternalSound(SOUND_FILES.notification, 0.6);
}
