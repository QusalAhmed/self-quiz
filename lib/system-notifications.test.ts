import { notifications } from '@mantine/notifications';
import * as soundModule from './sound';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  dispatchSystemNotification,
  getNotificationPermission,
  getNotificationSettings,
  isNotificationSupported,
  isUserInApp,
  notifyDailyGoalReached,
  notifyFsrsQueueRefill,
  notifyFsrsWordAdded,
  notifyQuizCompleted,
  notifySyncStatus,
  notifyWordSaved,
  requestNotificationPermission,
  saveNotificationSettings,
  sendTestNotification,
  updateNotificationSettings,
} from './system-notifications';

jest.mock('@mantine/notifications', () => ({
  notifications: {
    show: jest.fn(),
    clean: jest.fn(),
    hide: jest.fn(),
  },
}));

jest.mock('./sound', () => {
  const original = jest.requireActual('./sound');
  return {
    ...original,
    playNotificationSound: jest.fn(),
    isSoundEnabled: jest.fn(() => true),
  };
});

describe('System Notifications Service', () => {
  let mockShowNotification: jest.Mock;
  let mockGetRegistration: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();

    // Default to user being in-app (visible & focused) for predictable testing
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
      configurable: true,
    });
    jest.spyOn(document, 'hasFocus').mockReturnValue(true);

    mockShowNotification = jest.fn().mockResolvedValue(undefined);
    mockGetRegistration = jest.fn().mockResolvedValue({
      active: true,
      showNotification: mockShowNotification,
    });

    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: {
        getRegistration: mockGetRegistration,
      },
      writable: true,
      configurable: true,
    });

    // Mock Notification global
    const mockNotificationConstructor = jest.fn().mockImplementation((title, options) => ({
      title,
      options,
      close: jest.fn(),
    }));
    Object.assign(mockNotificationConstructor, {
      permission: 'granted',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    });

    Object.defineProperty(global, 'Notification', {
      value: mockNotificationConstructor,
      writable: true,
      configurable: true,
    });
  });

  describe('isUserInApp Detection', () => {
    it('returns true when document is visible and focused', () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      jest.spyOn(document, 'hasFocus').mockReturnValue(true);
      expect(isUserInApp()).toBe(true);
    });

    it('returns false when document is hidden', () => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      jest.spyOn(document, 'hasFocus').mockReturnValue(true);
      expect(isUserInApp()).toBe(false);
    });

    it('returns false when document does not have focus', () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      jest.spyOn(document, 'hasFocus').mockReturnValue(false);
      expect(isUserInApp()).toBe(false);
    });

    it('falls back to visibility when hasFocus is not a function', () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      const origHasFocus = document.hasFocus;
      Object.defineProperty(document, 'hasFocus', { value: undefined, configurable: true });
      expect(isUserInApp()).toBe(true);
      Object.defineProperty(document, 'hasFocus', { value: origHasFocus, configurable: true });
    });
  });

  describe('Settings & Preferences', () => {
    it('returns default settings when none stored in localStorage', () => {
      const settings = getNotificationSettings();
      expect(settings).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    });

    it('persists and retrieves updated settings', () => {
      saveNotificationSettings({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        systemNotificationsEnabled: false,
        soundEnabled: false,
      });

      const settings = getNotificationSettings();
      expect(settings.systemNotificationsEnabled).toBe(false);
      expect(settings.soundEnabled).toBe(false);
    });

    it('updates partial settings properly', () => {
      const updated = updateNotificationSettings({
        inAppNotificationsEnabled: false,
        eventSubscriptions: {
          ...DEFAULT_NOTIFICATION_SETTINGS.eventSubscriptions,
          fsrsWordAdded: false,
        },
      });

      expect(updated.inAppNotificationsEnabled).toBe(false);
      expect(updated.eventSubscriptions.fsrsWordAdded).toBe(false);
      expect(updated.eventSubscriptions.quizCompleted).toBe(true);
    });
  });

  describe('Permissions & Support', () => {
    it('detects notification support', () => {
      expect(isNotificationSupported()).toBe(true);
    });

    it('gets current permission status', () => {
      expect(getNotificationPermission()).toBe('granted');
    });

    it('requests notification permission from user', async () => {
      const permission = await requestNotificationPermission();
      expect(permission).toBe('granted');
      expect(Notification.requestPermission).toHaveBeenCalled();
    });
  });

  describe('In-App Notification Delivery (User IS in the app)', () => {
    beforeEach(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      jest.spyOn(document, 'hasFocus').mockReturnValue(true);
    });

    it('dispatches in-app toast and audio chime, but suppresses OS notification for fsrs_word_added', async () => {
      await notifyFsrsWordAdded({
        word: 'Ephemeral',
        quizMode: 'wordToMeaning',
        meaning: 'Lasting for a very short time',
      });

      // 1. In-App Toast IS shown
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'FSRS Review: "Ephemeral"',
          message: expect.stringContaining('Word to Meaning'),
          color: 'violet',
        })
      );

      // 2. Sound chime IS played
      expect(soundModule.playNotificationSound).toHaveBeenCalled();

      // 3. OS notification is NOT dispatched because user is actively in the app
      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('dispatches in-app toast for spelling mode without OS notification', async () => {
      await notifyFsrsWordAdded({
        word: 'Acquiesce',
        quizMode: 'spelling',
      });

      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'FSRS Review: "Acquiesce"',
          message: expect.stringContaining('Spelling'),
        })
      );
      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('dispatches in-app toast for fsrs_queue_refill without OS notification', async () => {
      await notifyFsrsQueueRefill({ count: 7, quizMode: 'meaningToWord' });

      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Review Queue Refilled',
          message: expect.stringContaining(
            '7 words ready for spaced repetition review in Meaning to Word'
          ),
        })
      );
      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('dispatches in-app toast for quiz_completed without OS notification', async () => {
      await notifyQuizCompleted({
        modeName: 'FSRS Review',
        totalCards: 15,
        accuracyPercentage: 93.3,
      });

      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Quiz Completed! 🎉',
          message: expect.stringContaining('15 cards in FSRS Review with 93% accuracy'),
          color: 'teal',
        })
      );
      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('dispatches in-app toast for daily_goal_reached without OS notification', async () => {
      await notifyDailyGoalReached({ minutesSpent: 20, wordsReviewed: 45 });

      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Daily Goal Achieved! 🏆',
          message: expect.stringContaining(
            '20 minutes of vocabulary practice today and reviewed 45 words'
          ),
          color: 'yellow',
        })
      );
      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('dispatches in-app toast for sync_status without OS notification', async () => {
      await notifySyncStatus({ success: true, count: 12 });
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Cloud Sync Complete',
          message: expect.stringContaining('12 records updated'),
          color: 'teal',
        })
      );
      expect(mockShowNotification).not.toHaveBeenCalled();

      await notifySyncStatus({ success: false, errorMessage: 'Network offline' });
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Cloud Sync Notice',
          message: 'Network offline',
          color: 'orange',
        })
      );
      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('dispatches in-app toast for word_saved without OS notification', async () => {
      await notifyWordSaved({ word: 'Eloquent', action: 'created' });
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Word Saved',
          message: '"Eloquent" was added to your vocabulary dictionary.',
        })
      );
      expect(mockShowNotification).not.toHaveBeenCalled();

      await notifyWordSaved({ word: 'Eloquent', action: 'deleted' });
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Word Deleted',
          color: 'red',
        })
      );
      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('respects inAppNotificationsEnabled = false when in-app', async () => {
      updateNotificationSettings({
        inAppNotificationsEnabled: false,
      });

      await notifyWordSaved({ word: 'Test', action: 'created' });
      expect(notifications.show).not.toHaveBeenCalled();
      expect(mockShowNotification).not.toHaveBeenCalled();
    });
  });

  describe('Out-of-App Notification Delivery (User is NOT in the app)', () => {
    it('dispatches OS system notification and suppresses in-app toast when tab is hidden', async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      jest.spyOn(document, 'hasFocus').mockReturnValue(true);

      await notifyFsrsQueueRefill({ count: 5, quizMode: 'wordToMeaning' });

      // OS notification IS dispatched
      expect(mockShowNotification).toHaveBeenCalledWith(
        'Review Queue Refilled',
        expect.objectContaining({
          body: expect.stringContaining('5 words ready for spaced repetition review'),
          data: expect.objectContaining({
            eventType: 'fsrs_queue_refill',
            count: 5,
          }),
        })
      );

      // In-app toast is suppressed because user is out of app
      expect(notifications.show).not.toHaveBeenCalled();
    });

    it('dispatches OS system notification and suppresses in-app toast when window lacks focus', async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      jest.spyOn(document, 'hasFocus').mockReturnValue(false);

      await notifyFsrsWordAdded({
        word: 'Serendipity',
        quizMode: 'wordToMeaning',
      });

      expect(mockShowNotification).toHaveBeenCalledWith(
        'FSRS Review: "Serendipity"',
        expect.objectContaining({
          body: expect.stringContaining('Word to Meaning review queue'),
        })
      );
      expect(notifications.show).not.toHaveBeenCalled();
    });

    it('respects systemNotificationsEnabled = false when out of app (suppresses OS notification and falls back to in-app toast)', async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      jest.spyOn(document, 'hasFocus').mockReturnValue(false);

      updateNotificationSettings({
        systemNotificationsEnabled: false,
      });

      await notifyWordSaved({ word: 'Test', action: 'created' });
      expect(mockShowNotification).not.toHaveBeenCalled();
      // Fallback in-app toast is queued for when user returns
      expect(notifications.show).toHaveBeenCalled();
    });

    it('falls back to in-app toast when notification permission is denied', async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      jest.spyOn(document, 'hasFocus').mockReturnValue(false);

      Object.assign(Notification, { permission: 'denied' });

      await notifyWordSaved({ word: 'Test', action: 'created' });
      expect(mockShowNotification).not.toHaveBeenCalled();
      expect(notifications.show).toHaveBeenCalled();
    });
  });

  describe('Test Notification (sendTestNotification)', () => {
    it('dispatches BOTH in-app toast and OS system notification when sendTestNotification is triggered', async () => {
      // Even if user is currently inside the app looking at Settings
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      jest.spyOn(document, 'hasFocus').mockReturnValue(true);

      await sendTestNotification();

      // Dispatches in-app toast
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Notifications Working! 🔔',
        })
      );

      // AND dispatches OS system notification so user can verify permissions
      expect(mockShowNotification).toHaveBeenCalledWith(
        'Notifications Working! 🔔',
        expect.objectContaining({
          body: 'System notifications, in-app toasts, and audio alerts are properly configured.',
        })
      );
    });
  });

  describe('Manual Force Delivery Overrides', () => {
    it('delivers OS notification even when in-app when forceDelivery is "system"', async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      jest.spyOn(document, 'hasFocus').mockReturnValue(true);

      await dispatchSystemNotification('word_saved', {
        title: 'Forced System',
        body: 'Testing forced system delivery',
        forceDelivery: 'system',
      });

      expect(mockShowNotification).toHaveBeenCalled();
      expect(notifications.show).not.toHaveBeenCalled();
    });

    it('delivers in-app toast even when out of app when forceDelivery is "in_app"', async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      jest.spyOn(document, 'hasFocus').mockReturnValue(false);

      await dispatchSystemNotification('word_saved', {
        title: 'Forced In-App',
        body: 'Testing forced in-app delivery',
        forceDelivery: 'in_app',
      });

      expect(notifications.show).toHaveBeenCalled();
      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('delivers both channels when forceDelivery is "both"', async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      jest.spyOn(document, 'hasFocus').mockReturnValue(true);

      await dispatchSystemNotification('word_saved', {
        title: 'Forced Both',
        body: 'Testing dual delivery',
        forceDelivery: 'both',
      });

      expect(notifications.show).toHaveBeenCalled();
      expect(mockShowNotification).toHaveBeenCalled();
    });
  });

  describe('Event Subscriptions & Auto-Close Lifecycle', () => {
    it('respects event subscription settings when disabled', async () => {
      updateNotificationSettings({
        eventSubscriptions: {
          ...DEFAULT_NOTIFICATION_SETTINGS.eventSubscriptions,
          fsrsWordAdded: false,
        },
      });

      await notifyFsrsWordAdded({ word: 'Ignored', quizMode: 'wordToMeaning' });
      expect(notifications.show).not.toHaveBeenCalled();
      expect(mockShowNotification).not.toHaveBeenCalled();
    });

    it('falls back to window.Notification if Service Worker not registered', async () => {
      mockGetRegistration.mockResolvedValue(null);

      await dispatchSystemNotification('test_notification', {
        title: 'Fallback Test',
        body: 'Testing direct Notification fallback',
      });

      expect(Notification).toHaveBeenCalledWith(
        'Fallback Test',
        expect.objectContaining({
          body: 'Testing direct Notification fallback',
        })
      );
    });

    it('automatically closes ServiceWorker OS notification after timeout', async () => {
      jest.useFakeTimers();
      const mockClose = jest.fn();
      const mockGetNotifications = jest.fn().mockResolvedValue([{ close: mockClose }]);

      mockGetRegistration.mockResolvedValue({
        active: true,
        showNotification: mockShowNotification,
        getNotifications: mockGetNotifications,
      });

      await dispatchSystemNotification('test_notification', {
        title: 'SW Auto-Close Test',
        body: 'Testing SW auto close on phone',
        tag: 'sw-auto-close-tag',
      });

      expect(mockShowNotification).toHaveBeenCalled();

      // Advance past 6000ms
      await jest.advanceTimersByTimeAsync(6500);

      expect(mockGetNotifications).toHaveBeenCalledWith({ tag: 'sw-auto-close-tag' });
      expect(mockClose).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('automatically closes fallback window.Notification after timeout', async () => {
      jest.useFakeTimers();
      mockGetRegistration.mockResolvedValue(null);

      const mockClose = jest.fn();
      (Notification as unknown as jest.Mock).mockImplementation((title, options) => ({
        title,
        options,
        close: mockClose,
      }));

      await dispatchSystemNotification('test_notification', {
        title: 'Fallback Auto-Close Test',
        body: 'Testing fallback close on phone',
      });

      expect(Notification).toHaveBeenCalled();
      expect(mockClose).not.toHaveBeenCalled();

      // Advance past 6000ms
      jest.advanceTimersByTime(6500);

      expect(mockClose).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});
