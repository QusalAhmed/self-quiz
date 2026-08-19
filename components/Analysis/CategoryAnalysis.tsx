'use client';

import {
  Badge,
  Box,
  Card,
  Group,
  Progress,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconCategory, IconFolder } from '@tabler/icons-react';
import React from 'react';
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
import type { CategoryComparisonItem, SectionStatusInfo } from '@/lib/analysis/types';
import { formatDurationHMS } from '@/lib/analysis/calculator';
import { SectionStatusBadge } from './SectionStatusBadge';

type CategoryAnalysisProps = {
  categories: CategoryComparisonItem[];
  statusInfo?: SectionStatusInfo;
};

export function CategoryAnalysis({ categories, statusInfo }: CategoryAnalysisProps) {
  if (categories.length === 0) {
    return null;
  }

  const chartData = categories.slice(0, 8).map((c) => ({
    name: c.category,
    words: c.totalWords,
    mastered: c.masteredWords,
    retention: c.retentionRate,
    studyMinutes: Math.round((c.totalStudyTimeSec / 60) * 10) / 10,
    difficulty: c.avgDifficulty,
  }));

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Category & Tag Performance
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
            </Group>
            <Text size="xs" c="dimmed">
              Cross-category comparison of vocabulary volume, mastery rates, and study time investment.
            </Text>
          </div>

          <Badge variant="light" color="indigo" leftSection={<IconCategory size={14} />}>
            {categories.length} Categories Tracked
          </Badge>
        </Group>

        {/* Comparison Chart */}
        {chartData.length > 0 && (
          <Box style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.15)" />
                <XAxis
                  dataKey="name"
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
                <Bar dataKey="words" name="Total Words" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mastered" name="Mastered Words" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="studyMinutes" name="Study Time (min)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* Categories Table */}
        <Box style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Table verticalSpacing="xs" horizontalSpacing="sm" highlightOnHover style={{ minWidth: 680 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Category / Tag</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Words</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Mastered</Table.Th>
                <Table.Th style={{ width: 140 }}>Mastery %</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Retention</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Avg Difficulty</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Reviews</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Total Time</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Lapses</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {categories.map((c) => (
                <Table.Tr key={c.category}>
                  <Table.Td>
                    <Group gap="xs">
                      <IconFolder size={16} color="#6366f1" />
                      <Text size="sm" fw={700}>
                        {c.category}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="xs" fw={700}>
                      {c.totalWords}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="xs" fw={700} c="teal">
                      {c.masteredWords}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" align="center" wrap="nowrap">
                      <Progress value={c.masteryRate} color="teal" size="sm" radius="xl" style={{ flex: 1 }} />
                      <Text size="11px" fw={700} style={{ minWidth: 32 }}>
                        {c.masteryRate}%
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Badge size="xs" variant="light" color={c.retentionRate >= 85 ? 'teal' : 'yellow'}>
                      {c.retentionRate}%
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Badge size="xs" variant="outline" color={c.avgDifficulty >= 7 ? 'red' : 'gray'}>
                      {c.avgDifficulty}/10
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="xs">{c.reviewsCount}</Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="xs" fw={600} c="indigo">
                      {formatDurationHMS(c.totalStudyTimeSec)}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="xs" c={c.lapses > 0 ? 'red' : 'dimmed'}>
                      {c.lapses}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      </Stack>
    </Card>
  );
}
