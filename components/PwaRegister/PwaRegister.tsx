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

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

function activateWaitingWorker(registration: ServiceWorkerRegistration) {
  registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let updateInterval: number | undefined;
    let isReloading = false;

    const reloadForUpdate = () => {
      if (isReloading) {
        return;
      }
      isReloading = true;
      window.location.reload();
    };

    const checkForUpdates = () => {
      void registration?.update().catch(() => {});
    };

    const onControllerChange = () => {
      reloadForUpdate();
    };

    const onFocus = () => {
      checkForUpdates();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        });

        if (registration.waiting) {
          activateWaitingWorker(registration);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration?.installing;
          if (!newWorker) {
            return;
          }

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller &&
              registration
            ) {
              activateWaitingWorker(registration);
            }
          });
        });

        checkForUpdates();
        updateInterval = window.setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL_MS);
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibilityChange);
      } catch {
        // Registration failures are non-critical for core app usage.
      }
    };

    void register();

    return () => {
      if (updateInterval) {
        window.clearInterval(updateInterval);
      }
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
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
        type="button"
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
