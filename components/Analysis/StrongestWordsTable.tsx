'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Group,
  Pagination,
  Progress,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconEdit,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconSparkles,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import { PronounceButton } from '@/components/WordActions';
import { formatDurationHMS } from '@/lib/analysis/calculator';
import type { StrongWordItem } from '@/lib/analysis/types';

type StrongestWordsTableProps = {
  words: StrongWordItem[];
  onSelectWord: (wordId: string) => void;
};

type StrongSortSignal = 'stability' | 'retrievability' | 'reps' | 'totalTimeSec' | 'lapses';

export function StrongestWordsTable({ words, onSelectWord }: StrongestWordsTableProps) {
  const [search, setSearch] = useState('');
  const [sortSignal, setSortSignal] = useState<StrongSortSignal>('stability');
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
      if (sortSignal === 'lapses') {
        // Fewest lapses first
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

  const handleHeaderSort = (signal: StrongSortSignal) => {
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
          <IconSparkles size={36} style={{ color: '#6366f1', opacity: 0.8 }} />
          <Title order={4} ta="center">
            Building Mastered Vocabulary
          </Title>
          <Text size="xs" c="dimmed" ta="center" maw={420}>
            Continue your daily review sessions. Once words achieve high stability (≥ 14 days) with
            zero lapses, they will appear here!
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
                Strongest Memorized Words
              </Title>
              <Badge color="teal" variant="light" size="sm">
                {words.length} words
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              Words firmly consolidated in long-term memory with high stability, strong retention,
              and low lapse rate.
            </Text>
          </div>

          <Group gap="xs" wrap="wrap" w={{ base: '100%', sm: 'auto' }}>
            <Select
              size="xs"
              radius="md"
              value={sortSignal}
              onChange={(v) => {
                if (v) {
                  setSortSignal(v as StrongSortSignal);
                }
              }}
              data={[
                { label: 'Highest Stability', value: 'stability' },
                { label: 'Highest Retrievability', value: 'retrievability' },
                { label: 'Most Reviews', value: 'reps' },
                { label: 'Lowest Study Time', value: 'totalTimeSec' },
                { label: 'Fewest Lapses', value: 'lapses' },
              ]}
              w={{ base: '100%', sm: 180 }}
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
                  onClick={() => handleHeaderSort('reps')}
                >
                  <Group gap={4} justify="flex-end">
                    <Text size="xs" fw={700}>
                      Reviews
                    </Text>
                    {sortSignal === 'reps' &&
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
                    <Badge size="xs" variant="light" color="teal">
                      {item.stability}d
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" align="center" wrap="nowrap">
                      <Progress
                        value={item.retrievability}
                        color="teal"
                        size="sm"
                        radius="xl"
                        style={{ flex: 1 }}
                      />
                      <Text size="11px" fw={700} style={{ minWidth: 32 }}>
                        {item.retrievability}%
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="xs" fw={600}>
                      {item.reps} revs
                    </Text>
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
