'use client';

import { Box, Card, Group, Paper, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { formatDurationHMS } from '@/lib/analysis/calculator';
import type { SectionStatusInfo, WordEffortPoint } from '@/lib/analysis/types';
import type { WordRecord } from '@/lib/db';
import { SectionStatusBadge } from './SectionStatusBadge';

type WordDifficultyVsTimeProps = {
  data: WordEffortPoint[];
  allWordsMap: Map<string, WordRecord>;
  onSelectWord: (word: WordRecord) => void;
  statusInfo?: SectionStatusInfo;
};

type YMetric = 'totalTime' | 'reviews' | 'lapses' | 'avgDuration';

export function WordDifficultyVsTime({
  data,
  allWordsMap,
  onSelectWord,
  statusInfo,
}: WordDifficultyVsTimeProps) {
  const [yMetric, setYMetric] = useState<YMetric>('totalTime');

  const formattedScatterData = useMemo(() => {
    return data.map((pt) => {
      let yVal = pt.totalTimeSec;
      if (yMetric === 'reviews') {
        yVal = pt.reviewsCount;
      } else if (yMetric === 'lapses') {
        yVal = pt.lapses;
      } else if (yMetric === 'avgDuration') {
        yVal = pt.avgDurationSec;
      }

      return {
        ...pt,
        x: pt.difficulty,
        y: yVal,
        z: Math.max(4, Math.min(20, pt.reviewsCount * 2)),
      };
    });
  }, [data, yMetric]);

  const yAxisLabel = useMemo(() => {
    if (yMetric === 'reviews') {
      return 'Review Count';
    }
    if (yMetric === 'lapses') {
      return 'Lapses (Again Count)';
    }
    if (yMetric === 'avgDuration') {
      return 'Avg Duration (s)';
    }
    return 'Total Time (s)';
  }, [yMetric]);

  if (data.length === 0) {
    return null;
  }

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header & Controls */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Word Difficulty vs Study Effort
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
            </Group>
            <Text size="xs" c="dimmed">
              Explore how FSRS difficulty rating relates to time invested and review repetitions
              across your vocabulary.
            </Text>
          </div>

          <SegmentedControl
            size="xs"
            radius="md"
            value={yMetric}
            onChange={(val) => setYMetric(val as YMetric)}
            data={[
              { label: 'Total Time', value: 'totalTime' },
              { label: 'Reviews', value: 'reviews' },
              { label: 'Lapses', value: 'lapses' },
              { label: 'Avg Duration', value: 'avgDuration' },
            ]}
          />
        </Group>

        {/* Scatter Plot Visualizer */}
        <Box style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.15)" />
              <XAxis
                type="number"
                dataKey="x"
                name="Difficulty"
                domain={[1, 10]}
                unit=""
                stroke="rgba(156, 163, 175, 0.6)"
                fontSize={11}
                tickCount={10}
                label={{
                  value: 'FSRS Difficulty (1 = Easy, 10 = Very Hard)',
                  position: 'bottom',
                  offset: 0,
                  fontSize: 11,
                  fill: 'rgba(156, 163, 175, 0.7)',
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={yAxisLabel}
                stroke="rgba(156, 163, 175, 0.6)"
                fontSize={11}
                label={{
                  value: yAxisLabel,
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 11,
                  fill: 'rgba(156, 163, 175, 0.7)',
                }}
              />
              <ZAxis type="number" dataKey="z" range={[30, 200]} name="Reviews" />
              <RechartsTooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as WordEffortPoint & { x: number; y: number };
                    return (
                      <Paper
                        p="xs"
                        radius="md"
                        style={{
                          backgroundColor: 'rgba(30, 41, 59, 0.94)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#fff',
                          fontSize: 12,
                          maxWidth: 240,
                        }}
                      >
                        <Text fw={700} size="sm" c="indigo.2">
                          {d.word}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={2} mb={4}>
                          {d.meaning}
                        </Text>
                        <Group justify="space-between" gap="xs">
                          <Text size="11px">Difficulty:</Text>
                          <Text size="11px" fw={700}>
                            {d.difficulty}/10
                          </Text>
                        </Group>
                        <Group justify="space-between" gap="xs">
                          <Text size="11px">Total Time:</Text>
                          <Text size="11px" fw={700}>
                            {formatDurationHMS(d.totalTimeSec)}
                          </Text>
                        </Group>
                        <Group justify="space-between" gap="xs">
                          <Text size="11px">Reviews / Lapses:</Text>
                          <Text size="11px" fw={700}>
                            {d.reviewsCount} / {d.lapses}
                          </Text>
                        </Group>
                        <Group justify="space-between" gap="xs">
                          <Text size="11px">Stability / State:</Text>
                          <Text size="11px" fw={700}>
                            {d.stability}d ({d.state})
                          </Text>
                        </Group>
                      </Paper>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                name="Words"
                data={formattedScatterData}
                fill="#6366f1"
                onClick={(node: any) => {
                  const payload = node?.payload || node;
                  if (payload?.id) {
                    const parent = allWordsMap.get(payload.id);
                    if (parent) {
                      onSelectWord(parent);
                    }
                  }
                }}
                style={{ cursor: 'pointer' }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </Box>

        {/* Analytical note */}
        <Paper
          p="xs"
          radius="md"
          style={{
            background: 'rgba(99, 102, 241, 0.06)',
            borderLeft: '4px solid #6366f1',
          }}
        >
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <IconInfoCircle size={16} color="#6366f1" style={{ marginTop: 2, flexShrink: 0 }} />
            <Text size="xs" c="dimmed">
              <strong>Pattern Detection:</strong> Outliers in the top-left indicate easy-rated words
              consuming high study time, whereas outliers in the top-right highlight difficult
              vocabulary requiring targeted reinforcement.
            </Text>
          </Group>
        </Paper>
      </Stack>
    </Card>
  );
}
