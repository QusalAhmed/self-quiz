'use client';

import {
  ActionIcon,
  Box,
  Button,
  Card,
  Group,
  RollingNumber,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconAdjustments,
  IconCalendar,
  IconRotateClockwise,
  IconSearch,
  IconSortDescending,
  IconTags,
  IconX,
} from '@tabler/icons-react';
import React, { useState } from 'react';
import type { QuizMode } from '@/lib/db';
import type { FsrsRating } from '@/lib/fsrs';

export type ReviewLogFilterState = {
  searchQuery: string;
  ratingFilter: 'all' | FsrsRating;
  stateFilter: 'all' | 'New' | 'Learning' | 'Review' | 'Relearning';
  modeFilter: 'all' | QuizMode;
  datePreset: 'all' | 'today' | '7d' | '30d' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  groupFilter: string;
  sortBy: 'newest' | 'oldest' | 'duration' | 'difficulty' | 'retrievability';
};

export type ReviewLogFiltersProps = {
  filters: ReviewLogFilterState;
  onFiltersChange: (filters: ReviewLogFilterState) => void;
  availableGroups: string[];
  totalLogsCount: number;
  filteredLogsCount: number;
};

export function ReviewLogFilters({
  filters,
  onFiltersChange,
  availableGroups,
  totalLogsCount,
  filteredLogsCount,
}: ReviewLogFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const handleReset = () => {
    onFiltersChange({
      searchQuery: '',
      ratingFilter: 'all',
      stateFilter: 'all',
      modeFilter: 'all',
      datePreset: 'all',
      customStartDate: undefined,
      customEndDate: undefined,
      groupFilter: 'all',
      sortBy: 'newest',
    });
  };

  const isFiltered =
    filters.searchQuery !== '' ||
    filters.ratingFilter !== 'all' ||
    filters.stateFilter !== 'all' ||
    filters.modeFilter !== 'all' ||
    filters.datePreset !== 'all' ||
    filters.groupFilter !== 'all' ||
    filters.sortBy !== 'newest';

  return (
    <Card className="glass-panel" radius="xl" padding="md">
      <Stack gap="sm">
        {/* Main Search & Quick Controls Row */}
        <Group justify="space-between" align="center" wrap="wrap">
          <TextInput
            placeholder="Search word or meaning in review log..."
            leftSection={<IconSearch size={16} />}
            rightSection={
              filters.searchQuery ? (
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={() => onFiltersChange({ ...filters, searchQuery: '' })}
                >
                  <IconX size={12} />
                </ActionIcon>
              ) : null
            }
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.currentTarget.value })}
            style={{ flex: 1, minWidth: 220 }}
            radius="md"
            size="sm"
          />

          <Group gap="xs" wrap="wrap" w={{ base: '100%', sm: 'auto' }}>
            <Select
              size="sm"
              radius="md"
              leftSection={<IconSortDescending size={16} />}
              value={filters.sortBy}
              onChange={(val) =>
                onFiltersChange({
                  ...filters,
                  sortBy: (val as ReviewLogFilterState['sortBy']) || 'newest',
                })
              }
              data={[
                { label: 'Newest Reviews First', value: 'newest' },
                { label: 'Oldest Reviews First', value: 'oldest' },
                { label: 'Highest Response Time', value: 'duration' },
                { label: 'Highest Difficulty', value: 'difficulty' },
                { label: 'Lowest Retrievability', value: 'retrievability' },
              ]}
              w={{ base: '100%', sm: 200 }}
            />

            <Button
              size="sm"
              radius="md"
              variant={expanded ? 'light' : 'default'}
              color="indigo"
              leftSection={<IconAdjustments size={16} />}
              onClick={() => setExpanded((v) => !v)}
            >
              Filters {isFiltered && '•'}
            </Button>

            {isFiltered && (
              <Tooltip label="Reset all filters">
                <ActionIcon
                  size="input-sm"
                  radius="md"
                  variant="subtle"
                  color="gray"
                  onClick={handleReset}
                >
                  <IconRotateClockwise size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        {/* Collapsible Advanced Filters Drawer */}
        {expanded && (
          <Box pt="xs">
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
              {/* Rating Filter */}
              <Select
                size="xs"
                radius="md"
                label="Rating Given"
                value={filters.ratingFilter}
                onChange={(val) =>
                  onFiltersChange({
                    ...filters,
                    ratingFilter: (val as ReviewLogFilterState['ratingFilter']) || 'all',
                  })
                }
                data={[
                  { label: 'All Ratings', value: 'all' },
                  { label: 'Again (Forgot)', value: 'again' },
                  { label: 'Hard (Hesitated)', value: 'hard' },
                  { label: 'Good (Recalled)', value: 'good' },
                  { label: 'Easy (Instant)', value: 'easy' },
                ]}
              />

              {/* State After Filter */}
              <Select
                size="xs"
                radius="md"
                label="Memory State"
                value={filters.stateFilter}
                onChange={(val) =>
                  onFiltersChange({
                    ...filters,
                    stateFilter: (val as ReviewLogFilterState['stateFilter']) || 'all',
                  })
                }
                data={[
                  { label: 'All Memory States', value: 'all' },
                  { label: 'Review', value: 'Review' },
                  { label: 'Learning', value: 'Learning' },
                  { label: 'Relearning', value: 'Relearning' },
                  { label: 'New', value: 'New' },
                ]}
              />

              {/* Quiz Mode Filter */}
              <Select
                size="xs"
                radius="md"
                label="Quiz Mode"
                value={filters.modeFilter}
                onChange={(val) =>
                  onFiltersChange({
                    ...filters,
                    modeFilter: (val as ReviewLogFilterState['modeFilter']) || 'all',
                  })
                }
                data={[
                  { label: 'All Quiz Modes', value: 'all' },
                  { label: 'Word → Meaning', value: 'wordToMeaning' },
                  { label: 'Meaning → Word', value: 'meaningToWord' },
                ]}
              />

              {/* Date Preset */}
              <Select
                size="xs"
                radius="md"
                label="Review Date Period"
                leftSection={<IconCalendar size={14} />}
                value={filters.datePreset}
                onChange={(val) =>
                  onFiltersChange({
                    ...filters,
                    datePreset: (val as ReviewLogFilterState['datePreset']) || 'all',
                  })
                }
                data={[
                  { label: 'All Time', value: 'all' },
                  { label: 'Today', value: 'today' },
                  { label: 'Past 7 Days', value: '7d' },
                  { label: 'Past 30 Days', value: '30d' },
                  { label: 'Custom Range', value: 'custom' },
                ]}
              />
            </SimpleGrid>

            {/* Custom Date Inputs if custom preset selected */}
            {filters.datePreset === 'custom' && (
              <Group gap="sm" mt="sm">
                <TextInput
                  size="xs"
                  type="date"
                  label="Start Date"
                  value={filters.customStartDate || ''}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, customStartDate: e.currentTarget.value })
                  }
                />
                <TextInput
                  size="xs"
                  type="date"
                  label="End Date"
                  value={filters.customEndDate || ''}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, customEndDate: e.currentTarget.value })
                  }
                />
              </Group>
            )}

            {/* Groups filter if groups exist */}
            {availableGroups.length > 0 && (
              <Group gap="xs" mt="sm" align="center">
                <Text size="xs" c="dimmed" fw={600}>
                  Word Group:
                </Text>
                <Select
                  size="xs"
                  radius="md"
                  leftSection={<IconTags size={14} />}
                  value={filters.groupFilter}
                  onChange={(val) => onFiltersChange({ ...filters, groupFilter: val || 'all' })}
                  data={[
                    { label: 'All Groups', value: 'all' },
                    ...availableGroups.map((g) => ({ label: g, value: g })),
                  ]}
                  w={180}
                />
              </Group>
            )}

            {/* Filter count strip */}
            <Group
              justify="space-between"
              align="center"
              mt="sm"
              pt="xs"
              style={{ borderTop: '1px solid var(--card-border)' }}
            >
              <Text size="xs" c="dimmed">
                Showing{' '}
                <Text component="span" fw={700} c="indigo">
                  <RollingNumber value={filteredLogsCount} />
                </Text>{' '}
                of <RollingNumber value={totalLogsCount} /> total reviews
              </Text>

              {isFiltered && (
                <Button variant="subtle" size="xs" color="gray" onClick={handleReset}>
                  Clear All Filters
                </Button>
              )}
            </Group>
          </Box>
        )}
      </Stack>
    </Card>
  );
}
