'use client';

import {
  Box,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconCalendarEvent,
  IconChartBar,
  IconInfoCircle,
  IconPlus,
  IconTrophy,
} from '@tabler/icons-react';
import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyWordsAddedData, SectionStatusInfo } from '@/lib/analysis/types';
import { SectionStatusBadge } from './SectionStatusBadge';

type DailyWordsAddedChartProps = {
  data: DailyWordsAddedData;
  statusInfo?: SectionStatusInfo;
};

export function DailyWordsAddedChart({ data, statusInfo }: DailyWordsAddedChartProps) {
  const { timeSeries, totalAdded, dailyAverage, mostProductiveDay, hasActivity } = data;

  // Compute maximum count to adjust y-axis domain nicely
  const maxWordsAdded = useMemo(() => {
    return Math.max(3, ...timeSeries.map((d) => d.wordsAdded));
  }, [timeSeries]);

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header & Status */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <ThemeIcon size="md" radius="md" color="indigo" variant="light">
                <IconPlus size={18} />
              </ThemeIcon>
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Words Added per Day
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
            </Group>
            <Text size="xs" c="dimmed">
              Number of new unique vocabulary words created and added to your dictionary each day.
            </Text>
          </div>
        </Group>

        {/* Summary Metrics Strip */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          {/* Total Added */}
          <Paper
            p="sm"
            radius="md"
            style={{
              background: 'rgba(99, 102, 241, 0.04)',
              border: '1px solid var(--card-border)',
            }}
          >
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.04em' }}>
                  TOTAL ADDED
                </Text>
                <Text
                  size="xl"
                  fw={800}
                  c="indigo.6"
                  style={{ fontFamily: 'var(--font-title)', lineHeight: 1.2, marginTop: 4 }}
                >
                  {totalAdded}{' '}
                  <Text component="span" size="xs" c="dimmed" fw={500}>
                    {totalAdded === 1 ? 'word' : 'words'}
                  </Text>
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  In selected date range
                </Text>
              </div>
              <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
                <IconPlus size={18} />
              </ThemeIcon>
            </Group>
          </Paper>

          {/* Daily Average */}
          <Paper
            p="sm"
            radius="md"
            style={{
              background: 'rgba(99, 102, 241, 0.04)',
              border: '1px solid var(--card-border)',
            }}
          >
            <Group justify="space-between" align="flex-start">
              <div>
                <Group gap={4} align="center">
                  <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.04em' }}>
                    DAILY AVERAGE
                  </Text>
                  <Tooltip label="Average words added per calendar day across the entire selected range (including days with zero words).">
                    <Box style={{ display: 'inline-flex', opacity: 0.6, cursor: 'help' }}>
                      <IconInfoCircle size={12} />
                    </Box>
                  </Tooltip>
                </Group>
                <Text
                  size="xl"
                  fw={800}
                  c="teal.6"
                  style={{ fontFamily: 'var(--font-title)', lineHeight: 1.2, marginTop: 4 }}
                >
                  {dailyAverage}{' '}
                  <Text component="span" size="xs" c="dimmed" fw={500}>
                    / day
                  </Text>
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  Across {timeSeries.length} calendar {timeSeries.length === 1 ? 'day' : 'days'}
                </Text>
              </div>
              <ThemeIcon size="lg" radius="md" color="teal" variant="light">
                <IconChartBar size={18} />
              </ThemeIcon>
            </Group>
          </Paper>

          {/* Most Productive Day */}
          <Paper
            p="sm"
            radius="md"
            style={{
              background: 'rgba(99, 102, 241, 0.04)',
              border: '1px solid var(--card-border)',
            }}
          >
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.04em' }}>
                  MOST PRODUCTIVE DAY
                </Text>
                <Text
                  size="md"
                  fw={800}
                  c="orange.6"
                  style={{ fontFamily: 'var(--font-title)', lineHeight: 1.2, marginTop: 4 }}
                >
                  {mostProductiveDay ? mostProductiveDay.label : 'None'}
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  {mostProductiveDay
                    ? `${mostProductiveDay.count} words added`
                    : 'No additions recorded'}
                </Text>
              </div>
              <ThemeIcon size="lg" radius="md" color="orange" variant="light">
                <IconTrophy size={18} />
              </ThemeIcon>
            </Group>
          </Paper>
        </SimpleGrid>

        {/* Empty / No Activity Notice */}
        {!hasActivity && (
          <Paper
            p="xs"
            radius="md"
            style={{
              background: 'rgba(99, 102, 241, 0.06)',
              borderLeft: '4px solid #6366f1',
            }}
          >
            <Group gap="xs" align="center">
              <IconCalendarEvent size={16} color="#6366f1" />
              <Text size="xs" c="dimmed">
                No words were added during this period. The chart displays continuous zero values to
                show inactivity.
              </Text>
            </Group>
          </Paper>
        )}

        {/* Bar Chart Container */}
        <Box style={{ height: 260, width: '100%', minHeight: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--card-border)"
                opacity={0.6}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: 'var(--card-border)' }}
                tick={{ fontSize: 11, fill: 'var(--mantine-color-dimmed)' }}
                interval={
                  timeSeries.length > 60
                    ? Math.floor(timeSeries.length / 8)
                    : timeSeries.length > 25
                      ? Math.floor(timeSeries.length / 6)
                      : 0
                }
              />
              <YAxis
                allowDecimals={false}
                domain={[0, maxWordsAdded]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'var(--mantine-color-dimmed)' }}
              />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as {
                      fullDateLabel: string;
                      wordsAdded: number;
                    };
                    return (
                      <Paper
                        p="xs"
                        radius="md"
                        shadow="md"
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          backdropFilter: 'blur(12px)',
                          minWidth: 150,
                        }}
                      >
                        <Text size="xs" fw={700} c="dimmed">
                          {d.fullDateLabel}
                        </Text>
                        <Group gap={6} align="center" mt={4}>
                          <Box
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 2,
                              background: '#6366f1',
                            }}
                          />
                          <Text size="sm" fw={800} c="indigo">
                            {d.wordsAdded} {d.wordsAdded === 1 ? 'word added' : 'words added'}
                          </Text>
                        </Group>
                      </Paper>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="wordsAdded"
                name="Words Added"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {timeSeries.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.wordsAdded > 0 ? '#6366f1' : 'rgba(99, 102, 241, 0.15)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Stack>
    </Card>
  );
}
