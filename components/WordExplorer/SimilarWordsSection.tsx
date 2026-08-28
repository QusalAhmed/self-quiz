'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Collapse,
  Divider,
  Group,
  Modal,
  Paper,
  Progress,
  RollingNumber,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowsExchange,
  IconChevronDown,
  IconChevronUp,
  IconCircleCheck,
  IconGitFork,
  IconInfoCircle,
  IconLanguage,
  IconLayersLinked,
  IconLetterCase,
  IconRotateClockwise,
  IconSearch,
  IconSparkles,
  IconTopologyStarRing3,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PronounceButton } from '@/components/WordActions/PronounceButton';
import { similarWordsEngine } from '@/lib/similar-words/engine';
import type { SimilarityRelationshipType, WordSimilarityResult } from '@/lib/similar-words/types';

export type SimilarWordsSectionProps = {
  wordId: string;
  word: string;
  similarWords?: WordSimilarityResult[];
  allWords?: Array<{ id: string; word: string }>;
  defaultExpanded?: boolean;
  onNavigateWord?: (wordText: string) => void;
  onRefreshSimilarWords?: (wordId: string, word: string) => Promise<void> | void;
};

const RELATIONSHIP_CONFIG: Record<
  SimilarityRelationshipType,
  { label: string; color: string; icon: React.ComponentType<{ size?: number }> }
> = {
  exact: { label: 'Exact Match', color: 'teal', icon: IconCircleCheck },
  word_family: { label: 'Word Family', color: 'cyan', icon: IconGitFork },
  morphological: { label: 'Morphological', color: 'indigo', icon: IconTopologyStarRing3 },
  transposition: { label: 'Transposition', color: 'orange', icon: IconArrowsExchange },
  orthographic: { label: 'Spelling Similar', color: 'grape', icon: IconLetterCase },
  prefix: { label: 'Prefix Shared', color: 'blue', icon: IconLanguage },
  suffix: { label: 'Suffix Shared', color: 'pink', icon: IconLayersLinked },
};

export const SimilarWordsSection = React.memo(function SimilarWordsSection({
  wordId,
  word,
  similarWords: propSimilarWords,
  allWords = [],
  defaultExpanded = false,
  onNavigateWord,
  onRefreshSimilarWords,
}: SimilarWordsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [similarWords, setSimilarWords] = useState<WordSimilarityResult[]>(propSimilarWords || []);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<WordSimilarityResult | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Sync prop changes
  useEffect(() => {
    if (propSimilarWords && propSimilarWords.length > 0) {
      setSimilarWords(propSimilarWords);
      setHasLoaded(true);
    }
  }, [propSimilarWords]);

  // Load similar words from API or local fallback when expanded
  const loadSimilarWords = useCallback(
    async (forceRecompute = false) => {
      if (!wordId || (!forceRecompute && hasLoaded && similarWords.length > 0)) {
        return;
      }

      setIsLoading(true);
      try {
        if (forceRecompute) {
          const res = await fetch(`/api/words/${encodeURIComponent(wordId)}/similar`, {
            method: 'POST',
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.results)) {
              setSimilarWords(data.results);
              setHasLoaded(true);
              return;
            }
          }
        } else {
          const res = await fetch(
            `/api/words/${encodeURIComponent(wordId)}/similar?limit=30&minScore=0.45`
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.results) && data.results.length > 0) {
              setSimilarWords(data.results);
              setHasLoaded(true);
              return;
            }
          }
        }

        // Local engine client fallback if API returns empty
        if (allWords.length > 0) {
          const liveResults = similarWordsEngine.findSimilarWords(word, allWords, {
            limit: 25,
            minScore: 0.45,
            includeSignals: true,
          });
          setSimilarWords(liveResults);
          setHasLoaded(true);
        }
      } catch (err) {
        console.warn('Failed to load similar words from API:', err);
        if (allWords.length > 0) {
          const liveResults = similarWordsEngine.findSimilarWords(word, allWords, {
            limit: 25,
            minScore: 0.45,
            includeSignals: true,
          });
          setSimilarWords(liveResults);
          setHasLoaded(true);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [wordId, word, allWords, hasLoaded, similarWords.length]
  );

  useEffect(() => {
    if (isExpanded && !hasLoaded) {
      void loadSimilarWords(false);
    }
  }, [isExpanded, hasLoaded, loadSimilarWords]);

  const handleManualRefresh = async () => {
    if (onRefreshSimilarWords) {
      setIsLoading(true);
      try {
        await onRefreshSimilarWords(wordId, word);
      } finally {
        setIsLoading(false);
      }
    } else {
      await loadSimilarWords(true);
    }
  };

  // Filter and group
  const filteredWords = useMemo(() => {
    if (selectedFilter === 'all') {
      return similarWords;
    }
    if (selectedFilter === 'word_family') {
      return similarWords.filter(
        (w) => w.relationship === 'word_family' || w.secondaryRelationships?.includes('word_family')
      );
    }
    if (selectedFilter === 'orthographic') {
      return similarWords.filter(
        (w) =>
          w.relationship === 'orthographic' ||
          w.relationship === 'transposition' ||
          w.secondaryRelationships?.includes('orthographic')
      );
    }
    if (selectedFilter === 'affix') {
      return similarWords.filter(
        (w) =>
          w.relationship === 'prefix' ||
          w.relationship === 'suffix' ||
          w.secondaryRelationships?.includes('prefix') ||
          w.secondaryRelationships?.includes('suffix')
      );
    }
    if (selectedFilter === 'morphological') {
      return similarWords.filter(
        (w) =>
          w.relationship === 'morphological' || w.secondaryRelationships?.includes('morphological')
      );
    }
    return similarWords;
  }, [similarWords, selectedFilter]);

  const counts = useMemo(() => {
    return {
      all: similarWords.length,
      word_family: similarWords.filter(
        (w) => w.relationship === 'word_family' || w.secondaryRelationships?.includes('word_family')
      ).length,
      orthographic: similarWords.filter(
        (w) =>
          w.relationship === 'orthographic' ||
          w.relationship === 'transposition' ||
          w.secondaryRelationships?.includes('orthographic')
      ).length,
      affix: similarWords.filter(
        (w) =>
          w.relationship === 'prefix' ||
          w.relationship === 'suffix' ||
          w.secondaryRelationships?.includes('prefix') ||
          w.secondaryRelationships?.includes('suffix')
      ).length,
      morphological: similarWords.filter(
        (w) =>
          w.relationship === 'morphological' || w.secondaryRelationships?.includes('morphological')
      ).length,
    };
  }, [similarWords]);

  return (
    <Paper
      p="sm"
      radius="md"
      mt="sm"
      style={{
        background: 'rgba(59, 130, 246, 0.04)',
        border: '1px solid rgba(59, 130, 246, 0.18)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header Bar */}
      <Group justify="space-between" align="center" wrap="wrap" gap="xs">
        <Group
          gap={8}
          align="center"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <ThemeIcon size="sm" variant="light" color="blue" radius="sm" style={{ flexShrink: 0 }}>
            <IconTopologyStarRing3 size={14} />
          </ThemeIcon>

          <Text size="xs" fw={700} c="blue">
            Similar & Related Words
          </Text>

          {similarWords.length > 0 && (
            <Badge size="xs" variant="light" color="blue" radius="xl">
              <RollingNumber value={similarWords.length} />
            </Badge>
          )}

          {isExpanded ? (
            <IconChevronUp size={14} style={{ color: '#3b82f6' }} />
          ) : (
            <IconChevronDown size={14} style={{ color: '#3b82f6' }} />
          )}
        </Group>

        <Group gap={6} align="center">
          <Tooltip label="Recompute linguistic similarities" withArrow>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="blue"
              loading={isLoading}
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                void handleManualRefresh();
              }}
              aria-label="Recompute similar words"
            >
              <IconRotateClockwise size={13} />
            </ActionIcon>
          </Tooltip>

          <Button
            variant="subtle"
            color="blue"
            size="xs"
            radius="sm"
            onClick={() => setIsExpanded((prev) => !prev)}
            style={{ height: 22, fontSize: '10px', padding: '0 6px' }}
          >
            {isExpanded ? 'Hide' : 'Explore'}
          </Button>
        </Group>
      </Group>

      {/* Expanded Content Area */}
      <Collapse expanded={isExpanded}>
        <Stack gap="xs" mt="xs">
          {/* Segmented Filter Bar */}
          {similarWords.length > 0 && (
            <SegmentedControl
              size="xs"
              radius="sm"
              value={selectedFilter}
              onChange={setSelectedFilter}
              data={[
                { label: `All (${counts.all})`, value: 'all' },
                { label: `Family (${counts.word_family})`, value: 'word_family' },
                { label: `Spelling (${counts.orthographic})`, value: 'orthographic' },
                { label: `Prefix/Suffix (${counts.affix})`, value: 'affix' },
                { label: `Morphology (${counts.morphological})`, value: 'morphological' },
              ]}
              styles={{
                root: {
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--card-border)',
                },
              }}
            />
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <Group gap={6} py="xs" justify="center">
              <IconSparkles size={14} className="sync-spin-icon" style={{ color: '#3b82f6' }} />
              <Text size="xs" c="blue" fw={600}>
                Analyzing orthographic, morphological, and structural patterns...
              </Text>
            </Group>
          )}

          {/* Empty State */}
          {!isLoading && filteredWords.length === 0 && (
            <Paper
              p="sm"
              radius="sm"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed var(--card-border)',
                textAlign: 'center',
              }}
            >
              <Text size="xs" c="dimmed">
                {similarWords.length === 0
                  ? 'No similar words discovered yet. Click refresh to run the linguistic similarity engine.'
                  : 'No similar words match the selected category filter.'}
              </Text>
            </Paper>
          )}

          {/* Results Grid */}
          {!isLoading && filteredWords.length > 0 && (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              {filteredWords.map((item, idx) => {
                const config =
                  RELATIONSHIP_CONFIG[item.relationship] || RELATIONSHIP_CONFIG.orthographic;
                const Icon = config.icon;
                const scorePercent = Math.round(item.score * 100);

                return (
                  <Paper
                    key={`${item.wordId || item.word}-${idx}`}
                    p="xs"
                    radius="sm"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      transition: 'transform 0.15s ease, background 0.15s ease',
                    }}
                  >
                    <Stack gap={4}>
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap={6} align="center" wrap="nowrap" style={{ minWidth: 0 }}>
                          <Text
                            size="sm"
                            fw={700}
                            style={{
                              color: 'var(--text-primary)',
                              wordBreak: 'break-word',
                            }}
                          >
                            {item.word}
                          </Text>

                          <PronounceButton word={item.word} size="xs" />
                        </Group>

                        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                          <Badge
                            size="xs"
                            variant="light"
                            color={config.color}
                            radius="sm"
                            leftSection={<Icon size={10} />}
                            style={{ textTransform: 'none', fontWeight: 700 }}
                          >
                            {config.label}
                          </Badge>

                          <Badge
                            size="xs"
                            variant="filled"
                            color={
                              scorePercent >= 80 ? 'teal' : scorePercent >= 60 ? 'blue' : 'orange'
                            }
                            radius="sm"
                            style={{ fontWeight: 800 }}
                          >
                            <RollingNumber value={scorePercent} suffix="%" />
                          </Badge>
                        </Group>
                      </Group>

                      {/* Explanation String */}
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{
                          lineHeight: 1.4,
                          fontSize: '11px',
                        }}
                      >
                        {item.explanation}
                      </Text>

                      {/* Action Bar */}
                      <Group justify="space-between" align="center" mt={2}>
                        <Group gap={4}>
                          {item.details?.affix && (
                            <Badge size="xs" variant="outline" color="gray" radius="sm">
                              Affix: {item.details.affix}
                            </Badge>
                          )}
                          {item.details?.sharedSequence && (
                            <Badge size="xs" variant="outline" color="gray" radius="sm">
                              Shared: {item.details.sharedSequence}
                            </Badge>
                          )}
                        </Group>

                        <Group gap={4}>
                          <Tooltip label="View detailed score signals" withArrow>
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="blue"
                              onClick={() => {
                                setSelectedResult(item);
                                setDetailsModalOpen(true);
                              }}
                              aria-label="View similarity breakdown"
                            >
                              <IconInfoCircle size={13} />
                            </ActionIcon>
                          </Tooltip>

                          {onNavigateWord && (
                            <Tooltip label={`Explore "${item.word}" in dictionary`} withArrow>
                              <ActionIcon
                                size="xs"
                                variant="subtle"
                                color="indigo"
                                onClick={() => onNavigateWord(item.word)}
                                aria-label={`View word ${item.word}`}
                              >
                                <IconSearch size={13} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Group>
                    </Stack>
                  </Paper>
                );
              })}
            </SimpleGrid>
          )}
        </Stack>
      </Collapse>

      {/* Detailed Signals & Scores Modal */}
      <Modal
        opened={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={
          <Group gap={8} align="center">
            <IconTopologyStarRing3 size={18} style={{ color: '#3b82f6' }} />
            <Text fw={700}>
              Linguistic Similarity: "{word}" ↔ "{selectedResult?.word}"
            </Text>
          </Group>
        }
        size="md"
        radius="md"
      >
        {selectedResult && (
          <Stack gap="sm">
            <Paper p="xs" radius="sm" style={{ background: 'rgba(59, 130, 246, 0.08)' }}>
              <Text size="xs" fw={700} c="blue">
                Explanation:
              </Text>
              <Text size="sm" mt={2} fw={600}>
                {selectedResult.explanation}
              </Text>
            </Paper>

            <Divider label="Signal Scores Breakdown" labelPosition="center" />

            <SimpleGrid cols={2} spacing="xs">
              <Stack gap={2}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Overall Relevance
                  </Text>
                  <Text size="xs" fw={700}>
                    {Math.round(selectedResult.scores.overall * 100)}%
                  </Text>
                </Group>
                <Progress
                  value={selectedResult.scores.overall * 100}
                  color="blue"
                  size="sm"
                  radius="xl"
                />
              </Stack>

              <Stack gap={2}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Spelling / Orthographic
                  </Text>
                  <Text size="xs" fw={700}>
                    {Math.round(selectedResult.scores.orthographic * 100)}%
                  </Text>
                </Group>
                <Progress
                  value={selectedResult.scores.orthographic * 100}
                  color="grape"
                  size="sm"
                  radius="xl"
                />
              </Stack>

              <Stack gap={2}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Character N-Grams
                  </Text>
                  <Text size="xs" fw={700}>
                    {Math.round(selectedResult.scores.ngram * 100)}%
                  </Text>
                </Group>
                <Progress
                  value={selectedResult.scores.ngram * 100}
                  color="cyan"
                  size="sm"
                  radius="xl"
                />
              </Stack>

              <Stack gap={2}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Morphological / Word Family
                  </Text>
                  <Text size="xs" fw={700}>
                    {Math.round(selectedResult.scores.morphological * 100)}%
                  </Text>
                </Group>
                <Progress
                  value={selectedResult.scores.morphological * 100}
                  color="indigo"
                  size="sm"
                  radius="xl"
                />
              </Stack>

              <Stack gap={2}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Common Prefix
                  </Text>
                  <Text size="xs" fw={700}>
                    {Math.round(selectedResult.scores.prefix * 100)}%
                  </Text>
                </Group>
                <Progress
                  value={selectedResult.scores.prefix * 100}
                  color="teal"
                  size="sm"
                  radius="xl"
                />
              </Stack>

              <Stack gap={2}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    Common Suffix
                  </Text>
                  <Text size="xs" fw={700}>
                    {Math.round(selectedResult.scores.suffix * 100)}%
                  </Text>
                </Group>
                <Progress
                  value={selectedResult.scores.suffix * 100}
                  color="pink"
                  size="sm"
                  radius="xl"
                />
              </Stack>
            </SimpleGrid>

            {selectedResult.signals && (
              <>
                <Divider label="Linguistic Signatures" labelPosition="center" />
                <SimpleGrid cols={2} spacing="xs">
                  <Paper p="xs" radius="sm" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                    <Text size="xs" c="dimmed">
                      Damerau-Levenshtein Similarity
                    </Text>
                    <Text size="sm" fw={700}>
                      {Math.round(selectedResult.signals.damerauLevenshtein * 100)}%
                    </Text>
                  </Paper>

                  <Paper p="xs" radius="sm" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                    <Text size="xs" c="dimmed">
                      Character Set Overlap
                    </Text>
                    <Text size="sm" fw={700}>
                      {Math.round(selectedResult.signals.characterSetOverlap * 100)}%
                    </Text>
                  </Paper>

                  <Paper p="xs" radius="sm" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                    <Text size="xs" c="dimmed">
                      Common Subsequence
                    </Text>
                    <Text size="sm" fw={700}>
                      "{selectedResult.signals.longestCommonSubsequence || 'None'}"
                    </Text>
                  </Paper>

                  <Paper p="xs" radius="sm" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                    <Text size="xs" c="dimmed">
                      Root / Base Word
                    </Text>
                    <Text size="sm" fw={700}>
                      "{selectedResult.signals.baseWord || selectedResult.signals.stem || 'None'}"
                    </Text>
                  </Paper>
                </SimpleGrid>
              </>
            )}

            <Group justify="flex-end" mt="xs">
              <Button variant="default" size="xs" onClick={() => setDetailsModalOpen(false)}>
                Close
              </Button>
              {onNavigateWord && (
                <Button
                  variant="filled"
                  color="blue"
                  size="xs"
                  leftSection={<IconSearch size={14} />}
                  onClick={() => {
                    setDetailsModalOpen(false);
                    onNavigateWord(selectedResult.word);
                  }}
                >
                  Explore "{selectedResult.word}"
                </Button>
              )}
            </Group>
          </Stack>
        )}
      </Modal>
    </Paper>
  );
});
