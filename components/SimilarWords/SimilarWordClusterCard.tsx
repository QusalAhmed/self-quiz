'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  HoverCard,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowsExchange,
  IconBrain,
  IconChevronDown,
  IconChevronUp,
  IconCircleCheck,
  IconGitFork,
  IconInfoCircle,
  IconLanguage,
  IconLayersLinked,
  IconLetterCase,
  IconSearch,
  IconTopologyStarRing3,
} from '@tabler/icons-react';
import React, { useState } from 'react';
import { PronounceButton } from '@/components/WordActions/PronounceButton';
import type { WordRecord } from '@/lib/db';
import { getWordDefinitions } from '@/lib/definitions';
import type { SimilarWordCluster } from '@/lib/similar-words/clustering';
import type { SimilarityRelationshipType } from '@/lib/similar-words/types';

export type SimilarWordClusterCardProps = {
  cluster: SimilarWordCluster;
  wordRecordsMap?: Map<string, WordRecord>;
  onInspectCluster: (cluster: SimilarWordCluster) => void;
  onStudyCluster?: (cluster: SimilarWordCluster) => void;
  onNavigateWord?: (word: string) => void;
};

const CATEGORY_STYLES: Record<
  SimilarityRelationshipType,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ size?: number }>;
    border: string;
    bg: string;
  }
> = {
  exact: {
    label: 'Exact / Normalized',
    color: 'teal',
    icon: IconCircleCheck,
    border: 'rgba(20, 184, 166, 0.3)',
    bg: 'rgba(20, 184, 166, 0.04)',
  },
  word_family: {
    label: 'Word Family',
    color: 'cyan',
    icon: IconGitFork,
    border: 'rgba(6, 182, 212, 0.3)',
    bg: 'rgba(6, 182, 212, 0.04)',
  },
  morphological: {
    label: 'Morphological Root',
    color: 'indigo',
    icon: IconTopologyStarRing3,
    border: 'rgba(99, 102, 241, 0.3)',
    bg: 'rgba(99, 102, 241, 0.04)',
  },
  transposition: {
    label: 'Transposition Pair',
    color: 'orange',
    icon: IconArrowsExchange,
    border: 'rgba(249, 115, 22, 0.3)',
    bg: 'rgba(249, 115, 22, 0.04)',
  },
  orthographic: {
    label: 'Spelling Twins',
    color: 'grape',
    icon: IconLetterCase,
    border: 'rgba(168, 85, 247, 0.3)',
    bg: 'rgba(168, 85, 247, 0.04)',
  },
  prefix: {
    label: 'Shared Prefix',
    color: 'blue',
    icon: IconLanguage,
    border: 'rgba(59, 130, 246, 0.3)',
    bg: 'rgba(59, 130, 246, 0.04)',
  },
  suffix: {
    label: 'Shared Suffix',
    color: 'pink',
    icon: IconLayersLinked,
    border: 'rgba(236, 72, 153, 0.3)',
    bg: 'rgba(236, 72, 153, 0.04)',
  },
};

export const SimilarWordClusterCard = React.memo(function SimilarWordClusterCard({
  cluster,
  wordRecordsMap,
  onInspectCluster,
  onStudyCluster,
  onNavigateWord,
}: SimilarWordClusterCardProps) {
  const [isConnectionsExpanded, setIsConnectionsExpanded] = useState(false);

  const styleConfig = CATEGORY_STYLES[cluster.clusterType] || CATEGORY_STYLES.orthographic;
  const CategoryIcon = styleConfig.icon;
  const avgPercent = Math.round(cluster.averageScore * 100);

  return (
    <Card
      p="md"
      radius="md"
      withBorder
      style={{
        background: styleConfig.bg,
        borderColor: styleConfig.border,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <Stack gap="xs">
        {/* Header Row */}
        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
          <Group gap={8} align="center" style={{ minWidth: 0, flex: 1 }}>
            <ThemeIcon
              size="md"
              radius="md"
              variant="light"
              color={styleConfig.color}
              style={{ flexShrink: 0 }}
            >
              <CategoryIcon size={16} />
            </ThemeIcon>

            <div style={{ minWidth: 0 }}>
              <Text
                size="md"
                fw={800}
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-title)',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                }}
              >
                {cluster.name}
              </Text>
              <Text size="xs" c="dimmed" mt={1}>
                {cluster.size} words in group • Central root: <strong>{cluster.hubWord}</strong>
              </Text>
            </div>
          </Group>

          <Group gap={6} align="center" wrap="nowrap" style={{ flexShrink: 0 }}>
            <Badge
              size="sm"
              variant="light"
              color={styleConfig.color}
              radius="sm"
              leftSection={<CategoryIcon size={12} />}
              style={{ textTransform: 'none', fontWeight: 700 }}
            >
              {styleConfig.label}
            </Badge>

            <Badge
              size="sm"
              variant="filled"
              color={avgPercent >= 80 ? 'teal' : avgPercent >= 65 ? 'blue' : 'orange'}
              radius="sm"
              style={{ fontWeight: 800 }}
            >
              {avgPercent}%
            </Badge>
          </Group>
        </Group>

        {/* Word Badges Grid */}
        <Paper
          p="xs"
          radius="sm"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <Group gap={6} wrap="wrap">
            {cluster.words.map((wordStr, idx) => {
              const wordDoc = wordRecordsMap?.get(cluster.wordIds[idx]);
              const defs = wordDoc ? getWordDefinitions(wordDoc) : [];
              const firstMeaning = defs[0]?.meaning || wordDoc?.meaning || '';

              return (
                <HoverCard
                  key={`${wordStr}-${idx}`}
                  width={280}
                  shadow="md"
                  withArrow
                  openDelay={200}
                  closeDelay={100}
                >
                  <HoverCard.Target>
                    <Badge
                      size="md"
                      radius="sm"
                      variant={wordStr === cluster.hubWord ? 'filled' : 'light'}
                      color={wordStr === cluster.hubWord ? 'indigo' : 'gray'}
                      style={{
                        cursor: 'pointer',
                        textTransform: 'none',
                        fontSize: '13px',
                        paddingLeft: 8,
                        paddingRight: 6,
                        height: 28,
                      }}
                      rightSection={
                        <Group gap={2} wrap="nowrap">
                          <PronounceButton word={wordStr} size="xs" />
                        </Group>
                      }
                      onClick={() => onNavigateWord?.(wordStr)}
                    >
                      {wordStr}
                    </Badge>
                  </HoverCard.Target>

                  <HoverCard.Dropdown>
                    <Stack gap={4}>
                      <Group justify="space-between" align="center">
                        <Text size="sm" fw={800} c="indigo">
                          {wordStr}
                        </Text>
                        <PronounceButton word={wordStr} size="xs" />
                      </Group>
                      {firstMeaning ? (
                        <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
                          {firstMeaning}
                        </Text>
                      ) : (
                        <Text size="xs" c="dimmed" fs="italic">
                          Click to explore full definition
                        </Text>
                      )}
                    </Stack>
                  </HoverCard.Dropdown>
                </HoverCard>
              );
            })}
          </Group>
        </Paper>

        {/* Shared Linguistic Signatures */}
        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
          <Group gap={4} wrap="wrap">
            {cluster.sharedFeatures.commonRoot && (
              <Badge size="xs" variant="outline" color="indigo" radius="sm">
                Root: "{cluster.sharedFeatures.commonRoot}"
              </Badge>
            )}
            {cluster.sharedFeatures.commonSubstring && (
              <Badge size="xs" variant="outline" color="blue" radius="sm">
                Core: "{cluster.sharedFeatures.commonSubstring}"
              </Badge>
            )}
            {cluster.sharedFeatures.affixes && cluster.sharedFeatures.affixes.length > 0 && (
              <Badge size="xs" variant="outline" color="pink" radius="sm">
                Affixes: {cluster.sharedFeatures.affixes.join(', ')}
              </Badge>
            )}
          </Group>

          <Button
            size="xs"
            variant="subtle"
            color="gray"
            rightSection={
              isConnectionsExpanded ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />
            }
            onClick={() => setIsConnectionsExpanded((prev) => !prev)}
            style={{ fontSize: '11px', height: 22, padding: '0 6px' }}
          >
            {cluster.edges.length} Pairwise Connections
          </Button>
        </Group>

        {/* Collapsible Connections Breakdown */}
        <Collapse expanded={isConnectionsExpanded}>
          <Stack gap={4} mt={2}>
            {cluster.edges.map((edge, edgeIdx) => (
              <Group
                key={`edge-${edgeIdx}`}
                justify="space-between"
                align="center"
                p={4}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 4,
                  fontSize: '11px',
                }}
              >
                <Group gap={6}>
                  <Text size="xs" fw={700}>
                    {edge.sourceWord} ↔ {edge.targetWord}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>
                    ({edge.explanation})
                  </Text>
                </Group>

                <Badge
                  size="xs"
                  variant="light"
                  color={edge.score >= 0.8 ? 'teal' : edge.score >= 0.6 ? 'blue' : 'orange'}
                >
                  {Math.round(edge.score * 100)}%
                </Badge>
              </Group>
            ))}
          </Stack>
        </Collapse>

        {/* Pedagogical Explanation */}
        <Text size="xs" c="dimmed" style={{ lineHeight: 1.4, fontSize: '11px' }}>
          {cluster.explanation}
        </Text>

        <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }} />

        {/* Action Toolbar */}
        <Group justify="space-between" align="center">
          <Group gap={6}>
            <Tooltip label="Inspect detailed signal matrices & alignments" withArrow>
              <Button
                size="xs"
                variant="light"
                color="indigo"
                radius="sm"
                leftSection={<IconInfoCircle size={14} />}
                onClick={() => onInspectCluster(cluster)}
              >
                Inspect Group
              </Button>
            </Tooltip>

            {onStudyCluster && (
              <Tooltip label="Practice flashcards & quiz for this group" withArrow>
                <Button
                  size="xs"
                  variant="subtle"
                  color="teal"
                  radius="sm"
                  leftSection={<IconBrain size={14} />}
                  onClick={() => onStudyCluster(cluster)}
                >
                  Study Quiz
                </Button>
              </Tooltip>
            )}
          </Group>

          {onNavigateWord && (
            <Tooltip label="Open in Dictionary Explorer" withArrow>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="blue"
                onClick={() => onNavigateWord(cluster.hubWord)}
                aria-label={`Explore ${cluster.hubWord} in dictionary`}
              >
                <IconSearch size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Stack>
    </Card>
  );
});
