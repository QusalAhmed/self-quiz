'use client';

import { ActionIcon, Indicator, Tooltip } from '@mantine/core';
import { IconBell, IconBellRinging } from '@tabler/icons-react';
import React, { useState } from 'react';
import { useNotificationSettings } from '@/lib/system-notifications';
import { NotificationSettingsModal } from './NotificationSettingsModal';

export interface NotificationBellButtonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'subtle' | 'light' | 'default' | 'filled';
}

export function NotificationBellButton({
  size = 'lg',
  variant = 'default',
}: NotificationBellButtonProps) {
  const [modalOpened, setModalOpened] = useState(false);
  const { settings, permission } = useNotificationSettings();

  const isEnabled = settings.systemNotificationsEnabled || settings.inAppNotificationsEnabled;
  const isGranted = permission === 'granted';

  return (
    <>
      <Tooltip label="Notification Settings" withArrow position="bottom">
        <Indicator
          inline
          size={9}
          offset={4}
          color={isGranted ? 'teal' : permission === 'denied' ? 'red' : 'yellow'}
          disabled={!isEnabled}
          processing={isGranted}
        >
          <ActionIcon
            onClick={() => setModalOpened(true)}
            size={size}
            variant={variant}
            color="violet"
            radius="md"
            aria-label="Open notification settings"
          >
            {isEnabled ? <IconBellRinging size={18} /> : <IconBell size={18} />}
          </ActionIcon>
        </Indicator>
      </Tooltip>

      <NotificationSettingsModal opened={modalOpened} onClose={() => setModalOpened(false)} />
    </>
  );
}
