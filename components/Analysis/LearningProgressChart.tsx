'use client';

import { Box, Card, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import React, { useState } from 'react';
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
import type { SectionStatusInfo, TimeSeriesDataPoint } from '@/lib/analysis/types';
import { SectionStatusBadge } from './SectionStatusBadge';

type LearningProgressChartProps = {
  data: TimeSeriesDataPoint[];
  totalWords: number;
  masteredWords: number;
  statusInfo?: SectionStatusInfo;
};

export function LearningProgressChart({
  data,
  totalWords: _totalWords,
  masteredWords: _masteredWords,
  statusInfo,
}: LearningProgressChartProps) {
  const [viewMode, setViewMode] = useState<'cumulative' | 'breakdown' | 'reviews'>('cumulative');

  if (data.length === 0) {
    return null;
  }

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header & Mode Switcher */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Learning Progress & Trends
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
            </Group>
            <Text size="xs" c="dimmed">
              {viewMode === 'cumulative'
                ? 'Cumulative vocabulary growth and mastered word trajectory over time.'
                : viewMode === 'breakdown'
                  ? 'Memory state distribution: Mastered, Review, Learning, and New cards.'
                  : 'Daily review volume and active study time.'}
            </Text>
          </div>

          <SegmentedControl
            size="xs"
            radius="md"
            value={viewMode}
            onChange={(val) => setViewMode(val as 'cumulative' | 'breakdown' | 'reviews')}
            data={[
              { label: 'Cumulative Growth', value: 'cumulative' },
              { label: 'Knowledge Breakdown', value: 'breakdown' },
              { label: 'Daily Reviews', value: 'reviews' },
            ]}
          />
        </Group>

        {/* Recharts Responsive Area/Bar/Line Visualizer */}
        <Box style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'cumulative' ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    borderColor: 'rgba(99, 102, 241, 0.2)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
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
            ) : viewMode === 'breakdown' ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    borderColor: 'rgba(99, 102, 241, 0.2)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="masteredWords"
                  stackId="1"
                  name="Mastered"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="reviewWords"
                  stackId="1"
                  name="Review (S ≥ 3d)"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="learningWords"
                  stackId="1"
                  name="Learning"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.8}
                />
                <Area
                  type="monotone"
                  dataKey="newWords"
                  stackId="1"
                  name="New"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.6}
                />
              </AreaChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    borderColor: 'rgba(99, 102, 241, 0.2)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar
                  dataKey="reviewsCount"
                  name="Reviews Completed"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="studyMinutes"
                  name="Study Minutes"
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </Box>
      </Stack>
    </Card>
  );
}
