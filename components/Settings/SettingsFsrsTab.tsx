'use client';

import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  NumberInput,
  Paper,
  RollingNumber,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconBrain,
  IconClock,
  IconDice,
  IconInfoCircle,
  IconRestore,
  IconSparkles,
  IconTarget,
} from '@tabler/icons-react';
import React from 'react';
import type { AppFsrsSettings } from '@/lib/settings';

export interface SettingsFsrsTabProps {
  settings: AppFsrsSettings;
  onChange: (values: Partial<AppFsrsSettings>) => void;
  onResetFsrs: () => void;
}

export function SettingsFsrsTab({ settings, onChange, onResetFsrs }: SettingsFsrsTabProps) {
  const retentionPercent = Math.round(settings.requestRetention * 100);

  return (
    <Stack gap="lg">
      {/* Target Retention Rate */}
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
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm" mb="md">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" color="violet" variant="light">
              <IconTarget size={20} />
            </ThemeIcon>
            <div>
              <Text component="div" fw={700} size="md">
                Target Retention Rate (<RollingNumber value={retentionPercent} suffix="%" />)
              </Text>
              <Text size="xs" c="dimmed">
                The probability of recalling a card when it is scheduled for review
              </Text>
            </div>
          </Group>

          <Badge
            size="md"
            variant="filled"
            color={retentionPercent >= 92 ? 'violet' : retentionPercent >= 88 ? 'teal' : 'orange'}
          >
            <RollingNumber value={retentionPercent} suffix="%" /> Desired Retention
          </Badge>
        </Group>

        <Stack gap="md">
          <Slider
            value={settings.requestRetention}
            onChange={(val) => onChange({ requestRetention: Number(val.toFixed(2)) })}
            min={0.7}
            max={0.97}
            step={0.01}
            color="violet"
            size="md"
            marks={[
              { value: 0.7, label: '70% (Minimal Workload)' },
              { value: 0.85, label: '85%' },
              { value: 0.9, label: '90% (Recommended)' },
              { value: 0.95, label: '95%' },
              { value: 0.97, label: '97% (High Workload)' },
            ]}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="xs">
            <Paper
              withBorder
              p="sm"
              radius="md"
              style={{
                background:
                  retentionPercent >= 90
                    ? 'rgba(139, 92, 246, 0.08)'
                    : 'var(--mantine-color-default-hover)',
              }}
            >
              <Text size="xs" fw={700} c="violet">
                🧠 Retention & Mastery
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Higher retention (90%+) schedules cards sooner to prevent forgetting, ideal for exam
                prep or critical vocabulary.
              </Text>
            </Paper>

            <Paper
              withBorder
              p="sm"
              radius="md"
              style={{
                background:
                  retentionPercent < 90
                    ? 'rgba(20, 184, 166, 0.08)'
                    : 'var(--mantine-color-default-hover)',
              }}
            >
              <Text size="xs" fw={700} c="teal">
                ⚡ Review Efficiency
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Lower retention (80%-88%) significantly stretches review intervals, cutting daily
                review volume by ~30-50%.
              </Text>
            </Paper>
          </SimpleGrid>
        </Stack>
      </Card>

      {/* Advanced FSRS Parameters */}
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
              FSRS Algorithm Tuning
            </Text>
            <Text size="xs" c="dimmed">
              Interval ceilings, fuzzing randomization, and queue scheduling parameters
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          {/* Max Interval */}
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Group gap="xs">
                <IconClock size={16} color="var(--mantine-color-indigo-5)" />
                <Text size="sm" fw={600}>
                  Maximum Interval (Days)
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                The absolute upper limit in days that a card interval can be scheduled
              </Text>
            </div>
            <NumberInput
              value={settings.maximumIntervalDays}
              onChange={(val) => onChange({ maximumIntervalDays: Number(val) || 36500 })}
              min={30}
              max={36500}
              step={30}
              size="xs"
              style={{ width: '100%', maxWidth: 160 }}
            />
          </Group>

          <Divider />

          {/* Enable Fuzz */}
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Group gap="xs">
                <IconDice size={16} color="var(--mantine-color-teal-5)" />
                <Text size="sm" fw={600}>
                  Enable Interval Fuzzing
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Slightly randomizes calculated review intervals to prevent cards from piling up on
                the exact same day
              </Text>
            </div>
            <Switch
              checked={settings.enableFuzz}
              onChange={(e) => onChange({ enableFuzz: e.currentTarget.checked })}
              color="teal"
            />
          </Group>

          <Divider />

          {/* Auto Refill Queue */}
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Group gap="xs">
                <IconSparkles size={16} color="var(--mantine-color-violet-5)" />
                <Text size="sm" fw={600}>
                  Real-Time Due Queue Refill
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Automatically reload due cards every 10 seconds without needing manual page
                refreshes
              </Text>
            </div>
            <Switch
              checked={settings.autoRefillQueue}
              onChange={(e) => onChange({ autoRefillQueue: e.currentTarget.checked })}
              color="violet"
            />
          </Group>
        </Stack>
      </Card>

      {/* Algorithm Architecture Reference */}
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
        <Group justify="space-between" align="center" wrap="wrap" gap="xs" mb="sm">
          <Group gap="xs">
            <ThemeIcon size="md" radius="md" color="blue" variant="light">
              <IconInfoCircle size={18} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              Free Spaced Repetition Scheduler (FSRS-5)
            </Text>
          </Group>

          <Button
            variant="subtle"
            color="red"
            size="xs"
            leftSection={<IconRestore size={14} />}
            onClick={onResetFsrs}
          >
            Reset FSRS Settings
          </Button>
        </Group>

        <Text size="xs" c="dimmed" mb="md">
          This application uses the state-of-the-art TS-FSRS v5 engine, which models memory with
          continuous stability (S) and difficulty (D) vectors for each word across three independent
          testing modes:
        </Text>

        <SimpleGrid cols={{ base: 1, xs: 2, sm: 4 }} spacing="xs">
          <Paper withBorder p="xs" radius="md">
            <Text size="xs" fw={700} c="red">
              1. Again (Fail)
            </Text>
            <Text size="xs" c="dimmed">
              Lapses memory, reduces stability, resets to relearning step.
            </Text>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Text size="xs" fw={700} c="orange">
              2. Hard (Recalled with difficulty)
            </Text>
            <Text size="xs" c="dimmed">
              Increases difficulty rating, gives conservative interval boost.
            </Text>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Text size="xs" fw={700} c="blue">
              3. Good (Standard recall)
            </Text>
            <Text size="xs" c="dimmed">
              Optimal spacing multiplier matching target retention curve.
            </Text>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Text size="xs" fw={700} c="teal">
              4. Easy (Effortless mastery)
            </Text>
            <Text size="xs" c="dimmed">
              Lowers difficulty rating, grants accelerated interval multiplier.
            </Text>
          </Paper>
        </SimpleGrid>
      </Card>
    </Stack>
  );
}
