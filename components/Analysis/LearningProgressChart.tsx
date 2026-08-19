'use client';

import {
  Badge,
  Box,
  Card,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AggregationPeriod,
  SectionStatusInfo,
  TimeSeriesDataPoint,
  VocabularyGrowthData,
} from '@/lib/analysis/types';
import { SectionStatusBadge } from './SectionStatusBadge';

type LearningProgressChartProps = {
  data: TimeSeriesDataPoint[];
  weeklyData?: TimeSeriesDataPoint[];
  monthlyData?: TimeSeriesDataPoint[];
  vocabularyGrowth?: VocabularyGrowthData;
  totalWords: number;
  masteredWords: number;
  statusInfo?: SectionStatusInfo;
};

export function LearningProgressChart({
  data,
  weeklyData = [],
  monthlyData = [],
  vocabularyGrowth,
  totalWords,
  masteredWords,
  statusInfo,
}: LearningProgressChartProps) {
  const [viewMode, setViewMode] = useState<
    'cumulative' | 'acquisition_vs_mastery' | 'breakdown' | 'reviews'
  >('cumulative');
  const [aggregation, setAggregation] = useState<AggregationPeriod>('daily');

  const activeData = useMemo(() => {
    if (aggregation === 'weekly' && weeklyData.length > 0) {
      return weeklyData;
    }
    if (aggregation === 'monthly' && monthlyData.length > 0) {
      return monthlyData;
    }
    return data;
  }, [aggregation, data, weeklyData, monthlyData]);

  if (data.length === 0) {
    return null;
  }

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header & Mode Switchers */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Vocabulary Growth & Learning Trajectory
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
            </Group>
            <Text size="xs" c="dimmed">
              {viewMode === 'cumulative'
                ? 'Cumulative vocabulary size vs established mastery over time.'
                : viewMode === 'acquisition_vs_mastery'
                  ? 'Words Added vs Words Entering Learning vs Mastered Words.'
                  : viewMode === 'breakdown'
                    ? 'State distribution: Mastered, In Review, Active Learning, and New cards.'
                    : 'Review volume & recall accuracy over time.'}
            </Text>
          </div>

          <Group gap="xs" wrap="wrap" style={{ maxWidth: '100%' }}>
            {/* Aggregation Switcher */}
            <Box style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
              <SegmentedControl
                size="xs"
                radius="md"
                value={aggregation}
                onChange={(val) => setAggregation(val as AggregationPeriod)}
                data={[
                  { label: 'Daily', value: 'daily' },
                  { label: 'Weekly', value: 'weekly' },
                  { label: 'Monthly', value: 'monthly' },
                ]}
              />
            </Box>

            {/* Metric Mode Switcher */}
            <Box style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
              <SegmentedControl
                size="xs"
                radius="md"
                value={viewMode}
                onChange={(val) =>
                  setViewMode(
                    val as 'cumulative' | 'acquisition_vs_mastery' | 'breakdown' | 'reviews'
                  )
                }
                data={[
                  { label: 'Cumulative', value: 'cumulative' },
                  { label: 'Acquisition vs Mastery', value: 'acquisition_vs_mastery' },
                  { label: 'State Breakdown', value: 'breakdown' },
                  { label: 'Reviews & Recall', value: 'reviews' },
                ]}
              />
            </Box>
          </Group>
        </Group>

        {/* Supporting Metrics Strip */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Text size="xs" c="dimmed" fw={600}>
              CURRENT VOCABULARY
            </Text>
            <Text size="md" fw={800} style={{ fontFamily: 'var(--font-title)' }}>
              {totalWords.toLocaleString()} <Text component="span" size="xs" c="dimmed">words</Text>
            </Text>
          </Paper>

          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Text size="xs" c="dimmed" fw={600}>
              TOTAL MASTERED
            </Text>
            <Text size="md" fw={800} c="teal" style={{ fontFamily: 'var(--font-title)' }}>
              {masteredWords.toLocaleString()} <Text component="span" size="xs" c="dimmed">({totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0}%)</Text>
            </Text>
          </Paper>

          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Text size="xs" c="dimmed" fw={600}>
              AVG MASTERED / WEEK
            </Text>
            <Text size="md" fw={800} c="indigo" style={{ fontFamily: 'var(--font-title)' }}>
              {vocabularyGrowth?.wordsMasteredPerWeekAvg || 0} <Text component="span" size="xs" c="dimmed">/ wk</Text>
            </Text>
          </Paper>

          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Text size="xs" c="dimmed" fw={600}>
              GROWTH VELOCITY
            </Text>
            <Text size="md" fw={800} c="violet" style={{ fontFamily: 'var(--font-title)' }}>
              +{vocabularyGrowth?.growthRatePercent || 0}% <Text component="span" size="xs" c="dimmed">rate</Text>
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Recharts Responsive Area/Bar/Line Visualizer */}
        <Box style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'cumulative' ? (
              <AreaChart data={activeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorMastered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.15)" />
                <XAxis
                  dataKey="label"
                  stroke="rgba(156, 163, 175, 0.6)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="rgba(156, 163, 175, 0.6)" fontSize={11} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.92)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#fff',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Area
                  type="monotone"
                  dataKey="totalWords"
                  name="Total Vocabulary"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                />
                <Area
                  type="monotone"
                  dataKey="masteredWords"
                  name="Mastered Words (S ≥ 21d)"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMastered)"
                />
              </AreaChart>
            ) : viewMode === 'acquisition_vs_mastery' ? (
              <BarChart data={activeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.15)" />
                <XAxis
                  dataKey="label"
                  stroke="rgba(156, 163, 175, 0.6)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="rgba(156, 163, 175, 0.6)" fontSize={11} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.92)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#fff',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar
                  dataKey="wordsAdded"
                  name="Words Added"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="wordsLearningEntered"
                  name="Entering Learning"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="masteredWords"
                  name="Mastered Total"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : viewMode === 'breakdown' ? (
              <BarChart
                data={activeData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.15)" />
                <XAxis
                  dataKey="label"
                  stroke="rgba(156, 163, 175, 0.6)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="rgba(156, 163, 175, 0.6)" fontSize={11} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.92)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#fff',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar
                  dataKey="masteredWords"
                  name="Mastered"
                  stackId="a"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="reviewWords"
                  name="In Review"
                  stackId="a"
                  fill="#6366f1"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="learningWords"
                  name="Learning"
                  stackId="a"
                  fill="#f59e0b"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="newWords"
                  name="New"
                  stackId="a"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <BarChart data={activeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.15)" />
                <XAxis
                  dataKey="label"
                  stroke="rgba(156, 163, 175, 0.6)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="rgba(156, 163, 175, 0.6)" fontSize={11} tickLine={false} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(30, 41, 59, 0.92)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 12,
                    fontSize: 12,
                    color: '#fff',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar
                  dataKey="reviewsCount"
                  name="Reviews Completed"
                  fill="#ec4899"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="recallRate"
                  name="Recall Rate (%)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </Box>
      </Stack>
    </Card>
  );
}
