'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Group,
  Pagination,
  Progress,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconEdit, IconSearch } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import type { ProblematicWordItem } from '@/lib/analysis/types';
import { formatInterval } from '@/lib/fsrs';

type DifficultWordsTableProps = {
  words: ProblematicWordItem[];
  onSelectWord: (wordId: string) => void;
};

export function DifficultWordsTable({ words, onSelectWord }: DifficultWordsTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filteredWords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return words;
    }
    return words.filter(
      (w) => w.word.toLowerCase().includes(query) || w.meaning.toLowerCase().includes(query)
    );
  }, [words, search]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / pageSize));
  const pagedWords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredWords.slice(start, start + pageSize);
  }, [filteredWords, page]);

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
                {words.length} words
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              Words with frequent memory lapses, low retrievability, or high FSRS difficulty scores.
            </Text>
          </div>

          <TextInput
            size="xs"
            placeholder="Search difficult words..."
            leftSection={<IconSearch size={14} />}
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
            style={{ width: 220 }}
          />
        </Group>

        {/* Table */}
        <Box style={{ overflowX: 'auto' }}>
          <Table verticalSpacing="xs" horizontalSpacing="sm" striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Word</Table.Th>
                <Table.Th>Difficulty</Table.Th>
                <Table.Th>Reviews / Lapses</Table.Th>
                <Table.Th>Stability</Table.Th>
                <Table.Th>Retrievability</Table.Th>
                <Table.Th>Next Due</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pagedWords.map((item) => {
                const isVeryDifficult = item.difficulty >= 7.5;
                const nextDueText = item.dueAt ? formatInterval(item.dueAt) : 'Due';

                return (
                  <Table.Tr
                    key={item.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectWord(item.id)}
                  >
                    {/* Word & Meaning */}
                    <Table.Td>
                      <Stack gap={1}>
                        <Group gap={6} align="center">
                          <Text fw={700} size="sm">
                            {item.word}
                          </Text>
                          {item.lapses >= 3 && (
                            <Tooltip label="High lapse count (3+ times forgotten)">
                              <Badge size="xs" color="red" variant="filled">
                                Leech
                              </Badge>
                            </Tooltip>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {item.meaning}
                        </Text>
                      </Stack>
                    </Table.Td>

                    {/* Difficulty */}
                    <Table.Td>
                      <Group gap={6} align="center">
                        <Badge
                          size="sm"
                          variant="light"
                          color={
                            isVeryDifficult ? 'red' : item.difficulty >= 5.5 ? 'yellow' : 'indigo'
                          }
                        >
                          {item.difficulty} / 10
                        </Badge>
                      </Group>
                    </Table.Td>

                    {/* Reps / Lapses */}
                    <Table.Td>
                      <Text size="xs" fw={600}>
                        {item.reps} revs •{' '}
                        <Text component="span" c="red.6" fw={700}>
                          {item.lapses} lapses
                        </Text>
                      </Text>
                    </Table.Td>

                    {/* Stability */}
                    <Table.Td>
                      <Text size="xs" fw={700}>
                        {item.stability}{' '}
                        <Text component="span" size="xs" c="dimmed">
                          days
                        </Text>
                      </Text>
                    </Table.Td>

                    {/* Retrievability Progress */}
                    <Table.Td style={{ minWidth: 100 }}>
                      <Stack gap={2}>
                        <Text
                          size="xs"
                          fw={700}
                          c={item.retrievability < 70 ? 'red.6' : 'yellow.6'}
                        >
                          {item.retrievability}%
                        </Text>
                        <Progress
                          size="xs"
                          radius="xl"
                          value={item.retrievability}
                          color={item.retrievability < 70 ? 'red' : 'yellow'}
                        />
                      </Stack>
                    </Table.Td>

                    {/* Next Due */}
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {nextDueText || 'Now'}
                      </Text>
                    </Table.Td>

                    {/* Action */}
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Tooltip label="View and edit word card">
                        <ActionIcon
                          variant="light"
                          color="indigo"
                          size="sm"
                          radius="md"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectWord(item.id);
                          }}
                        >
                          <IconEdit size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Box>

        {/* Pagination */}
        {totalPages > 1 && (
          <Group justify="flex-end" mt="xs">
            <Pagination size="xs" total={totalPages} value={page} onChange={setPage} radius="md" />
          </Group>
        )}
      </Stack>
    </Card>
  );
}
