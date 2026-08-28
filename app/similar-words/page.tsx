'use client';

import {
  Alert,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconCheck, IconSparkles, IconTopologyStarRing3 } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ClusterSortOption,
  SimilarWordClusterCard,
  SimilarWordsClusterDetailModal,
  SimilarWordsFilterBar,
  SimilarWordsHeader,
  SimilarWordsNetworkView,
  type ViewMode,
} from '@/components/SimilarWords';
import { getDatabase, type WordRecord, type WordSimilarityRecord } from '@/lib/db';
import { useAppDispatch } from '@/lib/redux/hooks';
import { openAllWordsQuiz, setMode } from '@/lib/redux/slices/quizSlice';
import { setupSupabaseReplication } from '@/lib/replication';
import { clusterSimilarWords, type SimilarWordCluster } from '@/lib/similar-words/clustering';
import { similarWordsEngine } from '@/lib/similar-words/engine';

export default function SimilarWordsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [words, setWords] = useState<WordRecord[]>([]);
  const [similarityRecords, setSimilarityRecords] = useState<WordSimilarityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [recomputeMessage, setRecomputeMessage] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [minScoreThreshold, setMinScoreThreshold] = useState<number>(0.45);
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<ClusterSortOption>('size_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Modal State
  const [selectedCluster, setSelectedCluster] = useState<SimilarWordCluster | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Initialize DB and Subscriptions
  useEffect(() => {
    let isMounted = true;
    let wordSub: { unsubscribe: () => void } | null = null;
    let simSub: { unsubscribe: () => void } | null = null;

    async function init() {
      try {
        const db = await getDatabase();
        if (!isMounted) {
          return;
        }

        // Fetch words
        wordSub = db.words.find().$.subscribe((wordDocs) => {
          if (!isMounted) {
            return;
          }
          const activeWords = wordDocs
            .map((doc) => doc.toJSON() as WordRecord)
            .filter((w) => !w.isDeleted);
          setWords(activeWords);
        });

        // Fetch word similarities
        if (db.wordSimilarities) {
          simSub = db.wordSimilarities.find().$.subscribe((simDocs) => {
            if (!isMounted) {
              return;
            }
            const activeSims = simDocs
              .map((doc) => doc.toJSON() as WordSimilarityRecord)
              .filter((s) => !s.isDeleted);
            setSimilarityRecords(activeSims);
            setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }

        // Trigger replication in background
        void setupSupabaseReplication(db);
      } catch (err) {
        console.warn('SimilarWordsPage init warning:', err);
        setIsLoading(false);
      }
    }

    void init();

    return () => {
      isMounted = false;
      wordSub?.unsubscribe();
      simSub?.unsubscribe();
    };
  }, []);

  // Map of WordRecords by ID for fast lookup
  const wordRecordsMap = useMemo(() => {
    const map = new Map<string, WordRecord>();
    words.forEach((w) => map.set(w.id, w));
    return map;
  }, [words]);

  // Compute or cluster similarity records
  const allClusters = useMemo(() => {
    const wordItems = words.map((w) => ({ id: w.id, word: w.word }));

    // If no similarity records are in DB, compute in-memory using engine
    let recordsToCluster: any[] = similarityRecords;
    if (recordsToCluster.length === 0 && wordItems.length > 1) {
      const { records } = similarWordsEngine.batchComputeAll(wordItems, minScoreThreshold);
      recordsToCluster = records;
    }

    return clusterSimilarWords(wordItems, recordsToCluster, {
      minScore: minScoreThreshold,
    });
  }, [words, similarityRecords, minScoreThreshold]);

  // Category Counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allClusters.length,
      word_family: 0,
      morphological: 0,
      orthographic: 0,
      transposition: 0,
      affix: 0,
    };
    allClusters.forEach((c) => {
      if (c.clusterType === 'word_family') {
        counts.word_family = (counts.word_family || 0) + 1;
      } else if (c.clusterType === 'morphological') {
        counts.morphological = (counts.morphological || 0) + 1;
      } else if (c.clusterType === 'transposition') {
        counts.transposition = (counts.transposition || 0) + 1;
      } else if (c.clusterType === 'prefix' || c.clusterType === 'suffix') {
        counts.affix = (counts.affix || 0) + 1;
      } else {
        counts.orthographic = (counts.orthographic || 0) + 1;
      }
    });
    return counts;
  }, [allClusters]);

  // Filtered and Sorted Clusters
  const filteredClusters = useMemo(() => {
    let result = [...allClusters];

    // 1. Search Query Filter
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((c) => {
        if (c.name.toLowerCase().includes(query)) {
          return true;
        }
        if (c.hubWord.toLowerCase().includes(query)) {
          return true;
        }
        if (c.words.some((w) => w.toLowerCase().includes(query))) {
          return true;
        }
        if (c.sharedFeatures.commonRoot?.toLowerCase().includes(query)) {
          return true;
        }
        if (c.sharedFeatures.commonSubstring?.toLowerCase().includes(query)) {
          return true;
        }
        if (c.sharedFeatures.affixes?.some((a) => a.toLowerCase().includes(query))) {
          return true;
        }
        return false;
      });
    }

    // 2. Category Filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'affix') {
        result = result.filter((c) => c.clusterType === 'prefix' || c.clusterType === 'suffix');
      } else {
        result = result.filter((c) => c.clusterType === selectedCategory);
      }
    }

    // 3. Cluster Size Filter
    if (selectedSizeFilter === 'pairs') {
      result = result.filter((c) => c.size === 2);
    } else if (selectedSizeFilter === 'triplets') {
      result = result.filter((c) => c.size === 3);
    } else if (selectedSizeFilter === 'large') {
      result = result.filter((c) => c.size >= 4);
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortOption === 'size_desc') {
        if (b.size !== a.size) {
          return b.size - a.size;
        }
        return b.averageScore - a.averageScore;
      }
      if (sortOption === 'score_desc') {
        if (b.averageScore !== a.averageScore) {
          return b.averageScore - a.averageScore;
        }
        return b.size - a.size;
      }
      if (sortOption === 'alpha_asc') {
        return a.hubWord.localeCompare(b.hubWord);
      }
      if (sortOption === 'edges_desc') {
        return b.edges.length - a.edges.length;
      }
      return 0;
    });

    return result;
  }, [allClusters, searchQuery, selectedCategory, selectedSizeFilter, sortOption]);

  // Recompute All Similarities Handler
  const handleRecomputeAll = useCallback(async () => {
    setIsRecomputing(true);
    setRecomputeMessage(null);
    try {
      const res = await fetch('/api/words/similar/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minScore: minScoreThreshold }),
      });

      if (res.ok) {
        const data = await res.json();
        setRecomputeMessage(
          `Successfully analyzed ${data.metrics?.totalWords || words.length} vocabulary words and precomputed ${data.totalDiscovered || 0} similarity relationships.`
        );
      } else {
        // In-memory fallback calculation
        const wordItems = words.map((w) => ({ id: w.id, word: w.word }));
        const { records } = similarWordsEngine.batchComputeAll(wordItems, minScoreThreshold);
        setRecomputeMessage(`Calculated ${records.length} linguistic similarity connections.`);
      }
    } catch (err) {
      console.warn('Batch similarity computation error:', err);
      // In-memory fallback
      const wordItems = words.map((w) => ({ id: w.id, word: w.word }));
      const { records } = similarWordsEngine.batchComputeAll(wordItems, minScoreThreshold);
      setRecomputeMessage(`Calculated ${records.length} linguistic similarity connections.`);
    } finally {
      setIsRecomputing(false);
    }
  }, [words, minScoreThreshold]);

  // Inspect Cluster Handler
  const handleInspectCluster = useCallback((cluster: SimilarWordCluster) => {
    setSelectedCluster(cluster);
    setDetailModalOpen(true);
  }, []);

  // Study / Practice Cluster Words Handler
  const handleStudyCluster = useCallback(
    (_clusterWords: string[]) => {
      dispatch(setMode('quiz'));
      dispatch(openAllWordsQuiz());
      router.push('/quiz');
    },
    [dispatch, router]
  );

  // Navigate Word Handler
  const handleNavigateWord = useCallback(
    (_wordText: string) => {
      router.push('/words');
    },
    [router]
  );

  // Reset Filters Handler
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setMinScoreThreshold(0.45);
    setSelectedSizeFilter('all');
    setSortOption('size_desc');
  }, []);

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        {/* Header and Stats Dashboard */}
        <SimilarWordsHeader
          clusters={allClusters}
          totalVocabularyCount={words.length}
          isLoading={isLoading}
          isRecomputing={isRecomputing}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onRecomputeAll={handleRecomputeAll}
        />

        {/* Feedback Message */}
        {recomputeMessage && (
          <Alert
            icon={<IconCheck size={16} />}
            title="Linguistic Engine Updated"
            color="teal"
            radius="md"
            withCloseButton
            onClose={() => setRecomputeMessage(null)}
          >
            {recomputeMessage}
          </Alert>
        )}

        {/* Filter and Search Bar */}
        <SimilarWordsFilterBar
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          minScoreThreshold={minScoreThreshold}
          onMinScoreChange={setMinScoreThreshold}
          selectedSizeFilter={selectedSizeFilter}
          onSizeFilterChange={setSelectedSizeFilter}
          sortOption={sortOption}
          onSortOptionChange={setSortOption}
          categoryCounts={categoryCounts}
          onResetFilters={handleResetFilters}
        />

        {/* Content View */}
        {isLoading && (
          <Paper
            p="xl"
            radius="md"
            style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <Group justify="center" gap="sm">
              <Loader size="sm" color="indigo" />
              <Text size="sm" c="dimmed">
                Loading vocabulary and clustering linguistic relationships...
              </Text>
            </Group>
          </Paper>
        )}

        {!isLoading && filteredClusters.length === 0 && (
          <Paper
            p="xl"
            radius="md"
            style={{
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed var(--card-border)',
            }}
          >
            <Stack align="center" gap="xs">
              <ThemeIcon size="xl" radius="xl" variant="light" color="indigo">
                <IconTopologyStarRing3 size={24} />
              </ThemeIcon>
              <Title order={4}>No Similar Word Groups Found</Title>
              <Text size="sm" c="dimmed" style={{ maxWidth: 460 }}>
                {words.length <= 1
                  ? 'Add more vocabulary words to discover structural patterns, spelling twins, and word families.'
                  : 'No groups match your current filter criteria. Try adjusting the search query or lowering the minimum score slider.'}
              </Text>
              {allClusters.length === 0 && words.length > 1 && (
                <Button
                  size="xs"
                  radius="md"
                  variant="light"
                  color="indigo"
                  mt="xs"
                  leftSection={<IconSparkles size={14} />}
                  onClick={() => void handleRecomputeAll()}
                >
                  Run Initial Similarity Analysis
                </Button>
              )}
            </Stack>
          </Paper>
        )}

        {!isLoading && filteredClusters.length > 0 && viewMode === 'network' && (
          <SimilarWordsNetworkView
            clusters={filteredClusters}
            onInspectCluster={handleInspectCluster}
            onStudyCluster={handleStudyCluster}
            onNavigateWord={handleNavigateWord}
          />
        )}

        {!isLoading && filteredClusters.length > 0 && viewMode !== 'network' && (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {filteredClusters.map((cluster) => (
              <SimilarWordClusterCard
                key={cluster.id}
                cluster={cluster}
                wordRecordsMap={wordRecordsMap}
                onInspectCluster={handleInspectCluster}
                onStudyCluster={handleStudyCluster}
                onNavigateWord={handleNavigateWord}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>

      {/* Deep Inspection Modal */}
      <SimilarWordsClusterDetailModal
        opened={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        cluster={selectedCluster}
        wordRecordsMap={wordRecordsMap}
        onStudyCluster={handleStudyCluster}
        onNavigateWord={handleNavigateWord}
      />
    </Container>
  );
}
