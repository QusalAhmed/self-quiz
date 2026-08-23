'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowRight,
  IconClock,
  IconEdit,
  IconEye,
  IconHistory,
  IconMoodHappy,
  IconMoodSmile,
  IconX,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import { PronounceButton } from '@/components/WordActions';
import type { ReviewLogRecord } from '@/lib/db';

export type ReviewLogTableProps = {
  logs: ReviewLogRecord[];
  onInspectLog: (log: ReviewLogRecord) => void;
  onSelectWord?: (wordId: string) => void;
};

export function ReviewLogTable({ logs, onInspectLog, onSelectWord }: ReviewLogTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const totalPages = Math.ceil(logs.length / pageSize);
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return logs.slice(start, start + pageSize);
  }, [logs, page, pageSize]);

  const ratingConfigs: Record<
    string,
    { color: string; label: string; icon: React.ComponentType<{ size: number }> }
  > = {
    again: { color: 'red', label: 'Again', icon: IconX },
    hard: { color: 'yellow', label: 'Hard', icon: IconClock },
    good: { color: 'indigo', label: 'Good', icon: IconMoodSmile },
    easy: { color: 'teal', label: 'Easy', icon: IconMoodHappy },
  };

  const formatRelativeTime = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) {
      return 'Just now';
    }
    if (diffSec < 3600) {
      return `${Math.floor(diffSec / 60)}m ago`;
    }
    if (diffSec < 86400) {
      return `${Math.floor(diffSec / 3600)}h ago`;
    }
    if (diffSec < 86400 * 7) {
      return `${Math.floor(diffSec / 86400)}d ago`;
    }

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (logs.length === 0) {
    return (
      <Card className="glass-panel" radius="xl" padding="xl" style={{ textAlign: 'center' }}>
        <Stack align="center" gap="sm" py="xl">
          <ThemeIcon size="xl" radius="xl" color="gray" variant="light">
            <IconHistory size={28} />
          </ThemeIcon>
          <Text fw={700} size="md">
            No Review Events Found
          </Text>
          <Text size="xs" c="dimmed" maw={380}>
            No historical reviews match the selected filter criteria. Complete flashcard reviews or
            adjust your filters above.
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card className="glass-panel" radius="xl" padding="md">
      <Stack gap="md">
        {/* Table Container */}
        <Box style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Table
            verticalSpacing="sm"
            horizontalSpacing="md"
            highlightOnHover
            style={{ minWidth: 700 }}
          >
            <Table.Thead>
              <Table.Tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                <Table.Th
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--mantine-color-dimmed)',
                  }}
                >
                  TIME
                </Table.Th>
                <Table.Th
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--mantine-color-dimmed)',
                  }}
                >
                  WORD & MEANING
                </Table.Th>
                <Table.Th
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--mantine-color-dimmed)',
                  }}
                >
                  RATING
                </Table.Th>
                <Table.Th
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--mantine-color-dimmed)',
                  }}
                >
                  STATE
                </Table.Th>
                <Table.Th
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--mantine-color-dimmed)',
                  }}
                >
                  INTERVAL / STABILITY
                </Table.Th>
                <Table.Th
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--mantine-color-dimmed)',
                  }}
                >
                  DURATION
                </Table.Th>
                <Table.Th
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textAlign: 'right',
                    color: 'var(--mantine-color-dimmed)',
                  }}
                >
                  ACTION
                </Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {paginatedLogs.map((log) => {
                const config = ratingConfigs[log.rating] || ratingConfigs.good;
                const IconComponent = config.icon;

                return (
                  <Table.Tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid var(--card-border)',
                      cursor: 'pointer',
                    }}
                    onClick={() => onInspectLog(log)}
                  >
                    {/* Timestamp */}
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                      <Tooltip label={new Date(log.reviewedAt).toLocaleString()} withArrow>
                        <Text size="xs" fw={600} c="dimmed">
                          {formatRelativeTime(log.reviewedAt)}
                        </Text>
                      </Tooltip>
                    </Table.Td>

                    {/* Word & Meaning */}
                    <Table.Td style={{ minWidth: 180 }}>
                      <Group gap="xs" wrap="nowrap">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap={6} align="center">
                            <Text size="sm" fw={700} style={{ fontFamily: 'var(--font-title)' }}>
                              {log.word}
                            </Text>
                            <PronounceButton word={log.word} size="xs" />
                            <Badge size="xs" variant="outline" color="gray" radius="sm">
                              {log.quizMode === 'wordToMeaning' ? 'W→M' : 'M→W'}
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed" truncate="end" maw={220}>
                            {log.meaning}
                          </Text>
                        </Box>

                        {onSelectWord && (
                          <Tooltip label="Edit word in dictionary">
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="gray"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectWord(log.wordId);
                              }}
                            >
                              <IconEdit size={13} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>

                    {/* Rating Given */}
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                      <Badge
                        size="sm"
                        variant="filled"
                        color={config.color}
                        radius="sm"
                        leftSection={<IconComponent size={12} />}
                      >
                        {config.label}
                      </Badge>
                    </Table.Td>

                    {/* State change */}
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                      <Group gap={4} align="center">
                        <Text size="xs" c="dimmed">
                          {log.stateBefore}
                        </Text>
                        <IconArrowRight size={10} style={{ opacity: 0.5 }} />
                        <Badge
                          size="xs"
                          variant="light"
                          color={
                            log.stateAfter === 'Review'
                              ? 'indigo'
                              : log.stateAfter === 'Learning'
                                ? 'orange'
                                : 'teal'
                          }
                        >
                          {log.stateAfter}
                        </Badge>
                      </Group>
                    </Table.Td>

                    {/* Interval & Stability */}
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                      <Group gap="xs">
                        <Text size="xs" fw={700} c="indigo">
                          {log.scheduledDays > 0 ? `${log.scheduledDays}d` : '<1d'}
                        </Text>
                        <Text size="xs" c="dimmed">
                          (S: {log.stability.toFixed(1)}d)
                        </Text>
                      </Group>
                    </Table.Td>

                    {/* Response Duration */}
                    <Table.Td style={{ whiteSpace: 'nowrap' }}>
                      <Text size="xs" c={log.durationMs > 5000 ? 'orange.6' : 'dimmed'}>
                        {log.durationMs > 0 ? `${(log.durationMs / 1000).toFixed(1)}s` : '<0.1s'}
                      </Text>
                    </Table.Td>

                    {/* Inspect Action */}
                    <Table.Td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Button
                        size="xs"
                        variant="light"
                        color="indigo"
                        radius="md"
                        leftSection={<IconEye size={13} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectLog(log);
                        }}
                      >
                        Inspect
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Box>

        {/* Pagination & Page Size Footer */}
        {logs.length > 0 && (
          <Group
            justify="space-between"
            align="center"
            wrap="wrap"
            pt="xs"
            style={{ borderTop: '1px solid var(--card-border)' }}
          >
            <Group gap="xs" align="center">
              <Text size="xs" c="dimmed">
                Rows per page:
              </Text>
              <Select
                size="xs"
                radius="md"
                w={80}
                value={String(pageSize)}
                onChange={(v) => {
                  setPageSize(Number(v) || 20);
                  setPage(1);
                }}
                data={['10', '20', '50', '100']}
              />
              <Text size="xs" c="dimmed">
                Showing {Math.min((page - 1) * pageSize + 1, logs.length)}–
                {Math.min(page * pageSize, logs.length)} of {logs.length}
              </Text>
            </Group>

            {totalPages > 1 && (
              <Pagination
                size="xs"
                radius="md"
                total={totalPages}
                value={page}
                onChange={setPage}
                color="indigo"
              />
            )}
          </Group>
        )}
      </Stack>
    </Card>
  );
}
