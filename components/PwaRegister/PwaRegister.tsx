'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    if (!('serviceWorker' in navigator)) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch {
        // Registration failures are non-critical for core app usage.
      }
    };

    register();
  }, []);

  return null;
}
