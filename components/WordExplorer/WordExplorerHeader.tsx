'use client';

import {
  ActionIcon,
  Badge,
  Button,
  CloseButton,
  Grid,
  Group,
  Menu,
  Paper,
  RollingNumber,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBook,
  IconCheck,
  IconFilter,
  IconHierarchy,
  IconPlus,
  IconSearch,
  IconSortAscending,
  IconSparkles,
  IconTags,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import React from 'react';
import type { WordViewDensity } from './WordDetailCard';

export type SearchScope = 'word' | 'wordAndDefinition' | 'all';

export type WordStatusFilter =
  | 'all'
  | 'dueToday'
  | 'learning'
  | 'review'
  | 'missed'
  | 'withNotes'
  | 'withWordFamily'
  | 'withoutWordFamily';

export type WordSortOption =
  | 'alphaAsc'
  | 'alphaDesc'
  | 'newest'
  | 'oldest'
  | 'updated'
  | 'dueSoonest'
  | 'mostLapses';

export type WordExplorerHeaderProps = {
  totalCount: number;
  filteredCount: number;
  masteredCount: number;
  learningCount: number;
  dueTodayCount: number;
  withNotesCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchScope: SearchScope;
  onSearchScopeChange: (scope: SearchScope) => void;
  selectedLetter: string;
  onSelectLetter: (letter: string) => void;
  availableLetters: Set<string>;
  groupFilter: string;
  onGroupFilterChange: (group: string) => void;
  customGroups: string[];
  posFilter: string;
  onPosFilterChange: (pos: string) => void;
  statusFilter: WordStatusFilter;
  onStatusFilterChange: (status: WordStatusFilter) => void;
  sortOption: WordSortOption;
  onSortOptionChange: (sort: WordSortOption) => void;
  density: WordViewDensity;
  onDensityChange: (density: WordViewDensity) => void;
  missingWordFamilyCount?: number;
  onOpenBatchWordFamilyModal?: () => void;
  onOpenAddModal: () => void;
  onOpenGroupManager: () => void;
};

const ALPHABET = [
  'ALL',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  '#',
];

const POS_OPTIONS = [
  { value: 'all', label: 'All Parts of Speech' },
  { value: 'noun', label: 'Noun (n.)' },
  { value: 'verb', label: 'Verb (v.)' },
  { value: 'adjective', label: 'Adjective (adj.)' },
  { value: 'adverb', label: 'Adverb (adv.)' },
  { value: 'preposition', label: 'Preposition (prep.)' },
  { value: 'conjunction', label: 'Conjunction (conj.)' },
  { value: 'pronoun', label: 'Pronoun (pron.)' },
  { value: 'interjection', label: 'Interjection (interj.)' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Learning Statuses' },
  { value: 'dueToday', label: '⚡ Due for Review Today' },
  { value: 'learning', label: '📖 In Learning / Relearning' },
  { value: 'review', label: '🎓 Mastered / Review' },
  { value: 'missed', label: '⚠️ Missed in Quizzes' },
  { value: 'withNotes', label: '📝 Has Personal Notes' },
  { value: 'withWordFamily', label: '🌳 Has Word Family' },
  { value: 'withoutWordFamily', label: '🌱 Missing Word Family' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Recently Added' },
  { value: 'alphaAsc', label: 'Alphabetical (A → Z)' },
  { value: 'alphaDesc', label: 'Alphabetical (Z → A)' },
  { value: 'updated', label: 'Recently Modified' },
  { value: 'dueSoonest', label: 'Next Review Due' },
  { value: 'mostLapses', label: 'Most Missed / Lapses' },
  { value: 'oldest', label: 'Oldest Added' },
];

export const WordExplorerHeader = React.memo(function WordExplorerHeader({
  totalCount,
  filteredCount,
  masteredCount,
  learningCount,
  dueTodayCount,
  withNotesCount,
  searchQuery,
  onSearchChange,
  searchScope,
  onSearchScopeChange,
  selectedLetter,
  onSelectLetter,
  availableLetters,
  groupFilter,
  onGroupFilterChange,
  customGroups,
  posFilter,
  onPosFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortOptionChange,
  density,
  onDensityChange,
  missingWordFamilyCount = 0,
  onOpenBatchWordFamilyModal,
  onOpenAddModal,
  onOpenGroupManager,
}: WordExplorerHeaderProps) {
  const router = useRouter();
  const isSearching = Boolean(searchQuery.trim());

  return (
    <Stack gap="md">
      {/* ── Top Header & Stats Bar ── */}
      <Paper
        p="md"
        radius="lg"
        className="glass-panel"
        style={{
          borderLeft: '4px solid #6366f1',
          overflow: 'hidden',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="center" wrap="wrap">
            <Group gap="sm" align="center">
              <ThemeIcon
                size="lg"
                radius="md"
                variant="gradient"
                gradient={{ from: 'indigo', to: 'purple' }}
              >
                <IconBook size={20} />
              </ThemeIcon>
              <div>
                <Title
                  order={2}
                  style={{
                    fontFamily: 'var(--font-title)',
                    fontSize: '1.4rem',
                    letterSpacing: '-0.02em',
                  }}
                >
                  <span className="text-gradient">Word Library & Dictionary</span>
                </Title>
                <Text size="xs" c="dimmed">
                  Comprehensive vocabulary explorer with full definitions, notes, word families &
                  spaced repetition
                </Text>
              </div>
            </Group>

            <Group gap="xs" wrap="wrap">
              <Badge
                variant="gradient"
                gradient={{ from: 'indigo', to: 'purple' }}
                size="md"
                radius="md"
                style={{ fontWeight: 700 }}
              >
                Showing <RollingNumber value={filteredCount} /> of{' '}
                <RollingNumber value={totalCount} />
              </Badge>

              <Button
                variant="light"
                color="indigo"
                size="sm"
                radius="md"
                leftSection={<IconSparkles size={16} />}
                onClick={() => router.push('/stories')}
              >
                AI Stories
              </Button>

              {missingWordFamilyCount > 0 && onOpenBatchWordFamilyModal && (
                <Button
                  variant="light"
                  color="indigo"
                  size="sm"
                  radius="md"
                  leftSection={<IconHierarchy size={16} />}
                  onClick={onOpenBatchWordFamilyModal}
                >
                  Generate Missing Families (<RollingNumber value={missingWordFamilyCount} />)
                </Button>
              )}

              <Button
                variant="light"
                color="grape"
                size="sm"
                radius="md"
                leftSection={<IconTags size={16} />}
                onClick={onOpenGroupManager}
              >
                Manage Groups
              </Button>

              <Button
                className="btn-premium"
                size="sm"
                radius="md"
                leftSection={<IconPlus size={16} />}
                onClick={onOpenAddModal}
              >
                Add Word
              </Button>
            </Group>
          </Group>

          {/* Quick Metrics Cards */}
          <SimpleGrid cols={{ base: 2, xs: 3, md: 5 }} spacing="xs">
            <Paper
              p="xs"
              radius="md"
              style={{
                background: 'rgba(99, 102, 241, 0.06)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
              }}
            >
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="dimmed">
                  TOTAL WORDS
                </Text>
                <Badge size="xs" color="indigo" variant="light">
                  <RollingNumber value={totalCount} thousandSeparator />
                </Badge>
              </Group>
              <Text size="lg" fw={800} mt={2}>
                <RollingNumber value={totalCount} thousandSeparator />
              </Text>
            </Paper>

            <Paper
              p="xs"
              radius="md"
              style={{
                background: 'rgba(34, 197, 94, 0.06)',
                border: '1px solid rgba(34, 197, 94, 0.15)',
              }}
            >
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="dimmed">
                  MASTERED
                </Text>
                <Badge size="xs" color="teal" variant="light">
                  <RollingNumber value={masteredCount} thousandSeparator />
                </Badge>
              </Group>
              <Text size="lg" fw={800} c="teal" mt={2}>
                <RollingNumber value={masteredCount} thousandSeparator />
              </Text>
            </Paper>

            <Paper
              p="xs"
              radius="md"
              style={{
                background: 'rgba(249, 115, 22, 0.06)',
                border: '1px solid rgba(249, 115, 22, 0.15)',
              }}
            >
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="dimmed">
                  IN LEARNING
                </Text>
                <Badge size="xs" color="orange" variant="light">
                  <RollingNumber value={learningCount} thousandSeparator />
                </Badge>
              </Group>
              <Text size="lg" fw={800} c="orange" mt={2}>
                <RollingNumber value={learningCount} thousandSeparator />
              </Text>
            </Paper>

            <Paper
              p="xs"
              radius="md"
              style={{
                background: 'rgba(168, 85, 247, 0.06)',
                border: '1px solid rgba(168, 85, 247, 0.15)',
              }}
            >
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="dimmed">
                  DUE TODAY
                </Text>
                <Badge size="xs" color="violet" variant="light">
                  <RollingNumber value={dueTodayCount} thousandSeparator />
                </Badge>
              </Group>
              <Text size="lg" fw={800} c="violet" mt={2}>
                <RollingNumber value={dueTodayCount} thousandSeparator />
              </Text>
            </Paper>

            <Paper
              p="xs"
              radius="md"
              style={{
                background: 'rgba(236, 72, 153, 0.06)',
                border: '1px solid rgba(236, 72, 153, 0.15)',
              }}
            >
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="dimmed">
                  WITH NOTES
                </Text>
                <Badge size="xs" color="pink" variant="light">
                  <RollingNumber value={withNotesCount} thousandSeparator />
                </Badge>
              </Group>
              <Text size="lg" fw={800} c="pink" mt={2}>
                <RollingNumber value={withNotesCount} thousandSeparator />
              </Text>
            </Paper>
          </SimpleGrid>
        </Stack>
      </Paper>

      {/* ── Search & Filter Controls ── */}
      <Paper p="md" radius="lg" className="glass-panel">
        <Stack gap="sm">
          {/* Top Search Row */}
          <Grid gap="sm" align="center">
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                placeholder={
                  searchScope === 'word'
                    ? 'Search by word...'
                    : searchScope === 'wordAndDefinition'
                      ? 'Search words and definitions...'
                      : 'Search words, definitions, examples & notes...'
                }
                value={searchQuery}
                onChange={(e) => onSearchChange(e.currentTarget.value)}
                size="md"
                radius="md"
                leftSection={
                  <Menu withArrow closeOnItemClick trigger="click-hover">
                    <Menu.Target>
                      <Tooltip label="Click to change search scope" withArrow>
                        <ActionIcon variant="subtle" color="indigo" size="sm">
                          <IconSearch size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Label>Search Target</Menu.Label>
                      <Menu.Item
                        leftSection={searchScope === 'word' ? <IconCheck size={14} /> : null}
                        onClick={() => onSearchScopeChange('word')}
                      >
                        Word Only
                      </Menu.Item>
                      <Menu.Item
                        leftSection={
                          searchScope === 'wordAndDefinition' ? <IconCheck size={14} /> : null
                        }
                        onClick={() => onSearchScopeChange('wordAndDefinition')}
                      >
                        Word + Definitions
                      </Menu.Item>
                      <Menu.Item
                        leftSection={searchScope === 'all' ? <IconCheck size={14} /> : null}
                        onClick={() => onSearchScopeChange('all')}
                      >
                        All Fields (Definitions, Notes & Examples)
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                }
                rightSection={
                  searchQuery ? <CloseButton size="sm" onClick={() => onSearchChange('')} /> : null
                }
              />
            </Grid.Col>

            <Grid.Col span={{ base: 6, sm: 3, md: 3 }}>
              <Tooltip
                label={
                  isSearching
                    ? 'Search active: results are automatically sorted by matching score only'
                    : 'Change sorting order of words'
                }
                withArrow
              >
                <Select
                  placeholder="Sort by"
                  value={isSearching ? 'matchScore' : sortOption}
                  onChange={(val) => {
                    if (!isSearching) {
                      onSortOptionChange((val as WordSortOption) ?? 'newest');
                    }
                  }}
                  data={
                    isSearching
                      ? [{ value: 'matchScore', label: '🎯 Match Score (Auto)' }, ...SORT_OPTIONS]
                      : SORT_OPTIONS
                  }
                  disabled={isSearching}
                  leftSection={<IconSortAscending size={16} />}
                  size="md"
                  radius="md"
                  allowDeselect={false}
                />
              </Tooltip>
            </Grid.Col>

            <Grid.Col span={{ base: 6, sm: 3, md: 3 }}>
              <Select
                placeholder="Status Filter"
                value={statusFilter}
                onChange={(val) => onStatusFilterChange((val as WordStatusFilter) ?? 'all')}
                data={STATUS_OPTIONS}
                leftSection={<IconFilter size={16} />}
                size="md"
                radius="md"
                allowDeselect={false}
              />
            </Grid.Col>
          </Grid>

          {/* Secondary Filter Row: Custom Groups, Part of Speech & View Density */}
          <Grid gap="sm" align="center">
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <Select
                placeholder="Filter by Group"
                value={groupFilter}
                onChange={(val) => onGroupFilterChange(val ?? 'all')}
                data={[
                  { value: 'all', label: 'All Custom Groups' },
                  { value: 'none', label: 'No Group Assigned' },
                  ...customGroups.map((g) => ({ value: g, label: `#${g}` })),
                ]}
                leftSection={<IconTags size={16} />}
                size="sm"
                radius="md"
                allowDeselect={false}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <Select
                placeholder="Filter by Part of Speech"
                value={posFilter}
                onChange={(val) => onPosFilterChange(val ?? 'all')}
                data={POS_OPTIONS}
                size="sm"
                radius="md"
                allowDeselect={false}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 12, md: 4 }}>
              <Group justify="space-between" align="center" gap="xs">
                <Text size="xs" c="dimmed" fw={600}>
                  View Mode:
                </Text>
                <SegmentedControl
                  value={density}
                  onChange={(val) => onDensityChange(val as WordViewDensity)}
                  data={[
                    { label: 'Detailed', value: 'detailed' },
                    { label: 'Compact', value: 'compact' },
                  ]}
                  size="xs"
                  radius="md"
                />
              </Group>
            </Grid.Col>
          </Grid>

          {/* A-Z Alphabet Scrubber Bar (Oxford / Merriam-Webster Style) */}
          <ScrollArea type="auto" offsetScrollbars scrollbarSize={4} mt={2}>
            <Group gap={4} wrap="nowrap" pb={4}>
              {ALPHABET.map((letter) => {
                const isSelected = selectedLetter === letter;
                const isAvailable =
                  letter === 'ALL' || availableLetters.has(letter) || letter === '#';

                return (
                  <Button
                    key={letter}
                    variant={isSelected ? 'filled' : 'subtle'}
                    color="indigo"
                    size="xs"
                    radius="md"
                    disabled={!isAvailable && !isSelected}
                    onClick={() => onSelectLetter(letter)}
                    style={{
                      minWidth: 28,
                      height: 28,
                      padding: '0 6px',
                      fontSize: '11px',
                      fontWeight: isSelected ? 800 : 600,
                      opacity: isAvailable ? 1 : 0.35,
                    }}
                  >
                    {letter}
                  </Button>
                );
              })}
            </Group>
          </ScrollArea>
        </Stack>
      </Paper>
    </Stack>
  );
});
