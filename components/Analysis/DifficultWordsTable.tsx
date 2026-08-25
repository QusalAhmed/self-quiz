'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Group,
  Pagination,
  Progress,
  RollingNumber,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconEdit,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import { PronounceButton } from '@/components/WordActions';
import { formatDurationHMS } from '@/lib/analysis/calculator';
import type { ProblematicWordItem } from '@/lib/analysis/types';

type DifficultWordsTableProps = {
  words: ProblematicWordItem[];
  onSelectWord: (wordId: string) => void;
};

type DifficultSortSignal =
  | 'problemScore'
  | 'lapses'
  | 'againCount'
  | 'difficulty'
  | 'stability'
  | 'retrievability'
  | 'totalTimeSec'
  | 'reps';

export function DifficultWordsTable({ words, onSelectWord }: DifficultWordsTableProps) {
  const [search, setSearch] = useState('');
  const [sortSignal, setSortSignal] = useState<DifficultSortSignal>('problemScore');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filteredWords = useMemo(() => {
    let result = words;
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (w) => w.word.toLowerCase().includes(query) || w.meaning.toLowerCase().includes(query)
      );
    }

    return [...result].sort((a, b) => {
      const valA = a[sortSignal] || 0;
      const valB = b[sortSignal] || 0;
      // For stability and retrievability, ascending means weakest first by default
      if (sortSignal === 'stability' || sortSignal === 'retrievability') {
        return sortDir === 'desc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
      return sortDir === 'desc'
        ? (valB as number) - (valA as number)
        : (valA as number) - (valB as number);
    });
  }, [words, search, sortSignal, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / pageSize));
  const pagedWords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredWords.slice(start, start + pageSize);
  }, [filteredWords, page]);

  const handleHeaderSort = (signal: DifficultSortSignal) => {
    if (sortSignal === signal) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortSignal(signal);
      setSortDir('desc');
    }
    setPage(1);
  };

  if (words.length === 0) {
    return (
      <Card className="glass-panel" radius="xl" padding="lg">
        <Stack align="center" gap="xs" py="md">
          <IconAlertTriangle size={36} style={{ color: '#10b981', opacity: 0.8 }} />
          <Title order={4} ta="center">
            No Problematic Words Detected
          </Title>
          <Text size="xs" c="dimmed" ta="center" maw={420}>
            Great job! None of your vocabulary words are currently suffering from high lapse rates
            or severe memory decay.
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Difficult Vocabulary & Problematic Words
              </Title>
              <Badge color="red" variant="light" size="sm">
                <RollingNumber value={words.length} /> words
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              Multi-signal ranking by lapses, difficulty, retrievability decay, and total review
              effort.
            </Text>
          </div>

          <Group gap="xs" wrap="wrap" w={{ base: '100%', sm: 'auto' }}>
            <Select
              size="xs"
              radius="md"
              value={sortSignal}
              onChange={(v) => {
                if (v) {
                  setSortSignal(v as DifficultSortSignal);
                }
              }}
              data={[
                { label: 'Risk Score (Composite)', value: 'problemScore' },
                { label: 'Highest Lapses', value: 'lapses' },
                { label: 'Most "Again" Ratings', value: 'againCount' },
                { label: 'Highest Difficulty', value: 'difficulty' },
                { label: 'Lowest Stability', value: 'stability' },
                { label: 'Lowest Retrievability', value: 'retrievability' },
                { label: 'Most Time Spent', value: 'totalTimeSec' },
              ]}
              w={{ base: '100%', sm: 190 }}
            />

            <TextInput
              size="xs"
              placeholder="Search words..."
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setPage(1);
              }}
              w={{ base: '100%', sm: 170 }}
            />
          </Group>
        </Group>

        {/* Table */}
        <Box style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Table
            verticalSpacing="xs"
            horizontalSpacing="sm"
            highlightOnHover
            style={{ minWidth: 680 }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 180 }}>Word</Table.Th>
                <Table.Th>Meaning</Table.Th>
                <Table.Th
                  style={{ cursor: 'pointer', textAlign: 'right' }}
                  onClick={() => handleHeaderSort('difficulty')}
                >
                  <Group gap={4} justify="flex-end">
                    <Text size="xs" fw={700}>
                      Difficulty
                    </Text>
                    {sortSignal === 'difficulty' &&
                      (sortDir === 'desc' ? (
                        <IconSortDescending size={12} />
                      ) : (
                        <IconSortAscending size={12} />
                      ))}
                  </Group>
                </Table.Th>
                <Table.Th
                  style={{ cursor: 'pointer', textAlign: 'right' }}
                  onClick={() => handleHeaderSort('stability')}
                >
                  <Group gap={4} justify="flex-end">
                    <Text size="xs" fw={700}>
                      Stability
                    </Text>
                    {sortSignal === 'stability' &&
                      (sortDir === 'desc' ? (
                        <IconSortDescending size={12} />
                      ) : (
                        <IconSortAscending size={12} />
                      ))}
                  </Group>
                </Table.Th>
                <Table.Th
                  style={{ cursor: 'pointer', width: 140 }}
                  onClick={() => handleHeaderSort('retrievability')}
                >
                  <Group gap={4} justify="flex-start">
                    <Text size="xs" fw={700}>
                      Retrievability
                    </Text>
                    {sortSignal === 'retrievability' &&
                      (sortDir === 'desc' ? (
                        <IconSortDescending size={12} />
                      ) : (
                        <IconSortAscending size={12} />
                      ))}
                  </Group>
                </Table.Th>
                <Table.Th
                  style={{ cursor: 'pointer', textAlign: 'right' }}
                  onClick={() => handleHeaderSort('lapses')}
                >
                  <Group gap={4} justify="flex-end">
                    <Text size="xs" fw={700}>
                      Lapses
                    </Text>
                    {sortSignal === 'lapses' &&
                      (sortDir === 'desc' ? (
                        <IconSortDescending size={12} />
                      ) : (
                        <IconSortAscending size={12} />
                      ))}
                  </Group>
                </Table.Th>
                <Table.Th
                  style={{ cursor: 'pointer', textAlign: 'right' }}
                  onClick={() => handleHeaderSort('totalTimeSec')}
                >
                  <Group gap={4} justify="flex-end">
                    <Text size="xs" fw={700}>
                      Study Time
                    </Text>
                    {sortSignal === 'totalTimeSec' &&
                      (sortDir === 'desc' ? (
                        <IconSortDescending size={12} />
                      ) : (
                        <IconSortAscending size={12} />
                      ))}
                  </Group>
                </Table.Th>
                <Table.Th style={{ width: 60, textAlign: 'center' }}>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pagedWords.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Group gap={6} align="center" wrap="nowrap">
                      <Text size="sm" fw={700}>
                        {item.word}
                      </Text>
                      <PronounceButton word={item.word} size="xs" />
                    </Group>
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
                    <Badge
                      size="xs"
                      variant="light"
                      color={
                        item.difficulty >= 8 ? 'red' : item.difficulty >= 6 ? 'orange' : 'yellow'
                      }
                    >
                      <RollingNumber value={item.difficulty} decimalScale={1} suffix="/10" />
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text component="div" size="xs" fw={600}>
                      <RollingNumber value={item.stability} decimalScale={1} suffix="d" />
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" align="center" wrap="nowrap">
                      <Progress
                        value={item.retrievability}
                        color={
                          item.retrievability < 70
                            ? 'red'
                            : item.retrievability < 85
                              ? 'yellow'
                              : 'teal'
                        }
                        size="sm"
                        radius="xl"
                        style={{ flex: 1 }}
                      />
                      <Text component="div" size="11px" fw={700} style={{ minWidth: 32 }}>
                        <RollingNumber value={item.retrievability} decimalScale={1} suffix="%" />
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Badge size="xs" variant="filled" color={item.lapses >= 3 ? 'red' : 'orange'}>
                      <RollingNumber value={item.lapses} /> lapses
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="xs" c="indigo" fw={600}>
                      {formatDurationHMS(item.totalTimeSec)}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Tooltip label="Edit dictionary entry" withArrow>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="indigo"
                        onClick={() => onSelectWord(item.id)}
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
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
