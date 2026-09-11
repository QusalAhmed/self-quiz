'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_SOUND_KEY = 'self_quiz_gboard_sound';
const STORAGE_VIBRATE_KEY = 'self_quiz_gboard_vibrate';

let sharedAudioContext: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
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
    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContextClass();
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

export function useKeyboardFeedback() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrateEnabled, setVibrateEnabled] = useState<boolean>(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const savedSound = localStorage.getItem(STORAGE_SOUND_KEY);
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true');
      }
      const savedVibrate = localStorage.getItem(STORAGE_VIBRATE_KEY);
      if (savedVibrate !== null) {
        setVibrateEnabled(savedVibrate === 'true');
      }
    } catch {
      // Ignore localStorage errors
    }
    hasInitialized.current = true;
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_SOUND_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const toggleVibrate = useCallback(() => {
    setVibrateEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_VIBRATE_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const playKeySound = useCallback(
    (keyType: 'character' | 'function' | 'delete' | 'space' = 'character') => {
      if (!soundEnabled || typeof window === 'undefined') {
        return;
      }

      try {
        const ctx = getSharedAudioContext();
        if (!ctx) {
          return;
        }

        if (ctx.state === 'suspended') {
          void ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Gboard-like subtle soft pop / click
        if (keyType === 'delete') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.025);
          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.025);
        } else if (keyType === 'space') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(70, now + 0.02);
          gain.gain.setValueAtTime(0.07, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.02);
        } else if (keyType === 'function') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(160, now + 0.02);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.02);
        } else {
          // Standard letter key tap
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(90, now + 0.018);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.018);
        }
      } catch {
        // Fallback silently if web audio fails
      }
    },
    [soundEnabled]
  );

  const triggerHaptic = useCallback(
    (durationMs = 12) => {
      if (!vibrateEnabled || typeof window === 'undefined' || !navigator.vibrate) {
        return;
      }
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Ignore vibration errors
      }
    },
    [vibrateEnabled]
  );

  const triggerFeedback = useCallback(
    (keyType: 'character' | 'function' | 'delete' | 'space' = 'character') => {
      playKeySound(keyType);
      triggerHaptic(keyType === 'delete' ? 16 : 10);
    },
    [playKeySound, triggerHaptic]
  );

  return {
    soundEnabled,
    vibrateEnabled,
    toggleSound,
    toggleVibrate,
    triggerFeedback,
  };
}
