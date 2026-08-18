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
import { IconEdit, IconSearch, IconSparkles } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import type { StrongWordItem } from '@/lib/analysis/types';
import { formatInterval } from '@/lib/fsrs';

type StrongestWordsTableProps = {
  words: StrongWordItem[];
  onSelectWord: (wordId: string) => void;
};

export function StrongestWordsTable({ words, onSelectWord }: StrongestWordsTableProps) {
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
              Words firmly consolidated in long-term memory with high stability and zero lapses.
            </Text>
          </div>

          <TextInput
            size="xs"
            placeholder="Search strongest words..."
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
                <Table.Th>Stability (Days)</Table.Th>
                <Table.Th>Reviews</Table.Th>
                <Table.Th>Retrievability</Table.Th>
                <Table.Th>Next Due</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pagedWords.map((item) => {
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
                          {item.stability >= 30 && (
                            <Badge size="xs" color="teal" variant="light">
                              Mature
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {item.meaning}
                        </Text>
                      </Stack>
                    </Table.Td>

                    {/* Stability */}
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="gradient"
                        gradient={{ from: 'teal', to: 'indigo', deg: 45 }}
                      >
                        {item.stability} days
                      </Badge>
                    </Table.Td>

                    {/* Reps */}
                    <Table.Td>
                      <Text size="xs" fw={600}>
                        {item.reps} reviews • 0 lapses
                      </Text>
                    </Table.Td>

                    {/* Retrievability Progress */}
                    <Table.Td style={{ minWidth: 100 }}>
                      <Stack gap={2}>
                        <Text size="xs" fw={700} c="teal.6">
                          {item.retrievability}%
                        </Text>
                        <Progress size="xs" radius="xl" value={item.retrievability} color="teal" />
                      </Stack>
                    </Table.Td>

                    {/* Next Due */}
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {nextDueText || 'Scheduled'}
                      </Text>
                    </Table.Td>

                    {/* Action */}
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Tooltip label="View and edit word card">
                        <ActionIcon
                          variant="light"
                          color="teal"
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
