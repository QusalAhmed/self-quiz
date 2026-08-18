'use client';

import { Badge, Box, Card, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import {
  IconBrain,
  IconCheck,
  IconClock,
  IconFlame,
  IconHistory,
  IconPercentage,
} from '@tabler/icons-react';
import React from 'react';
import type { ReviewLogRecord } from '@/lib/db';

export type ReviewStatsStripProps = {
  reviewLogs: ReviewLogRecord[];
};

export function ReviewStatsStrip({ reviewLogs }: ReviewStatsStripProps) {
  const totalReviews = reviewLogs.length;

  let againCount = 0;
  let hardCount = 0;
  let goodCount = 0;
  let easyCount = 0;
  let totalDurationMs = 0;

  for (const log of reviewLogs) {
    if (log.rating === 'again') {
      againCount += 1;
    } else if (log.rating === 'hard') {
      hardCount += 1;
    } else if (log.rating === 'good') {
      goodCount += 1;
    } else if (log.rating === 'easy') {
      easyCount += 1;
    }
    totalDurationMs += log.durationMs || 0;
  }

  const recallRate =
    totalReviews > 0 ? Math.round(((goodCount + easyCount) / totalReviews) * 100) : 0;
  const avgDurationSec =
    totalReviews > 0 ? (totalDurationMs / totalReviews / 1000).toFixed(1) : '0.0';

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
      {/* 1. Total Reviews */}
      <Paper
        p="md"
        radius="lg"
        className="glass-panel"
        style={{
          border: '1px solid var(--card-border)',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.04em' }}>
              TOTAL REVIEWS
            </Text>
            <Text
              size="xl"
              fw={800}
              style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem', lineHeight: 1.2 }}
            >
              {totalReviews.toLocaleString()}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Immutable review events
            </Text>
          </div>
          <ThemeIcon size="lg" radius="md" variant="light" color="indigo">
            <IconHistory size={20} />
          </ThemeIcon>
        </Group>
      </Paper>

      {/* 2. Recall Accuracy Rate */}
      <Paper
        p="md"
        radius="lg"
        className="glass-panel"
        style={{
          border: '1px solid var(--card-border)',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.04em' }}>
              RECALL ACCURACY
            </Text>
            <Text
              size="xl"
              fw={800}
              c={recallRate >= 90 ? 'teal' : recallRate >= 80 ? 'indigo' : 'yellow'}
              style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem', lineHeight: 1.2 }}
            >
              {recallRate}%
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Good + Easy response share
            </Text>
          </div>
          <ThemeIcon
            size="lg"
            radius="md"
            variant="light"
            color={recallRate >= 90 ? 'teal' : recallRate >= 80 ? 'indigo' : 'yellow'}
          >
            <IconPercentage size={20} />
          </ThemeIcon>
        </Group>
      </Paper>

      {/* 3. Rating Response Counts */}
      <Paper
        p="md"
        radius="lg"
        className="glass-panel"
        style={{
          border: '1px solid var(--card-border)',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.04em' }}>
              RESPONSE RATINGS
            </Text>
            <Group gap={4} mt={4}>
              <Badge size="xs" color="teal" variant="light">
                {easyCount} Easy
              </Badge>
              <Badge size="xs" color="indigo" variant="light">
                {goodCount} Good
              </Badge>
              <Badge size="xs" color="yellow" variant="light">
                {hardCount} Hard
              </Badge>
              <Badge size="xs" color="red" variant="light">
                {againCount} Again
              </Badge>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              {againCount} lapses recorded
            </Text>
          </div>
          <ThemeIcon size="lg" radius="md" variant="light" color="teal">
            <IconCheck size={20} />
          </ThemeIcon>
        </Group>
      </Paper>

      {/* 4. Average Review Speed */}
      <Paper
        p="md"
        radius="lg"
        className="glass-panel"
        style={{
          border: '1px solid var(--card-border)',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.04em' }}>
              AVG SPEED
            </Text>
            <Text
              size="xl"
              fw={800}
              style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem', lineHeight: 1.2 }}
            >
              {avgDurationSec}s
            </Text>
            <Text size="xs" c="dimmed" mt={4}>
              Per flashcard review
            </Text>
          </div>
          <ThemeIcon size="lg" radius="md" variant="light" color="cyan">
            <IconClock size={20} />
          </ThemeIcon>
        </Group>
      </Paper>
    </SimpleGrid>
  );
}
