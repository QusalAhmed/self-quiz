'use client';

import {
  Badge,
  Box,
  Card,
  Group,
  Paper,
  Progress,
  RingProgress,
  RollingNumber,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconHelpCircle,
  IconMoodHappy,
  IconMoodSmile,
  IconClock,
  IconX,
} from '@tabler/icons-react';
import React from 'react';
import type { RatingDistribution, SectionStatusInfo } from '@/lib/analysis/types';
import { SectionStatusBadge } from './SectionStatusBadge';

type RetentionAnalysisProps = {
  distribution: RatingDistribution;
  statusInfo?: SectionStatusInfo;
};

export function RetentionAnalysis({ distribution, statusInfo }: RetentionAnalysisProps) {
  const {
    againCount,
    hardCount,
    goodCount,
    easyCount,
    totalRatings,
    againRate,
    hardRate,
    goodRate,
    easyRate,
    successfulRecallRate,
  } = distribution;

  const ratingItems = [
    {
      label: 'Easy',
      count: easyCount,
      rate: easyRate,
      color: '#10b981',
      badgeColor: 'teal',
      icon: IconMoodHappy,
      description: 'Instant recall with maximum confidence.',
      effect: 'Greatly increases memory stability & review interval.',
    },
    {
      label: 'Good',
      count: goodCount,
      rate: goodRate,
      color: '#6366f1',
      badgeColor: 'indigo',
      icon: IconMoodSmile,
      description: 'Successful recall with normal effort.',
      effect: 'Steadily builds stability and expands interval.',
    },
    {
      label: 'Hard',
      count: hardCount,
      rate: hardRate,
      color: '#f59e0b',
      badgeColor: 'yellow',
      icon: IconClock,
      description: 'Recalled with hesitation or significant effort.',
      effect: 'Increases difficulty slightly and limits interval growth.',
    },
    {
      label: 'Again',
      count: againCount,
      rate: againRate,
      color: '#ef4444',
      badgeColor: 'red',
      icon: IconX,
      description: 'Could not recall the word meaning correctly.',
      effect: 'Marks a memory lapse and enters relearning steps.',
    },
  ];

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Section Header */}
        <Group justify="space-between" align="center">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Memory Retention & Response Quality
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
              <Tooltip
                label="Measures how reliably you recall vocabulary words upon review. 90%+ is the gold standard for long-term mastery."
                multiline
                w={240}
              >
                <Box style={{ display: 'inline-flex', cursor: 'help', opacity: 0.6 }}>
                  <IconHelpCircle size={15} />
                </Box>
              </Tooltip>
            </Group>
            <Text size="xs" c="dimmed">
              Breakdown of your review responses across Again, Hard, Good, and Easy ratings.
            </Text>
          </div>

          <Badge
            size="md"
            variant="light"
            color={
              successfulRecallRate >= 88 ? 'teal' : successfulRecallRate >= 75 ? 'indigo' : 'red'
            }
          >
            <RollingNumber value={totalRatings} /> total ratings
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Left Column: Retention Ring Gauge */}
          <Paper
            p="md"
            radius="lg"
            style={{
              background: 'rgba(99, 102, 241, 0.04)',
              border: '1px solid var(--card-border)',
              textAlign: 'center',
            }}
          >
            <Stack align="center" gap="xs">
              <RingProgress
                size={160}
                thickness={14}
                roundCaps
                sections={[
                  { value: easyRate, color: '#10b981', tooltip: `Easy: ${easyRate}%` },
                  { value: goodRate, color: '#6366f1', tooltip: `Good: ${goodRate}%` },
                  { value: hardRate, color: '#f59e0b', tooltip: `Hard: ${hardRate}%` },
                  { value: againRate, color: '#ef4444', tooltip: `Again: ${againRate}%` },
                ]}
                label={
                  <Stack gap={0} align="center">
                    <Text
                      size="xl"
                      fw={800}
                      style={{
                        fontFamily: 'var(--font-title)',
                        fontSize: '1.75rem',
                        lineHeight: 1,
                      }}
                    >
                      <RollingNumber value={successfulRecallRate} suffix="%" />
                    </Text>
                    <Text size="xs" c="dimmed" fw={600} style={{ fontSize: '0.68rem' }}>
                      RECALL RATE
                    </Text>
                  </Stack>
                }
              />

              <div>
                <Text size="sm" fw={700}>
                  {successfulRecallRate >= 90
                    ? 'Optimal Memory Retention'
                    : successfulRecallRate >= 80
                      ? 'Solid Learning Pace'
                      : totalRatings > 0
                        ? 'Needs Consolidation'
                        : 'Awaiting Reviews'}
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  <RollingNumber value={goodCount + easyCount} /> of{' '}
                  <RollingNumber value={totalRatings} /> reviews successfully retrieved
                </Text>
              </div>
            </Stack>
          </Paper>

          {/* Right Column: Multi-segment Progress Bar & Rating Cards */}
          <Stack gap="sm">
            {/* Stacked Progress Bar */}
            <Box mb="xs">
              <Group justify="space-between" mb={4}>
                <Text size="xs" fw={700} c="dimmed">
                  RATING DISTRIBUTION
                </Text>
                <Text size="xs" c="dimmed">
                  {totalRatings > 0 ? (
                    <>
                      <RollingNumber value={totalRatings} /> responses
                    </>
                  ) : (
                    'No reviews in period'
                  )}
                </Text>
              </Group>
              <Progress.Root size="xl" radius="xl">
                <Progress.Section value={easyRate} color="#10b981" striped={easyRate > 0} animated>
                  <Progress.Label>{easyRate > 8 ? `${easyRate}%` : ''}</Progress.Label>
                </Progress.Section>
                <Progress.Section value={goodRate} color="#6366f1">
                  <Progress.Label>{goodRate > 8 ? `${goodRate}%` : ''}</Progress.Label>
                </Progress.Section>
                <Progress.Section value={hardRate} color="#f59e0b">
                  <Progress.Label>{hardRate > 8 ? `${hardRate}%` : ''}</Progress.Label>
                </Progress.Section>
                <Progress.Section value={againRate} color="#ef4444">
                  <Progress.Label>{againRate > 8 ? `${againRate}%` : ''}</Progress.Label>
                </Progress.Section>
              </Progress.Root>
            </Box>

            {/* Individual Rating Cards Grid */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              {ratingItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Paper
                    key={item.label}
                    p="xs"
                    radius="md"
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      borderLeft: `3px solid ${item.color}`,
                    }}
                  >
                    <Group justify="space-between" align="center" mb={4}>
                      <Group gap="xs" align="center">
                        <Icon size={16} style={{ color: item.color }} />
                        <Text size="xs" fw={700}>
                          {item.label}
                        </Text>
                      </Group>
                      <Group gap={4} align="baseline">
                        <Text size="sm" fw={800} style={{ color: item.color }}>
                          <RollingNumber value={item.rate} decimalScale={1} suffix="%" />
                        </Text>
                        <Text size="xs" c="dimmed">
                          (<RollingNumber value={item.count} />)
                        </Text>
                      </Group>
                    </Group>
                    <Text size="xs" c="dimmed" lineClamp={1} style={{ fontSize: '0.72rem' }}>
                      {item.description}
                    </Text>
                  </Paper>
                );
              })}
            </SimpleGrid>
          </Stack>
        </SimpleGrid>
      </Stack>
    </Card>
  );
}
