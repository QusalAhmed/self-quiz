import { notifications } from '@mantine/notifications';
import {
  appNotifications,
  showErrorNotification,
  showInfoNotification,
  showQueueRefillNotification,
  showSuccessNotification,
  showWarningNotification,
} from './notifications';

jest.mock('@mantine/notifications', () => ({
  notifications: {
    show: jest.fn(),
    clean: jest.fn(),
    hide: jest.fn(),
  },
}));

describe('Notifications helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows queue refill notification for single word with proper phrasing', () => {
    showQueueRefillNotification(1);
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'fsrs-queue-refill',
        title: 'Review Queue Refilled',
        message: '1 new word ready to review',
        color: 'violet',
        autoClose: 4500,
      })
    );
  });

  it('shows queue refill notification for multiple words with proper pluralization', () => {
    showQueueRefillNotification(5);
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'fsrs-queue-refill',
        title: 'Review Queue Refilled',
        message: '5 new words ready to review',
        color: 'violet',
      })
    );
  });

  it('shows success notification with teal color and custom title/message', () => {
    showSuccessNotification({ title: 'Saved', message: 'Word saved successfully' });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Saved',
        message: 'Word saved successfully',
        color: 'teal',
      })
    );
  });

  it('shows info notification with indigo color', () => {
    showInfoNotification({ title: 'Info', message: 'Sync complete' });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Info',
        message: 'Sync complete',
        color: 'indigo',
      })
    );
  });

  it('shows warning notification with orange color', () => {
    showWarningNotification({ title: 'Warning', message: 'Offline mode active' });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Warning',
        message: 'Offline mode active',
        color: 'orange',
      })
    );
  });

  it('shows error notification with red color', () => {
    showErrorNotification({ title: 'Error', message: 'Failed to save' });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        message: 'Failed to save',
        color: 'red',
      })
    );
  });

  it('supports appNotifications.clean and hide', () => {
    appNotifications.clean();
    expect(notifications.clean).toHaveBeenCalled();

    appNotifications.hide('some-id');
    expect(notifications.hide).toHaveBeenCalledWith('some-id');
  });

  describe('Watchdog auto-dismiss for mobile phones', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      appNotifications.clean();
      jest.useRealTimers();
    });

    it('automatically calls notifications.hide via watchdog when autoClose duration expires', () => {
      appNotifications.success({
        id: 'watchdog-test-1',
        title: 'Auto Dismiss Test',
        message: 'Should close automatically on phone',
        autoClose: 3000,
      });

      // Before timeout expires, hide should not have been called
      expect(notifications.hide).not.toHaveBeenCalledWith('watchdog-test-1');

      // Fast forward past autoClose (3000ms) + grace buffer (500ms) = 3500ms
      jest.advanceTimersByTime(3600);

      expect(notifications.hide).toHaveBeenCalledWith('watchdog-test-1');
    });

    it('cancels watchdog timer if appNotifications.hide is manually called before expiry', () => {
      appNotifications.info({
        id: 'watchdog-test-manual',
        title: 'Manual Dismiss Test',
        message: 'Closed manually before timeout',
        autoClose: 4000,
      });

      appNotifications.hide('watchdog-test-manual');
      expect(notifications.hide).toHaveBeenCalledWith('watchdog-test-manual');

      (notifications.hide as jest.Mock).mockClear();

      // Fast forward past the original timeout
      jest.advanceTimersByTime(5000);

      // Should not call hide again because watchdog was cancelled
      expect(notifications.hide).not.toHaveBeenCalledWith('watchdog-test-manual');
    });

    it('cancels all active watchdogs on appNotifications.clean', () => {
      appNotifications.show({
        id: 'watchdog-test-clean-1',
        message: 'Message 1',
        autoClose: 3000,
      });
      appNotifications.show({
        id: 'watchdog-test-clean-2',
        message: 'Message 2',
        autoClose: 4000,
      });

      appNotifications.clean();
      expect(notifications.clean).toHaveBeenCalled();

      (notifications.hide as jest.Mock).mockClear();

      jest.advanceTimersByTime(5000);
      expect(notifications.hide).not.toHaveBeenCalled();
    });

    it('does not schedule a watchdog timer when autoClose is false', () => {
      appNotifications.show({
        id: 'watchdog-test-persistent',
        message: 'Persistent message',
        autoClose: false,
      });

      jest.advanceTimersByTime(10000);
      expect(notifications.hide).not.toHaveBeenCalled();
    });
  });
});
