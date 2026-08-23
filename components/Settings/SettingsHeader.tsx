'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAdjustmentsHorizontal,
  IconArrowLeft,
  IconCheck,
  IconDeviceFloppy,
  IconRotateClockwise,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import type { AppSettings } from '@/lib/settings';

export interface SettingsHeaderProps {
  settings: AppSettings;
  onResetAll: () => void;
}

export function SettingsHeader({ settings, onResetAll }: SettingsHeaderProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleExportSettings = () => {
    try {
      const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(settings, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `self-quiz-settings-${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to export settings:', err);
    }
  };

  return (
    <Paper
      className="glass-panel"
      p={{ base: 'md', sm: 'lg' }}
      radius="lg"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow accent */}
      <Box
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'var(--primary-glow)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Group gap="sm" align="center" style={{ flex: '1 1 280px', minWidth: 0 }}>
            <Tooltip label="Back to Dashboard">
              <ActionIcon
                variant="light"
                color="indigo"
                size="md"
                radius="md"
                onClick={() => router.push('/')}
                aria-label="Back to Dashboard"
              >
                <IconArrowLeft size={18} />
              </ActionIcon>
            </Tooltip>

            <ThemeIcon
              size={40}
              radius="md"
              variant="gradient"
              gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
              style={{ boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)', flexShrink: 0 }}
            >
              <IconAdjustmentsHorizontal size={20} />
            </ThemeIcon>

            <div style={{ minWidth: 0, flex: 1 }}>
              <Group gap="xs" align="center" wrap="wrap">
                <Title
                  order={2}
                  style={{
                    fontSize: 'clamp(1.15rem, 3.5vw, 1.45rem)',
                    lineHeight: 1.2,
                  }}
                >
                  <span className="text-gradient">Application Settings</span>
                </Title>
                <Badge variant="light" color="indigo" size="xs" radius="sm">
                  Personal Preferences
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mt={2} style={{ wordBreak: 'break-word' }}>
                Customize appearance, quiz algorithms, voice audio, AI models, and data
                synchronization
              </Text>
            </div>
          </Group>

          <Group gap="xs" wrap="wrap" style={{ alignSelf: 'flex-start' }}>
            <Tooltip label="Export configuration file (JSON)">
              <Button
                variant="subtle"
                color="indigo"
                size="xs"
                radius="md"
                leftSection={copied ? <IconCheck size={14} /> : <IconDeviceFloppy size={14} />}
                onClick={handleExportSettings}
              >
                {copied ? 'Exported!' : 'Export Config'}
              </Button>
            </Tooltip>

            <Tooltip label="Reset all preferences to factory defaults">
              <Button
                variant="light"
                color="red"
                size="xs"
                radius="md"
                leftSection={<IconRotateClockwise size={14} />}
                onClick={onResetAll}
              >
                Reset All Defaults
              </Button>
            </Tooltip>
          </Group>
        </Group>

        {/* Quick Highlights Summary Bar */}
        <Group gap="xs" wrap="wrap">
          <Badge size="xs" variant="dot" color="indigo">
            Theme: {settings.appearance.colorScheme.toUpperCase()}
          </Badge>
          <Badge size="xs" variant="dot" color="violet">
            Retention: {(settings.fsrs.requestRetention * 100).toFixed(0)}%
          </Badge>
          <Badge size="xs" variant="dot" color="teal">
            AI Provider: {settings.ai.preferredProvider.toUpperCase()}
          </Badge>
          <Badge size="xs" variant="dot" color="blue">
            Audio: {settings.audio.reviewSoundEffectsEnabled ? 'Active' : 'Muted'}
          </Badge>
          <Badge size="xs" variant="dot" color="orange">
            Notifications:{' '}
            {settings.notifications.systemNotificationsEnabled ? 'Push Enabled' : 'In-App Only'}
          </Badge>
        </Group>
      </Stack>
    </Paper>
  );
}
