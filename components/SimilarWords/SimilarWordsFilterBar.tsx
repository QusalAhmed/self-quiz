'use client';

import {
  ActionIcon,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconClearAll, IconSearch, IconSortAscending, IconX } from '@tabler/icons-react';
import React from 'react';

export type ClusterSortOption = 'size_desc' | 'score_desc' | 'alpha_asc' | 'edges_desc';

export type SimilarWordsFilterBarProps = {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  minScoreThreshold: number;
  onMinScoreChange: (score: number) => void;
  selectedSizeFilter: string;
  onSizeFilterChange: (sizeFilter: string) => void;
  sortOption: ClusterSortOption;
  onSortOptionChange: (sort: ClusterSortOption) => void;
  categoryCounts: Record<string, number>;
  onResetFilters: () => void;
};

export const SimilarWordsFilterBar = React.memo(function SimilarWordsFilterBar({
  searchQuery,
  onSearchQueryChange,
  selectedCategory,
  onCategoryChange,
  minScoreThreshold,
  onMinScoreChange,
  selectedSizeFilter,
  onSizeFilterChange,
  sortOption,
  onSortOptionChange,
  categoryCounts,
  onResetFilters,
}: SimilarWordsFilterBarProps) {
  const isFiltered =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== 'all' ||
    minScoreThreshold > 0.45 ||
    selectedSizeFilter !== 'all' ||
    sortOption !== 'size_desc';

  return (
    <Paper
      p="md"
      radius="md"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--card-border)',
      }}
    >
      <Stack gap="sm">
        {/* Main Search and Quick Controls */}
        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
          <TextInput
            placeholder="Search by word, stem root, or shared pattern (e.g. 'retail', 'predict', 'tail')..."
            leftSection={<IconSearch size={16} />}
            rightSection={
              searchQuery ? (
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={() => onSearchQueryChange('')}
                >
                  <IconX size={12} />
                </ActionIcon>
              ) : null
            }
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.currentTarget.value)}
            style={{ flex: '1 1 300px' }}
            radius="md"
            size="sm"
          />

          <Group gap="xs" wrap="nowrap">
            <Select
              size="xs"
              radius="md"
              value={sortOption}
              onChange={(val) => onSortOptionChange((val as ClusterSortOption) || 'size_desc')}
              data={[
                { label: 'Largest Groups (Size ↓)', value: 'size_desc' },
                { label: 'Highest Score (Score ↓)', value: 'score_desc' },
                { label: 'Alphabetical (A - Z)', value: 'alpha_asc' },
                { label: 'Most Connected', value: 'edges_desc' },
              ]}
              leftSection={<IconSortAscending size={14} />}
              style={{ width: 190 }}
            />

            <Select
              size="xs"
              radius="md"
              value={selectedSizeFilter}
              onChange={(val) => onSizeFilterChange(val || 'all')}
              data={[
                { label: 'All Cluster Sizes', value: 'all' },
                { label: 'Pairs (2 Words)', value: 'pairs' },
                { label: 'Triplets (3 Words)', value: 'triplets' },
                { label: 'Large (4+ Words)', value: 'large' },
              ]}
              style={{ width: 150 }}
            />

            {isFiltered && (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                radius="md"
                leftSection={<IconClearAll size={14} />}
                onClick={onResetFilters}
              >
                Reset
              </Button>
            )}
          </Group>
        </Group>

        {/* Category Filter Pills */}
        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
          <SegmentedControl
            size="xs"
            radius="md"
            value={selectedCategory}
            onChange={onCategoryChange}
            data={[
              { label: `All Groups (${categoryCounts.all || 0})`, value: 'all' },
              { label: `Word Family (${categoryCounts.word_family || 0})`, value: 'word_family' },
              {
                label: `Spelling Twins (${categoryCounts.orthographic || 0})`,
                value: 'orthographic',
              },
              {
                label: `Morphological (${categoryCounts.morphological || 0})`,
                value: 'morphological',
              },
              {
                label: `Transposition (${categoryCounts.transposition || 0})`,
                value: 'transposition',
              },
              { label: `Prefix/Suffix (${categoryCounts.affix || 0})`, value: 'affix' },
            ]}
            styles={{
              root: {
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--card-border)',
                flexWrap: 'wrap',
              },
            }}
          />

          {/* Min Score Slider */}
          <Group gap="xs" align="center" style={{ minWidth: 200 }}>
            <Text size="xs" c="dimmed" fw={600}>
              Min Score: {Math.round(minScoreThreshold * 100)}%
            </Text>
            <Slider
              size="xs"
              radius="xl"
              value={minScoreThreshold * 100}
              onChange={(v) => onMinScoreChange(v / 100)}
              min={40}
              max={90}
              step={5}
              style={{ width: 100 }}
            />
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
});
