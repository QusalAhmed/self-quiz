'use client';

import { Badge, Card, Group, Paper, SimpleGrid, Stack, Text, Title, Tooltip } from '@mantine/core';
import {
  IconBolt,
  IconClock,
  IconHistory,
  IconHourglassLow,
  IconInfoCircle,
  IconSparkles,
  IconTrophy,
} from '@tabler/icons-react';
import React from 'react';
import { formatDurationHMS } from '@/lib/analysis/calculator';
import type { SectionStatusInfo, TimeToMasteryData } from '@/lib/analysis/types';
import type { WordRecord } from '@/lib/db';
import { SectionStatusBadge } from './SectionStatusBadge';

type TimeToMasteryCardProps = {
  data: TimeToMasteryData;
  allWordsMap: Map<string, WordRecord>;
  onSelectWord: (word: WordRecord) => void;
  statusInfo?: SectionStatusInfo;
};

export function TimeToMasteryCard({
  data,
  allWordsMap,
  onSelectWord,
  statusInfo,
}: TimeToMasteryCardProps) {
  const {
    avgDaysToMastery,
    medianDaysToMastery,
    avgReviewsBeforeMastery,
    avgStudyTimeBeforeMasterySec,
    masteredWordsCount,
    fastestMasteredWords,
    slowestMasteredWords,
  } = data;

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Time-to-Mastery Trajectory
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
            </Group>
            <Text size="xs" c="dimmed">
              Historical speed and review effort required for vocabulary words to establish
              long-term memory stability (S ≥ 21d).
            </Text>
          </div>

          <Tooltip
            label="Mastery is reached when a word card achieves FSRS stability ≥ 21 days with successful recall."
            multiline
            w={280}
            withArrow
          >
            <Badge
              variant="light"
              color="teal"
              leftSection={<IconInfoCircle size={14} />}
              style={{ cursor: 'pointer' }}
            >
              {masteredWordsCount} Mastered Words
            </Badge>
          </Tooltip>
        </Group>

        {/* Aggregate Mastery Stats Strip */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Group gap="xs" align="center" mb={4}>
              <IconHourglassLow size={16} color="#10b981" />
              <Text size="xs" c="dimmed" fw={600}>
                AVG DAYS TO MASTERY
              </Text>
            </Group>
            <Text size="md" fw={800} c="teal" style={{ fontFamily: 'var(--font-title)' }}>
              {avgDaysToMastery}{' '}
              <Text component="span" size="xs" c="dimmed">
                days
              </Text>
            </Text>
            <Text size="xs" c="dimmed">
              First review to S ≥ 21d
            </Text>
          </Paper>

          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Group gap="xs" align="center" mb={4}>
              <IconSparkles size={16} color="#6366f1" />
              <Text size="xs" c="dimmed" fw={600}>
                MEDIAN DAYS
              </Text>
            </Group>
            <Text size="md" fw={800} c="indigo" style={{ fontFamily: 'var(--font-title)' }}>
              {medianDaysToMastery}{' '}
              <Text component="span" size="xs" c="dimmed">
                days
              </Text>
            </Text>
            <Text size="xs" c="dimmed">
              Midpoint duration
            </Text>
          </Paper>

          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Group gap="xs" align="center" mb={4}>
              <IconHistory size={16} color="#a855f7" />
              <Text size="xs" c="dimmed" fw={600}>
                REVIEWS TO MASTER
              </Text>
            </Group>
            <Text size="md" fw={800} c="violet" style={{ fontFamily: 'var(--font-title)' }}>
              {avgReviewsBeforeMastery}{' '}
              <Text component="span" size="xs" c="dimmed">
                reviews
              </Text>
            </Text>
            <Text size="xs" c="dimmed">
              Spaced repetition cycles
            </Text>
          </Paper>

          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Group gap="xs" align="center" mb={4}>
              <IconClock size={16} color="#f59e0b" />
              <Text size="xs" c="dimmed" fw={600}>
                AVG STUDY TIME
              </Text>
            </Group>
            <Text size="md" fw={800} c="yellow" style={{ fontFamily: 'var(--font-title)' }}>
              {formatDurationHMS(avgStudyTimeBeforeMasterySec)}
            </Text>
            <Text size="xs" c="dimmed">
              Total active seconds
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Fastest & Slowest to Master Lists */}
        {masteredWordsCount > 0 && (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {/* Fastest */}
            <Paper p="md" radius="lg" style={{ background: 'var(--mantine-color-default-hover)' }}>
              <Group gap="xs" mb="xs" align="center">
                <IconBolt size={18} color="#10b981" />
                <Text size="xs" fw={700} c="teal" style={{ letterSpacing: '0.04em' }}>
                  FASTEST-TO-MASTER WORDS
                </Text>
              </Group>
              <Stack gap="xs">
                {fastestMasteredWords.map((item, idx) => {
                  const parent = allWordsMap.get(item.id);
                  return (
                    <Group
                      key={item.id}
                      justify="space-between"
                      align="center"
                      p={6}
                      style={{
                        borderRadius: 8,
                        background: 'var(--mantine-color-body)',
                        cursor: parent ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (parent) {
                          onSelectWord(parent);
                        }
                      }}
                    >
                      <Group gap="xs">
                        <Badge size="xs" variant="light" color="teal">
                          #{idx + 1}
                        </Badge>
                        <div>
                          <Text size="xs" fw={700}>
                            {item.word}
                          </Text>
                          <Text size="10px" c="dimmed" lineClamp={1}>
                            {item.meaning}
                          </Text>
                        </div>
                      </Group>
                      <Group gap="xs">
                        <Badge size="xs" variant="outline" color="teal">
                          {item.days} days
                        </Badge>
                        <Text size="10px" c="dimmed">
                          {item.reviews} revs
                        </Text>
                      </Group>
                    </Group>
                  );
                })}
              </Stack>
            </Paper>

            {/* Slowest */}
            <Paper p="md" radius="lg" style={{ background: 'var(--mantine-color-default-hover)' }}>
              <Group gap="xs" mb="xs" align="center">
                <IconTrophy size={18} color="#f59e0b" />
                <Text size="xs" fw={700} c="yellow" style={{ letterSpacing: '0.04em' }}>
                  SLOWEST-TO-MASTER WORDS (HIGH REPETITIONS)
                </Text>
              </Group>
              <Stack gap="xs">
                {slowestMasteredWords.map((item, idx) => {
                  const parent = allWordsMap.get(item.id);
                  return (
                    <Group
                      key={item.id}
                      justify="space-between"
                      align="center"
                      p={6}
                      style={{
                        borderRadius: 8,
                        background: 'var(--mantine-color-body)',
                        cursor: parent ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (parent) {
                          onSelectWord(parent);
                        }
                      }}
                    >
                      <Group gap="xs">
                        <Badge size="xs" variant="light" color="yellow">
                          #{idx + 1}
                        </Badge>
                        <div>
                          <Text size="xs" fw={700}>
                            {item.word}
                          </Text>
                          <Text size="10px" c="dimmed" lineClamp={1}>
                            {item.meaning}
                          </Text>
                        </div>
                      </Group>
                      <Group gap="xs">
                        <Badge size="xs" variant="outline" color="yellow">
                          {item.days} days
                        </Badge>
                        <Text size="10px" c="dimmed">
                          {item.reviews} revs
                        </Text>
                      </Group>
                    </Group>
                  );
                })}
              </Stack>
            </Paper>
          </SimpleGrid>
        )}
      </Stack>
    </Card>
  );
}
