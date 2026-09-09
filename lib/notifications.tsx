'use client';

import { NotificationData, notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconRotateClockwise,
} from '@tabler/icons-react';
import React from 'react';

export interface AppNotificationOptions {
  id?: string;
  title: React.ReactNode;
  message: React.ReactNode;
  autoClose?: number | boolean;
  withCloseButton?: boolean;
}

interface WatchdogEntry {
  timer: ReturnType<typeof setTimeout>;
  expiresAt: number;
}

const activeWatchdogs = new Map<string, WatchdogEntry>();

/**
 * Cancels active watchdog timer for a notification ID.
 */
export function clearWatchdog(id: string): void {
  const entry = activeWatchdogs.get(id);
  if (entry) {
    clearTimeout(entry.timer);
    activeWatchdogs.delete(id);
  }
}

/**
 * Returns number of active watchdog timers (useful for unit testing).
 */
export function getActiveWatchdogCount(): number {
  return activeWatchdogs.size;
}

/**
 * Schedules a guaranteed fallback auto-close timer.
 * On mobile/phone devices, touching or swiping a notification can cause Mantine to enter
 * and remain in a synthetic hovered/paused state indefinitely because mobile touchscreens
 * never fire mouseleave. This watchdog guarantees the notification will be hidden
 * when the duration expires even if Mantine's internal timer was stalled.
 */
export function scheduleWatchdog(id: string, autoClose: number | boolean | undefined): void {
  clearWatchdog(id);
  if (typeof autoClose !== 'number' || autoClose <= 0) {
    return;
  }

  // Grace buffer: 500ms after Mantine's expected close time
  const duration = autoClose + 500;
  const expiresAt = Date.now() + duration;

  const timer = setTimeout(() => {
    activeWatchdogs.delete(id);
    try {
      notifications.hide(id);
    } catch {
      // Safe no-op in test/isolated environments
    }
  }, duration);

  activeWatchdogs.set(id, { timer, expiresAt });
}

let touchListenerAttached = false;

/**
 * Attaches a mobile touch listener to release synthetic mouse hover locks on notifications.
 * On mobile/tablets, tapping/touching an element leaves it in a synthetic :hover / mouseenter
 * state permanently because touchend is never followed by mouseleave.
 * By dispatching mouseout & mouseleave after touchend, we release the hover lock and allow
 * Mantine to resume its normal dismissal lifecycle.
 */
export function setupMobileNotificationTouchFix(): void {
  if (typeof window === 'undefined' || touchListenerAttached) {
    return;
  }
  touchListenerAttached = true;

  const handleTouchEnd = (event: TouchEvent) => {
    const target = event.target as HTMLElement | null;
    const notificationEl = target?.closest?.('.mantine-Notification-root') as HTMLElement | null;
    if (!notificationEl) {
      return;
    }

    // Wait 100ms so mobile browser's synthetic mousemove/mouseenter cycle settles
    setTimeout(() => {
      try {
        notificationEl.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
        notificationEl.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
      } catch {
        // Safe no-op in restricted DOM environments
      }
    }, 100);
  };

  window.addEventListener('touchend', handleTouchEnd, { passive: true });
  window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  // When phone wakes or tab regains visibility, immediately dismiss any notifications that expired in the background
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      activeWatchdogs.forEach((entry, id) => {
        if (now >= entry.expiresAt) {
          clearTimeout(entry.timer);
          activeWatchdogs.delete(id);
          try {
            notifications.hide(id);
          } catch {
            // Ignore
          }
        }
      });
    }
  });
}

// Auto-initialize when loaded in browser
if (typeof window !== 'undefined') {
  setupMobileNotificationTouchFix();
}

function generateNotificationId(): string {
  return `app-notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * High-level wrapper around Mantine notifications for consistent
 * styling, icons, and behavior across the app with guaranteed mobile dismissal.
 */
export const appNotifications = {
  /**
   * Dedicated notification when due timer or background sync adds cards to the FSRS review queue.
   */
  queueRefill: (count: number) => {
    const wordLabel = count === 1 ? 'word' : 'words';
    const id = 'fsrs-queue-refill';
    notifications.show({
      id,
      title: 'Review Queue Refilled',
      message: `${count} new ${wordLabel} ready to review`,
      color: 'violet',
      icon: <IconRotateClockwise size={18} />,
      autoClose: 4500,
      withBorder: true,
      styles: {
        root: {
          backdropFilter: 'blur(12px)',
        },
      },
    });
    scheduleWatchdog(id, 4500);
  },

  success: ({
    title,
    message,
    autoClose = 4000,
    id,
    withCloseButton = true,
  }: AppNotificationOptions) => {
    const notificationId = id || generateNotificationId();
    notifications.show({
      id: notificationId,
      title,
      message,
      color: 'teal',
      icon: <IconCheck size={18} />,
      autoClose,
      withCloseButton,
      withBorder: true,
    });
    scheduleWatchdog(notificationId, autoClose);
  },

  info: ({
    title,
    message,
    autoClose = 4000,
    id,
    withCloseButton = true,
  }: AppNotificationOptions) => {
    const notificationId = id || generateNotificationId();
    notifications.show({
      id: notificationId,
      title,
      message,
      color: 'indigo',
      icon: <IconInfoCircle size={18} />,
      autoClose,
      withCloseButton,
      withBorder: true,
    });
    scheduleWatchdog(notificationId, autoClose);
  },

  warning: ({
    title,
    message,
    autoClose = 5000,
    id,
    withCloseButton = true,
  }: AppNotificationOptions) => {
    const notificationId = id || generateNotificationId();
    notifications.show({
      id: notificationId,
      title,
      message,
      color: 'orange',
      icon: <IconAlertCircle size={18} />,
      autoClose,
      withCloseButton,
      withBorder: true,
    });
    scheduleWatchdog(notificationId, autoClose);
  },

  error: ({
    title,
    message,
    autoClose = 6000,
    id,
    withCloseButton = true,
  }: AppNotificationOptions) => {
    const notificationId = id || generateNotificationId();
    notifications.show({
      id: notificationId,
      title,
      message,
      color: 'red',
      icon: <IconAlertTriangle size={18} />,
      autoClose,
      withCloseButton,
      withBorder: true,
    });
    scheduleWatchdog(notificationId, autoClose);
  },

  show: (data: NotificationData) => {
    const notificationId = data.id || generateNotificationId();
    const autoClose = data.autoClose !== undefined ? data.autoClose : 4000;
    const result = notifications.show({
      ...data,
      id: notificationId,
      autoClose,
    });
    scheduleWatchdog(notificationId, autoClose);
    return result;
  },

  update: (data: NotificationData) => {
    if (data.id) {
      if (data.autoClose !== undefined) {
        scheduleWatchdog(data.id, data.autoClose);
      }
      notifications.update(data);
    }
  },

  clean: () => {
    activeWatchdogs.forEach((entry) => clearTimeout(entry.timer));
    activeWatchdogs.clear();
    notifications.clean();
  },

  hide: (id: string) => {
    clearWatchdog(id);
    notifications.hide(id);
  },
};

export const showQueueRefillNotification = appNotifications.queueRefill;
export const showSuccessNotification = appNotifications.success;
export const showInfoNotification = appNotifications.info;
export const showWarningNotification = appNotifications.warning;
export const showErrorNotification = appNotifications.error;
