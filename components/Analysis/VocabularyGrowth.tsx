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
  Title,
  Tooltip,
} from '@mantine/core';
import { IconClock, IconHelpCircle, IconPlus, IconTarget, IconTrophy } from '@tabler/icons-react';
import React from 'react';
import type { SectionStatusInfo, VocabularyGrowthData } from '@/lib/analysis/types';
import { SectionStatusBadge } from './SectionStatusBadge';

type VocabularyGrowthProps = {
  growth: VocabularyGrowthData;
  totalWords: number;
  masteredWords: number;
  statusInfo?: SectionStatusInfo;
};

export function VocabularyGrowth({
  growth,
  totalWords,
  masteredWords,
  statusInfo,
}: VocabularyGrowthProps) {
  const {
    wordsAddedInPeriod,
    wordsMasteredInPeriod,
    wordsAddedPerWeekAvg,
    wordsMasteredPerWeekAvg,
    avgDaysNewToMastered,
    growthRatePercent,
    projectedMasteryNext30Days,
  } = growth;

  const masteryRatio = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Vocabulary Growth Velocity
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
              <Tooltip
                label="Tracks your rate of acquiring new words and converting them to long-term memory mastery."
                multiline
                w={260}
              >
                <Box style={{ display: 'inline-flex', cursor: 'help', opacity: 0.6 }}>
                  <IconHelpCircle size={15} />
                </Box>
              </Tooltip>
            </Group>
            <Text size="xs" c="dimmed">
              Acquisition rate, conversion velocity, and 30-day vocabulary forecast.
            </Text>
          </div>

          <Badge variant="light" color="indigo" size="md">
            <RollingNumber value={wordsAddedInPeriod} prefix="+" suffix=" Added" />
          </Badge>
        </Group>

        {/* Metrics Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {/* Card 1: Words Added Velocity */}
          <Paper
            p="sm"
            radius="md"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="xs" c="dimmed" fw={600}>
                  ACQUISITION VELOCITY
                </Text>
                <Text
                  size="lg"
                  fw={800}
                  mt={2}
                  style={{ fontFamily: 'var(--font-title)', fontSize: '1.35rem' }}
                >
                  <RollingNumber value={wordsAddedPerWeekAvg} decimalScale={1} />{' '}
                  <Text component="span" size="xs" c="dimmed" fw={500}>
                    words / wk
                  </Text>
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  Growth rate: +
                  <RollingNumber value={growthRatePercent} decimalScale={1} suffix="%" /> this
                  period
                </Text>
              </div>
              <Box
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6366f1',
                }}
              >
                <IconPlus size={18} />
              </Box>
            </Group>
          </Paper>

          {/* Card 2: Words Mastered Velocity */}
          <Paper
            p="sm"
            radius="md"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="xs" c="dimmed" fw={600}>
                  MASTERY VELOCITY
                </Text>
                <Text
                  size="lg"
                  fw={800}
                  mt={2}
                  c="teal.6"
                  style={{ fontFamily: 'var(--font-title)', fontSize: '1.35rem' }}
                >
                  <RollingNumber value={wordsMasteredPerWeekAvg} decimalScale={1} />{' '}
                  <Text component="span" size="xs" c="dimmed" fw={500}>
                    mastered / wk
                  </Text>
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  <RollingNumber value={wordsMasteredInPeriod} /> words reached S ≥ 21d
                </Text>
              </div>
              <Box
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(16, 185, 129, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981',
                }}
              >
                <IconTrophy size={18} />
              </Box>
            </Group>
          </Paper>

          {/* Card 3: Days from New to Mastered */}
          <Paper
            p="sm"
            radius="md"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="xs" c="dimmed" fw={600}>
                  AVG TIME TO MASTERY
                </Text>
                <Text
                  size="lg"
                  fw={800}
                  mt={2}
                  style={{ fontFamily: 'var(--font-title)', fontSize: '1.35rem' }}
                >
                  {avgDaysNewToMastered > 0 ? (
                    <RollingNumber value={avgDaysNewToMastered} decimalScale={1} prefix="~" />
                  ) : (
                    'N/A'
                  )}{' '}
                  <Text component="span" size="xs" c="dimmed" fw={500}>
                    days
                  </Text>
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  From first review to S ≥ 21 days
                </Text>
              </div>
              <Box
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(245, 158, 11, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f59e0b',
                }}
              >
                <IconClock size={18} />
              </Box>
            </Group>
          </Paper>

          {/* Card 4: 30-Day Forecast */}
          <Paper
            p="sm"
            radius="md"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="xs" c="dimmed" fw={600}>
                  30-DAY MASTERY FORECAST
                </Text>
                <Text
                  size="lg"
                  fw={800}
                  mt={2}
                  c="indigo.6"
                  style={{ fontFamily: 'var(--font-title)', fontSize: '1.35rem' }}
                >
                  <RollingNumber value={projectedMasteryNext30Days} prefix="~" />{' '}
                  <Text component="span" size="xs" c="dimmed" fw={500}>
                    mastered
                  </Text>
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  Based on current review progression
                </Text>
              </div>
              <Box
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6366f1',
                }}
              >
                <IconTarget size={18} />
              </Box>
            </Group>
          </Paper>
        </SimpleGrid>

        {/* Overall Mastery Conversion Progress */}
        <Paper
          p="sm"
          radius="md"
          style={{
            background: 'rgba(99, 102, 241, 0.04)',
            border: '1px solid var(--card-border)',
          }}
        >
          <Group justify="space-between" align="center" mb={6}>
            <Text size="xs" fw={700} c="dimmed">
              TOTAL VOCABULARY CONVERTED TO MASTERED
            </Text>
            <Text size="xs" fw={800} c="teal.6">
              <RollingNumber value={masteredWords} /> / <RollingNumber value={totalWords} /> (
              <RollingNumber value={masteryRatio} decimalScale={1} suffix="%" />)
            </Text>
          </Group>
          <Progress size="md" radius="xl" value={masteryRatio} color="teal" animated />
        </Paper>
      </Stack>
    </Card>
  );
}
