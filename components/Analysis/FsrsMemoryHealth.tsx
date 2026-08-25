'use client';

import {
  Badge,
  Box,
  Card,
  Group,
  Paper,
  Progress,
  RollingNumber,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBrain,
  IconClock,
  IconGauge,
  IconHelpCircle,
  IconShieldCheck,
} from '@tabler/icons-react';
import React from 'react';
import type { FsrsMemoryHealthData, SectionStatusInfo } from '@/lib/analysis/types';
import { SectionStatusBadge } from './SectionStatusBadge';

type FsrsMemoryHealthProps = {
  memoryHealth: FsrsMemoryHealthData;
  statusInfo?: SectionStatusInfo;
};

export function FsrsMemoryHealth({ memoryHealth, statusInfo }: FsrsMemoryHealthProps) {
  const {
    avgStabilityDays,
    avgDifficulty,
    avgRetrievability,
    stabilityBuckets,
    difficultyBuckets,
    fragileCardsCount,
    approachingForgettingCount,
    highlyStableCardsCount,
    totalTrackedCards,
  } = memoryHealth;

  const totalCards = Math.max(1, totalTrackedCards);

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                FSRS Memory Diagnostics & Health
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
              <Tooltip
                label="FSRS tracks memory across 3 pillars: Stability (how long memory lasts), Difficulty (inherent card complexity), and Retrievability (current recall probability)."
                multiline
                w={280}
              >
                <Box style={{ display: 'inline-flex', cursor: 'help', opacity: 0.6 }}>
                  <IconHelpCircle size={15} />
                </Box>
              </Tooltip>
            </Group>
            <Text size="xs" c="dimmed">
              Diagnostic overview of Free Spaced Repetition Scheduler (FSRS-4.5) memory parameters.
            </Text>
          </div>

          <Badge variant="gradient" gradient={{ from: 'indigo', to: 'violet', deg: 45 }} size="md">
            FSRS-4.5 Core
          </Badge>
        </Group>

        {/* 3 Core Metric Cards (S, D, R) */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {/* Stability Card */}
          <Paper
            p="md"
            radius="lg"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            }}
          >
            <Group justify="space-between" align="flex-start">
              <div>
                <Group gap={6} align="center">
                  <Text size="xs" fw={700} c="dimmed">
                    AVERAGE STABILITY (S)
                  </Text>
                  <Tooltip label="Average days until retrievability drops to 90%. Higher stability means longer memory retention without reviews.">
                    <Box style={{ display: 'inline-flex', cursor: 'help', opacity: 0.5 }}>
                      <IconHelpCircle size={12} />
                    </Box>
                  </Tooltip>
                </Group>
                <Text
                  component="div"
                  size="xl"
                  fw={800}
                  mt={4}
                  style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem' }}
                >
                  <RollingNumber value={avgStabilityDays} decimalScale={1} />{' '}
                  <Text component="span" size="sm" c="dimmed" fw={500}>
                    days
                  </Text>
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  {avgStabilityDays >= 30
                    ? 'Excellent long-term encoding'
                    : avgStabilityDays >= 14
                      ? 'Solid memory consolidation'
                      : 'Developing initial stability'}
                </Text>
              </div>
              <ThemeIcon color="indigo" variant="light" size="lg" radius="md">
                <IconClock size={20} />
              </ThemeIcon>
            </Group>
          </Paper>

          {/* Difficulty Card */}
          <Paper
            p="md"
            radius="lg"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            }}
          >
            <Group justify="space-between" align="flex-start">
              <div>
                <Group gap={6} align="center">
                  <Text size="xs" fw={700} c="dimmed">
                    AVERAGE DIFFICULTY (D)
                  </Text>
                  <Tooltip label="FSRS card difficulty scale from 1 (easiest) to 10 (hardest).">
                    <Box style={{ display: 'inline-flex', cursor: 'help', opacity: 0.5 }}>
                      <IconHelpCircle size={12} />
                    </Box>
                  </Tooltip>
                </Group>
                <Text
                  component="div"
                  size="xl"
                  fw={800}
                  mt={4}
                  style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem' }}
                >
                  <RollingNumber value={avgDifficulty} decimalScale={1} />{' '}
                  <Text component="span" size="sm" c="dimmed" fw={500}>
                    / 10
                  </Text>
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  {avgDifficulty <= 4.5
                    ? 'Light cognitive load'
                    : avgDifficulty <= 6.8
                      ? 'Balanced complexity'
                      : 'High challenge vocabulary'}
                </Text>
              </div>
              <ThemeIcon color="orange" variant="light" size="lg" radius="md">
                <IconGauge size={20} />
              </ThemeIcon>
            </Group>
          </Paper>

          {/* Retrievability Card */}
          <Paper
            p="md"
            radius="lg"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            }}
          >
            <Group justify="space-between" align="flex-start">
              <div>
                <Group gap={6} align="center">
                  <Text size="xs" fw={700} c="dimmed">
                    CURRENT RETRIEVABILITY (R)
                  </Text>
                  <Tooltip label="Estimated average probability of recalling a card right now based on elapsed time and stability.">
                    <Box style={{ display: 'inline-flex', cursor: 'help', opacity: 0.5 }}>
                      <IconHelpCircle size={12} />
                    </Box>
                  </Tooltip>
                </Group>
                <Text
                  component="div"
                  size="xl"
                  fw={800}
                  mt={4}
                  c="teal.6"
                  style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem' }}
                >
                  <RollingNumber value={avgRetrievability} decimalScale={1} suffix="%" />
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  Target optimal retention: 90%
                </Text>
              </div>
              <ThemeIcon color="teal" variant="light" size="lg" radius="md">
                <IconBrain size={20} />
              </ThemeIcon>
            </Group>
          </Paper>
        </SimpleGrid>

        {/* Distributions & Alert Flags */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {/* Stability Distribution */}
          <Paper
            p="md"
            radius="lg"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="dimmed">
                  STABILITY DISTRIBUTION
                </Text>
                <Text component="div" size="xs" c="dimmed">
                  <RollingNumber value={totalTrackedCards} /> cards
                </Text>
              </Group>

              <Progress.Root size="lg" radius="xl">
                <Progress.Section
                  value={(stabilityBuckets.fragile / totalCards) * 100}
                  color="#ef4444"
                />
                <Progress.Section
                  value={(stabilityBuckets.moderate / totalCards) * 100}
                  color="#f59e0b"
                />
                <Progress.Section
                  value={(stabilityBuckets.strong / totalCards) * 100}
                  color="#6366f1"
                />
                <Progress.Section
                  value={(stabilityBuckets.mature / totalCards) * 100}
                  color="#10b981"
                />
              </Progress.Root>

              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs" mt="xs">
                <Group justify="space-between">
                  <Group gap={6}>
                    <Box style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }} />
                    <Text size="xs" c="dimmed">
                      Fragile (&lt;7d)
                    </Text>
                  </Group>
                  <Text component="div" size="xs" fw={700}>
                    <RollingNumber value={stabilityBuckets.fragile} />
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Group gap={6}>
                    <Box style={{ width: 8, height: 8, borderRadius: 2, background: '#f59e0b' }} />
                    <Text size="xs" c="dimmed">
                      Moderate (7–30d)
                    </Text>
                  </Group>
                  <Text component="div" size="xs" fw={700}>
                    <RollingNumber value={stabilityBuckets.moderate} />
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Group gap={6}>
                    <Box style={{ width: 8, height: 8, borderRadius: 2, background: '#6366f1' }} />
                    <Text size="xs" c="dimmed">
                      Strong (30–90d)
                    </Text>
                  </Group>
                  <Text component="div" size="xs" fw={700}>
                    <RollingNumber value={stabilityBuckets.strong} />
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Group gap={6}>
                    <Box style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981' }} />
                    <Text size="xs" c="dimmed">
                      Mature (&gt;90d)
                    </Text>
                  </Group>
                  <Text component="div" size="xs" fw={700}>
                    <RollingNumber value={stabilityBuckets.mature} />
                  </Text>
                </Group>
              </SimpleGrid>
            </Stack>
          </Paper>

          {/* Difficulty Distribution */}
          <Paper
            p="md"
            radius="lg"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="dimmed">
                  DIFFICULTY DISTRIBUTION
                </Text>
                <Text size="xs" c="dimmed">
                  Scale 1 to 10
                </Text>
              </Group>

              <Progress.Root size="lg" radius="xl">
                <Progress.Section
                  value={(difficultyBuckets.easy / totalCards) * 100}
                  color="#10b981"
                />
                <Progress.Section
                  value={(difficultyBuckets.medium / totalCards) * 100}
                  color="#6366f1"
                />
                <Progress.Section
                  value={(difficultyBuckets.hard / totalCards) * 100}
                  color="#f59e0b"
                />
                <Progress.Section
                  value={(difficultyBuckets.veryHard / totalCards) * 100}
                  color="#ef4444"
                />
              </Progress.Root>

              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs" mt="xs">
                <Group justify="space-between">
                  <Group gap={6}>
                    <Box style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981' }} />
                    <Text size="xs" c="dimmed">
                      Easy (1–3)
                    </Text>
                  </Group>
                  <Text component="div" size="xs" fw={700}>
                    <RollingNumber value={difficultyBuckets.easy} />
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Group gap={6}>
                    <Box style={{ width: 8, height: 8, borderRadius: 2, background: '#6366f1' }} />
                    <Text size="xs" c="dimmed">
                      Medium (4–6)
                    </Text>
                  </Group>
                  <Text component="div" size="xs" fw={700}>
                    <RollingNumber value={difficultyBuckets.medium} />
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Group gap={6}>
                    <Box style={{ width: 8, height: 8, borderRadius: 2, background: '#f59e0b' }} />
                    <Text size="xs" c="dimmed">
                      Hard (7–8)
                    </Text>
                  </Group>
                  <Text component="div" size="xs" fw={700}>
                    <RollingNumber value={difficultyBuckets.hard} />
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Group gap={6}>
                    <Box style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }} />
                    <Text size="xs" c="dimmed">
                      Very Hard (9–10)
                    </Text>
                  </Group>
                  <Text component="div" size="xs" fw={700}>
                    <RollingNumber value={difficultyBuckets.veryHard} />
                  </Text>
                </Group>
              </SimpleGrid>
            </Stack>
          </Paper>
        </SimpleGrid>

        {/* Health Highlights / Alerts */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <Paper
            p="sm"
            radius="md"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderLeft: '4px solid #ef4444',
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed" fw={600}>
                  FRAGILE CARDS (R &lt; 70%)
                </Text>
                <Text
                  component="div"
                  size="lg"
                  fw={800}
                  c={fragileCardsCount > 0 ? 'red.6' : 'teal.6'}
                >
                  <RollingNumber value={fragileCardsCount} suffix=" cards" />
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  Require urgent reinforcement
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper
            p="sm"
            radius="md"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderLeft: '4px solid #f59e0b',
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed" fw={600}>
                  APPROACHING FORGETTING
                </Text>
                <Text
                  component="div"
                  size="lg"
                  fw={800}
                  c={approachingForgettingCount > 0 ? 'yellow.6' : 'teal.6'}
                >
                  <RollingNumber value={approachingForgettingCount} suffix=" cards" />
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  Due in next 24h with low retention
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper
            p="sm"
            radius="md"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderLeft: '4px solid #10b981',
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed" fw={600}>
                  HIGHLY STABLE (S ≥ 30d)
                </Text>
                <Text component="div" size="lg" fw={800} c="teal.6">
                  <RollingNumber value={highlyStableCardsCount} suffix=" cards" />
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  Durable long-term retention
                </Text>
              </div>
              <ThemeIcon color="teal" variant="light" size="md" radius="md">
                <IconShieldCheck size={16} />
              </ThemeIcon>
            </Group>
          </Paper>
        </SimpleGrid>
      </Stack>
    </Card>
  );
}
