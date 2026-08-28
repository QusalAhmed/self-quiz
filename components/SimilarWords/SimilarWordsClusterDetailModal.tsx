'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconBrain, IconSearch, IconTopologyStarRing3 } from '@tabler/icons-react';
import React from 'react';
import { PronounceButton } from '@/components/WordActions/PronounceButton';
import type { WordRecord } from '@/lib/db';
import { getWordDefinitions } from '@/lib/definitions';
import type { SimilarWordCluster } from '@/lib/similar-words/clustering';

export type SimilarWordsClusterDetailModalProps = {
  opened: boolean;
  onClose: () => void;
  cluster: SimilarWordCluster | null;
  wordRecordsMap?: Map<string, WordRecord>;
  onStudyCluster?: (words: string[]) => void;
  onNavigateWord?: (word: string) => void;
};

export const SimilarWordsClusterDetailModal = React.memo(function SimilarWordsClusterDetailModal({
  opened,
  onClose,
  cluster,
  wordRecordsMap,
  onStudyCluster,
  onNavigateWord,
}: SimilarWordsClusterDetailModalProps) {
  if (!cluster) {
    return null;
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <ThemeIcon size="md" radius="md" variant="light" color="indigo">
            <IconTopologyStarRing3 size={18} />
          </ThemeIcon>
          <div>
            <Text fw={800} size="md" style={{ fontFamily: 'var(--font-title)' }}>
              {cluster.name}
            </Text>
            <Text size="xs" c="dimmed">
              Detailed Linguistic Graph Breakdown ({cluster.size} Words • {cluster.edges.length}{' '}
              Connections)
            </Text>
          </div>
        </Group>
      }
      size="lg"
      radius="md"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        {/* Overview Banner */}
        <Paper p="sm" radius="md" style={{ background: 'rgba(99, 102, 241, 0.08)' }}>
          <Group justify="space-between" align="center" wrap="wrap">
            <div>
              <Text size="xs" fw={700} c="indigo">
                Cluster Explanation:
              </Text>
              <Text size="sm" mt={2} fw={600}>
                {cluster.explanation}
              </Text>
            </div>

            <Badge size="md" variant="filled" color="indigo" radius="sm">
              Avg Score: {Math.round(cluster.averageScore * 100)}%
            </Badge>
          </Group>
        </Paper>

        {/* Shared Features Grid */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
          <Paper p="xs" radius="sm" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
            <Text size="xs" c="dimmed">
              Central Root / Hub
            </Text>
            <Text size="sm" fw={700} c="indigo">
              {cluster.hubWord}
            </Text>
          </Paper>

          <Paper p="xs" radius="sm" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
            <Text size="xs" c="dimmed">
              Common Substring
            </Text>
            <Text size="sm" fw={700} c="blue">
              {cluster.sharedFeatures.commonSubstring
                ? `"${cluster.sharedFeatures.commonSubstring}"`
                : 'None'}
            </Text>
          </Paper>

          <Paper p="xs" radius="sm" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
            <Text size="xs" c="dimmed">
              Common Sequence
            </Text>
            <Text size="sm" fw={700} c="teal">
              {cluster.sharedFeatures.commonSequence
                ? `"${cluster.sharedFeatures.commonSequence}"`
                : 'None'}
            </Text>
          </Paper>

          <Paper p="xs" radius="sm" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
            <Text size="xs" c="dimmed">
              Affixes Identified
            </Text>
            <Text size="sm" fw={700} c="pink">
              {cluster.sharedFeatures.affixes?.join(', ') || 'None'}
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Member Words Table */}
        <Divider label="Member Words & Definitions" labelPosition="center" />

        <Paper withBorder radius="sm" p={0} style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 140 }}>Word</Table.Th>
                <Table.Th>Primary Meaning / Definition</Table.Th>
                <Table.Th style={{ width: 90, textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {cluster.words.map((wordStr, idx) => {
                const doc = wordRecordsMap?.get(cluster.wordIds[idx]);
                const defs = doc ? getWordDefinitions(doc) : [];
                const meaning = defs[0]?.meaning || doc?.meaning || 'No definition cached';

                return (
                  <Table.Tr key={`${wordStr}-${idx}`}>
                    <Table.Td>
                      <Group gap={6} align="center" wrap="nowrap">
                        <Text
                          size="sm"
                          fw={700}
                          c={wordStr === cluster.hubWord ? 'indigo' : undefined}
                        >
                          {wordStr}
                        </Text>
                        {wordStr === cluster.hubWord && (
                          <Badge size="xs" variant="light" color="indigo">
                            Hub
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {meaning}
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <PronounceButton word={wordStr} size="xs" />
                        {onNavigateWord && (
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            color="blue"
                            onClick={() => {
                              onClose();
                              onNavigateWord(wordStr);
                            }}
                            aria-label={`Explore ${wordStr}`}
                          >
                            <IconSearch size={13} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Paper>

        {/* Pairwise Linguistic Relationships */}
        <Divider label="Pairwise Connections & Explanations" labelPosition="center" />

        <Stack gap="xs">
          {cluster.edges.map((edge, idx) => (
            <Paper
              key={`edge-detail-${idx}`}
              p="xs"
              radius="sm"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                <Group gap={8}>
                  <Text size="sm" fw={700}>
                    {edge.sourceWord} ↔ {edge.targetWord}
                  </Text>
                  <Badge size="xs" variant="light" color="indigo">
                    {edge.relationshipType}
                  </Badge>
                </Group>

                <Badge
                  size="sm"
                  variant="filled"
                  color={edge.score >= 0.8 ? 'teal' : edge.score >= 0.6 ? 'blue' : 'orange'}
                >
                  Relevance: {Math.round(edge.score * 100)}%
                </Badge>
              </Group>

              <Text size="xs" c="dimmed" mt={4}>
                {edge.explanation}
              </Text>
            </Paper>
          ))}
        </Stack>

        {/* Footer Actions */}
        <Group justify="space-between" align="center" mt="sm">
          <Button variant="default" size="xs" onClick={onClose}>
            Close
          </Button>

          {onStudyCluster && (
            <Button
              variant="gradient"
              gradient={{ from: 'blue', to: 'indigo', deg: 135 }}
              size="xs"
              leftSection={<IconBrain size={14} />}
              onClick={() => {
                onClose();
                onStudyCluster(cluster.words);
              }}
            >
              Practice Flashcards for this Group ({cluster.size} words)
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
});
