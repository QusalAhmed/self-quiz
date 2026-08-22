'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
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
import { useNotificationSettings } from '@/lib/system-notifications';

export interface NotificationSettingsModalProps {
  opened: boolean;
  onClose: () => void;
}

export function NotificationSettingsModal({ opened, onClose }: NotificationSettingsModalProps) {
  const { settings, permission, isSupported, requestPermission, updateSettings, sendTest } =
    useNotificationSettings();
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
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon size="lg" radius="md" color="violet" variant="light">
            <IconBellRinging size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              System Notification Settings
            </Text>
            <Text size="xs" c="dimmed">
              Configure system push, in-app alerts, sound cues, and FSRS events
            </Text>
          </div>
        </Group>
      }
      size="lg"
      centered
      radius="lg"
      styles={{
        header: {
          borderBottom: '1px solid var(--mantine-color-default-border)',
          paddingBottom: 14,
        },
      }}
    >
      <Stack gap="md" mt="xs">
        {/* Permission Status Card */}
        <Paper
          withBorder
          p="md"
          radius="md"
          style={{ background: 'var(--mantine-color-default-hover)' }}
        >
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <ThemeIcon
                size="md"
                radius="xl"
                color={
                  permission === 'granted' ? 'teal' : permission === 'denied' ? 'red' : 'yellow'
                }
                variant="light"
              >
                {permission === 'granted' ? <IconCheck size={16} /> : <IconAlertCircle size={16} />}
              </ThemeIcon>
              <div>
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    OS Notification Permission
                  </Text>
                  <Badge
                    size="sm"
                    variant="dot"
                    color={
                      permission === 'granted' ? 'teal' : permission === 'denied' ? 'red' : 'yellow'
                    }
                  >
                    {permission === 'granted'
                      ? 'Granted'
                      : permission === 'denied'
                        ? 'Blocked'
                        : 'Action Required'}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  {permission === 'granted'
                    ? 'Desktop and system push notifications are fully active'
                    : permission === 'denied'
                      ? 'Browser notifications are blocked. Enable permissions in browser settings.'
                      : 'Permission has not been requested yet. Click to enable.'}
                </Text>
              </div>
            </Group>

            {permission !== 'granted' && isSupported && (
              <Button
                size="xs"
                variant="filled"
                color="violet"
                loading={isRequesting}
                onClick={handleRequestPermission}
                leftSection={<IconBell size={14} />}
              >
                Enable
              </Button>
            )}
          </Group>

          {!isSupported && (
            <Alert icon={<IconInfoCircle size={16} />} color="orange" mt="xs" title="Not Supported">
              Web Notifications API is not supported in this browser. In-app toasts and audio alerts
              will still work!
            </Alert>
          )}
        </Paper>

        {/* Master Channels */}
        <Card withBorder radius="md" p="md">
          <Text fw={600} size="sm" mb="sm" c="dimmed" tt="uppercase" lts={1}>
            Notification Channels
          </Text>

          <Stack gap="md">
            <Group justify="space-between" align="center">
              <div>
                <Group gap="xs">
                  <IconBell size={16} color="var(--mantine-color-violet-5)" />
                  <Text size="sm" fw={500}>
                    OS / System Notifications
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Show desktop and mobile system notifications when app is active or in background
                </Text>
              </div>
              <Switch
                checked={settings.systemNotificationsEnabled}
                onChange={(e) =>
                  updateSettings({ systemNotificationsEnabled: e.currentTarget.checked })
                }
                color="violet"
              />
            </Group>

            <Divider />

            <Group justify="space-between" align="center">
              <div>
                <Group gap="xs">
                  <IconSparkles size={16} color="var(--mantine-color-teal-5)" />
                  <Text size="sm" fw={500}>
                    In-App Toast Alerts
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Display subtle, elegant popups within the application interface
                </Text>
              </div>
              <Switch
                checked={settings.inAppNotificationsEnabled}
                onChange={(e) =>
                  updateSettings({ inAppNotificationsEnabled: e.currentTarget.checked })
                }
                color="teal"
              />
            </Group>

            <Divider />

            <Group justify="space-between" align="center">
              <div>
                <Group gap="xs">
                  <IconVolume size={16} color="var(--mantine-color-blue-5)" />
                  <Text size="sm" fw={500}>
                    Notification Sound Chime
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Play a warm, crystal acoustic chime when notifications trigger
                </Text>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onChange={(e) => updateSettings({ soundEnabled: e.currentTarget.checked })}
                color="blue"
              />
            </Group>
          </Stack>
        </Card>

        {/* Event Subscriptions */}
        <Card withBorder radius="md" p="md">
          <Text fw={600} size="sm" mb="sm" c="dimmed" tt="uppercase" lts={1}>
            Event Triggers & FSRS Quiz Modes
          </Text>

          <Stack gap="md">
            {/* FSRS Word Added */}
            <Group justify="space-between" align="center">
              <div>
                <Group gap="xs">
                  <IconBrain size={16} color="var(--mantine-color-violet-5)" />
                  <Text size="sm" fw={500}>
                    FSRS Review: Word Enrolled
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Notify when a new word is added to FSRS review across quiz modes (Word to Meaning,
                  Meaning to Word, Spelling)
                </Text>
              </div>
              <Switch
                checked={settings.eventSubscriptions.fsrsWordAdded}
                onChange={(e) =>
                  updateSettings({
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

            {/* FSRS Queue Refilled */}
            <Group justify="space-between" align="center">
              <div>
                <Group gap="xs">
                  <IconClock size={16} color="var(--mantine-color-indigo-5)" />
                  <Text size="sm" fw={500}>
                    FSRS Due Cards & Queue Refill
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Notify when review intervals lapse and cards become due for spaced practice
                </Text>
              </div>
              <Switch
                checked={settings.eventSubscriptions.fsrsQueueRefill}
                onChange={(e) =>
                  updateSettings({
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

            {/* Quiz & Review Session Completed */}
            <Group justify="space-between" align="center">
              <div>
                <Group gap="xs">
                  <IconTrophy size={16} color="var(--mantine-color-yellow-5)" />
                  <Text size="sm" fw={500}>
                    Quiz & Review Session Complete
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Notify with summary stats when you complete a quiz or FSRS review deck
                </Text>
              </div>
              <Switch
                checked={settings.eventSubscriptions.quizCompleted}
                onChange={(e) =>
                  updateSettings({
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

            {/* Daily Practice & Streak */}
            <Group justify="space-between" align="center">
              <div>
                <Group gap="xs">
                  <IconFlame size={16} color="var(--mantine-color-orange-5)" />
                  <Text size="sm" fw={500}>
                    Daily Goals & Streak Milestones
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Celebrate when daily study duration or streak targets are achieved
                </Text>
              </div>
              <Switch
                checked={settings.eventSubscriptions.dailyGoal}
                onChange={(e) =>
                  updateSettings({
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

            {/* Cloud Sync Status */}
            <Group justify="space-between" align="center">
              <div>
                <Group gap="xs">
                  <IconCloudCheck size={16} color="var(--mantine-color-teal-5)" />
                  <Text size="sm" fw={500}>
                    Cloud Sync & Replication
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Notify when changes are synced with Supabase or offline backup status changes
                </Text>
              </div>
              <Switch
                checked={settings.eventSubscriptions.syncStatus}
                onChange={(e) =>
                  updateSettings({
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

            {/* Word Library Modifications */}
            <Group justify="space-between" align="center">
              <div>
                <Group gap="xs">
                  <IconWriting size={16} color="var(--mantine-color-cyan-5)" />
                  <Text size="sm" fw={500}>
                    Vocabulary Word Updates
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Notify when words are created, edited, or deleted in the vocabulary library
                </Text>
              </div>
              <Switch
                checked={settings.eventSubscriptions.wordSaved}
                onChange={(e) =>
                  updateSettings({
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

        {/* Footer Actions */}
        <Group justify="space-between" mt="sm">
          <Button
            variant="light"
            color="violet"
            leftSection={<IconSparkles size={16} />}
            loading={isTesting}
            onClick={handleSendTest}
          >
            Send Test Notification
          </Button>

          <Button variant="default" onClick={onClose}>
            Done
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
