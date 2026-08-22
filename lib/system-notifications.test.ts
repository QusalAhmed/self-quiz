import { notifications } from '@mantine/notifications';
import * as soundModule from './sound';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  dispatchSystemNotification,
  getNotificationPermission,
  getNotificationSettings,
  isNotificationSupported,
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

  describe('Event Notifications Dispatching', () => {
    it('dispatches fsrs_word_added with proper quiz mode details', async () => {
      await notifyFsrsWordAdded({
        word: 'Ephemeral',
        quizMode: 'wordToMeaning',
        meaning: 'Lasting for a very short time',
      });

      // 1. Toast
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'FSRS Review: "Ephemeral"',
          message: expect.stringContaining('Word to Meaning'),
          color: 'violet',
        })
      );

      // 2. Sound
      expect(soundModule.playNotificationSound).toHaveBeenCalled();

      // 3. Service Worker OS Notification
      expect(mockShowNotification).toHaveBeenCalledWith(
        'FSRS Review: "Ephemeral"',
        expect.objectContaining({
          body: expect.stringContaining('Word to Meaning'),
          data: expect.objectContaining({
            eventType: 'fsrs_word_added',
            quizMode: 'wordToMeaning',
            word: 'Ephemeral',
          }),
        })
      );
    });

    it('dispatches fsrs_word_added for spelling mode', async () => {
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
      expect(mockShowNotification).toHaveBeenCalledWith(
        'FSRS Review: "Acquiesce"',
        expect.objectContaining({
          body: expect.stringContaining('Spelling'),
          data: expect.objectContaining({
            eventType: 'fsrs_word_added',
            quizMode: 'spelling',
          }),
        })
      );
    });

    it('dispatches fsrs_queue_refill notification', async () => {
      await notifyFsrsQueueRefill({ count: 7, quizMode: 'meaningToWord' });

      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Review Queue Refilled',
          message: expect.stringContaining(
            '7 words ready for spaced repetition review in Meaning to Word'
          ),
        })
      );
    });

    it('dispatches quiz_completed notification with accuracy stats', async () => {
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
    });

    it('dispatches daily_goal_reached notification', async () => {
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
    });

    it('dispatches sync_status notification for success and error', async () => {
      await notifySyncStatus({ success: true, count: 12 });
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Cloud Sync Complete',
          message: expect.stringContaining('12 records updated'),
          color: 'teal',
        })
      );

      await notifySyncStatus({ success: false, errorMessage: 'Network offline' });
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Cloud Sync Notice',
          message: 'Network offline',
          color: 'orange',
        })
      );
    });

    it('dispatches word_saved notification for create, update, delete', async () => {
      await notifyWordSaved({ word: 'Eloquent', action: 'created' });
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Word Saved',
          message: '"Eloquent" was added to your vocabulary dictionary.',
        })
      );

      await notifyWordSaved({ word: 'Eloquent', action: 'deleted' });
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Word Deleted',
          color: 'red',
        })
      );
    });

    it('dispatches test notification', async () => {
      await sendTestNotification();
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Notifications Working! 🔔',
        })
      );
    });

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

    it('respects inAppNotificationsEnabled = false', async () => {
      updateNotificationSettings({
        inAppNotificationsEnabled: false,
      });

      await notifyWordSaved({ word: 'Test', action: 'created' });
      expect(notifications.show).not.toHaveBeenCalled();
      expect(mockShowNotification).toHaveBeenCalled();
    });

    it('respects systemNotificationsEnabled = false', async () => {
      updateNotificationSettings({
        systemNotificationsEnabled: false,
      });

      await notifyWordSaved({ word: 'Test', action: 'created' });
      expect(notifications.show).toHaveBeenCalled();
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
  });
});
