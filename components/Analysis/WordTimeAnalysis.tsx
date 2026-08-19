'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Group,
  Pagination,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconClock,
  IconFlame,
  IconInfoCircle,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
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
import { formatDurationHMS } from '@/lib/analysis/calculator';
import type { SectionStatusInfo, WordTimeSpentItem } from '@/lib/analysis/types';
import type { WordRecord } from '@/lib/db';
import { SectionStatusBadge } from './SectionStatusBadge';

type WordTimeAnalysisProps = {
  words: WordTimeSpentItem[];
  allWordsMap: Map<string, WordRecord>;
  onSelectWord: (word: WordRecord) => void;
  statusInfo?: SectionStatusInfo;
};

type SortField =
  | 'totalTimeSec'
  | 'avgDurationSec'
  | 'reviewsCount'
  | 'lapses'
  | 'difficulty'
  | 'stability';

export function WordTimeAnalysis({
  words,
  allWordsMap,
  onSelectWord,
  statusInfo,
}: WordTimeAnalysisProps) {
  const [topCount, setTopCount] = useState<'10' | '20'>('10');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalTimeSec');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filter & Sort
  const filteredWords = useMemo(() => {
    let result = words;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (w) =>
          w.word.toLowerCase().includes(q) ||
          w.meaning.toLowerCase().includes(q) ||
          w.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return [...result].sort((a, b) => {
      const valA = a[sortField] || 0;
      const valB = b[sortField] || 0;
      return sortDir === 'desc'
        ? (valB as number) - (valA as number)
        : (valA as number) - (valB as number);
    });
  }, [words, searchQuery, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / pageSize));
  const pagedWords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredWords.slice(start, start + pageSize);
  }, [filteredWords, page]);

  // Top time-consuming words data for Chart
  const topChartData = useMemo(() => {
    const limit = topCount === '10' ? 10 : 20;
    return [...words]
      .sort((a, b) => b.totalTimeSec - a.totalTimeSec)
      .slice(0, limit)
      .map((w) => ({
        word: w.word,
        meaning: w.meaning,
        timeSec: w.totalTimeSec,
        timeMinutes: Math.round((w.totalTimeSec / 60) * 10) / 10,
        reviews: w.reviewsCount,
        difficulty: w.difficulty,
        color: w.difficulty >= 7 ? '#ef4444' : w.difficulty >= 4 ? '#f59e0b' : '#6366f1',
      }));
  }, [words, topCount]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  if (words.length === 0) {
    return null;
  }

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Time Spent Per Word
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
            </Group>
            <Text size="xs" c="dimmed">
              Identify which vocabulary words consume the most study time and require the highest
              recall effort.
            </Text>
          </div>

          <SegmentedControl
            size="xs"
            radius="md"
            value={topCount}
            onChange={(val) => setTopCount(val as '10' | '20')}
            data={[
              { label: 'Top 10 Time-Consuming', value: '10' },
              { label: 'Top 20 Time-Consuming', value: '20' },
            ]}
          />
        </Group>

        {/* Top Words Chart */}
        {topChartData.length > 0 && (
          <Paper p="md" radius="lg" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Text size="xs" fw={700} c="dimmed" mb="xs" style={{ letterSpacing: '0.04em' }}>
              MOST TIME-CONSUMING WORDS (TOTAL STUDY MINUTES)
            </Text>
            <Box style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.15)" />
                  <XAxis type="number" stroke="rgba(156, 163, 175, 0.6)" fontSize={11} unit="m" />
                  <YAxis
                    type="category"
                    dataKey="word"
                    stroke="rgba(156, 163, 175, 0.6)"
                    fontSize={11}
                    width={80}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(30, 41, 59, 0.92)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 12,
                      fontSize: 12,
                      color: '#fff',
                    }}
                    formatter={(val, _name, item) => [
                      `${val} min (${item.payload.timeSec}s) across ${item.payload.reviews} reviews`,
                      'Study Time',
                    ]}
                  />
                  <Bar dataKey="timeMinutes" radius={[0, 4, 4, 0]}>
                    {topChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        )}

        {/* Search & Table Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <TextInput
            placeholder="Search word, meaning, or tag..."
            leftSection={<IconSearch size={14} />}
            size="xs"
            radius="md"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.currentTarget.value);
              setPage(1);
            }}
            style={{ width: 260 }}
          />

          <Text size="xs" c="dimmed">
            Showing {pagedWords.length} of {filteredWords.length} words
          </Text>
        </Group>

        {/* Ranked Words Table */}
        <Box style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Table
            verticalSpacing="xs"
            horizontalSpacing="sm"
            highlightOnHover
            style={{ minWidth: 720 }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 180 }}>Word</Table.Th>
                <Table.Th>Meaning</Table.Th>
                <Table.Th
                  style={{ cursor: 'pointer', textAlign: 'right' }}
                  onClick={() => handleSort('reviewsCount')}
                >
                  <Group gap={4} justify="flex-end">
                    <Text size="xs" fw={700}>
                      Reviews
                    </Text>
                    {sortField === 'reviewsCount' &&
                      (sortDir === 'desc' ? (
                        <IconSortDescending size={12} />
                      ) : (
                        <IconSortAscending size={12} />
                      ))}
                  </Group>
                </Table.Th>
                <Table.Th
                  style={{ cursor: 'pointer', textAlign: 'right' }}
                  onClick={() => handleSort('totalTimeSec')}
                >
                  <Group gap={4} justify="flex-end">
                    <Text size="xs" fw={700}>
                      Total Time
                    </Text>
                    {sortField === 'totalTimeSec' &&
                      (sortDir === 'desc' ? (
                        <IconSortDescending size={12} />
                      ) : (
                        <IconSortAscending size={12} />
                      ))}
                  </Group>
                </Table.Th>
                <Table.Th
                  style={{ cursor: 'pointer', textAlign: 'right' }}
                  onClick={() => handleSort('avgDurationSec')}
                >
                  <Group gap={4} justify="flex-end">
                    <Text size="xs" fw={700}>
                      Avg/Review
                    </Text>
                    {sortField === 'avgDurationSec' &&
                      (sortDir === 'desc' ? (
                        <IconSortDescending size={12} />
                      ) : (
                        <IconSortAscending size={12} />
                      ))}
                  </Group>
                </Table.Th>
                <Table.Th
                  style={{ cursor: 'pointer', textAlign: 'right' }}
                  onClick={() => handleSort('lapses')}
                >
                  <Group gap={4} justify="flex-end">
                    <Text size="xs" fw={700}>
                      Lapses
                    </Text>
                    {sortField === 'lapses' &&
                      (sortDir === 'desc' ? (
                        <IconSortDescending size={12} />
                      ) : (
                        <IconSortAscending size={12} />
                      ))}
                  </Group>
                </Table.Th>
                <Table.Th
                  style={{ cursor: 'pointer', textAlign: 'right' }}
                  onClick={() => handleSort('difficulty')}
                >
                  <Group gap={4} justify="flex-end">
                    <Text size="xs" fw={700}>
                      Difficulty
                    </Text>
                    {sortField === 'difficulty' &&
                      (sortDir === 'desc' ? (
                        <IconSortDescending size={12} />
                      ) : (
                        <IconSortAscending size={12} />
                      ))}
                  </Group>
                </Table.Th>
                <Table.Th
                  style={{ cursor: 'pointer', textAlign: 'right' }}
                  onClick={() => handleSort('stability')}
                >
                  <Group gap={4} justify="flex-end">
                    <Text size="xs" fw={700}>
                      Stability
                    </Text>
                    {sortField === 'stability' &&
                      (sortDir === 'desc' ? (
                        <IconSortDescending size={12} />
                      ) : (
                        <IconSortAscending size={12} />
                      ))}
                  </Group>
                </Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>State</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pagedWords.map((item) => {
                const parent = allWordsMap.get(item.id);
                return (
                  <Table.Tr
                    key={item.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      if (parent) {
                        onSelectWord(parent);
                      }
                    }}
                  >
                    <Table.Td>
                      <Text size="sm" fw={700}>
                        {item.word}
                      </Text>
                      {item.tags.length > 0 && (
                        <Group gap={4} mt={2}>
                          {item.tags.slice(0, 2).map((t) => (
                            <Badge key={t} size="xs" variant="light" color="gray">
                              {t}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {item.meaning}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="xs" fw={700}>
                        {item.reviewsCount}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="xs" fw={700} c="indigo">
                        {formatDurationHMS(item.totalTimeSec)}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="xs" c="dimmed">
                        {item.avgDurationSec}s
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text
                        size="xs"
                        c={item.lapses > 0 ? 'red' : 'dimmed'}
                        fw={item.lapses > 0 ? 700 : 400}
                      >
                        {item.lapses}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Badge
                        size="xs"
                        variant="light"
                        color={
                          item.difficulty >= 7 ? 'red' : item.difficulty >= 4 ? 'yellow' : 'teal'
                        }
                      >
                        {item.difficulty}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="xs" fw={600}>
                        {item.stability}d
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Badge
                        size="xs"
                        variant="outline"
                        color={
                          item.state === 'Mastered'
                            ? 'teal'
                            : item.state === 'Review'
                              ? 'indigo'
                              : item.state === 'Learning'
                                ? 'yellow'
                                : item.state === 'Relearning'
                                  ? 'red'
                                  : 'gray'
                        }
                      >
                        {item.state}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Box>

        {/* Pagination */}
        {totalPages > 1 && (
          <Group justify="center" mt="xs">
            <Pagination total={totalPages} value={page} onChange={setPage} size="xs" radius="md" />
          </Group>
        )}
      </Stack>
    </Card>
  );
}
