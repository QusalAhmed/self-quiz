'use client';

import React from 'react';
import type { QuizMode } from './db';
import { appNotifications } from './notifications';
import { isSoundEnabled, playNotificationSound } from './sound';

export type SystemNotificationEventType =
  | 'fsrs_word_added'
  | 'fsrs_queue_refill'
  | 'quiz_completed'
  | 'daily_goal_reached'
  | 'sync_status'
  | 'word_saved'
  | 'test_notification';

export interface NotificationSettings {
  systemNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  soundEnabled: boolean;
  eventSubscriptions: {
    fsrsWordAdded: boolean;
    fsrsQueueRefill: boolean;
    quizCompleted: boolean;
    dailyGoal: boolean;
    syncStatus: boolean;
    wordSaved: boolean;
  };
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  systemNotificationsEnabled: true,
  inAppNotificationsEnabled: true,
  soundEnabled: true,
  eventSubscriptions: {
    fsrsWordAdded: true,
    fsrsQueueRefill: true,
    quizCompleted: true,
    dailyGoal: true,
    syncStatus: true,
    wordSaved: true,
  },
};

const STORAGE_KEY = 'self_quiz_notification_settings';
const SETTINGS_EVENT_NAME = 'self_quiz_notifications_changed';

export const QUIZ_MODE_LABELS: Record<QuizMode, string> = {
  wordToMeaning: 'Word to Meaning',
  meaningToWord: 'Meaning to Word',
  spelling: 'Spelling',
};

/**
 * Retrieves current notification settings from localStorage.
 */
export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      systemNotificationsEnabled:
        typeof parsed.systemNotificationsEnabled === 'boolean'
          ? parsed.systemNotificationsEnabled
          : DEFAULT_NOTIFICATION_SETTINGS.systemNotificationsEnabled,
      inAppNotificationsEnabled:
        typeof parsed.inAppNotificationsEnabled === 'boolean'
          ? parsed.inAppNotificationsEnabled
          : DEFAULT_NOTIFICATION_SETTINGS.inAppNotificationsEnabled,
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean'
          ? parsed.soundEnabled
          : DEFAULT_NOTIFICATION_SETTINGS.soundEnabled,
      eventSubscriptions: {
        ...DEFAULT_NOTIFICATION_SETTINGS.eventSubscriptions,
        ...(parsed.eventSubscriptions || {}),
      },
    };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

/**
 * Saves notification settings to localStorage and broadcasts the update.
 */
export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT_NAME, { detail: settings }));
  } catch {
    // Fail gracefully in restricted storage environments
  }
}

/**
 * Updates a subset of notification settings.
 */
export function updateNotificationSettings(
  partial: Partial<NotificationSettings>
): NotificationSettings {
  const current = getNotificationSettings();
  const next: NotificationSettings = {
    ...current,
    ...partial,
    eventSubscriptions: {
      ...current.eventSubscriptions,
      ...(partial.eventSubscriptions || {}),
    },
  };
  saveNotificationSettings(next);
  return next;
}

/**
 * Checks whether Web Notification API is supported by the current browser environment.
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return 'Notification' in window;
}

/**
 * Returns current permission status ('granted', 'denied', 'default', or 'unsupported').
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests notification permission from user.
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    // Dispatch settings change event so listeners update permission states
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(SETTINGS_EVENT_NAME, { detail: getNotificationSettings() })
      );
    }
    return permission;
  } catch {
    return 'denied';
  }
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: {
    url?: string;
    eventType?: SystemNotificationEventType;
    quizMode?: QuizMode;
    [key: string]: unknown;
  };
  inAppColor?: string;
  inAppIcon?: React.ReactNode;
}

/**
 * Low-level dispatcher: Sends OS/Browser notification via ServiceWorker or Web Notification API.
 */
async function dispatchOsNotification(payload: NotificationPayload): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/icon.svg',
    badge: '/favicon.svg',
    tag: payload.tag || 'self-quiz-notification',
    data: payload.data,
  };

  try {
    // 1. Prefer ServiceWorker registration for reliable background & standalone PWA handling
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && registration.active) {
        await registration.showNotification(payload.title, options);
        return true;
      }
    }

    // 2. Fallback to standard Notification constructor
    const notification = new Notification(payload.title, options);
    if (payload.data?.url) {
      notification.onclick = () => {
        window.focus();
        if (payload.data?.url && window.location.href !== payload.data.url) {
          window.location.href = payload.data.url;
        }
        notification.close();
      };
    }
    return true;
  } catch (err) {
    console.warn('Could not dispatch OS notification:', err);
    return false;
  }
}

/**
 * Unified notification dispatcher handling OS notifications, Mantine toasts, and audio chimes.
 */
export async function dispatchSystemNotification(
  eventType: SystemNotificationEventType,
  payload: NotificationPayload
): Promise<void> {
  const settings = getNotificationSettings();

  // Check event-level subscription filter
  let isEventEnabled = true;
  switch (eventType) {
    case 'fsrs_word_added':
      isEventEnabled = settings.eventSubscriptions.fsrsWordAdded;
      break;
    case 'fsrs_queue_refill':
      isEventEnabled = settings.eventSubscriptions.fsrsQueueRefill;
      break;
    case 'quiz_completed':
      isEventEnabled = settings.eventSubscriptions.quizCompleted;
      break;
    case 'daily_goal_reached':
      isEventEnabled = settings.eventSubscriptions.dailyGoal;
      break;
    case 'sync_status':
      isEventEnabled = settings.eventSubscriptions.syncStatus;
      break;
    case 'word_saved':
      isEventEnabled = settings.eventSubscriptions.wordSaved;
      break;
    case 'test_notification':
      isEventEnabled = true;
      break;
  }

  if (!isEventEnabled) {
    return;
  }

  // 1. Dispatch Sound Chime if enabled
  if (settings.soundEnabled && isSoundEnabled()) {
    playNotificationSound();
  }

  // 2. Dispatch In-App Toast if enabled
  if (settings.inAppNotificationsEnabled) {
    appNotifications.show({
      id: payload.tag,
      title: payload.title,
      message: payload.body,
      color: payload.inAppColor || 'violet',
      icon: payload.inAppIcon,
      autoClose: 5000,
      withBorder: true,
      styles: {
        root: {
          backdropFilter: 'blur(12px)',
        },
      },
    });
  }

  // 3. Dispatch OS / Web Push Notification if enabled & permission is granted
  if (settings.systemNotificationsEnabled) {
    await dispatchOsNotification(payload);
  }
}

// ---------------------------------------------------------------------------
// High-Level Event Handlers
// ---------------------------------------------------------------------------

/**
 * Triggered when a new word is added and enrolled into FSRS review in a quiz mode.
 */
export async function notifyFsrsWordAdded(params: {
  word: string;
  quizMode: QuizMode;
  meaning?: string;
  totalCardsForWord?: number;
}): Promise<void> {
  const modeLabel = QUIZ_MODE_LABELS[params.quizMode] || params.quizMode;
  const targetUrl = `/?mode=quiz&source=fsrs&direction=${params.quizMode}`;

  await dispatchSystemNotification('fsrs_word_added', {
    title: `FSRS Review: "${params.word}"`,
    body: `Added to ${modeLabel} review queue. Ready for spaced practice!`,
    tag: `fsrs-add-${params.word}-${params.quizMode}`,
    data: {
      url: targetUrl,
      eventType: 'fsrs_word_added',
      quizMode: params.quizMode,
      word: params.word,
    },
    inAppColor: 'violet',
  });
}

/**
 * Triggered when cards become due / FSRS review queue is refilled.
 */
export async function notifyFsrsQueueRefill(params: {
  count: number;
  quizMode?: QuizMode;
}): Promise<void> {
  const count = params.count;
  const wordLabel = count === 1 ? 'word' : 'words';
  const modeLabel = params.quizMode ? ` in ${QUIZ_MODE_LABELS[params.quizMode]}` : '';
  const targetUrl = params.quizMode
    ? `/?mode=quiz&source=fsrs&direction=${params.quizMode}`
    : `/?mode=quiz&source=fsrs`;

  await dispatchSystemNotification('fsrs_queue_refill', {
    title: 'Review Queue Refilled',
    body: `${count} ${wordLabel} ready for spaced repetition review${modeLabel}.`,
    tag: 'fsrs-queue-refill',
    data: {
      url: targetUrl,
      eventType: 'fsrs_queue_refill',
      quizMode: params.quizMode,
      count,
    },
    inAppColor: 'violet',
  });
}

/**
 * Triggered when a study or quiz session is completed.
 */
export async function notifyQuizCompleted(params: {
  modeName: string;
  totalCards: number;
  accuracyPercentage?: number;
}): Promise<void> {
  const accuracyText =
    params.accuracyPercentage !== undefined
      ? ` with ${Math.round(params.accuracyPercentage)}% accuracy`
      : '';

  await dispatchSystemNotification('quiz_completed', {
    title: 'Quiz Completed! 🎉',
    body: `Great job! You finished ${params.totalCards} cards in ${params.modeName}${accuracyText}.`,
    tag: `quiz-completed-${Date.now()}`,
    data: {
      eventType: 'quiz_completed',
      modeName: params.modeName,
      totalCards: params.totalCards,
    },
    inAppColor: 'teal',
  });
}

/**
 * Triggered when daily usage or review streak milestone is reached.
 */
export async function notifyDailyGoalReached(params: {
  minutesSpent: number;
  wordsReviewed?: number;
}): Promise<void> {
  const reviewText = params.wordsReviewed ? ` and reviewed ${params.wordsReviewed} words` : '';

  await dispatchSystemNotification('daily_goal_reached', {
    title: 'Daily Goal Achieved! 🏆',
    body: `You completed ${params.minutesSpent} minutes of vocabulary practice today${reviewText}.`,
    tag: `daily-goal-${new Date().toISOString().slice(0, 10)}`,
    data: {
      eventType: 'daily_goal_reached',
      minutesSpent: params.minutesSpent,
    },
    inAppColor: 'yellow',
  });
}

/**
 * Triggered when cloud or offline sync changes state.
 */
export async function notifySyncStatus(params: {
  success: boolean;
  count?: number;
  errorMessage?: string;
}): Promise<void> {
  if (params.success) {
    const countText = params.count ? ` (${params.count} records updated)` : '';
    await dispatchSystemNotification('sync_status', {
      title: 'Cloud Sync Complete',
      body: `Your vocabulary and FSRS cards are safely backed up${countText}.`,
      tag: 'sync-status-success',
      data: {
        eventType: 'sync_status',
        success: true,
      },
      inAppColor: 'teal',
    });
  } else {
    await dispatchSystemNotification('sync_status', {
      title: 'Cloud Sync Notice',
      body:
        params.errorMessage ||
        'Sync postponed. Changes are saved offline and will sync when reconnected.',
      tag: 'sync-status-error',
      data: {
        eventType: 'sync_status',
        success: false,
      },
      inAppColor: 'orange',
    });
  }
}

/**
 * Triggered when a word is saved, updated, or deleted.
 */
export async function notifyWordSaved(params: {
  word: string;
  action: 'created' | 'updated' | 'deleted';
}): Promise<void> {
  const actionText =
    params.action === 'created'
      ? 'added to your vocabulary dictionary'
      : params.action === 'updated'
        ? 'updated successfully'
        : 'removed from library';

  await dispatchSystemNotification('word_saved', {
    title: `Word ${params.action === 'created' ? 'Saved' : params.action === 'updated' ? 'Updated' : 'Deleted'}`,
    body: `"${params.word}" was ${actionText}.`,
    tag: `word-saved-${params.word}`,
    data: {
      eventType: 'word_saved',
      word: params.word,
      action: params.action,
    },
    inAppColor: params.action === 'deleted' ? 'red' : 'teal',
  });
}

/**
 * Sends a test notification to verify OS, in-app toast, and audio chime functionality.
 */
export async function sendTestNotification(): Promise<void> {
  await dispatchSystemNotification('test_notification', {
    title: 'Notifications Working! 🔔',
    body: 'System notifications, in-app toasts, and audio alerts are properly configured.',
    tag: `test-notification-${Date.now()}`,
    data: {
      eventType: 'test_notification',
      url: '/',
    },
    inAppColor: 'violet',
  });
}

/**
 * React hook to subscribe to and update notification preferences.
 */
export function useNotificationSettings(): {
  settings: NotificationSettings;
  permission: NotificationPermission | 'unsupported';
  isSupported: boolean;
  requestPermission: () => Promise<NotificationPermission | 'unsupported'>;
  updateSettings: (partial: Partial<NotificationSettings>) => void;
  sendTest: () => Promise<void>;
} {
  const [settings, setSettings] = React.useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [permission, setPermission] = React.useState<NotificationPermission | 'unsupported'>(
    'default'
  );
  const [isSupported, setIsSupported] = React.useState<boolean>(false);

  React.useEffect(() => {
    setSettings(getNotificationSettings());
    setPermission(getNotificationPermission());
    setIsSupported(isNotificationSupported());

    const handleUpdate = () => {
      setSettings(getNotificationSettings());
      setPermission(getNotificationPermission());
    };

    window.addEventListener(SETTINGS_EVENT_NAME, handleUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        handleUpdate();
      }
    });

    return () => {
      window.removeEventListener(SETTINGS_EVENT_NAME, handleUpdate);
    };
  }, []);

  const handleRequestPermission = React.useCallback(async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    return res;
  }, []);

  const handleUpdateSettings = React.useCallback((partial: Partial<NotificationSettings>) => {
    const next = updateNotificationSettings(partial);
    setSettings(next);
  }, []);

  return {
    settings,
    permission,
    isSupported,
    requestPermission: handleRequestPermission,
    updateSettings: handleUpdateSettings,
    sendTest: sendTestNotification,
  };
}
