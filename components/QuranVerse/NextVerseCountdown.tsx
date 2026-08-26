'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Progress,
  RollingNumber,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAdjustments,
  IconClock,
  IconPlayerPause,
  IconPlayerPlay,
  IconRotateClockwise,
} from '@tabler/icons-react';
import Link from 'next/link';
import React from 'react';
import { useQuranVerse } from './QuranVerseProvider';

/**
 * Formats seconds into MM:SS or HH:MM:SS format
 */
export function formatCountdownTime(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return '00:00';
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats seconds into human readable format like "14m 30s" or "45s"
 */
export function formatCountdownHuman(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return 'Due now';
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }
  return parts.join(' ');
}

/**
 * Smooth rolling animated countdown duration display
 */
export function RollingCountdownDisplay({
  totalSeconds,
  format = 'units',
}: {
  totalSeconds: number;
  format?: 'units' | 'digital';
}) {
  if (totalSeconds <= 0) {
    return (
      <Text component="span" inherit>
        Due now
      </Text>
    );
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (format === 'digital') {
    return (
      <Group
        gap={2}
        align="baseline"
        wrap="nowrap"
        style={{ display: 'inline-flex', fontVariantNumeric: 'tabular-nums' }}
      >
        {hours > 0 && (
          <>
            <RollingNumber value={hours} />
            <Text component="span" inherit c="dimmed">
              :
            </Text>
          </>
        )}
        <RollingNumber value={minutes} />
        <Text component="span" inherit c="dimmed">
          :
        </Text>
        <RollingNumber value={seconds} />
      </Group>
    );
  }

  return (
    <Group
      gap={4}
      align="baseline"
      wrap="nowrap"
      style={{ display: 'inline-flex', fontVariantNumeric: 'tabular-nums' }}
    >
      {hours > 0 && <RollingNumber value={hours} suffix="h" />}
      {(minutes > 0 || hours > 0) && <RollingNumber value={minutes} suffix="m" />}
      <RollingNumber value={seconds} suffix="s" />
    </Group>
  );
}

export interface NextVerseCountdownProps {
  variant?: 'pill' | 'banner' | 'card' | 'stat';
  showControls?: boolean;
  onShowRandomNow?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function NextVerseCountdown({
  variant = 'pill',
  showControls = true,
  onShowRandomNow,
  className,
  style,
}: NextVerseCountdownProps) {
  const {
    countdownSeconds,
    isRecurringEnabled,
    recurringIntervalMinutes,
    resetTimer,
    showNextVerseNow,
  } = useQuranVerse();

  const totalCycleSeconds = Math.max(1, recurringIntervalMinutes) * 60;
  const progressPercent = isRecurringEnabled
    ? Math.max(0, Math.min(100, (countdownSeconds / totalCycleSeconds) * 100))
    : 0;

  const handleTriggerNow = () => {
    if (onShowRandomNow) {
      onShowRandomNow();
    } else {
      void showNextVerseNow({ force: true });
    }
  };

  // 1. Stat Card Variant (Ideal for QuranVerseManager Stats Grid)
  if (variant === 'stat') {
    return (
      <Card
        p="md"
        radius="lg"
        withBorder
        className={className}
        style={{
          background: 'var(--card-bg)',
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
        data-testid="next-verse-countdown-stat"
      >
        <Group justify="space-between" align="flex-start">
          <Stack gap={4} style={{ flex: 1 }}>
            <Group gap={6} align="center">
              <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                NEXT POPUP COUNTDOWN
              </Text>
              {isRecurringEnabled && (
                <Badge variant="dot" color="teal" size="xs">
                  {recurringIntervalMinutes}m
                </Badge>
              )}
            </Group>

            <Group gap="xs" align="baseline">
              <Title
                order={2}
                style={{
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  color: isRecurringEnabled
                    ? 'var(--mantine-color-teal-6)'
                    : 'var(--mantine-color-gray-5)',
                }}
              >
                {isRecurringEnabled ? (
                  <RollingCountdownDisplay totalSeconds={countdownSeconds} />
                ) : (
                  'Paused'
                )}
              </Title>
              {isRecurringEnabled && (
                <Text size="xs" c="dimmed">
                  ({formatCountdownTime(countdownSeconds)})
                </Text>
              )}
            </Group>

            {isRecurringEnabled ? (
              <Progress
                value={progressPercent}
                size="xs"
                radius="xl"
                color="teal"
                striped={countdownSeconds < 60}
                animated={countdownSeconds < 60}
                style={{ marginTop: 4, width: '100%' }}
              />
            ) : (
              <Text size="xs" c="dimmed">
                Popups disabled in settings
              </Text>
            )}
          </Stack>

          <Group gap={4}>
            <Tooltip label="Show verse now" position="top">
              <ActionIcon
                size="md"
                radius="md"
                variant="light"
                color="teal"
                onClick={handleTriggerNow}
                aria-label="Show verse now"
              >
                <IconPlayerPlay size={16} />
              </ActionIcon>
            </Tooltip>

            {isRecurringEnabled && (
              <Tooltip label="Reset countdown timer" position="top">
                <ActionIcon
                  size="md"
                  radius="md"
                  variant="subtle"
                  color="gray"
                  onClick={resetTimer}
                  aria-label="Reset countdown timer"
                >
                  <IconRotateClockwise size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>
      </Card>
    );
  }

  // 2. Banner Card Variant (Prominent card on top of Quran page)
  if (variant === 'card' || variant === 'banner') {
    return (
      <Card
        p={{ base: 'md', sm: 'lg' }}
        radius="lg"
        withBorder
        className={className}
        style={{
          background: isRecurringEnabled
            ? 'linear-gradient(135deg, rgba(20, 184, 166, 0.08) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(245, 158, 11, 0.05) 100%)'
            : 'var(--card-bg)',
          borderColor: isRecurringEnabled ? 'rgba(20, 184, 166, 0.25)' : 'var(--card-border)',
          boxShadow: 'var(--card-shadow)',
          ...style,
        }}
        data-testid="next-verse-countdown-banner"
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="md">
            <ThemeIcon
              size={48}
              radius="md"
              variant={isRecurringEnabled ? 'gradient' : 'light'}
              gradient={{ from: 'teal', to: 'indigo', deg: 45 }}
              color={isRecurringEnabled ? undefined : 'gray'}
              style={{
                boxShadow: isRecurringEnabled ? '0 4px 12px rgba(20, 184, 166, 0.25)' : undefined,
              }}
            >
              {isRecurringEnabled ? <IconClock size={24} /> : <IconPlayerPause size={24} />}
            </ThemeIcon>

            <Stack gap={2}>
              <Group gap="xs" align="center" wrap="wrap">
                <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                  NEXT RECURRING VERSE POPUP
                </Text>
                <Badge
                  variant={isRecurringEnabled ? 'filled' : 'light'}
                  color={isRecurringEnabled ? 'teal' : 'gray'}
                  size="sm"
                >
                  {isRecurringEnabled ? `Every ${recurringIntervalMinutes}m` : 'Paused'}
                </Badge>
              </Group>

              <Group gap="xs" align="baseline" wrap="wrap">
                <Title
                  order={3}
                  style={{
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: isRecurringEnabled ? 'var(--mantine-color-teal-6)' : undefined,
                  }}
                >
                  {isRecurringEnabled ? (
                    <Group
                      gap={6}
                      align="baseline"
                      wrap="nowrap"
                      style={{ display: 'inline-flex' }}
                    >
                      <span>Next reflection in</span>
                      <RollingCountdownDisplay totalSeconds={countdownSeconds} />
                    </Group>
                  ) : (
                    'Recurring Popups Disabled'
                  )}
                </Title>
                {isRecurringEnabled && (
                  <Badge variant="light" color="teal" size="sm">
                    {formatCountdownTime(countdownSeconds)}
                  </Badge>
                )}
              </Group>
            </Stack>
          </Group>

          {showControls && (
            <Group gap="xs">
              <Button
                variant="light"
                color="teal"
                size="sm"
                leftSection={<IconPlayerPlay size={16} />}
                onClick={handleTriggerNow}
              >
                Show Now
              </Button>

              {isRecurringEnabled ? (
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconRotateClockwise size={16} />}
                  onClick={resetTimer}
                >
                  Reset Timer
                </Button>
              ) : (
                <Button
                  component={Link}
                  href="/settings?tab=quran"
                  variant="default"
                  size="sm"
                  leftSection={<IconAdjustments size={16} />}
                >
                  Enable in Settings
                </Button>
              )}
            </Group>
          )}
        </Group>

        {isRecurringEnabled && (
          <Progress
            value={progressPercent}
            size={6}
            radius="xl"
            color="teal"
            striped={countdownSeconds < 60}
            animated={countdownSeconds < 60}
            style={{ marginTop: 14 }}
          />
        )}
      </Card>
    );
  }

  // 3. Pill Variant (Default, compact header badge)
  return (
    <Group
      gap="xs"
      align="center"
      className={className}
      style={{ display: 'inline-flex', ...style }}
      data-testid="next-verse-countdown-pill"
    >
      {isRecurringEnabled ? (
        <Tooltip
          label={`Next Quran verse reflection scheduled in ${formatCountdownHuman(countdownSeconds)} (Every ${recurringIntervalMinutes}m)`}
          position="bottom"
          withArrow
        >
          <Badge
            variant="filled"
            color="teal"
            size="md"
            leftSection={<IconClock size={14} style={{ animation: 'spin 12s linear infinite' }} />}
            style={{
              cursor: 'pointer',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              boxShadow: '0 2px 8px rgba(20, 184, 166, 0.25)',
            }}
            onClick={handleTriggerNow}
          >
            <Group gap={4} align="baseline" wrap="nowrap" style={{ display: 'inline-flex' }}>
              <span>Next Verse:</span>
              <RollingCountdownDisplay totalSeconds={countdownSeconds} />
            </Group>
          </Badge>
        </Tooltip>
      ) : (
        <Tooltip label="Recurring popups are paused. Click to open Settings." position="bottom">
          <Badge
            component={Link}
            href="/settings?tab=quran"
            variant="light"
            color="gray"
            size="md"
            leftSection={<IconPlayerPause size={14} />}
            style={{ cursor: 'pointer' }}
          >
            Popups Paused
          </Badge>
        </Tooltip>
      )}

      {showControls && isRecurringEnabled && (
        <Tooltip label="Reset next verse countdown" position="top">
          <ActionIcon
            size="sm"
            variant="subtle"
            color="teal"
            radius="xl"
            onClick={resetTimer}
            aria-label="Reset countdown timer"
          >
            <IconRotateClockwise size={14} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}
