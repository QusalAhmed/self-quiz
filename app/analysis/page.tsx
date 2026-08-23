'use client';

import {
  Card,
  Container,
  Group,
  Loader,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AnalysisHeader,
  CategoryAnalysis,
  DailyWordsAddedChart,
  DifficultWordsTable,
  EmptyAnalysisState,
  FsrsMemoryHealth,
  InsightsAndRecommendations,
  KpiOverview,
  LearningProgressChart,
  LearningStateDistribution,
  RetentionAnalysis,
  ReviewLogSection,
  SectionStatusBadge,
  StrongestWordsTable,
  StudyActivityHeatmap,
  StudyEfficiency,
  StudyTimeAnalytics,
  TimeToMasteryCard,
  VocabularyGrowth,
  WordDifficultyVsTime,
  WordTimeAnalysis,
} from '@/components/Analysis';
import { EditWordModal } from '@/components/EditWordModal/EditWordModal';
import { GroupManager } from '@/components/GroupManager/GroupManager';
import { calculateAnalysis } from '@/lib/analysis/calculator';
import type { AnalysisFilters } from '@/lib/analysis/types';
import {
  type AppDatabase,
  type DailyUsageRecord,
  type FsrsRecord,
  getDatabase,
  type GroupRecord,
  type MissedWordRecord,
  type ReviewLogRecord,
  type WordDefinition,
  type WordRecord,
} from '@/lib/db';
import { getActiveGroupNames, replaceGroupInWordGroups, wordHasGroup } from '@/lib/groups';
import { setupSupabaseReplication } from '@/lib/replication';

export default function AnalysisPage() {
  const [database, setDatabase] = useState<AppDatabase | null>(null);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [missedWords, setMissedWords] = useState<MissedWordRecord[]>([]);
  const [fsrsRecords, setFsrsRecords] = useState<FsrsRecord[]>([]);
  const [reviewLogs, setReviewLogs] = useState<ReviewLogRecord[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Selected Words
  const [selectedWordRecord, setSelectedWordRecord] = useState<WordRecord | null>(null);
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [wordsTab, setWordsTab] = useState<'difficult' | 'strong'>('difficult');

  // Filters State
  const [filters, setFilters] = useState<AnalysisFilters>({
    datePreset: '30d',
    comparison: 'previous_period',
    quizMode: 'all',
    groupFilter: 'all',
    stateFilter: 'all',
  });

  // Ticker for real-time intervals
  const [nowTicker, setNowTicker] = useState(() => new Date().toISOString());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTicker(new Date().toISOString());
    }, 10000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const customGroups = useMemo(() => getActiveGroupNames(groups), [groups]);
  const wordsById = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  // RxDB Live Subscriptions
  useEffect(() => {
    let isMounted = true;
    let wordSubscription: { unsubscribe: () => void } | null = null;
    let groupSubscription: { unsubscribe: () => void } | null = null;
    let missedSubscription: { unsubscribe: () => void } | null = null;
    let fsrsSubscription: { unsubscribe: () => void } | null = null;
    let reviewLogSubscription: { unsubscribe: () => void } | null = null;
    let usageSubscription: { unsubscribe: () => void } | null = null;

    const loadDb = async () => {
      try {
        const db = await getDatabase();
        if (!isMounted) {
          return;
        }
        setDatabase(db);

        wordSubscription = db.words
          .find({ selector: { isDeleted: { $ne: true } } })
          .$.subscribe((docs) => {
            if (!isMounted) {
              return;
            }
            setWords(docs.map((d) => d.toJSON() as WordRecord));
          });

        groupSubscription = db.groups
          .find({ selector: { isDeleted: { $ne: true } } })
          .$.subscribe((docs) => {
            if (!isMounted) {
              return;
            }
            setGroups(docs.map((d) => d.toJSON() as GroupRecord));
          });

        missedSubscription = db.missedWords
          .find({ selector: { isDeleted: { $ne: true } } })
          .$.subscribe((docs) => {
            if (!isMounted) {
              return;
            }
            setMissedWords(docs.map((d) => d.toJSON() as MissedWordRecord));
          });

        fsrsSubscription = db.fsrsRecords
          .find({ selector: { isDeleted: { $ne: true } } })
          .$.subscribe((docs) => {
            if (!isMounted) {
              return;
            }
            setFsrsRecords(docs.map((d) => d.toJSON() as FsrsRecord));
          });

        reviewLogSubscription = db.reviewLogs
          .find({ selector: { isDeleted: { $ne: true } } })
          .$.subscribe((docs) => {
            if (!isMounted) {
              return;
            }
            setReviewLogs(docs.map((d) => d.toJSON() as ReviewLogRecord));
          });

        usageSubscription = db.dailyUsage
          .find({ selector: { isDeleted: { $ne: true } } })
          .$.subscribe((docs) => {
            if (!isMounted) {
              return;
            }
            setDailyUsage(docs.map((d) => d.toJSON() as DailyUsageRecord));
          });

        // Initialize cloud sync
        try {
          setupSupabaseReplication(db);
        } catch {
          // ignore
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load database in AnalysisPage:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDb();

    return () => {
      isMounted = false;
      wordSubscription?.unsubscribe();
      groupSubscription?.unsubscribe();
      missedSubscription?.unsubscribe();
      fsrsSubscription?.unsubscribe();
      reviewLogSubscription?.unsubscribe();
      usageSubscription?.unsubscribe();
    };
  }, []);

  // Compute full analytics result
  const analysis = useMemo(() => {
    return calculateAnalysis({
      words,
      fsrsRecords,
      dailyUsage,
      missedWords,
      groups,
      reviewLogs,
      filters,
      now: new Date(nowTicker),
    });
  }, [words, fsrsRecords, dailyUsage, missedWords, groups, reviewLogs, filters, nowTicker]);

  // Word selection for Edit Modal
  const handleSelectWord = useCallback(
    (wordId: string) => {
      const found = words.find((w) => w.id === wordId);
      if (found) {
        setSelectedWordRecord(found);
      }
    },
    [words]
  );

  const handleEditWord = useCallback(
    async (
      id: string,
      word: string,
      meaning: string,
      definitions?: WordDefinition[],
      customGroupNames?: string[],
      aiExampleCount?: number,
      notes?: string
    ) => {
      if (!database) {
        return;
      }
      const existing = await database.words.findOne(id).exec();
      if (!existing) {
        return;
      }
      const timestamp = new Date().toISOString();
      await database.words.upsert({
        ...existing.toJSON(),
        word,
        meaning,
        definitions: definitions || existing.definitions,
        customGroups: customGroupNames || existing.customGroups,
        aiExampleCount: aiExampleCount !== undefined ? aiExampleCount : existing.aiExampleCount,
        notes: notes !== undefined ? notes : existing.notes,
        updatedAt: timestamp,
      });
    },
    [database]
  );

  const handleAddGroup = useCallback(
    async (name: string) => {
      if (!database) {
        return;
      }
      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }
      const existing = await database.groups.find().exec();
      if (existing.some((g) => g.name.toLowerCase() === trimmed.toLowerCase() && !g.isDeleted)) {
        return;
      }
      const timestamp = new Date().toISOString();
      await database.groups.insert({
        id: crypto.randomUUID(),
        name: trimmed,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
        lastSyncedAt: '',
      });
    },
    [database]
  );

  const handleRenameGroup = useCallback(
    async (id: string, newName: string) => {
      if (!database) {
        return;
      }
      const trimmed = newName.trim();
      if (!trimmed) {
        return;
      }
      const groupDoc = await database.groups.findOne(id).exec();
      if (!groupDoc || groupDoc.isDeleted) {
        return;
      }

      const oldName = groupDoc.name;
      const timestamp = new Date().toISOString();
      await database.groups.upsert({
        ...groupDoc.toJSON(),
        name: trimmed,
        updatedAt: timestamp,
      });

      const allWords = await database.words.find().exec();
      for (const wDoc of allWords) {
        const r = wDoc.toJSON() as WordRecord;
        if (wordHasGroup(r, oldName)) {
          await database.words.upsert({
            ...r,
            customGroups: replaceGroupInWordGroups(r.customGroups || [], oldName, trimmed),
            updatedAt: timestamp,
          });
        }
      }
    },
    [database]
  );

  const handleDeleteGroup = useCallback(
    async (id: string) => {
      if (!database) {
        return;
      }
      const groupDoc = await database.groups.findOne(id).exec();
      if (!groupDoc || groupDoc.isDeleted) {
        return;
      }
      const timestamp = new Date().toISOString();
      await database.groups.upsert({
        ...groupDoc.toJSON(),
        isDeleted: true,
        updatedAt: timestamp,
      });
    },
    [database]
  );

  return (
    <Container size="xl" pt={0} pb={{ base: 'md', sm: 'xl' }} px={{ base: 'xs', sm: 'md' }}>
      {isLoading ? (
        <Card
          className="glass-panel"
          radius="xl"
          padding="xl"
          style={{ textAlign: 'center' }}
          py={60}
        >
          <Stack align="center" gap="sm">
            <Loader color="indigo" size="lg" type="dots" />
            <Text size="sm" c="dimmed">
              Aggregating FSRS records and study analytics...
            </Text>
          </Stack>
        </Card>
      ) : (
        <Stack gap="lg">
          {/* 1. Header with Period & Attribute Controls */}
          <AnalysisHeader
            filters={filters}
            onFiltersChange={setFilters}
            availableGroups={customGroups}
            totalWords={words.length}
            totalMastered={analysis.kpis.wordsMastered.value}
            onRefresh={() => setNowTicker(new Date().toISOString())}
          />

          {!analysis.hasData ? (
            <EmptyAnalysisState totalWords={words.length} />
          ) : (
            <>
              {/* 2. High-Value Overview KPI Cards */}
              <KpiOverview kpis={analysis.kpis} />

              {/* 3. Vocabulary Growth & Learning Trajectory */}
              <LearningProgressChart
                data={analysis.timeSeries}
                weeklyData={analysis.timeSeriesWeekly}
                monthlyData={analysis.timeSeriesMonthly}
                vocabularyGrowth={analysis.vocabularyGrowth}
                totalWords={analysis.totalWordsCount}
                masteredWords={analysis.kpis.wordsMastered.value}
                statusInfo={analysis.statuses.progress}
              />

              {/* 3.1 Words Added per Day Bar Chart */}
              <DailyWordsAddedChart
                data={analysis.dailyWordsAdded}
                statusInfo={analysis.statuses.dailyWordsAdded}
              />

              {/* 4. Words by Learning State (Interactive) */}
              <LearningStateDistribution
                data={analysis.stateDistribution}
                activeFilter={filters.stateFilter}
                onSelectState={(state) => setFilters((f) => ({ ...f, stateFilter: state }))}
                statusInfo={analysis.statuses.stateDistribution}
              />

              {/* 5. Study Time Over Time & Pacing */}
              <StudyTimeAnalytics
                data={analysis.timeSeries}
                weeklyData={analysis.timeSeriesWeekly}
                monthlyData={analysis.timeSeriesMonthly}
                totalStudyTimeMetric={analysis.kpis.totalStudyTimeSec}
                efficiency={analysis.efficiency}
                totalReviews={analysis.totalReviewsCount}
                activeStudyDays={analysis.activity.daysStudied}
                statusInfo={analysis.statuses.studyTime}
              />

              {/* 6. Time Spent Per Word (Ranked Table & Top Consuming Chart) */}
              <WordTimeAnalysis
                words={analysis.timeSpentPerWord}
                allWordsMap={wordsById}
                onSelectWord={(w) => setSelectedWordRecord(w)}
                statusInfo={analysis.statuses.wordTime}
              />

              {/* 7. Time-to-Mastery Trajectory & Fastest/Slowest Words */}
              <TimeToMasteryCard
                data={analysis.timeToMastery}
                allWordsMap={wordsById}
                onSelectWord={(w) => setSelectedWordRecord(w)}
                statusInfo={analysis.statuses.timeToMastery}
              />

              {/* 8. Word Difficulty vs Study Effort Scatter */}
              <WordDifficultyVsTime
                data={analysis.wordEffortPoints}
                allWordsMap={wordsById}
                onSelectWord={(w) => setSelectedWordRecord(w)}
                statusInfo={analysis.statuses.difficultyVsTime}
              />

              {/* 9. Category & Tag Analysis (when applicable) */}
              {analysis.categoryComparisons.length > 0 && (
                <CategoryAnalysis
                  categories={analysis.categoryComparisons}
                  statusInfo={analysis.statuses.categoryComparison}
                />
              )}

              {/* 10. Retention & Response Quality Analysis */}
              <RetentionAnalysis
                distribution={analysis.ratingDistribution}
                statusInfo={analysis.statuses.retention}
              />

              {/* 11. FSRS Memory Health & Diagnostics */}
              <FsrsMemoryHealth
                memoryHealth={analysis.memoryHealth}
                statusInfo={analysis.statuses.memoryHealth}
              />

              {/* 12. Study Consistency & Habit Heatmap */}
              <StudyActivityHeatmap
                activity={analysis.activity}
                statusInfo={analysis.statuses.activity}
              />

              {/* 13. Patterns, Insights & Actionable Recommendations */}
              <InsightsAndRecommendations
                insights={analysis.insights}
                recommendations={analysis.recommendations}
                statusInfo={analysis.statuses.insights}
              />

              {/* 14. Difficult Words vs Strongest Words Tabs */}
              <Card className="glass-panel" radius="xl" padding="md">
                <Stack gap="md">
                  <Group justify="space-between" align="center" wrap="wrap">
                    <Group gap="xs" align="center">
                      <Title order={3} style={{ fontSize: '1.2rem' }}>
                        Vocabulary Breakdown by Memory Strength
                      </Title>
                      <SectionStatusBadge statusInfo={analysis.statuses.wordsBreakdown} />
                    </Group>
                    <SegmentedControl
                      size="xs"
                      radius="md"
                      value={wordsTab}
                      onChange={(val) => setWordsTab(val as 'difficult' | 'strong')}
                      data={[
                        {
                          label: `Difficult Words (${analysis.difficultWords.length})`,
                          value: 'difficult',
                        },
                        {
                          label: `Strongest Words (${analysis.strongestWords.length})`,
                          value: 'strong',
                        },
                      ]}
                    />
                  </Group>

                  {wordsTab === 'difficult' ? (
                    <DifficultWordsTable
                      words={analysis.difficultWords}
                      onSelectWord={handleSelectWord}
                    />
                  ) : (
                    <StrongestWordsTable
                      words={analysis.strongestWords}
                      onSelectWord={handleSelectWord}
                    />
                  )}
                </Stack>
              </Card>

              {/* 15. Vocabulary Growth Velocity & Study Efficiency */}
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                <VocabularyGrowth
                  growth={analysis.vocabularyGrowth}
                  totalWords={analysis.totalWordsCount}
                  masteredWords={analysis.kpis.wordsMastered.value}
                  statusInfo={analysis.statuses.growth}
                />
                <StudyEfficiency
                  efficiency={analysis.efficiency}
                  statusInfo={analysis.statuses.efficiency}
                />
              </SimpleGrid>

              {/* 16. Historical Review Log & Audit Section */}
              <ReviewLogSection
                reviewLogs={reviewLogs}
                words={words}
                customGroups={customGroups}
                statusInfo={analysis.statuses.overview}
                onSelectWord={handleSelectWord}
              />
            </>
          )}
        </Stack>
      )}

      {/* Edit Word Modal */}
      <EditWordModal
        opened={selectedWordRecord !== null}
        onClose={() => setSelectedWordRecord(null)}
        wordRecord={selectedWordRecord}
        customGroups={customGroups}
        onSave={async (id, w, m, d, g, aiCount, n) => {
          await handleEditWord(id, w, m, d, g, aiCount, n);
          setSelectedWordRecord(null);
        }}
        onAddCustomGroup={(g) => void handleAddGroup(g)}
      />

      {/* Group Manager Modal */}
      <GroupManager
        opened={groupManagerOpen}
        onClose={() => setGroupManagerOpen(false)}
        groups={groups}
        onRename={handleRenameGroup}
        onDelete={handleDeleteGroup}
        onAdd={handleAddGroup}
      />
    </Container>
  );
}
