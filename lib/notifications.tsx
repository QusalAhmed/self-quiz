'use client';

import { notifications, NotificationData } from '@mantine/notifications';
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

/**
 * High-level wrapper around Mantine notifications for consistent
 * styling, icons, and behavior across the app.
 */
export const appNotifications = {
  /**
   * Dedicated notification when due timer or background sync adds cards to the FSRS review queue.
   */
  queueRefill: (count: number) => {
    const wordLabel = count === 1 ? 'word' : 'words';
    notifications.show({
      id: 'fsrs-queue-refill',
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
  },

  success: ({
    title,
    message,
    autoClose = 4000,
    id,
    withCloseButton = true,
  }: AppNotificationOptions) => {
    notifications.show({
      id,
      title,
      message,
      color: 'teal',
      icon: <IconCheck size={18} />,
      autoClose,
      withCloseButton,
      withBorder: true,
    });
  },

  info: ({
    title,
    message,
    autoClose = 4000,
    id,
    withCloseButton = true,
  }: AppNotificationOptions) => {
    notifications.show({
      id,
      title,
      message,
      color: 'indigo',
      icon: <IconInfoCircle size={18} />,
      autoClose,
      withCloseButton,
      withBorder: true,
    });
  },

  warning: ({
    title,
    message,
    autoClose = 5000,
    id,
    withCloseButton = true,
  }: AppNotificationOptions) => {
    notifications.show({
      id,
      title,
      message,
      color: 'orange',
      icon: <IconAlertCircle size={18} />,
      autoClose,
      withCloseButton,
      withBorder: true,
    });
  },

  error: ({
    title,
    message,
    autoClose = 6000,
    id,
    withCloseButton = true,
  }: AppNotificationOptions) => {
    notifications.show({
      id,
      title,
      message,
      color: 'red',
      icon: <IconAlertTriangle size={18} />,
      autoClose,
      withCloseButton,
      withBorder: true,
    });
  },

  show: (data: NotificationData) => {
    notifications.show(data);
  },

  clean: () => {
    notifications.clean();
  },

  hide: (id: string) => {
    notifications.hide(id);
  },
};

export const showQueueRefillNotification = appNotifications.queueRefill;
export const showSuccessNotification = appNotifications.success;
export const showInfoNotification = appNotifications.info;
export const showWarningNotification = appNotifications.warning;
export const showErrorNotification = appNotifications.error;
