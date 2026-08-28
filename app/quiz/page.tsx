'use client';

import { Container, Stack } from '@mantine/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type QuizDirectionKey,
  type QuizSourceKey,
  quizDirections,
  GROUP_QUIZ_STORAGE_KEY,
  SIMILAR_CLUSTERS_CACHE_KEY,
} from '@/app/home/constants';
import {
  capitalizeWord,
  getMissingAiExampleDefinitionIndexes,
  getRangeEnd,
  getRangeStart,
  mergeExamplesIntoDefinitions,
  requestExamples,
  requestExamplesForDefinitions,
  shuffle,
  toMutableWordRecord,
} from '@/app/home/utils';
import { EditWordModal } from '@/components/EditWordModal/EditWordModal';
import { FsrsQueueChangeModal } from '@/components/FsrsReview';
import { ClearMissedWordsModal } from '@/components/Home/ClearMissedWordsModal';
import { QuizModeSection } from '@/components/Home/QuizModeSection';
import {
  type AppDatabase,
  buildMissedWordId,
  type FsrsRecord,
  getDatabase,
  type GroupRecord,
  type MissedWordRecord,
  type WordDefinition,
  type WordFamilyMemberRecord,
  type WordRecord,
  type WordSimilarityRecord,
} from '@/lib/db';
import { definitionsToMeaning, getWordDefinitions, normalizeDefinitions } from '@/lib/definitions';
import { mergeAiExamples, normalizeAiExampleCount, normalizeAiExamples } from '@/lib/examples';
import {
  buildFsrsId,
  computeFsrs,
  computeFsrsIntervals,
  createInitialFsrsRecord,
  createReviewLogEvent,
  type FsrsRating,
  updateFsrsRecordContent,
} from '@/lib/fsrs';
import { getActiveGroupNames, wordHasAnyGroup, wordHasGroup } from '@/lib/groups';
import { showQueueRefillNotification } from '@/lib/notifications';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
  clearGroupQuiz,
  computePoolSignature,
  nextCard,
  openForgettingQuiz,
  openSrsPracticeQuiz,
  previousCard,
  pushQuizHistory,
  removeQuizItem,
  selectQuizState,
  setAutoPronounceQuizWord,
  setClusterContext,
  setCustomEnd,
  setCustomStart,
  setHideMissedMeanings,
  setHideSrsPracticeMeanings,
  setMode,
  setPracticeDisplayMode,
  setQuizDirection,
  setQuizGroupFilter,
  setQuizQueue,
  setQuizRange,
  setQuizSource,
  setRevealed,
  setRevealedMissedWordIds,
  setRevealedSrsPracticeWordIds,
  setSelectedGroupId,
  setTargetWordIds,
  syncQueueItems,
  undoQuizHistory,
  updateQuizItem,
} from '@/lib/redux/slices/quizSlice';
import { setupSupabaseReplication, type ReplicationsHolder } from '@/lib/replication';
import { clusterSimilarWords } from '@/lib/similar-words/clustering';
import { similarWordsEngine } from '@/lib/similar-words/engine';
import { notifyFsrsQueueRefill, notifyWordSaved } from '@/lib/system-notifications';
import { resolveWordTextFromMainTable } from '@/lib/word-display';
import { buildWordFamilyId, type WordFamilyMember } from '@/lib/word-family';

type WordWithDefinitions<T> = T & { definitions?: WordDefinition[] };

export default function QuizPage() {
  const dispatch = useAppDispatch();
  const {
    quizRange,
    quizSource,
    quizDirection,
    quizGroupFilter,
    customStart,
    customEnd,
    practiceDisplayMode,
    autoPronounceQuizWord,
    hideMissedMeanings,
    hideSrsPracticeMeanings,
    targetWordIds,
    selectedGroupId,
    clusterContext,
    revealedMissedWordIds,
    revealedSrsPracticeWordIds,
    queue: quizQueue,
    currentIndex: quizIndex,
    revealed,
    completed,
    history: quizHistory,
    isInitialized,
    poolSignature,
  } = useAppSelector(selectQuizState);

  const [database, setDatabase] = useState<AppDatabase | null>(null);
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [missedWords, setMissedWords] = useState<MissedWordRecord[]>([]);
  const [fsrsRecords, setFsrsRecords] = useState<FsrsRecord[]>([]);
  const [similarityRecords, setSimilarityRecords] = useState<WordSimilarityRecord[]>([]);
  const [wordFamilies, setWordFamilies] = useState<Record<string, WordFamilyMemberRecord[]>>({});
  const [generatingWordFamilyWordIds, setGeneratingWordFamilyWordIds] = useState<
    Record<string, boolean>
  >({});
  const [editingQuizWordId, setEditingQuizWordId] = useState<string | null>(null);
  const [confirmClearAllOpen, setConfirmClearAllOpen] = useState(false);
  const [exampleGenerationCounts, setExampleGenerationCounts] = useState<Record<string, number>>(
    {}
  );
  const cardPresentedAtRef = useRef<number>(Date.now());

  // Real-Time Due Timer: Ticks every 10 seconds to update FSRS/SRS due cards automatically
  const [nowTicker, setNowTicker] = useState(() => new Date().toISOString());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTicker(new Date().toISOString());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const customGroups = useMemo(() => getActiveGroupNames(groups), [groups]);

  // Ensure mode is set to 'quiz' in Redux
  useEffect(() => {
    dispatch(setMode('quiz'));
  }, [dispatch]);

  // Recover Group Quiz from URL query params or localStorage upon page load / refresh
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get('source');
    const clusterIdParam = params.get('clusterId') || params.get('groupId');
    const clusterNameParam = params.get('clusterName');

    let savedState: any = null;
    try {
      const saved = localStorage.getItem(GROUP_QUIZ_STORAGE_KEY);
      if (saved) {
        savedState = JSON.parse(saved);
      }
    } catch (err) {
      console.warn('Could not restore group quiz from localStorage:', err);
    }

    if (sourceParam === 'similarGroups' || clusterIdParam) {
      dispatch(setQuizSource('similarGroups'));
      const activeGroupId = clusterIdParam || savedState?.selectedGroupId || 'all';
      dispatch(setSelectedGroupId(activeGroupId));

      if (
        savedState &&
        savedState.quizSource === 'similarGroups' &&
        (savedState.selectedGroupId === activeGroupId || activeGroupId === 'all')
      ) {
        if (savedState.targetWordIds && Array.isArray(savedState.targetWordIds)) {
          dispatch(setTargetWordIds(savedState.targetWordIds));
        }
        if (savedState.clusterContext) {
          dispatch(setClusterContext(savedState.clusterContext));
        }
      } else if (clusterNameParam) {
        dispatch(
          setClusterContext({
            clusterId: activeGroupId,
            clusterName: clusterNameParam,
          })
        );
      }
      return;
    }

    if (savedState && savedState.quizSource === 'similarGroups') {
      dispatch(setQuizSource('similarGroups'));
      if (savedState.selectedGroupId) {
        dispatch(setSelectedGroupId(savedState.selectedGroupId));
      }
      if (savedState.targetWordIds && Array.isArray(savedState.targetWordIds)) {
        dispatch(setTargetWordIds(savedState.targetWordIds));
      }
      if (savedState.clusterContext) {
        dispatch(setClusterContext(savedState.clusterContext));
      }
    }
  }, [dispatch]);

  // Persist Group Quiz state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (quizSource === 'similarGroups') {
      try {
        const existingRaw = localStorage.getItem(GROUP_QUIZ_STORAGE_KEY);
        const existing = existingRaw ? JSON.parse(existingRaw) : null;

        const payload = {
          quizSource: 'similarGroups',
          selectedGroupId: selectedGroupId || existing?.selectedGroupId || 'all',
          targetWordIds: targetWordIds ?? existing?.targetWordIds ?? null,
          clusterContext: clusterContext ?? existing?.clusterContext ?? null,
        };
        localStorage.setItem(GROUP_QUIZ_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem(GROUP_QUIZ_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, [quizSource, selectedGroupId, targetWordIds, clusterContext]);

  // Compute all similar clusters for the database words (with cached fallback)
  const allSimilarClusters = useMemo(() => {
    const wordItems = words.map((w) => ({ id: w.id, word: w.word }));
    let recordsToCluster: any[] = similarityRecords;
    if (recordsToCluster.length === 0 && wordItems.length > 1) {
      const { records } = similarWordsEngine.batchComputeAll(wordItems, 0.45);
      recordsToCluster = records;
    }

    const computed = clusterSimilarWords(wordItems, recordsToCluster, { minScore: 0.45 });
    if (computed.length > 0) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(SIMILAR_CLUSTERS_CACHE_KEY, JSON.stringify(computed));
        } catch {
          // ignore
        }
      }
      return computed;
    }

    // Fallback to cached clusters in localStorage
    if (typeof window !== 'undefined') {
      try {
        const cachedRaw = localStorage.getItem(SIMILAR_CLUSTERS_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (Array.isArray(cached) && cached.length > 0) {
            return cached;
          }
        }
      } catch {
        // ignore
      }
    }

    return [];
  }, [words, similarityRecords]);

  // Synchronize targetWordIds and clusterContext with computed clusters
  useEffect(() => {
    if (quizSource !== 'similarGroups' || allSimilarClusters.length === 0) {
      return;
    }

    if (!selectedGroupId || selectedGroupId === 'all') {
      const allClusteredWordIds = Array.from(new Set(allSimilarClusters.flatMap((c) => c.wordIds)));
      const allWordsList = Array.from(new Set(allSimilarClusters.flatMap((c) => c.words)));
      dispatch(setTargetWordIds(allClusteredWordIds));
      dispatch(
        setClusterContext({
          clusterId: 'all',
          clusterName: 'All Clustered Words',
          clusterType: 'all_groups',
          words: allWordsList,
          explanation: `Comprehensive quiz across all ${allClusteredWordIds.length} words in ${allSimilarClusters.length} linguistic groups.`,
        })
      );
      return;
    }

    const matched = allSimilarClusters.find(
      (c) => c.id === selectedGroupId || c.name === selectedGroupId
    );
    if (matched) {
      dispatch(setTargetWordIds(matched.wordIds));
      dispatch(
        setClusterContext({
          clusterId: matched.id,
          clusterName: matched.name,
          clusterType: matched.clusterType,
          hubWord: matched.hubWord,
          words: matched.words,
          explanation: matched.explanation,
        })
      );
    }
  }, [quizSource, selectedGroupId, allSimilarClusters, dispatch]);

  const handleSetQuizSource = useCallback(
    (source: QuizSourceKey) => {
      dispatch(setQuizSource(source));
      if (source === 'similarGroups') {
        if (!selectedGroupId) {
          dispatch(setSelectedGroupId('all'));
        }
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('source', 'similarGroups');
          url.searchParams.set('clusterId', selectedGroupId || 'all');
          window.history.replaceState({}, '', url.toString());
        }
      } else {
        dispatch(setSelectedGroupId(null));
        dispatch(setTargetWordIds(null));
        dispatch(setClusterContext(null));
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(GROUP_QUIZ_STORAGE_KEY);
          } catch {
            // ignore
          }
          const url = new URL(window.location.href);
          url.searchParams.delete('source');
          url.searchParams.delete('clusterId');
          url.searchParams.delete('groupId');
          window.history.replaceState({}, '', url.toString());
        }
      }
    },
    [dispatch, selectedGroupId]
  );

  const handleSetSelectedGroupId = useCallback(
    (groupId: string | null) => {
      dispatch(setSelectedGroupId(groupId));
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (groupId) {
          url.searchParams.set('source', 'similarGroups');
          url.searchParams.set('clusterId', groupId);
        } else {
          url.searchParams.delete('clusterId');
        }
        window.history.replaceState({}, '', url.toString());
      }
    },
    [dispatch]
  );

  const handleClearGroupQuiz = useCallback(() => {
    dispatch(clearGroupQuiz());
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(GROUP_QUIZ_STORAGE_KEY);
      } catch {
        // ignore
      }
      const url = new URL(window.location.href);
      url.searchParams.delete('source');
      url.searchParams.delete('clusterId');
      url.searchParams.delete('groupId');
      window.history.replaceState({}, '', url.toString());
    }
  }, [dispatch]);

  // Network & Replication Sync
  const syncInProgressRef = useRef(false);
  const replicationsRef = useRef<ReplicationsHolder | null>(null);

  const withSyncState = useCallback(async (task: () => Promise<void>) => {
    if (syncInProgressRef.current || !navigator.onLine) {
      return;
    }

    syncInProgressRef.current = true;
    try {
      await task();
    } catch (error) {
      console.error('Replication sync error in QuizPage:', error);
    } finally {
      syncInProgressRef.current = false;
    }
  }, []);

  const ensureGroupExists = useCallback(
    async (groupName: string) => {
      if (!database) {
        return;
      }

      const trimmed = groupName.trim();
      if (!trimmed) {
        return;
      }

      const existingDoc = await database.groups
        .findOne({
          selector: { name: trimmed, isDeleted: { $ne: true } },
        })
        .exec();
      if (existingDoc) {
        return;
      }

      const timestamp = new Date().toISOString();
      const record: GroupRecord = {
        id: crypto.randomUUID(),
        name: trimmed,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
        lastSyncedAt: '',
      };

      await database.groups.upsert(record);
    },
    [database]
  );

  const handleAddCustomGroup = useCallback(
    (newGroup: string) => {
      void ensureGroupExists(newGroup);
    },
    [ensureGroupExists]
  );

  const wordsById = useMemo(() => {
    return new Map(words.map((word) => [word.id, word]));
  }, [words]);

  const fsrsRecordsById = useMemo(() => {
    return new Map(fsrsRecords.map((record) => [record.id, record]));
  }, [fsrsRecords]);

  // Compute Stats / Practice items
  const missedWordsForMode = useMemo(
    () =>
      missedWords
        .filter((word) => word.quizMode === quizDirection)
        .map((word) => resolveWordTextFromMainTable(word, wordsById))
        .filter((word): word is WordWithDefinitions<MissedWordRecord> => word !== null),
    [missedWords, quizDirection, wordsById]
  );

  const missedWordIdSet = useMemo(
    () => new Set(missedWordsForMode.map((word) => word.wordId)),
    [missedWordsForMode]
  );

  const fsrsDueRecords = useMemo(() => {
    return fsrsRecords
      .filter((r) => !r.isDeleted && r.quizMode === quizDirection && r.dueAt <= nowTicker)
      .map((record) => resolveWordTextFromMainTable(record, wordsById))
      .filter((record): record is WordWithDefinitions<FsrsRecord> => record !== null)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }, [fsrsRecords, quizDirection, wordsById, nowTicker]);

  const fsrsForgettingWordsForMode = useMemo(() => {
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    const nowMs = new Date(nowTicker).getTime();

    return fsrsRecords
      .filter((r) => {
        if (r.isDeleted || r.quizMode !== quizDirection) {
          return false;
        }
        if (r.lastRating !== 'again' && r.lastRating !== 'hard') {
          return false;
        }
        const dueMs = new Date(r.dueAt).getTime();
        return dueMs - nowMs > SIX_HOURS_MS;
      })
      .map((record) => resolveWordTextFromMainTable(record, wordsById))
      .filter((record): record is WordWithDefinitions<FsrsRecord> => record !== null);
  }, [fsrsRecords, quizDirection, wordsById, nowTicker]);

  const generatingExampleWordIds = useMemo(
    () => Object.fromEntries(Object.keys(exampleGenerationCounts).map((id) => [id, true])),
    [exampleGenerationCounts]
  );

  const getCandidateWordId = useCallback(
    (word: WordRecord | MissedWordRecord | FsrsRecord) => {
      if (quizSource === 'missed') {
        return (word as MissedWordRecord).wordId;
      }
      if (quizSource === 'fsrs') {
        return (word as FsrsRecord).wordId;
      }
      return word.id;
    },
    [quizSource]
  );

  const saveMissedWordRecord = useCallback(
    async (wordId: string, word: string, meaning: string, quizMode: QuizDirectionKey) => {
      if (!database) {
        return;
      }

      const timestamp = new Date().toISOString();
      const baseWordId = wordId.includes(':') ? wordId.split(':')[0] : wordId;
      const missedId = buildMissedWordId(baseWordId, quizMode);
      const existing = await database.missedWords.findOne(missedId).exec();

      if (existing) {
        const current = existing.toJSON();
        const updated = {
          ...current,
          word,
          meaning,
          missedAt: timestamp,
          missedCount: current.missedCount + 1,
          updatedAt: timestamp,
          isDeleted: false,
        };
        await database.missedWords.upsert(updated);
        return;
      }

      const record: MissedWordRecord = {
        id: missedId,
        wordId: baseWordId,
        quizMode,
        word,
        meaning,
        missedAt: timestamp,
        missedCount: 1,
        updatedAt: timestamp,
        lastSyncedAt: '',
        isDeleted: false,
      };

      await database.missedWords.upsert(record);
    },
    [database]
  );

  const removeMissedWordRecord = useCallback(
    async (wordId: string, quizMode: QuizDirectionKey) => {
      if (!database) {
        return;
      }

      const baseWordId = wordId.includes(':') ? wordId.split(':')[0] : wordId;
      const missedId = buildMissedWordId(baseWordId, quizMode);
      const existing = await database.missedWords.findOne(missedId).exec();
      if (!existing) {
        return;
      }

      const timestamp = new Date().toISOString();
      const record = {
        ...existing.toJSON(),
        isDeleted: true,
        updatedAt: timestamp,
      };

      await database.missedWords.upsert(record);
    },
    [database]
  );

  const toggleMissedWordRecord = useCallback(
    async (wordId: string, word: string, meaning: string, quizMode: QuizDirectionKey) => {
      const baseWordId = wordId.includes(':') ? wordId.split(':')[0] : wordId;
      const missedId = buildMissedWordId(baseWordId, quizMode);
      const existing = await database?.missedWords.findOne(missedId).exec();
      if (existing && !existing.isDeleted) {
        await removeMissedWordRecord(baseWordId, quizMode);
      } else {
        await saveMissedWordRecord(baseWordId, word, meaning, quizMode);
      }
    },
    [database, removeMissedWordRecord, saveMissedWordRecord]
  );

  const quizCandidates = useMemo(() => {
    // Similar Word Groups Quiz
    if (quizSource === 'similarGroups') {
      if (selectedGroupId && selectedGroupId !== 'all') {
        const matchedCluster = allSimilarClusters.find(
          (c) => c.id === selectedGroupId || c.name === selectedGroupId
        );
        if (matchedCluster) {
          const idSet = new Set(matchedCluster.wordIds);
          const textSet = new Set((matchedCluster.words || []).map((w: string) => w.toLowerCase()));
          return words.filter((w) => idSet.has(w.id) || textSet.has(w.word.toLowerCase()));
        }
      }

      if (targetWordIds && targetWordIds.length > 0) {
        const targetIdSet = new Set(targetWordIds);
        const targetWordTextSet = new Set(
          (clusterContext?.words || []).map((w: string) => w.toLowerCase())
        );
        return words.filter(
          (w) => targetIdSet.has(w.id) || targetWordTextSet.has(w.word.toLowerCase())
        );
      }

      if (clusterContext?.words && clusterContext.words.length > 0) {
        const textSet = new Set((clusterContext.words || []).map((w: string) => w.toLowerCase()));
        return words.filter((w) => textSet.has(w.word.toLowerCase()));
      }

      // If all groups, filter to words belonging to any discovered cluster
      const allClusterWordIds = new Set(allSimilarClusters.flatMap((c) => c.wordIds));
      if (allClusterWordIds.size > 0) {
        return words.filter((w) => allClusterWordIds.has(w.id));
      }

      return [];
    }

    // If targetWordIds are provided directly, constrain the pool to those target words
    if (targetWordIds && targetWordIds.length > 0) {
      const targetIdSet = new Set(targetWordIds);
      const targetWordTextSet = new Set((clusterContext?.words || []).map((w) => w.toLowerCase()));

      return words.filter(
        (w) => targetIdSet.has(w.id) || targetWordTextSet.has(w.word.toLowerCase())
      );
    }

    if (quizSource === 'fsrsForgetting') {
      let candidates: (WordRecord | MissedWordRecord | FsrsRecord)[];
      if (practiceDisplayMode === 'fsrsAgain') {
        candidates = fsrsForgettingWordsForMode.filter((w) => w.lastRating === 'again');
      } else if (practiceDisplayMode === 'fsrsHard') {
        candidates = fsrsForgettingWordsForMode.filter((w) => w.lastRating === 'hard');
      } else if (practiceDisplayMode === 'fsrsAgainHard') {
        candidates = fsrsForgettingWordsForMode;
      } else {
        // 'allMissed' or default: missed words
        candidates = missedWordsForMode;
      }

      if (quizGroupFilter !== 'all') {
        candidates = candidates.filter((item) => {
          const wordId =
            (item as FsrsRecord).wordId || (item as MissedWordRecord).wordId || item.id;
          const correspondingWord = wordsById.get(wordId);
          if (!correspondingWord) {
            return quizGroupFilter === 'none';
          }
          return quizGroupFilter === 'none'
            ? !wordHasAnyGroup(correspondingWord)
            : wordHasGroup(correspondingWord, quizGroupFilter);
        });
      }
      return candidates;
    }

    // Review sources ignore date range — scheduling is handled by the algorithm
    if (quizSource === 'fsrs' || (quizSource as string) === 'srs') {
      let candidates: (WordRecord | MissedWordRecord | FsrsRecord)[] = fsrsDueRecords;
      if (quizGroupFilter !== 'all') {
        candidates = candidates.filter((item) => {
          const correspondingWord = wordsById.get((item as FsrsRecord).wordId);
          if (!correspondingWord) {
            return quizGroupFilter === 'none';
          }
          return quizGroupFilter === 'none'
            ? !wordHasAnyGroup(correspondingWord)
            : wordHasGroup(correspondingWord, quizGroupFilter);
        });
      }
      return candidates;
    }

    const start = getRangeStart(quizRange, customStart);
    const end = getRangeEnd(quizRange, customEnd);

    if (!start && quizRange !== 'all') {
      return [];
    }

    let candidates: (WordRecord | MissedWordRecord)[];

    if (quizSource === 'missed') {
      candidates = missedWordsForMode.filter((word) => {
        if (quizRange === 'all') {
          return true;
        }
        const createdAt = new Date(word.missedAt);
        if (end) {
          return createdAt >= (start as Date) && createdAt <= end;
        }
        return createdAt >= (start as Date);
      });
    } else {
      candidates = words.filter((word) => {
        if (quizRange === 'all') {
          return true;
        }
        const createdAt = new Date(word.createdAt);
        if (end) {
          return createdAt >= (start as Date) && createdAt <= end;
        }
        return createdAt >= (start as Date);
      });
    }

    // Apply quiz group filter
    if (quizGroupFilter !== 'all') {
      if (quizSource === 'missed') {
        candidates = candidates.filter((item) => {
          const correspondingWord = wordsById.get((item as MissedWordRecord).wordId);
          if (!correspondingWord) {
            return quizGroupFilter === 'none';
          }
          return quizGroupFilter === 'none'
            ? !wordHasAnyGroup(correspondingWord)
            : wordHasGroup(correspondingWord, quizGroupFilter);
        });
      } else {
        candidates = candidates.filter((word) => {
          const record = word as WordRecord;
          return quizGroupFilter === 'none'
            ? !wordHasAnyGroup(record)
            : wordHasGroup(record, quizGroupFilter);
        });
      }
    }

    return candidates;
  }, [
    words,
    wordsById,
    missedWordsForMode,
    fsrsDueRecords,
    fsrsForgettingWordsForMode,
    practiceDisplayMode,
    quizRange,
    quizSource,
    customStart,
    customEnd,
    quizGroupFilter,
    targetWordIds,
    selectedGroupId,
    clusterContext,
    allSimilarClusters,
  ]);

  const getFsrsRecordForWord = useCallback(
    (wordId: string, mode: QuizDirectionKey): FsrsRecord | undefined => {
      const fsrsId = buildFsrsId(wordId, mode as import('@/lib/db').QuizMode);
      const record = fsrsRecordsById.get(fsrsId);
      return record && !record.isDeleted ? record : undefined;
    },
    [fsrsRecordsById]
  );

  const currentPoolSignature = useMemo(() => {
    return computePoolSignature({
      quizRange,
      quizSource,
      quizDirection,
      quizGroupFilter,
      customStart,
      customEnd,
      practiceDisplayMode,
      targetWordIds,
      selectedGroupId,
      clusterContext,
    });
  }, [
    quizRange,
    quizSource,
    quizDirection,
    quizGroupFilter,
    customStart,
    customEnd,
    practiceDisplayMode,
    targetWordIds,
    selectedGroupId,
    clusterContext,
  ]);

  const resetQuiz = useCallback(() => {
    const queue = shuffle(
      quizCandidates.map((word) => {
        const wordId = getCandidateWordId(word);
        const correspondingWord = wordsById.get(wordId);
        const rawDefinitions = (correspondingWord?.definitions ??
          (word as { definitions?: WordDefinition[] }).definitions) as WordDefinition[] | undefined;
        const rawMeaning = correspondingWord?.meaning || word.meaning;
        const definitions = normalizeDefinitions(rawDefinitions, rawMeaning);
        const fsrsRecord = getFsrsRecordForWord(wordId, quizDirection);
        return {
          id: wordId,
          word: word.word,
          meaning: definitionsToMeaning(definitions),
          definitions,
          tags: correspondingWord?.customGroups || [],
          notes: correspondingWord?.notes || (word as { notes?: string }).notes || '',
          fsrsRecord,
          audioUrl: correspondingWord?.audioUrl || (word as { audioUrl?: string }).audioUrl,
          phonetic: correspondingWord?.phonetic || (word as { phonetic?: string }).phonetic,
        };
      })
    );
    dispatch(
      setQuizQueue({
        queue,
        poolSignature: currentPoolSignature,
      })
    );
  }, [
    quizCandidates,
    getCandidateWordId,
    wordsById,
    getFsrsRecordForWord,
    quizDirection,
    currentPoolSignature,
    dispatch,
  ]);

  // Track dismissed removed word IDs so dismissing does not repeatedly trigger popup
  const [dismissedRemovedWordIds, setDismissedRemovedWordIds] = useState<Set<string>>(
    () => new Set()
  );
  const [queueChangeModalOpened, setQueueChangeModalOpened] = useState(false);

  // Set of word IDs currently stored in active Redux queue
  const reduxWordIds = useMemo(() => new Set(quizQueue.map((item) => item.id)), [quizQueue]);

  // Set of candidate word IDs available in live database
  const candidateWordIds = useMemo(() => {
    return new Set(quizCandidates.map((c) => getCandidateWordId(c)));
  }, [quizCandidates, getCandidateWordId]);

  // For FSRS review: words that became due in DB but are not yet in Redux queue
  const addedQuizWords = useMemo(() => {
    if (!isDbLoaded || quizSource !== 'fsrs' || poolSignature !== currentPoolSignature) {
      return [];
    }
    return quizCandidates.filter((c) => !reduxWordIds.has(getCandidateWordId(c)));
  }, [
    isDbLoaded,
    quizSource,
    poolSignature,
    currentPoolSignature,
    quizCandidates,
    reduxWordIds,
    getCandidateWordId,
  ]);

  const hasAddedQuizWords = addedQuizWords.length > 0;

  // For FSRS review: remaining unreviewed items in Redux queue that were deleted or are no longer in candidate pool
  const removedQuizItems = useMemo(() => {
    if (
      !isDbLoaded ||
      quizSource !== 'fsrs' ||
      quizQueue.length === 0 ||
      completed ||
      poolSignature !== currentPoolSignature
    ) {
      return [];
    }
    const remaining = quizQueue.slice(quizIndex);
    return remaining.filter((item) => {
      const freshWord = wordsById.get(item.id);
      const freshFsrs = getFsrsRecordForWord(item.id, quizDirection);
      if (!freshWord || freshWord.isDeleted || !freshFsrs || freshFsrs.isDeleted) {
        return true;
      }
      return !candidateWordIds.has(item.id);
    });
  }, [
    isDbLoaded,
    quizSource,
    quizQueue,
    completed,
    poolSignature,
    currentPoolSignature,
    quizIndex,
    wordsById,
    getFsrsRecordForWord,
    quizDirection,
    candidateWordIds,
  ]);

  // Automatically trigger removed-word alert modal when unhandled removed items are detected
  useEffect(() => {
    if (!isDbLoaded || quizSource !== 'fsrs' || poolSignature !== currentPoolSignature) {
      setQueueChangeModalOpened(false);
      return;
    }
    const unhandled = removedQuizItems.filter((item) => !dismissedRemovedWordIds.has(item.id));
    if (unhandled.length > 0) {
      setQueueChangeModalOpened(true);
    } else {
      setQueueChangeModalOpened(false);
    }
  }, [
    isDbLoaded,
    quizSource,
    poolSignature,
    currentPoolSignature,
    removedQuizItems,
    dismissedRemovedWordIds,
  ]);

  const handleDismissQueueChangeModal = useCallback(() => {
    setQueueChangeModalOpened(false);
    setDismissedRemovedWordIds((prev) => {
      const next = new Set(prev);
      removedQuizItems.forEach((item) => next.add(item.id));
      return next;
    });
  }, [removedQuizItems]);

  const handleRefreshFromQueueChangeModal = useCallback(() => {
    setQueueChangeModalOpened(false);
    setDismissedRemovedWordIds(new Set());
    resetQuiz();
  }, [resetQuiz]);

  // Synchronize card content in active queue when words / FSRS records update
  useEffect(() => {
    if (words.length === 0 || quizQueue.length === 0) {
      return;
    }
    let hasChanges = false;
    const updatedQueue = quizQueue.map((item) => {
      const freshWord = wordsById.get(item.id);
      if (!freshWord) {
        return item;
      }
      const freshDefinitions = freshWord.definitions ?? [];
      const freshMeaning = freshWord.meaning;
      const freshTags = freshWord.customGroups || [];
      const freshNotes = freshWord.notes || '';
      const freshFsrs = getFsrsRecordForWord(item.id, quizDirection);
      const freshAudioUrl = freshWord.audioUrl;
      const freshPhonetic = freshWord.phonetic;

      const definitionsChanged =
        item.meaning !== freshMeaning ||
        (item.definitions?.length ?? 0) !== freshDefinitions.length;
      const tagsChanged = (item.tags?.length ?? 0) !== freshTags.length;
      const notesChanged = (item.notes || '') !== freshNotes;
      const wordChanged = item.word !== freshWord.word;
      const audioChanged = item.audioUrl !== freshAudioUrl || item.phonetic !== freshPhonetic;
      const fsrsChanged =
        item.fsrsRecord?.dueAt !== freshFsrs?.dueAt ||
        item.fsrsRecord?.stability !== freshFsrs?.stability ||
        item.fsrsRecord?.difficulty !== freshFsrs?.difficulty ||
        item.fsrsRecord?.state !== freshFsrs?.state;

      if (
        definitionsChanged ||
        tagsChanged ||
        notesChanged ||
        wordChanged ||
        audioChanged ||
        fsrsChanged
      ) {
        hasChanges = true;
        const normalizedDefs = normalizeDefinitions(freshDefinitions, freshMeaning);
        return {
          ...item,
          word: freshWord.word,
          meaning: definitionsToMeaning(normalizedDefs),
          definitions: normalizedDefs,
          tags: freshTags,
          notes: freshNotes,
          audioUrl: freshAudioUrl,
          phonetic: freshPhonetic,
          fsrsRecord: freshFsrs || item.fsrsRecord,
        };
      }
      return item;
    });

    if (hasChanges) {
      dispatch(syncQueueItems(updatedQueue));
    }
  }, [words.length, wordsById, quizQueue, getFsrsRecordForWord, quizDirection, dispatch]);

  // Manage queue initialization / refill
  useEffect(() => {
    if (poolSignature !== currentPoolSignature) {
      if (quizCandidates.length > 0) {
        resetQuiz();
      } else {
        dispatch(
          setQuizQueue({
            queue: [],
            poolSignature: currentPoolSignature,
          })
        );
      }
      return;
    }

    if (quizQueue.length === 0 && quizCandidates.length > 0) {
      const isRefill = quizSource === 'fsrs' && isInitialized;
      resetQuiz();
      if (isRefill) {
        showQueueRefillNotification(quizCandidates.length);
        void notifyFsrsQueueRefill({
          count: quizCandidates.length,
          quizMode: quizDirection as import('@/lib/db').QuizMode,
        });
      }
    }
  }, [
    poolSignature,
    currentPoolSignature,
    quizCandidates.length,
    quizQueue.length,
    quizSource,
    quizDirection,
    isInitialized,
    resetQuiz,
    dispatch,
  ]);

  // RxDB & Supabase subscriptions
  useEffect(() => {
    let isMounted = true;
    let wordSubscription: { unsubscribe: () => void } | null = null;
    let groupSubscription: { unsubscribe: () => void } | null = null;
    let missedSubscription: { unsubscribe: () => void } | null = null;
    let fsrsSubscription: { unsubscribe: () => void } | null = null;
    let wordFamilySubscription: { unsubscribe: () => void } | null = null;
    let simSubscription: { unsubscribe: () => void } | null = null;
    let cleanupOnlineListener: (() => void) | null = null;
    let unsubscribeSyncState: (() => void) | null = null;

    const load = async () => {
      const db = await getDatabase();
      if (!isMounted) {
        return;
      }

      setDatabase(db);

      let wordsLoaded = false;
      let fsrsLoaded = false;

      const checkInitialReady = () => {
        if (wordsLoaded && fsrsLoaded && isMounted) {
          setIsDbLoaded(true);
        }
      };

      const wordQuery = db.words.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ updatedAt: 'desc' }],
      });

      wordSubscription = wordQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setWords(docs.map((doc) => toMutableWordRecord(doc.toJSON())));
        wordsLoaded = true;
        checkInitialReady();
      });

      const groupQuery = db.groups.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ name: 'asc' }],
      });

      groupSubscription = groupQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setGroups(docs.map((doc) => doc.toJSON() as GroupRecord));
      });

      const missedQuery = db.missedWords.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ updatedAt: 'desc' }],
      });

      missedSubscription = missedQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setMissedWords(docs.map((doc) => doc.toJSON() as MissedWordRecord));
      });

      const fsrsQuery = db.fsrsRecords.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ dueAt: 'asc' }],
      });

      fsrsSubscription = fsrsQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setFsrsRecords(docs.map((doc) => doc.toJSON() as FsrsRecord));
        fsrsLoaded = true;
        checkInitialReady();
      });

      const wordFamilyQuery = db.wordFamilies.find({
        selector: { isDeleted: { $ne: true } },
      });

      wordFamilySubscription = wordFamilyQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        const map: Record<string, WordFamilyMemberRecord[]> = {};
        for (const doc of docs) {
          const item = doc.toJSON() as WordFamilyMemberRecord;
          if (!map[item.wordId]) {
            map[item.wordId] = [];
          }
          map[item.wordId].push(item);
        }
        setWordFamilies(map);
      });

      if (db.wordSimilarities) {
        simSubscription = db.wordSimilarities.find().$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          const activeSims = docs
            .map((doc) => doc.toJSON() as WordSimilarityRecord)
            .filter((s) => !s.isDeleted);
          setSimilarityRecords(activeSims);
        });
      }

      // Initialize automatic two-way Supabase replication
      const replications = setupSupabaseReplication(db);
      replicationsRef.current = replications;

      unsubscribeSyncState = replications.subscribeSyncState(() => {});

      const handleOnline = () => {
        void withSyncState(async () => {
          await replicationsRef.current?.reSyncAll();
          await replicationsRef.current?.awaitInSync();
        });
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline);
        cleanupOnlineListener = () => {
          window.removeEventListener('online', handleOnline);
        };
      }

      if (navigator.onLine) {
        void withSyncState(async () => {
          await replicationsRef.current?.reSyncAll();
          await replicationsRef.current?.awaitInSync();
        });
      }
    };

    void load();

    return () => {
      isMounted = false;
      wordSubscription?.unsubscribe();
      groupSubscription?.unsubscribe();
      missedSubscription?.unsubscribe();
      fsrsSubscription?.unsubscribe();
      wordFamilySubscription?.unsubscribe();
      simSubscription?.unsubscribe();
      cleanupOnlineListener?.();
      unsubscribeSyncState?.();
    };
  }, [withSyncState]);

  useEffect(() => {
    cardPresentedAtRef.current = Date.now();
  }, [quizIndex]);

  const rawCurrentQuizItem = quizQueue[quizIndex] ?? null;

  const currentQuizItem = useMemo(() => {
    if (!rawCurrentQuizItem) {
      return null;
    }
    const fsrsRecord = getFsrsRecordForWord(rawCurrentQuizItem.id, quizDirection);
    return {
      ...rawCurrentQuizItem,
      fsrsRecord: fsrsRecord || rawCurrentQuizItem.fsrsRecord,
    };
  }, [rawCurrentQuizItem, getFsrsRecordForWord, quizDirection]);

  const srsIntervals = useMemo(() => {
    if (!currentQuizItem || quizSource !== 'fsrs') {
      return undefined;
    }
    const now = new Date();
    const fsrsId = buildFsrsId(currentQuizItem.id, quizDirection as import('@/lib/db').QuizMode);
    const existing = currentQuizItem.fsrsRecord || fsrsRecordsById.get(fsrsId);
    const record =
      existing ||
      createInitialFsrsRecord(
        currentQuizItem.id,
        quizDirection as import('@/lib/db').QuizMode,
        currentQuizItem.word,
        currentQuizItem.meaning,
        now
      );
    const res = computeFsrsIntervals(record, now);
    return {
      again: res.again.intervalText,
      hard: res.hard.intervalText,
      good: res.good.intervalText,
      easy: res.easy.intervalText,
    };
  }, [currentQuizItem, quizSource, quizDirection, fsrsRecordsById]);

  const isCurrentMarkedMissed = useMemo(() => {
    if (!currentQuizItem) {
      return false;
    }

    const baseWordId = currentQuizItem.id.includes(':')
      ? currentQuizItem.id.split(':')[0]
      : currentQuizItem.id;
    const missedId = buildMissedWordId(baseWordId, quizDirection);
    return missedWords.some(
      (item) =>
        !item.isDeleted &&
        (item.id === missedId || (item.wordId === baseWordId && item.quizMode === quizDirection))
    );
  }, [currentQuizItem, quizDirection, missedWords]);

  const ensureMissingAiExamples = useCallback(
    async (wordId: string) => {
      if (!database) {
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return;
      }

      const doc = await database.words.findOne(wordId).exec();
      if (!doc) {
        return;
      }

      const current = toMutableWordRecord(doc.toJSON());
      const currentDefinitions = getWordDefinitions(current);
      const targetAiExampleCount = normalizeAiExampleCount(current.aiExampleCount);
      const missingIndexes = getMissingAiExampleDefinitionIndexes(
        currentDefinitions,
        targetAiExampleCount
      );
      if (missingIndexes.length === 0) {
        return;
      }

      setExampleGenerationCounts((prev) => ({
        ...prev,
        [wordId]: (prev[wordId] ?? 0) + 1,
      }));

      try {
        const generatedExamples = await Promise.all(
          missingIndexes.map((index) =>
            requestExamples(
              current.word,
              currentDefinitions[index].meaning,
              targetAiExampleCount,
              currentDefinitions[index].userExamples ?? [],
              currentDefinitions[index].partOfSpeech ?? ''
            )
          )
        );
        if (generatedExamples.every((examples) => examples.length === 0)) {
          return;
        }

        const generatedByIndex = new Map<number, string[]>();
        missingIndexes.forEach((index, resultIndex) => {
          const examples = generatedExamples[resultIndex] ?? [];
          if (examples.length > 0) {
            generatedByIndex.set(index, examples);
          }
        });

        if (generatedByIndex.size === 0) {
          return;
        }

        const refreshedDoc = await database.words.findOne(wordId).exec();
        if (!refreshedDoc) {
          return;
        }

        const latest = toMutableWordRecord(refreshedDoc.toJSON());
        const latestDefinitions = getWordDefinitions(latest);
        const updatedDefinitions = latestDefinitions.map((definition, index) => {
          const currentExamples = normalizeAiExamples(definition.examples, targetAiExampleCount);
          if (currentExamples.length >= targetAiExampleCount) {
            return {
              ...definition,
              examples: currentExamples,
            };
          }

          const examples = generatedByIndex.get(index);
          return examples && examples.length > 0
            ? {
                ...definition,
                examples: mergeAiExamples(currentExamples, examples, targetAiExampleCount),
              }
            : {
                ...definition,
                examples: currentExamples,
              };
        });

        if (
          updatedDefinitions.every(
            (definition, index) => definition.examples === latestDefinitions[index]?.examples
          )
        ) {
          return;
        }

        const updated = {
          ...latest,
          meaning: definitionsToMeaning(updatedDefinitions),
          definitions: updatedDefinitions,
          updatedAt: new Date().toISOString(),
        };

        await database.words.upsert(updated);
        dispatch(
          updateQuizItem({
            id: wordId,
            meaning: updated.meaning,
            definitions: updated.definitions,
          })
        );
      } finally {
        setExampleGenerationCounts((prev) => {
          const nextCount = Math.max(0, (prev[wordId] ?? 0) - 1);
          if (nextCount === 0) {
            const { [wordId]: _removed, ...rest } = prev;
            return rest;
          }
          return { ...prev, [wordId]: nextCount };
        });
      }
    },
    [database, dispatch]
  );

  const handleDeleteFsrsRecord = useCallback(
    async (wordId: string, quizMode: QuizDirectionKey) => {
      if (!database) {
        return;
      }

      const fsrsId = buildFsrsId(wordId, quizMode);
      const targetWord = words.find((w) => w.id === wordId);
      const wordText = targetWord?.word || 'word';

      try {
        const doc = await database.fsrsRecords.findOne(fsrsId).exec();
        const timestamp = new Date().toISOString();

        if (doc) {
          await doc.patch({
            isDeleted: true,
            updatedAt: timestamp,
          });
        } else {
          const record: FsrsRecord = {
            ...createInitialFsrsRecord(
              wordId,
              quizMode,
              wordText,
              targetWord?.meaning || '',
              new Date(timestamp)
            ),
            isDeleted: true,
            updatedAt: timestamp,
          };
          await database.fsrsRecords.upsert(record);
        }

        setFsrsRecords((prev) => prev.filter((r) => r.id !== fsrsId));
        dispatch(removeQuizItem(wordId));
      } catch (error) {
        console.error('Failed to delete FSRS record:', error);
      }
    },
    [database, words, dispatch]
  );

  const handleEdit = async (
    id: string,
    word: string,
    meaning: string,
    definitions: WordDefinition[],
    customGroups: string[],
    aiExampleCount: number,
    notes?: string
  ) => {
    if (!database) {
      return;
    }

    const doc = await database.words.findOne(id).exec();
    if (!doc) {
      return;
    }

    const normalizedGroups = Array.from(
      new Set(customGroups.map((g) => g.trim()).filter((g) => g.length > 0))
    );
    for (const groupName of normalizedGroups) {
      await ensureGroupExists(groupName);
    }

    const timestamp = new Date().toISOString();
    const current = toMutableWordRecord(doc.toJSON());
    const normalizedDefinitions = normalizeDefinitions(definitions, meaning);
    const normalizedMeaning = definitionsToMeaning(normalizedDefinitions);
    const normalizedAiExampleCount = normalizeAiExampleCount(aiExampleCount);
    const record = {
      ...current,
      word,
      meaning: normalizedMeaning,
      definitions: normalizedDefinitions,
      customGroups: normalizedGroups,
      aiExampleCount: normalizedAiExampleCount,
      notes: notes !== undefined ? notes : current.notes || '',
      updatedAt: timestamp,
    };

    await database.words.upsert(record);
    void notifyWordSaved({ word: record.word, action: 'updated' });
    const fsrsDocs = await database.fsrsRecords
      .find({
        selector: { wordId: id },
      })
      .exec();
    for (const fsrsDoc of fsrsDocs) {
      const updatedFsrs = updateFsrsRecordContent(
        fsrsDoc.toJSON() as FsrsRecord,
        word,
        normalizedMeaning,
        timestamp
      );
      await database.fsrsRecords.upsert(updatedFsrs);
    }
    dispatch(
      updateQuizItem({
        id,
        word: record.word,
        meaning: record.meaning,
        definitions: record.definitions,
        tags: record.customGroups,
        notes: record.notes,
      })
    );
    if (record.definitions.length > 0) {
      void ensureMissingAiExamples(id);
    }
  };

  const fetchAndStoreWordFamily = useCallback(
    async (wordId: string, word: string, meaning?: string) => {
      if (!database) {
        return;
      }
      if (!navigator.onLine) {
        console.warn('Device is offline, skipping word family fetch for:', word);
        return;
      }

      setGeneratingWordFamilyWordIds((prev) => ({ ...prev, [wordId]: true }));
      try {
        const response = await fetch('/api/word-family', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word, meaning }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn('Word family API error for word:', word, response.status, errorText);
          return;
        }

        const data = await response.json();
        const members: WordFamilyMember[] = data?.members || [];
        const rootUsageFrequency: string =
          typeof data?.rootUsageFrequency === 'string' ? data.rootUsageFrequency.trim() : '';
        const generatorAiDetails: string =
          typeof data?.generatorAiDetails === 'string' ? data.generatorAiDetails.trim() : '';

        if (rootUsageFrequency || generatorAiDetails) {
          try {
            const wordDoc = await database.words.findOne(wordId).exec();
            if (wordDoc) {
              await wordDoc.patch({
                ...(rootUsageFrequency ? { usageFrequency: rootUsageFrequency } : {}),
                ...(generatorAiDetails ? { generatorAiDetails } : {}),
                updatedAt: new Date().toISOString(),
              });
            }
          } catch (err) {
            console.warn('Could not update root word with frequency/AI details:', err);
          }
        }

        const normalizedMainWord = word.trim().toLowerCase();
        const validMembers = members.filter(
          (m) => m.word.trim().toLowerCase() !== normalizedMainWord
        );
        if (validMembers.length === 0) {
          return;
        }

        const timestamp = new Date().toISOString();
        for (const member of validMembers) {
          const memberRecord: WordFamilyMemberRecord = {
            id: buildWordFamilyId(wordId, member.word),
            wordId,
            word: capitalizeWord(member.word),
            partOfSpeech: member.partOfSpeech.toLowerCase().trim(),
            banglaDefinition: member.banglaDefinition.trim(),
            englishDefinition: member.englishDefinition.trim(),
            examples: Array.isArray(member.examples) ? member.examples : [],
            usageFrequency: member.usageFrequency || '',
            generatorAiDetails: member.generatorAiDetails || generatorAiDetails || '',
            createdAt: timestamp,
            updatedAt: timestamp,
            isDeleted: false,
            lastSyncedAt: '',
          };
          await database.wordFamilies.upsert(memberRecord);
        }
      } catch (error) {
        console.error('Error generating and storing word family for:', word, error);
      } finally {
        setGeneratingWordFamilyWordIds((prev) => {
          const { [wordId]: _removed, ...rest } = prev;
          return rest;
        });
      }
    },
    [database]
  );

  const handleRefreshWordFamily = useCallback(
    async (wordId: string, word: string) => {
      const wordDoc = words.find((w) => w.id === wordId);
      await fetchAndStoreWordFamily(wordId, word, wordDoc?.meaning);
    },
    [fetchAndStoreWordFamily, words]
  );

  const handleDeleteWordFamilyMember = useCallback(
    async (memberId: string) => {
      if (!database) {
        return;
      }
      try {
        const doc = await database.wordFamilies.findOne(memberId).exec();
        if (doc) {
          await doc.patch({
            isDeleted: true,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Failed to delete word family member:', memberId, err);
      }
    },
    [database]
  );

  const handleRefreshExamples = async (id: string) => {
    if (!database) {
      return;
    }

    setExampleGenerationCounts((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + 1,
    }));

    try {
      const doc = await database.words.findOne(id).exec();
      if (!doc) {
        return;
      }

      const record = toMutableWordRecord(doc.toJSON());
      let definitions = getWordDefinitions(record);

      if (definitions.length === 0) {
        if (!navigator.onLine) {
          console.warn('Device is offline, skipping examples fetch for:', record.word);
          return;
        }

        const response = await fetch('/api/meaning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: record.word }),
        });

        if (!response.ok) {
          console.warn('Failed to fetch meaning for examples:', record.word);
          return;
        }

        const data = await response.json();
        definitions = normalizeDefinitions(data?.definitions, String(data?.meaning ?? ''));
        const meaning = definitionsToMeaning(definitions);

        if (meaning) {
          const wordDoc = await database.words.findOne(id).exec();
          if (wordDoc) {
            await wordDoc.patch({
              meaning,
              definitions,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      if (definitions.length === 0) {
        return;
      }

      const targetAiExampleCount = normalizeAiExampleCount(record.aiExampleCount);
      const examplesPerDefinition = await requestExamplesForDefinitions(
        record.word,
        definitions,
        targetAiExampleCount
      );
      if (examplesPerDefinition.every((examples) => examples.length === 0)) {
        return;
      }

      const updatedDefinitions = mergeExamplesIntoDefinitions(
        definitions,
        examplesPerDefinition,
        targetAiExampleCount
      );

      const wordDoc = await database.words.findOne(id).exec();
      if (wordDoc) {
        await wordDoc.patch({
          meaning: definitionsToMeaning(updatedDefinitions),
          definitions: updatedDefinitions,
          updatedAt: new Date().toISOString(),
        });
      }
      dispatch(
        updateQuizItem({
          id,
          definitions: updatedDefinitions,
          meaning: definitionsToMeaning(updatedDefinitions),
        })
      );
    } finally {
      setExampleGenerationCounts((prev) => {
        const nextCount = Math.max(0, (prev[id] ?? 0) - 1);
        if (nextCount === 0) {
          const { [id]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [id]: nextCount };
      });
    }
  };

  const handleReveal = useCallback(() => {
    dispatch(setRevealed(true));
  }, [dispatch]);

  const handleUnmarkMissed = async (id: string) => {
    if (!database) {
      return;
    }
    const existing = await database.missedWords.findOne(id).exec();
    if (existing) {
      await removeMissedWordRecord(existing.wordId, existing.quizMode);
      return;
    }
    const fsrsDoc = await database.fsrsRecords.findOne(id).exec();
    if (fsrsDoc) {
      const updated = {
        ...(fsrsDoc.toJSON() as FsrsRecord),
        lastRating: undefined,
        updatedAt: new Date().toISOString(),
      };
      await database.fsrsRecords.upsert(updated);
    }
  };

  const handleUnmarkAllMissed = async () => {
    if (!database || missedWordsForMode.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    for (const item of missedWordsForMode) {
      const { definitions: _definitions, ...baseRecord } = item;
      const record = {
        ...baseRecord,
        isDeleted: true,
        updatedAt: timestamp,
      };
      await database.missedWords.upsert(record);
    }
  };

  const handleConfirmClearAll = async () => {
    setConfirmClearAllOpen(false);
    await handleUnmarkAllMissed();
  };

  const handleToggleMissed = async () => {
    if (!currentQuizItem) {
      return;
    }
    const baseWordId = currentQuizItem.id.includes(':')
      ? currentQuizItem.id.split(':')[0]
      : currentQuizItem.id;
    await toggleMissedWordRecord(
      baseWordId,
      currentQuizItem.word,
      currentQuizItem.meaning,
      quizDirection
    );
  };

  const handleNext = useCallback(() => {
    dispatch(nextCard());
  }, [dispatch]);

  const handlePrevious = useCallback(() => {
    dispatch(previousCard());
  }, [dispatch]);

  const handleUndoQuiz = useCallback(async () => {
    if (!database || quizHistory.length === 0) {
      return;
    }

    const last = quizHistory[quizHistory.length - 1];

    if (last.fsrsRecord) {
      await database.fsrsRecords.upsert(last.fsrsRecord);
    }
    if (last.srsRecord) {
      await database.srsRecords.upsert(last.srsRecord);
    }

    dispatch(undoQuizHistory());
  }, [database, quizHistory, dispatch]);

  const handleSrsRate = useCallback(
    (rating: FsrsRating) => {
      if (!database || !currentQuizItem) {
        return;
      }

      const timestamp = new Date().toISOString();
      const now = new Date();
      const durationMs = Math.max(0, Date.now() - cardPresentedAtRef.current);
      const fsrsId = buildFsrsId(currentQuizItem.id, quizDirection as import('@/lib/db').QuizMode);

      // Instant in-memory state resolution (0ms)
      const existing = currentQuizItem.fsrsRecord || fsrsRecordsById.get(fsrsId);
      const currentState = existing
        ? existing
        : createInitialFsrsRecord(
            currentQuizItem.id,
            quizDirection as import('@/lib/db').QuizMode,
            currentQuizItem.word,
            currentQuizItem.meaning,
            now
          );

      // Record undo snapshot
      dispatch(
        pushQuizHistory({
          fsrsRecord: currentState ? { ...currentState } : undefined,
          previousQueue: [...quizQueue],
          previousIndex: quizIndex,
          previousRevealed: revealed,
          previousCompleted: completed,
        })
      );

      const updated: FsrsRecord = {
        ...computeFsrs(currentState, rating, now, currentQuizItem.word, currentQuizItem.meaning),
        word: currentQuizItem.word,
        meaning: currentQuizItem.meaning,
        updatedAt: timestamp,
        isDeleted: false,
      };

      // Optimistically advance to next card immediately (0ms UI latency!)
      dispatch(nextCard());

      // Persist to IndexedDB in the background without blocking card rendering
      void (async () => {
        try {
          await database.fsrsRecords.upsert(updated);
          const reviewLog = createReviewLogEvent({
            currentState,
            updatedCard: updated,
            rating,
            durationMs,
            now,
          });
          await database.reviewLogs.insert(reviewLog);
        } catch (err) {
          console.error('Failed to persist FSRS record or review log:', err);
        }
      })();
    },
    [
      database,
      currentQuizItem,
      quizDirection,
      fsrsRecordsById,
      quizIndex,
      quizQueue,
      revealed,
      completed,
      dispatch,
    ]
  );

  return (
    <Container size="md" pt={0} pb={{ base: 'md', sm: 'xl' }} px={{ base: 'xs', sm: 'md' }}>
      <ClearMissedWordsModal
        opened={confirmClearAllOpen}
        count={missedWordsForMode.length}
        quizDirectionLabel={quizDirections[quizDirection]}
        onClose={() => setConfirmClearAllOpen(false)}
        onConfirm={handleConfirmClearAll}
      />

      <FsrsQueueChangeModal
        opened={queueChangeModalOpened}
        onClose={handleDismissQueueChangeModal}
        onRefresh={handleRefreshFromQueueChangeModal}
        removedItems={removedQuizItems.map((item) => ({
          id: item.id,
          word: item.word,
          meaning: item.meaning,
        }))}
        addedCount={addedQuizWords.length}
      />

      <Stack gap="xl">
        <QuizModeSection
          quizRange={quizRange}
          quizSource={quizSource}
          quizDirection={quizDirection}
          quizGroupFilter={quizGroupFilter}
          customGroups={customGroups}
          customStart={customStart}
          customEnd={customEnd}
          quizCandidatesCount={quizCandidates.length}
          quizQueueLength={quizQueue.length}
          currentQuizItem={currentQuizItem}
          revealed={revealed}
          completed={completed}
          quizIndex={quizIndex}
          isCurrentMarkedMissed={isCurrentMarkedMissed}
          practiceDisplayMode={practiceDisplayMode}
          hideMissedMeanings={hideMissedMeanings}
          hideSrsPracticeMeanings={hideSrsPracticeMeanings}
          revealedMissedWordIds={revealedMissedWordIds}
          revealedSrsPracticeWordIds={revealedSrsPracticeWordIds}
          missedWordsForMode={missedWordsForMode}
          fsrsForgettingWordsForMode={fsrsForgettingWordsForMode}
          recentSrsPracticeWords={[]}
          missedWordIdSet={missedWordIdSet}
          generatingExampleWordIds={generatingExampleWordIds}
          autoPronounceQuizWord={autoPronounceQuizWord}
          wordFamilies={wordFamilies}
          generatingWordFamilyWordIds={generatingWordFamilyWordIds}
          hasAddedWords={hasAddedQuizWords}
          addedWordsCount={addedQuizWords.length}
          hasRemovedWords={removedQuizItems.length > 0}
          removedWordsCount={removedQuizItems.length}
          onSetQuizRange={(value) => dispatch(setQuizRange(value))}
          onSetQuizSource={handleSetQuizSource}
          onSetQuizDirection={(value) => dispatch(setQuizDirection(value))}
          onSetQuizGroupFilter={(value) => dispatch(setQuizGroupFilter(value))}
          onSetCustomStart={(value) => dispatch(setCustomStart(value))}
          onSetCustomEnd={(value) => dispatch(setCustomEnd(value))}
          onResetQuiz={resetQuiz}
          onReveal={handleReveal}
          onToggleMissed={handleToggleMissed}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onRefreshExamples={handleRefreshExamples}
          onRefreshWordFamily={handleRefreshWordFamily}
          onDeleteWordFamilyMember={handleDeleteWordFamilyMember}
          onSrsRate={handleSrsRate}
          srsIntervals={srsIntervals}
          onEditClick={(id) => setEditingQuizWordId(id)}
          onSetPracticeDisplayMode={(value) => dispatch(setPracticeDisplayMode(value))}
          onSetAutoPronounceQuizWord={(value) => dispatch(setAutoPronounceQuizWord(value))}
          onSetHideMissedMeanings={(value) => dispatch(setHideMissedMeanings(value))}
          onSetHideSrsPracticeMeanings={(value) => dispatch(setHideSrsPracticeMeanings(value))}
          onSetRevealedMissedWordIds={(value) => dispatch(setRevealedMissedWordIds(value))}
          onSetRevealedSrsPracticeWordIds={(value) =>
            dispatch(setRevealedSrsPracticeWordIds(value))
          }
          onUnmarkMissed={handleUnmarkMissed}
          onTogglePracticeMissed={(word) =>
            void toggleMissedWordRecord(word.wordId, word.word, word.meaning, word.quizMode)
          }
          onOpenSrsPracticeQuiz={() => dispatch(openSrsPracticeQuiz())}
          onStartForgettingQuiz={() => dispatch(openForgettingQuiz())}
          onOpenClearAllMissed={() => setConfirmClearAllOpen(true)}
          onDeleteFsrsRecord={handleDeleteFsrsRecord}
          canUndo={quizHistory.length > 0}
          onUndo={handleUndoQuiz}
          quizCandidates={quizCandidates}
          words={words}
          clusterContext={clusterContext}
          selectedGroupId={selectedGroupId}
          onSetSelectedGroupId={handleSetSelectedGroupId}
          similarClusters={allSimilarClusters}
          onClearGroupQuiz={handleClearGroupQuiz}
        />
      </Stack>

      <EditWordModal
        opened={editingQuizWordId !== null}
        onClose={() => setEditingQuizWordId(null)}
        wordRecord={
          editingQuizWordId
            ? wordsById.get(
                editingQuizWordId.includes(':')
                  ? editingQuizWordId.split(':')[0]
                  : editingQuizWordId
              ) ||
              words.find(
                (w) => w.id === editingQuizWordId || w.id === editingQuizWordId.split(':')[0]
              ) ||
              null
            : null
        }
        customGroups={customGroups}
        onSave={async (id, word, meaning, definitions, groups, aiExampleCount, notes) => {
          await handleEdit(id, word, meaning, definitions, groups, aiExampleCount, notes);
        }}
        onAddCustomGroup={handleAddCustomGroup}
      />
    </Container>
  );
}
