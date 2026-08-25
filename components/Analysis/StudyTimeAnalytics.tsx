'use client';

import {
  Box,
  Card,
  Group,
  Paper,
  RollingNumber,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconClock,
  IconFlame,
  IconHistory,
  IconHourglass,
  IconTrendingUp,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AggregationPeriod,
  KpiMetric,
  SectionStatusInfo,
  StudyEfficiencyData,
  TimeSeriesDataPoint,
} from '@/lib/analysis/types';
import { SectionStatusBadge } from './SectionStatusBadge';

type StudyTimeAnalyticsProps = {
  data: TimeSeriesDataPoint[];
  weeklyData?: TimeSeriesDataPoint[];
  monthlyData?: TimeSeriesDataPoint[];
  totalStudyTimeMetric: KpiMetric;
  efficiency: StudyEfficiencyData;
  totalReviews: number;
  activeStudyDays: number;
  statusInfo?: SectionStatusInfo;
};

export function StudyTimeAnalytics({
  data,
  weeklyData = [],
  monthlyData = [],
  totalStudyTimeMetric,
  efficiency,
  totalReviews,
  activeStudyDays,
  statusInfo,
}: StudyTimeAnalyticsProps) {
  const [aggregation, setAggregation] = useState<AggregationPeriod>('daily');
  const [metricMode, setMetricMode] = useState<'study_time' | 'avg_duration' | 'reviews_volume'>(
    'study_time'
  );

  const activeData = useMemo(() => {
    if (aggregation === 'weekly' && weeklyData.length > 0) {
      return weeklyData;
    }
    if (aggregation === 'monthly' && monthlyData.length > 0) {
      return monthlyData;
    }
    return data;
  }, [aggregation, data, weeklyData, monthlyData]);

  const avgDailyMinutes =
    activeStudyDays > 0
      ? Math.round(((totalStudyTimeMetric.value || 0) / (60 * activeStudyDays)) * 10) / 10
      : 0;

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header & Controls */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Study Time & Focus Analytics
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
            </Group>
            <Text size="xs" c="dimmed">
              Time investment analyzed from verified review durations and active session usage.
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

            {/* Metric Mode */}
            <Box style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
              <SegmentedControl
                size="xs"
                radius="md"
                value={metricMode}
                onChange={(val) =>
                  setMetricMode(val as 'study_time' | 'avg_duration' | 'reviews_volume')
                }
                data={[
                  { label: 'Study Minutes', value: 'study_time' },
                  { label: 'Avg Duration (s)', value: 'avg_duration' },
                  { label: 'Review Count', value: 'reviews_volume' },
                ]}
              />
            </Box>
          </Group>
        </Group>

        {/* Summary Metrics Strip */}
        <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="xs">
          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Group gap="xs" align="center" mb={4}>
              <IconClock size={16} color="#6366f1" />
              <Text size="xs" c="dimmed" fw={600}>
                TOTAL STUDY TIME
              </Text>
            </Group>
            <Text component="div" size="md" fw={800} style={{ fontFamily: 'var(--font-title)' }}>
              {(() => {
                const totalSeconds = totalStudyTimeMetric.value;
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                return (
                  <Group gap={4} align="baseline" wrap="nowrap" style={{ display: 'inline-flex' }}>
                    {hours > 0 && <RollingNumber value={hours} suffix="h" />}
                    {minutes > 0 && <RollingNumber value={minutes} suffix="m" />}
                    {(seconds > 0 || (hours === 0 && minutes === 0)) && (
                      <RollingNumber value={seconds} suffix="s" />
                    )}
                  </Group>
                );
              })()}
            </Text>
            <Text size="xs" c="dimmed">
              {totalStudyTimeMetric.subtitle}
            </Text>
          </Paper>

          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Group gap="xs" align="center" mb={4}>
              <IconFlame size={16} color="#f59e0b" />
              <Text size="xs" c="dimmed" fw={600}>
                AVG / ACTIVE DAY
              </Text>
            </Group>
            <Text
              component="div"
              size="md"
              fw={800}
              c="yellow"
              style={{ fontFamily: 'var(--font-title)' }}
            >
              <RollingNumber value={avgDailyMinutes} decimalScale={1} />{' '}
              <Text component="span" size="xs" c="dimmed">
                min/day
              </Text>
            </Text>
            <Text component="div" size="xs" c="dimmed">
              Across <RollingNumber value={activeStudyDays} /> study days
            </Text>
          </Paper>

          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Group gap="xs" align="center" mb={4}>
              <IconHourglass size={16} color="#10b981" />
              <Text size="xs" c="dimmed" fw={600}>
                AVG TIME / REVIEW
              </Text>
            </Group>
            <Text
              component="div"
              size="md"
              fw={800}
              c="teal"
              style={{ fontFamily: 'var(--font-title)' }}
            >
              <RollingNumber value={efficiency.avgReviewDurationSec || 0} decimalScale={1} />{' '}
              <Text component="span" size="xs" c="dimmed">
                sec
              </Text>
            </Text>
            <Text size="xs" c="dimmed">
              Per card recall
            </Text>
          </Paper>

          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Group gap="xs" align="center" mb={4}>
              <IconHistory size={16} color="#a855f7" />
              <Text size="xs" c="dimmed" fw={600}>
                TOTAL REVIEWS
              </Text>
            </Group>
            <Text
              component="div"
              size="md"
              fw={800}
              c="violet"
              style={{ fontFamily: 'var(--font-title)' }}
            >
              <RollingNumber value={totalReviews} thousandSeparator />
            </Text>
            <Text size="xs" c="dimmed">
              Completed attempts
            </Text>
          </Paper>

          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Group gap="xs" align="center" mb={4}>
              <IconTrendingUp size={16} color="#ec4899" />
              <Text size="xs" c="dimmed" fw={600}>
                REVIEWS / MINUTE
              </Text>
            </Group>
            <Text
              component="div"
              size="md"
              fw={800}
              c="pink"
              style={{ fontFamily: 'var(--font-title)' }}
            >
              <RollingNumber value={efficiency.reviewsPerMinute || 0} decimalScale={1} />{' '}
              <Text component="span" size="xs" c="dimmed">
                cards/min
              </Text>
            </Text>
            <Text size="xs" c="dimmed">
              Pacing velocity
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Study Time Chart Visualizer */}
        <Box style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            {metricMode === 'study_time' ? (
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
                  dataKey="studyMinutes"
                  name="Study Time (Minutes)"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : metricMode === 'avg_duration' ? (
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
                  dataKey="avgReviewDurationSec"
                  name="Avg Review Duration (Seconds)"
                  fill="#10b981"
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
                  name="Reviews Volume"
                  fill="#ec4899"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </Box>
      </Stack>
    </Card>
  );
}
