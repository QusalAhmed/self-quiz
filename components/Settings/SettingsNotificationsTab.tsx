'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  Stack,
  Switch,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconBell,
  IconBellRinging,
  IconBrain,
  IconCheck,
  IconClock,
  IconCloudCheck,
  IconFlame,
  IconInfoCircle,
  IconSparkles,
  IconTrophy,
  IconVolume,
  IconWriting,
} from '@tabler/icons-react';
import React, { useState } from 'react';
import { type NotificationSettings, useNotificationSettings } from '@/lib/system-notifications';

export interface SettingsNotificationsTabProps {
  settings: NotificationSettings;
  onChange: (values: Partial<NotificationSettings>) => void;
}

export function SettingsNotificationsTab({ settings, onChange }: SettingsNotificationsTabProps) {
  const { permission, isSupported, requestPermission, sendTest } = useNotificationSettings();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      await requestPermission();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSendTest = async () => {
    setIsTesting(true);
    try {
      await sendTest();
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Stack gap="lg">
      {/* OS Permission Card */}
      <Paper
        withBorder
        p={{ base: 'md', sm: 'lg' }}
        radius="md"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="sm">
            <ThemeIcon
              size="lg"
              radius="xl"
              color={permission === 'granted' ? 'teal' : permission === 'denied' ? 'red' : 'yellow'}
              variant="light"
            >
              {permission === 'granted' ? <IconCheck size={20} /> : <IconAlertCircle size={20} />}
            </ThemeIcon>
            <div>
              <Group gap="xs" align="center">
                <Text size="sm" fw={700}>
                  Operating System Push Permission
                </Text>
                <Badge
                  size="sm"
                  variant="dot"
                  color={
                    permission === 'granted' ? 'teal' : permission === 'denied' ? 'red' : 'yellow'
                  }
                >
                  {permission === 'granted'
                    ? 'Granted & Active'
                    : permission === 'denied'
                      ? 'Blocked by Browser'
                      : 'Action Required'}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {permission === 'granted'
                  ? 'Desktop push notifications and background study alerts are active.'
                  : permission === 'denied'
                    ? 'Browser notifications are blocked. Enable permissions in your site URL bar settings.'
                    : 'Click Enable to allow reminders when spaced repetition cards become due.'}
              </Text>
            </div>
          </Group>

          <Group gap="xs">
            {permission !== 'granted' && isSupported && (
              <Button
                size="xs"
                variant="filled"
                color="violet"
                loading={isRequesting}
                onClick={handleRequestPermission}
                leftSection={<IconBell size={14} />}
              >
                Enable Notifications
              </Button>
            )}

            <Button
              size="xs"
              variant="light"
              color="violet"
              loading={isTesting}
              onClick={handleSendTest}
              leftSection={<IconSparkles size={14} />}
            >
              Send Test Notification
            </Button>
          </Group>
        </Group>

        {!isSupported && (
          <Alert icon={<IconInfoCircle size={16} />} color="orange" mt="sm" title="Not Supported">
            Web Notifications API is not supported in this browser. In-app popups and audio chimes
            will continue to function properly.
          </Alert>
        )}
      </Paper>

      {/* Master Delivery Channels */}
      <Card
        withBorder
        radius="md"
        p={{ base: 'md', sm: 'lg' }}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <Group gap="sm" mb="md">
          <ThemeIcon size="lg" radius="md" color="violet" variant="light">
            <IconBellRinging size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Notification Delivery Channels
            </Text>
            <Text size="xs" c="dimmed">
              Choose how you want study reminders and milestone celebrations delivered
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          <Group justify="space-between" align="center">
            <div>
              <Group gap="xs">
                <IconBell size={16} color="var(--mantine-color-violet-5)" />
                <Text size="sm" fw={600}>
                  OS / System Desktop Notifications
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Show native OS toast banners even when the tab is running in the background
              </Text>
            </div>
            <Switch
              checked={settings.systemNotificationsEnabled}
              onChange={(e) => onChange({ systemNotificationsEnabled: e.currentTarget.checked })}
              color="violet"
            />
          </Group>

          <Divider />

          <Group justify="space-between" align="center">
            <div>
              <Group gap="xs">
                <IconSparkles size={16} color="var(--mantine-color-teal-5)" />
                <Text size="sm" fw={600}>
                  In-App Popup Alerts
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Display modern glassmorphism toast banners inside the application view
              </Text>
            </div>
            <Switch
              checked={settings.inAppNotificationsEnabled}
              onChange={(e) => onChange({ inAppNotificationsEnabled: e.currentTarget.checked })}
              color="teal"
            />
          </Group>

          <Divider />

          <Group justify="space-between" align="center">
            <div>
              <Group gap="xs">
                <IconVolume size={16} color="var(--mantine-color-blue-5)" />
                <Text size="sm" fw={600}>
                  Notification Audio Chime
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Play an acoustic crystal chime whenever an alert fires
              </Text>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onChange={(e) => onChange({ soundEnabled: e.currentTarget.checked })}
              color="blue"
            />
          </Group>
        </Stack>
      </Card>

      {/* Event Subscriptions */}
      <Card
        withBorder
        radius="md"
        p={{ base: 'md', sm: 'lg' }}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <Group gap="sm" mb="md">
          <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
            <IconBrain size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Granular Event Subscriptions
            </Text>
            <Text size="xs" c="dimmed">
              Select specific learning activities that should trigger alerts
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          {/* FSRS Word Added */}
          <Group justify="space-between" align="center">
            <div>
              <Group gap="xs">
                <IconBrain size={16} color="var(--mantine-color-violet-5)" />
                <Text size="sm" fw={600}>
                  FSRS Review: Word Enrolled
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Notify when a new word is enrolled in FSRS spaced repetition
              </Text>
            </div>
            <Switch
              checked={settings.eventSubscriptions.fsrsWordAdded}
              onChange={(e) =>
                onChange({
                  eventSubscriptions: {
                    ...settings.eventSubscriptions,
                    fsrsWordAdded: e.currentTarget.checked,
                  },
                })
              }
              color="violet"
            />
          </Group>

          <Divider />

          {/* FSRS Queue Refill */}
          <Group justify="space-between" align="center">
            <div>
              <Group gap="xs">
                <IconClock size={16} color="var(--mantine-color-indigo-5)" />
                <Text size="sm" fw={600}>
                  FSRS Due Cards & Queue Refill
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Notify when scheduled intervals lapse and review cards become due
              </Text>
            </div>
            <Switch
              checked={settings.eventSubscriptions.fsrsQueueRefill}
              onChange={(e) =>
                onChange({
                  eventSubscriptions: {
                    ...settings.eventSubscriptions,
                    fsrsQueueRefill: e.currentTarget.checked,
                  },
                })
              }
              color="indigo"
            />
          </Group>

          <Divider />

          {/* Quiz Completed */}
          <Group justify="space-between" align="center">
            <div>
              <Group gap="xs">
                <IconTrophy size={16} color="var(--mantine-color-yellow-5)" />
                <Text size="sm" fw={600}>
                  Quiz Session Completed
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Notify with score summaries upon finishing flashcard or review decks
              </Text>
            </div>
            <Switch
              checked={settings.eventSubscriptions.quizCompleted}
              onChange={(e) =>
                onChange({
                  eventSubscriptions: {
                    ...settings.eventSubscriptions,
                    quizCompleted: e.currentTarget.checked,
                  },
                })
              }
              color="yellow"
            />
          </Group>

          <Divider />

          {/* Daily Goals */}
          <Group justify="space-between" align="center">
            <div>
              <Group gap="xs">
                <IconFlame size={16} color="var(--mantine-color-orange-5)" />
                <Text size="sm" fw={600}>
                  Daily Study Milestones & Streaks
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Celebrate when daily study goals and consecutive practice streaks are hit
              </Text>
            </div>
            <Switch
              checked={settings.eventSubscriptions.dailyGoal}
              onChange={(e) =>
                onChange({
                  eventSubscriptions: {
                    ...settings.eventSubscriptions,
                    dailyGoal: e.currentTarget.checked,
                  },
                })
              }
              color="orange"
            />
          </Group>

          <Divider />

          {/* Cloud Sync */}
          <Group justify="space-between" align="center">
            <div>
              <Group gap="xs">
                <IconCloudCheck size={16} color="var(--mantine-color-teal-5)" />
                <Text size="sm" fw={600}>
                  Cloud Sync & Replication
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Notify when data is synchronized with Supabase or offline backup status changes
              </Text>
            </div>
            <Switch
              checked={settings.eventSubscriptions.syncStatus}
              onChange={(e) =>
                onChange({
                  eventSubscriptions: {
                    ...settings.eventSubscriptions,
                    syncStatus: e.currentTarget.checked,
                  },
                })
              }
              color="teal"
            />
          </Group>

          <Divider />

          {/* Word Saved */}
          <Group justify="space-between" align="center">
            <div>
              <Group gap="xs">
                <IconWriting size={16} color="var(--mantine-color-cyan-5)" />
                <Text size="sm" fw={600}>
                  Dictionary Word Updates
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Notify when words are created, edited, or deleted in the vocabulary library
              </Text>
            </div>
            <Switch
              checked={settings.eventSubscriptions.wordSaved}
              onChange={(e) =>
                onChange({
                  eventSubscriptions: {
                    ...settings.eventSubscriptions,
                    wordSaved: e.currentTarget.checked,
                  },
                })
              }
              color="cyan"
            />
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
