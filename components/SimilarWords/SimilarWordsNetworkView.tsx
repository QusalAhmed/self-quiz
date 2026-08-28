'use client';

import { Badge, Button, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconBrain, IconInfoCircle, IconTopologyStarRing3 } from '@tabler/icons-react';
import React from 'react';
import { PronounceButton } from '@/components/WordActions/PronounceButton';
import type { SimilarWordCluster } from '@/lib/similar-words/clustering';

export type SimilarWordsNetworkViewProps = {
  clusters: SimilarWordCluster[];
  onInspectCluster: (cluster: SimilarWordCluster) => void;
  onStudyCluster?: (cluster: SimilarWordCluster) => void;
  onNavigateWord?: (word: string) => void;
};

export const SimilarWordsNetworkView = React.memo(function SimilarWordsNetworkView({
  clusters,
  onInspectCluster,
  onStudyCluster,
  onNavigateWord,
}: SimilarWordsNetworkViewProps) {
  if (clusters.length === 0) {
    return (
      <Paper
        p="xl"
        radius="md"
        style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)' }}
      >
        <Text size="sm" c="dimmed">
          No clusters match your current search/filter settings.
        </Text>
      </Paper>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      {clusters.map((cluster) => {
        const avgPercent = Math.round(cluster.averageScore * 100);

        return (
          <Paper
            key={`network-${cluster.id}`}
            p="md"
            radius="md"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--card-border)',
              position: 'relative',
            }}
          >
            <Stack gap="xs">
              {/* Header */}
              <Group justify="space-between" align="center">
                <Group gap={8}>
                  <ThemeIcon size="sm" radius="sm" variant="light" color="indigo">
                    <IconTopologyStarRing3 size={14} />
                  </ThemeIcon>
                  <Text size="sm" fw={800}>
                    {cluster.name}
                  </Text>
                </Group>

                <Badge size="xs" variant="filled" color={avgPercent >= 80 ? 'teal' : 'indigo'}>
                  {avgPercent}% Match
                </Badge>
              </Group>

              {/* Hub & Satellite Nodes */}
              <Paper
                p="sm"
                radius="sm"
                style={{
                  background: 'rgba(0, 0, 0, 0.1)',
                  border: '1px dashed rgba(255, 255, 255, 0.08)',
                  minHeight: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Group gap="md" justify="center" align="center" wrap="wrap">
                  {/* Central Node */}
                  <Badge
                    size="lg"
                    radius="xl"
                    variant="gradient"
                    gradient={{ from: 'indigo', to: 'blue', deg: 135 }}
                    style={{
                      cursor: 'pointer',
                      fontSize: '14px',
                      height: 32,
                      padding: '0 12px',
                    }}
                    rightSection={<PronounceButton word={cluster.hubWord} size="xs" />}
                    onClick={() => onNavigateWord?.(cluster.hubWord)}
                  >
                    👑 {cluster.hubWord}
                  </Badge>

                  {/* Connected Satellite Nodes */}
                  {cluster.words
                    .filter((w) => w !== cluster.hubWord)
                    .map((satWord, sIdx) => (
                      <Badge
                        key={`sat-${satWord}-${sIdx}`}
                        size="md"
                        radius="xl"
                        variant="light"
                        color="blue"
                        style={{
                          cursor: 'pointer',
                          fontSize: '12px',
                          height: 26,
                        }}
                        rightSection={<PronounceButton word={satWord} size="xs" />}
                        onClick={() => onNavigateWord?.(satWord)}
                      >
                        {satWord}
                      </Badge>
                    ))}
                </Group>
              </Paper>

              {/* Footer Links */}
              <Group justify="space-between" align="center" mt={2}>
                <Text size="xs" c="dimmed">
                  {cluster.edges.length} edges • {cluster.size} nodes
                </Text>

                <Group gap={6}>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="indigo"
                    onClick={() => onInspectCluster(cluster)}
                    leftSection={<IconInfoCircle size={13} />}
                    style={{ fontSize: '11px', height: 22 }}
                  >
                    Inspect
                  </Button>
                  {onStudyCluster && (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="teal"
                      onClick={() => onStudyCluster(cluster)}
                      leftSection={<IconBrain size={13} />}
                      style={{ fontSize: '11px', height: 22 }}
                    >
                      Quiz
                    </Button>
                  )}
                </Group>
              </Group>
            </Stack>
          </Paper>
        );
      })}
    </SimpleGrid>
  );
});
