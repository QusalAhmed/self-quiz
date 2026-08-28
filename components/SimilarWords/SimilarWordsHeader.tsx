'use client';

import {
  Badge,
  Button,
  Group,
  Paper,
  RollingNumber,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowsExchange,
  IconCards,
  IconCircleCheck,
  IconRotateClockwise,
  IconTopologyStarRing3,
} from '@tabler/icons-react';
import React from 'react';
import type { SimilarWordCluster } from '@/lib/similar-words/clustering';

export type ViewMode = 'grid' | 'compact' | 'network';

export type SimilarWordsHeaderProps = {
  clusters: SimilarWordCluster[];
  totalVocabularyCount: number;
  isLoading?: boolean;
  isRecomputing?: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onRecomputeAll: () => Promise<void> | void;
};

export const SimilarWordsHeader = React.memo(function SimilarWordsHeader({
  clusters,
  totalVocabularyCount,
  isLoading = false,
  isRecomputing = false,
  viewMode,
  onViewModeChange,
  onRecomputeAll,
}: SimilarWordsHeaderProps) {
  const totalClusteredWords = React.useMemo(() => {
    const unique = new Set<string>();
    clusters.forEach((c) => c.wordIds.forEach((id) => unique.add(id)));
    return unique.size;
  }, [clusters]);

  const avgClusterScore = React.useMemo(() => {
    if (clusters.length === 0) {
      return 0;
    }
    const sum = clusters.reduce((acc, c) => acc + c.averageScore, 0);
    return Math.round((sum / clusters.length) * 100);
  }, [clusters]);

  const categoryCounts = React.useMemo(() => {
    const counts = {
      word_family: 0,
      morphological: 0,
      orthographic: 0,
      transposition: 0,
      affix: 0,
    };
    clusters.forEach((c) => {
      if (c.clusterType === 'word_family') {
        counts.word_family++;
      } else if (c.clusterType === 'morphological') {
        counts.morphological++;
      } else if (c.clusterType === 'transposition') {
        counts.transposition++;
      } else if (c.clusterType === 'prefix' || c.clusterType === 'suffix') {
        counts.affix++;
      } else {
        counts.orthographic++;
      }
    });
    return counts;
  }, [clusters]);

  return (
    <Stack gap="md">
      {/* Top Banner */}
      <Paper
        p="lg"
        radius="lg"
        style={{
          background:
            'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(168, 85, 247, 0.06) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          backdropFilter: 'blur(12px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <Stack gap={4} style={{ maxWidth: 640 }}>
            <Group gap={8} align="center">
              <ThemeIcon
                size="lg"
                radius="md"
                variant="gradient"
                gradient={{ from: 'blue', to: 'indigo', deg: 135 }}
              >
                <IconTopologyStarRing3 size={20} />
              </ThemeIcon>
              <Title
                order={2}
                style={{ fontFamily: 'var(--font-title)', letterSpacing: '-0.02em' }}
              >
                Similar Word Groups & Clusters
              </Title>
              <Badge size="sm" variant="light" color="indigo" radius="sm">
                Linguistic Engine v1
              </Badge>
            </Group>

            <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
              Explore structural clusters, spelling twins, morphological root alternations,
              character transpositions, and word families discovered across your vocabulary
              database.
            </Text>
          </Stack>

          {/* Action Tools */}
          <Group gap="xs" align="center">
            <SegmentedControl
              size="xs"
              radius="md"
              value={viewMode}
              onChange={(val) => onViewModeChange(val as ViewMode)}
              data={[
                { label: 'Cards', value: 'grid' },
                { label: 'Compact', value: 'compact' },
                { label: 'Network', value: 'network' },
              ]}
              styles={{
                root: {
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--card-border)',
                },
              }}
            />

            <Button
              size="xs"
              radius="md"
              variant="gradient"
              gradient={{ from: 'blue', to: 'indigo', deg: 135 }}
              leftSection={
                <IconRotateClockwise
                  size={14}
                  className={isRecomputing ? 'sync-spin-icon' : undefined}
                />
              }
              loading={isRecomputing || isLoading}
              onClick={() => void onRecomputeAll()}
            >
              Recompute All Similarities
            </Button>
          </Group>
        </Group>

        {/* Metrics Grid */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mt="lg">
          <Paper
            p="sm"
            radius="md"
            style={{
              background: 'rgba(255, 255, 255, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Discovered Groups
                </Text>
                <Title order={3} fw={800} c="blue" mt={2}>
                  <RollingNumber value={clusters.length} thousandSeparator />
                </Title>
              </div>
              <ThemeIcon size="md" radius="md" color="blue" variant="light">
                <IconTopologyStarRing3 size={16} />
              </ThemeIcon>
            </Group>
          </Paper>

          <Paper
            p="sm"
            radius="md"
            style={{
              background: 'rgba(255, 255, 255, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Words in Clusters
                </Text>
                <Group gap={6} align="baseline" mt={2}>
                  <Title order={3} fw={800} c="indigo">
                    <RollingNumber value={totalClusteredWords} thousandSeparator />
                  </Title>
                  <Text size="xs" c="dimmed">
                    / {totalVocabularyCount} total
                  </Text>
                </Group>
              </div>
              <ThemeIcon size="md" radius="md" color="indigo" variant="light">
                <IconCards size={16} />
              </ThemeIcon>
            </Group>
          </Paper>

          <Paper
            p="sm"
            radius="md"
            style={{
              background: 'rgba(255, 255, 255, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Avg Cluster Score
                </Text>
                <Title order={3} fw={800} c="teal" mt={2}>
                  <RollingNumber value={avgClusterScore} suffix="%" />
                </Title>
              </div>
              <ThemeIcon size="md" radius="md" color="teal" variant="light">
                <IconCircleCheck size={16} />
              </ThemeIcon>
            </Group>
          </Paper>

          <Paper
            p="sm"
            radius="md"
            style={{
              background: 'rgba(255, 255, 255, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Transposition Pairs
                </Text>
                <Title order={3} fw={800} c="orange" mt={2}>
                  <RollingNumber value={categoryCounts.transposition} thousandSeparator />
                </Title>
              </div>
              <ThemeIcon size="md" radius="md" color="orange" variant="light">
                <IconArrowsExchange size={16} />
              </ThemeIcon>
            </Group>
          </Paper>
        </SimpleGrid>
      </Paper>
    </Stack>
  );
});
