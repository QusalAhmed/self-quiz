'use client';

import { Badge, Group, Paper, RollingNumber, SimpleGrid, Text, ThemeIcon } from '@mantine/core';
import { IconCheck, IconClock, IconHistory, IconPercentage } from '@tabler/icons-react';
import React from 'react';
import type { ReviewLogRecord } from '@/lib/db';

export type ReviewStatsStripProps = {
  reviewLogs: ReviewLogRecord[];
};

export const ReviewStatsStrip = React.memo(function ReviewStatsStrip({
  reviewLogs,
}: ReviewStatsStripProps) {
  const { totalReviews, againCount, hardCount, goodCount, easyCount, recallRate, avgDurationSec } =
    React.useMemo(() => {
      const total = reviewLogs.length;
      let again = 0;
      let hard = 0;
      let good = 0;
      let easy = 0;
      let duration = 0;

      for (const log of reviewLogs) {
        if (log.rating === 'again') {
          again += 1;
        } else if (log.rating === 'hard') {
          hard += 1;
        } else if (log.rating === 'good') {
          good += 1;
        } else if (log.rating === 'easy') {
          easy += 1;
        }
        duration += log.durationMs || 0;
      }

      const recall = total > 0 ? Math.round(((good + easy) / total) * 100) : 0;
      const avgSec = total > 0 ? Number((duration / total / 1000).toFixed(1)) : 0;

      return {
        totalReviews: total,
        againCount: again,
        hardCount: hard,
        goodCount: good,
        easyCount: easy,
        recallRate: recall,
        avgDurationSec: avgSec,
      };
    }, [reviewLogs]);

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
              component="div"
              size="xl"
              fw={800}
              style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem', lineHeight: 1.2 }}
            >
              <RollingNumber value={totalReviews} thousandSeparator />
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
              component="div"
              size="xl"
              fw={800}
              c={recallRate >= 90 ? 'teal' : recallRate >= 80 ? 'indigo' : 'yellow'}
              style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem', lineHeight: 1.2 }}
            >
              <RollingNumber value={recallRate} suffix="%" />
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
              {againCount} {againCount === 1 ? 'lapse' : 'lapses'} recorded
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
              component="div"
              size="xl"
              fw={800}
              style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem', lineHeight: 1.2 }}
            >
              <RollingNumber value={avgDurationSec} decimalScale={1} suffix="s" />
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
});
