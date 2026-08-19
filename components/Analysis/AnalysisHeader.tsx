'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Group,
  Menu,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAdjustments,
  IconCalendar,
  IconChartBar,
  IconChevronDown,
  IconRefresh,
  IconSparkles,
} from '@tabler/icons-react';
import React, { useState } from 'react';
import type {
  AnalysisFilters,
  ComparisonPeriod,
  DateRangePreset,
  WordStateFilter,
} from '@/lib/analysis/types';
import type { QuizMode } from '@/lib/db';

type AnalysisHeaderProps = {
  filters: AnalysisFilters;
  onFiltersChange: (newFilters: AnalysisFilters) => void;
  availableGroups: string[];
  totalWords: number;
  totalMastered: number;
  onRefresh?: () => void;
};

export function AnalysisHeader({
  filters,
  onFiltersChange,
  availableGroups,
  totalWords,
  totalMastered,
  onRefresh,
}: AnalysisHeaderProps) {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [customStart, setCustomStart] = useState(filters.customStartDate || '');
  const [customEnd, setCustomEnd] = useState(filters.customEndDate || '');

  const handleDatePresetChange = (val: string) => {
    onFiltersChange({
      ...filters,
      datePreset: val as DateRangePreset,
    });
  };

  const handleComparisonChange = (val: string) => {
    onFiltersChange({
      ...filters,
      comparison: val as ComparisonPeriod,
    });
  };

  const handleApplyCustomDates = () => {
    if (customStart && customEnd) {
      onFiltersChange({
        ...filters,
        datePreset: 'custom',
        customStartDate: customStart,
        customEndDate: customEnd,
      });
    }
  };

  const activeFiltersCount =
    (filters.quizMode !== 'all' ? 1 : 0) +
    (filters.groupFilter !== 'all' ? 1 : 0) +
    (filters.stateFilter !== 'all' ? 1 : 0) +
    (filters.comparison !== 'previous_period' ? 1 : 0);

  return (
    <Card className="glass-panel" radius="xl" padding="lg" mb="lg">
      <Stack gap="md">
        {/* Top Title & Quick Status Bar */}
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Group gap="sm" align="center">
            <Box
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
              }}
            >
              <IconChartBar size={26} />
            </Box>
            <Stack gap={2}>
              <Group gap="xs" align="center">
                <Title order={2} style={{ fontSize: '1.45rem', lineHeight: 1.2 }}>
                  <span className="text-gradient">Learning Analysis</span>
                </Title>
                <Badge
                  variant="gradient"
                  gradient={{ from: 'indigo', to: 'violet', deg: 45 }}
                  size="sm"
                  radius="md"
                  leftSection={<IconSparkles size={12} />}
                >
                  FSRS Insights
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                Track memory retention, FSRS stability, learning habits, and vocabulary velocity.
              </Text>
            </Stack>
          </Group>

          {/* Quick Summary Pill & Controls */}
          <Group gap="xs" align="center">
            <Paper
              px="sm"
              py={6}
              radius="md"
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid var(--card-border)',
              }}
            >
              <Group gap="md">
                <div>
                  <Text size="xs" c="dimmed" fw={600}>
                    VOCABULARY
                  </Text>
                  <Text size="sm" fw={800} style={{ fontFamily: 'var(--font-title)' }}>
                    {totalWords}{' '}
                    <Text component="span" size="xs" c="dimmed" fw={500}>
                      words
                    </Text>
                  </Text>
                </div>
                <div style={{ width: 1, height: 24, background: 'var(--card-border)' }} />
                <div>
                  <Text size="xs" c="dimmed" fw={600}>
                    MASTERED
                  </Text>
                  <Text size="sm" fw={800} c="teal.6" style={{ fontFamily: 'var(--font-title)' }}>
                    {totalMastered}{' '}
                    <Text component="span" size="xs" c="dimmed" fw={500}>
                      ({totalWords > 0 ? Math.round((totalMastered / totalWords) * 100) : 0}%)
                    </Text>
                  </Text>
                </div>
              </Group>
            </Paper>

            {onRefresh && (
              <Tooltip label="Refresh Analytics">
                <ActionIcon
                  variant="light"
                  color="indigo"
                  radius="md"
                  size="lg"
                  onClick={onRefresh}
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        {/* Date Presets & Filter Toggle Controls */}
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          {/* Date Presets Segmented Control */}
          <Group gap="xs" align="center" wrap="wrap" style={{ maxWidth: '100%' }}>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.04em' }}>
              PERIOD:
            </Text>
            <Box style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
              <SegmentedControl
                size="xs"
                radius="md"
                value={filters.datePreset}
                onChange={handleDatePresetChange}
                data={[
                  { label: '7 Days', value: '7d' },
                  { label: '30 Days', value: '30d' },
                  { label: '90 Days', value: '90d' },
                  { label: '1 Year', value: '1y' },
                  { label: 'All Time', value: 'all' },
                  { label: 'Custom', value: 'custom' },
                ]}
              />
            </Box>
          </Group>

          {/* Comparison & Filter Menu */}
          <Group gap="xs" align="center">
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <Button
                  size="xs"
                  variant="default"
                  radius="md"
                  leftSection={<IconCalendar size={14} />}
                  rightSection={<IconChevronDown size={14} />}
                >
                  {filters.comparison === 'previous_period'
                    ? 'vs Previous Period'
                    : filters.comparison === 'prev_30d'
                      ? 'vs Prev 30 Days'
                      : filters.comparison === 'prev_90d'
                        ? 'vs Prev 90 Days'
                        : 'No Comparison'}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Compare Against</Menu.Label>
                <Menu.Item onClick={() => handleComparisonChange('previous_period')}>
                  Previous Period
                </Menu.Item>
                <Menu.Item onClick={() => handleComparisonChange('prev_30d')}>
                  Previous 30 Days
                </Menu.Item>
                <Menu.Item onClick={() => handleComparisonChange('prev_90d')}>
                  Previous 90 Days
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item onClick={() => handleComparisonChange('none')}>
                  Disable Comparison
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>

            <Button
              size="xs"
              variant={filterDrawerOpen || activeFiltersCount > 0 ? 'filled' : 'light'}
              color="indigo"
              radius="md"
              leftSection={<IconAdjustments size={14} />}
              rightSection={
                activeFiltersCount > 0 ? (
                  <Badge size="xs" color="indigo.3" variant="filled" circle>
                    {activeFiltersCount}
                  </Badge>
                ) : null
              }
              onClick={() => setFilterDrawerOpen((o) => !o)}
            >
              Filters
            </Button>
          </Group>
        </Group>

        {/* Custom Date Inputs if 'custom' is selected */}
        {filters.datePreset === 'custom' && (
          <Paper
            p="xs"
            radius="md"
            style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid var(--card-border)',
            }}
          >
            <Group gap="sm" align="center" wrap="wrap">
              <TextInput
                size="xs"
                type="date"
                label="Start Date"
                value={customStart}
                onChange={(e) => setCustomStart(e.currentTarget.value)}
              />
              <TextInput
                size="xs"
                type="date"
                label="End Date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.currentTarget.value)}
              />
              <Button
                size="xs"
                variant="gradient"
                gradient={{ from: 'indigo', to: 'violet', deg: 45 }}
                radius="md"
                mt={20}
                onClick={handleApplyCustomDates}
              >
                Apply Range
              </Button>
            </Group>
          </Paper>
        )}

        {/* Collapsible Advanced Filters Drawer */}
        <Collapse expanded={filterDrawerOpen}>
          <Paper
            p="md"
            radius="lg"
            style={{
              background: 'rgba(99, 102, 241, 0.04)',
              border: '1px solid var(--card-border)',
            }}
          >
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.04em' }}>
                  FILTER BY ATTRIBUTES
                </Text>
                {activeFiltersCount > 0 && (
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="gray"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        quizMode: 'all',
                        groupFilter: 'all',
                        stateFilter: 'all',
                        comparison: 'previous_period',
                      })
                    }
                  >
                    Reset Filters
                  </Button>
                )}
              </Group>

              <Group grow gap="md" wrap="wrap">
                <Select
                  size="xs"
                  label="Quiz Mode"
                  value={filters.quizMode}
                  onChange={(val) =>
                    onFiltersChange({
                      ...filters,
                      quizMode: (val as 'all' | QuizMode) || 'all',
                    })
                  }
                  data={[
                    { label: 'All Quiz Modes', value: 'all' },
                    { label: 'Word → Meaning', value: 'wordToMeaning' },
                    { label: 'Meaning → Word', value: 'meaningToWord' },
                    { label: 'Spelling Practice', value: 'spelling' },
                  ]}
                />

                <Select
                  size="xs"
                  label="Word Group / Tag"
                  value={filters.groupFilter}
                  onChange={(val) =>
                    onFiltersChange({
                      ...filters,
                      groupFilter: val || 'all',
                    })
                  }
                  data={[
                    { label: 'All Groups', value: 'all' },
                    { label: 'Ungrouped Words', value: 'none' },
                    ...availableGroups.map((g) => ({ label: g, value: g })),
                  ]}
                />

                <Select
                  size="xs"
                  label="Memory State"
                  value={filters.stateFilter}
                  onChange={(val) =>
                    onFiltersChange({
                      ...filters,
                      stateFilter: (val as WordStateFilter) || 'all',
                    })
                  }
                  data={[
                    { label: 'All States', value: 'all' },
                    { label: 'Mastered (Stability ≥ 21d)', value: 'Mastered' },
                    { label: 'Review (Stability ≥ 3d)', value: 'Review' },
                    { label: 'Learning / Relearning', value: 'Learning' },
                    { label: 'New Words (Unreviewed)', value: 'New' },
                  ]}
                />
              </Group>
            </Stack>
          </Paper>
        </Collapse>
      </Stack>
    </Card>
  );
}
