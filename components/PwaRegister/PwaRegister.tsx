'use client';

import { Notification } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Register service worker only in production
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const register = async () => {
        try {
          await navigator.serviceWorker.register('/sw.js');
        } catch {
          // Registration failures are non-critical for core app usage.
        }
      };
      register();
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
      setIsInstalled(true);
    }
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <Notification
      icon={<IconDownload size={18} />}
      title="Install App"
      color="blue"
      onClose={() => setShowPrompt(false)}
      style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, maxWidth: 350 }}
    >
      Install our app for offline access, instant loading, and a better experience!{' '}
      <button
        onClick={handleInstall}
        style={{
          background: 'var(--mantine-color-blue-6)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 12px',
          cursor: 'pointer',
          fontWeight: 500,
          marginLeft: '8px',
        }}
      >
        Install Now
      </button>
    </Notification>
  );
}

