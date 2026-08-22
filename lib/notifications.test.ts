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
});
