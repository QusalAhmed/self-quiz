'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBook,
  IconCircleCheck,
  IconEye,
  IconFilter,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import { type QuranVerseRecord } from '@/lib/db';
import { appNotifications } from '@/lib/notifications';
import { getChapterMetadata } from '@/lib/quran-api';
import { deleteQuranVerseRecord, toggleQuranVerseStatus } from '@/lib/quran-service';
import { AddQuranVerseModal } from './AddQuranVerseModal';

export interface QuranVerseManagerProps {
  verses: QuranVerseRecord[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onPreviewVerse?: (chapter: number, verse: number, record?: QuranVerseRecord) => void;
  onShowRandomNow?: () => void;
}

export function QuranVerseManager({
  verses,
  isLoading = false,
  onRefresh,
  onPreviewVerse,
  onShowRandomNow,
}: QuranVerseManagerProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>('all');

  // Compute Categories for Filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const v of verses) {
      if (v.category) {
        set.add(v.category);
      }
    }
    return ['all', ...Array.from(set)];
  }, [verses]);

  // Filtered Verses
  const filteredVerses = useMemo(() => {
    return verses.filter((v) => {
      if (v.isDeleted) {
        return false;
      }

      // Status filter
      if (statusFilter === 'active' && v.status !== 'active') {
        return false;
      }
      if (statusFilter === 'paused' && v.status !== 'paused') {
        return false;
      }
      if (statusFilter === 'error' && v.status !== 'error') {
        return false;
      }

      // Category filter
      if (categoryFilter && categoryFilter !== 'all' && v.category !== categoryFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const meta = getChapterMetadata(v.chapter);
        const matchKey = v.id.toLowerCase().includes(q);
        const matchSurah = meta
          ? meta.nameSimple.toLowerCase().includes(q) ||
            meta.translatedName.toLowerCase().includes(q)
          : false;
        const matchCat = v.category?.toLowerCase().includes(q) || false;
        const matchNotes = v.notes?.toLowerCase().includes(q) || false;

        return matchKey || matchSurah || matchCat || matchNotes;
      }

      return true;
    });
  }, [verses, searchQuery, categoryFilter, statusFilter]);

  // Statistics
  const totalVersesCount = verses.filter((v) => !v.isDeleted).length;
  const activeVersesCount = verses.filter((v) => !v.isDeleted && v.status === 'active').length;
  const totalViewsCount = verses.reduce((sum, v) => sum + (v.viewCount || 0), 0);

  const handleToggleActive = async (verse: QuranVerseRecord) => {
    const willBeActive = verse.status !== 'active';
    try {
      await toggleQuranVerseStatus(verse.id, willBeActive);
      appNotifications.success({
        title: willBeActive ? 'Verse Activated' : 'Verse Paused',
        message: `Ayah ${verse.id} ${willBeActive ? 'will be included' : 'paused from'} recurring popup cycles.`,
      });
      onRefresh?.();
    } catch (err: any) {
      appNotifications.error({ title: 'Update Failed', message: err?.message });
    }
  };

  const handleDelete = async (verse: QuranVerseRecord) => {
    try {
      await deleteQuranVerseRecord(verse.id);
      appNotifications.success({
        title: 'Verse Removed',
        message: `Ayah ${verse.id} removed from your database.`,
      });
      onRefresh?.();
    } catch (err: any) {
      appNotifications.error({ title: 'Delete Failed', message: err?.message });
    }
  };

  return (
    <Stack gap="lg">
      {/* Top Stats Cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card p="md" radius="lg" withBorder style={{ background: 'var(--card-bg)' }}>
          <Group justify="space-between" align="center">
            <Stack gap={2}>
              <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                TOTAL SAVED VERSES
              </Text>
              <Title order={2} style={{ fontWeight: 800 }}>
                {totalVersesCount}
              </Title>
            </Stack>
            <ThemeIcon size="xl" radius="md" color="indigo" variant="light">
              <IconBook size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card p="md" radius="lg" withBorder style={{ background: 'var(--card-bg)' }}>
          <Group justify="space-between" align="center">
            <Stack gap={2}>
              <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                ACTIVE IN CYCLE
              </Text>
              <Title order={2} style={{ fontWeight: 800, color: 'var(--mantine-color-teal-6)' }}>
                {activeVersesCount}
              </Title>
            </Stack>
            <ThemeIcon size="xl" radius="md" color="teal" variant="light">
              <IconCircleCheck size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card p="md" radius="lg" withBorder style={{ background: 'var(--card-bg)' }}>
          <Group justify="space-between" align="center">
            <Stack gap={2}>
              <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                TOTAL VIEWS DELIVERED
              </Text>
              <Title order={2} style={{ fontWeight: 800, color: 'var(--mantine-color-amber-6)' }}>
                {totalViewsCount}
              </Title>
            </Stack>
            <ThemeIcon size="xl" radius="md" color="amber" variant="light">
              <IconSparkles size={24} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Action Header & Search Controls */}
      <Card p="md" radius="lg" withBorder style={{ background: 'var(--card-bg)' }}>
        <Stack gap="md">
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Stack gap={2}>
              <Title order={4} style={{ fontWeight: 700 }}>
                Quran Verse Library
              </Title>
              <Text size="xs" c="dimmed">
                Manage verses stored in Supabase & local DB for inspirational recurring popups
              </Text>
            </Stack>

            <Group gap="xs">
              {onShowRandomNow && (
                <Button
                  variant="light"
                  color="teal"
                  size="sm"
                  leftSection={<IconPlayerPlay size={16} />}
                  onClick={onShowRandomNow}
                >
                  Show Random Verse Now
                </Button>
              )}

              <Button
                variant="filled"
                color="indigo"
                size="sm"
                leftSection={<IconPlus size={16} />}
                onClick={() => setAddModalOpen(true)}
              >
                Add Verses
              </Button>
            </Group>
          </Group>

          {/* Filter Bar */}
          <Grid align="center" gap="xs">
            <Grid.Col span={{ base: 12, sm: 6, md: 5 }}>
              <TextInput
                placeholder="Search by Surah, verse key e.g. 2:255, theme..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                size="sm"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 6, sm: 3, md: 3 }}>
              <Select
                placeholder="Category Filter"
                data={categories.map((c) => ({
                  value: c,
                  label: c === 'all' ? 'All Categories' : c,
                }))}
                value={categoryFilter}
                onChange={setCategoryFilter}
                size="sm"
                leftSection={<IconFilter size={14} />}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 6, sm: 3, md: 2 }}>
              <Select
                placeholder="Status"
                data={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active only' },
                  { value: 'paused', label: 'Paused only' },
                  { value: 'error', label: 'Errors only' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                size="sm"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 2 }}>
              <Button
                variant="subtle"
                color="gray"
                size="sm"
                fullWidth
                leftSection={<IconRefresh size={14} />}
                onClick={onRefresh}
                loading={isLoading}
              >
                Refresh
              </Button>
            </Grid.Col>
          </Grid>
        </Stack>
      </Card>

      {/* Verses Table */}
      <Card
        p={0}
        radius="lg"
        withBorder
        style={{ background: 'var(--card-bg)', overflow: 'hidden' }}
      >
        <ScrollArea type="auto">
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead style={{ background: 'rgba(0, 0, 0, 0.03)' }}>
              <Table.Tr>
                <Table.Th style={{ width: 110 }}>Verse Key</Table.Th>
                <Table.Th>Surah Name</Table.Th>
                <Table.Th>Theme / Category</Table.Th>
                <Table.Th style={{ width: 120 }}>Status</Table.Th>
                <Table.Th style={{ width: 100 }}>Views</Table.Th>
                <Table.Th style={{ width: 140 }}>Last Shown</Table.Th>
                <Table.Th style={{ width: 140, textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredVerses.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px' }}>
                    <Stack align="center" gap="xs">
                      <ThemeIcon size="xl" radius="xl" color="gray" variant="light">
                        <IconBook size={24} />
                      </ThemeIcon>
                      <Text size="sm" fw={600} c="dimmed">
                        No Quran verses found matching your filters
                      </Text>
                      <Button
                        size="xs"
                        variant="light"
                        color="indigo"
                        leftSection={<IconPlus size={14} />}
                        onClick={() => setAddModalOpen(true)}
                      >
                        Add Inspirational Verses
                      </Button>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filteredVerses.map((verse) => {
                  const meta = getChapterMetadata(verse.chapter);
                  const isActive = verse.status === 'active';
                  const isError = verse.status === 'error';

                  return (
                    <Table.Tr key={verse.id}>
                      {/* Verse Key */}
                      <Table.Td>
                        <Badge variant="filled" color="indigo" size="md">
                          {verse.id}
                        </Badge>
                      </Table.Td>

                      {/* Surah Name & Meaning */}
                      <Table.Td>
                        <Stack gap={1}>
                          <Text size="sm" fw={600}>
                            {meta ? `${meta.id}. ${meta.nameSimple}` : `Surah ${verse.chapter}`}
                            <Text component="span" size="xs" c="dimmed" ml={6}>
                              ({meta?.nameArabic})
                            </Text>
                          </Text>
                          <Text size="xs" c="dimmed">
                            {meta?.translatedName} • Ayah {verse.verse}
                          </Text>
                        </Stack>
                      </Table.Td>

                      {/* Theme / Category */}
                      <Table.Td>
                        <Stack gap={2}>
                          <Badge variant="light" color="teal" size="sm">
                            {verse.category || 'Inspirational'}
                          </Badge>
                          {verse.notes && (
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {verse.notes}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>

                      {/* Status */}
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          <Switch
                            size="sm"
                            color="teal"
                            checked={isActive}
                            onChange={() => handleToggleActive(verse)}
                          />
                          {isError ? (
                            <Tooltip label={verse.lastError || 'Last API call failed'}>
                              <Badge color="red" size="xs" variant="filled">
                                Error
                              </Badge>
                            </Tooltip>
                          ) : (
                            <Badge color={isActive ? 'teal' : 'gray'} size="xs" variant="light">
                              {isActive ? 'Active' : 'Paused'}
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>

                      {/* View Count */}
                      <Table.Td>
                        <Text size="sm" fw={600}>
                          {verse.viewCount || 0}
                        </Text>
                      </Table.Td>

                      {/* Last Viewed */}
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {verse.lastViewedAt
                            ? new Date(verse.lastViewedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Not yet shown'}
                        </Text>
                      </Table.Td>

                      {/* Actions */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="Preview popup now">
                            <ActionIcon
                              variant="light"
                              color="indigo"
                              size="sm"
                              radius="md"
                              onClick={() => onPreviewVerse?.(verse.chapter, verse.verse, verse)}
                            >
                              <IconEye size={14} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Delete verse">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              radius="md"
                              onClick={() => handleDelete(verse)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Add Modal */}
      <AddQuranVerseModal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onVersesAdded={() => onRefresh?.()}
        existingVerseIds={verses.map((v) => v.id)}
      />
    </Stack>
  );
}
