'use client';

import {
  Badge,
  Box,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBolt,
  IconCheck,
  IconClock,
  IconHelpCircle,
  IconSparkles,
  IconTrophy,
} from '@tabler/icons-react';
import React from 'react';
import type { SectionStatusInfo, StudyEfficiencyData } from '@/lib/analysis/types';
import { SectionStatusBadge } from './SectionStatusBadge';

type StudyEfficiencyProps = {
  efficiency: StudyEfficiencyData;
  statusInfo?: SectionStatusInfo;
};

export function StudyEfficiency({ efficiency, statusInfo }: StudyEfficiencyProps) {
  const {
    reviewsPerMinute,
    avgReviewDurationSec,
    successfulReviewsPerMinute,
    reviewsPerMasteredWord,
    studyMinutesPerMasteredWord,
    wordsMasteredPerHour,
  } = efficiency;

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Study Efficiency & Time Economics
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
              <Tooltip
                label="Evaluates how efficiently your study time translates into memory consolidation and mastered vocabulary."
                multiline
                w={240}
              >
                <Box style={{ display: 'inline-flex', cursor: 'help', opacity: 0.6 }}>
                  <IconHelpCircle size={15} />
                </Box>
              </Tooltip>
            </Group>
            <Text size="xs" c="dimmed">
              Time investment per card, review throughput, and study time required per mastered word.
            </Text>
          </div>
        </Group>

        {/* Efficiency Grid */}
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 6 }} spacing="sm">
          {/* Reviews Per Minute */}
          <Paper
            p="md"
            radius="lg"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Stack gap={2}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed" fw={600}>
                  REVIEW SPEED
                </Text>
                <IconBolt size={18} style={{ color: '#6366f1', opacity: 0.6 }} />
              </Group>
              <Text
                size="xl"
                fw={800}
                style={{ fontFamily: 'var(--font-title)', color: '#6366f1' }}
              >
                {reviewsPerMinute}{' '}
                <Text component="span" size="xs" c="dimmed">
                  cards/min
                </Text>
              </Text>
              <Text size="xs" c="dimmed">
                Throughput rate
              </Text>
            </Stack>
          </Paper>

          {/* Average Duration per Card */}
          <Paper
            p="md"
            radius="lg"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Stack gap={2}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed" fw={600}>
                  AVG CARD TIME
                </Text>
                <IconClock size={18} style={{ color: '#06b6d4', opacity: 0.6 }} />
              </Group>
              <Text
                size="xl"
                fw={800}
                style={{ fontFamily: 'var(--font-title)', color: '#06b6d4' }}
              >
                {avgReviewDurationSec}{' '}
                <Text component="span" size="xs" c="dimmed">
                  sec
                </Text>
              </Text>
              <Text size="xs" c="dimmed">
                Per flashcard review
              </Text>
            </Stack>
          </Paper>

          {/* Successful Reviews / Min */}
          <Paper
            p="md"
            radius="lg"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Stack gap={2}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed" fw={600}>
                  RECALL SPEED
                </Text>
                <IconCheck size={18} style={{ color: '#10b981', opacity: 0.6 }} />
              </Group>
              <Text
                size="xl"
                fw={800}
                style={{ fontFamily: 'var(--font-title)', color: '#10b981' }}
              >
                {successfulReviewsPerMinute}{' '}
                <Text component="span" size="xs" c="dimmed">
                  good/min
                </Text>
              </Text>
              <Text size="xs" c="dimmed">
                Effective recall rate
              </Text>
            </Stack>
          </Paper>

          {/* Mastered Words / Hour */}
          <Paper
            p="md"
            radius="lg"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Stack gap={2}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed" fw={600}>
                  WORDS / HOUR
                </Text>
                <IconTrophy size={18} style={{ color: '#10b981', opacity: 0.6 }} />
              </Group>
              <Text
                size="xl"
                fw={800}
                style={{ fontFamily: 'var(--font-title)', color: '#10b981' }}
              >
                {wordsMasteredPerHour > 0 ? wordsMasteredPerHour : '--'}{' '}
                <Text component="span" size="xs" c="dimmed">
                  words/hr
                </Text>
              </Text>
              <Text size="xs" c="dimmed">
                Mastery velocity
              </Text>
            </Stack>
          </Paper>

          {/* Reviews per Mastered Word */}
          <Paper
            p="md"
            radius="lg"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Stack gap={2}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed" fw={600}>
                  REVS / MASTERY
                </Text>
                <IconClock size={18} style={{ color: '#f59e0b', opacity: 0.6 }} />
              </Group>
              <Text
                size="xl"
                fw={800}
                style={{ fontFamily: 'var(--font-title)', color: '#f59e0b' }}
              >
                {reviewsPerMasteredWord > 0 ? reviewsPerMasteredWord : '--'}{' '}
                <Text component="span" size="xs" c="dimmed">
                  revs
                </Text>
              </Text>
              <Text size="xs" c="dimmed">
                Reps to reach 21d stability
              </Text>
            </Stack>
          </Paper>

          {/* Study Time per Mastered Word */}
          <Paper
            p="md"
            radius="lg"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Stack gap={2}>
              <Group justify="space-between">
                <Text size="xs" c="dimmed" fw={600}>
                  TIME / MASTERY
                </Text>
                <IconSparkles size={18} style={{ color: '#ec4899', opacity: 0.6 }} />
              </Group>
              <Text
                size="xl"
                fw={800}
                style={{ fontFamily: 'var(--font-title)', color: '#ec4899' }}
              >
                {studyMinutesPerMasteredWord > 0 ? `${studyMinutesPerMasteredWord}m` : '--'}
              </Text>
              <Text size="xs" c="dimmed">
                Minutes per mastered word
              </Text>
            </Stack>
          </Paper>
        </SimpleGrid>
      </Stack>
    </Card>
  );
}
