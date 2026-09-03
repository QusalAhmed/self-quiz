'use client';

import {
  Badge,
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
import {
  IconAlertCircle,
  IconBrain,
  IconCheck,
  IconCircleDot,
  IconInfoCircle,
  IconRefresh,
  IconSparkles,
} from '@tabler/icons-react';
import React from 'react';
import type {
  LearningStateDistributionData,
  SectionStatusInfo,
  WordStateFilter,
} from '@/lib/analysis/types';
import { SectionStatusBadge } from './SectionStatusBadge';

type LearningStateDistributionProps = {
  data: LearningStateDistributionData;
  activeFilter?: WordStateFilter;
  onSelectState?: (state: WordStateFilter) => void;
  statusInfo?: SectionStatusInfo;
};

const STATE_ICONS: Record<string, React.ReactNode> = {
  Mastered: <IconCheck size={18} color="#10b981" />,
  Review: <IconBrain size={18} color="#6366f1" />,
  Learning: <IconSparkles size={18} color="#f59e0b" />,
  Relearning: <IconRefresh size={18} color="#ef4444" />,
  New: <IconCircleDot size={18} color="#94a3b8" />,
};

export function LearningStateDistribution({
  data,
  activeFilter = 'all',
  onSelectState,
  statusInfo,
}: LearningStateDistributionProps) {
  const { states, totalWords, masteryRuleDescription } = data;

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Words by Learning State
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
            </Group>
            <Text component="div" size="xs" c="dimmed">
              Current breakdown of your <RollingNumber value={totalWords} thousandSeparator />{' '}
              vocabulary words across FSRS spaced repetition states.
            </Text>
          </div>

          <Tooltip label="FSRS-5 state rules" multiline w={300} withArrow>
            <Badge
              variant="light"
              color="indigo"
              leftSection={<IconInfoCircle size={14} />}
              style={{ cursor: 'pointer' }}
            >
              FSRS Mastery Rule
            </Badge>
          </Tooltip>
        </Group>

        {/* Stacked Progress Bar */}
        <Progress.Root size="xl" radius="xl" style={{ overflow: 'hidden' }}>
          {states.map((s) => (
            <Tooltip key={s.state} label={`${s.state}: ${s.count} words (${s.percent}%)`} withArrow>
              <Progress.Section
                value={s.percent}
                color={
                  s.state === 'Mastered'
                    ? 'teal'
                    : s.state === 'Review'
                      ? 'indigo'
                      : s.state === 'Learning'
                        ? 'yellow'
                        : s.state === 'Relearning'
                          ? 'red'
                          : 'gray'
                }
              >
                {s.percent > 8 && (
                  <Progress.Label style={{ fontSize: 11, fontWeight: 700 }}>
                    {s.percent}%
                  </Progress.Label>
                )}
              </Progress.Section>
            </Tooltip>
          ))}
        </Progress.Root>

        {/* Interactive State Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="xs">
          {states.map((s) => {
            const isSelected = activeFilter === s.state;
            return (
              <Paper
                key={s.state}
                p="sm"
                radius="lg"
                className="hover-lift"
                style={{
                  border: isSelected ? `2px solid ${s.color}` : '1px solid var(--glass-border)',
                  background: isSelected
                    ? 'var(--mantine-color-default-hover)'
                    : 'var(--mantine-color-body)',
                  cursor: onSelectState ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => {
                  if (onSelectState) {
                    onSelectState(isSelected ? 'all' : (s.state as WordStateFilter));
                  }
                }}
              >
                <Stack gap="xs">
                  <Group justify="space-between" align="center">
                    <Group gap="xs">
                      {STATE_ICONS[s.state]}
                      <Text size="xs" fw={700} style={{ letterSpacing: '0.04em' }}>
                        {s.state.toUpperCase()}
                      </Text>
                    </Group>
                    <Badge
                      size="sm"
                      variant={isSelected ? 'filled' : 'light'}
                      color={
                        s.state === 'Mastered'
                          ? 'teal'
                          : s.state === 'Review'
                            ? 'indigo'
                            : s.state === 'Learning'
                              ? 'yellow'
                              : s.state === 'Relearning'
                                ? 'red'
                                : 'gray'
                      }
                    >
                      <RollingNumber value={s.percent} suffix="%" />
                    </Badge>
                  </Group>

                  <Text
                    component="div"
                    size="xl"
                    fw={800}
                    style={{ fontFamily: 'var(--font-title)' }}
                  >
                    <RollingNumber value={s.count} thousandSeparator />
                  </Text>

                  <Text size="xs" c="dimmed" style={{ minHeight: 32, lineHeight: 1.3 }}>
                    {s.description}
                  </Text>
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>

        {/* Mastery Rule Definition Note */}
        <Paper
          p="xs"
          radius="md"
          style={{
            background: 'rgba(99, 102, 241, 0.06)',
            borderLeft: '4px solid #6366f1',
          }}
        >
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <IconAlertCircle size={16} color="#6366f1" style={{ marginTop: 2, flexShrink: 0 }} />
            <Text size="xs" c="dimmed">
              <strong style={{ color: 'var(--mantine-color-text)' }}>Mastery Definition:</strong>{' '}
              {masteryRuleDescription} Words are not considered learned upon creation; memory
              stability is mathematically calculated by FSRS from review responses.
            </Text>
          </Group>
        </Paper>
      </Stack>
    </Card>
  );
}
