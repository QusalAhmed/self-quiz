'use client';

import { Container, Stack } from '@mantine/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type QuizDirectionKey, quizDirections } from '@/app/home/constants';
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
  computePoolSignature,
  nextCard,
  openForgettingQuiz,
  openSrsPracticeQuiz,
  previousCard,
  pushQuizHistory,
  removeQuizItem,
  selectQuizState,
  setAutoPronounceQuizWord,
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
  syncQueueItems,
  undoQuizHistory,
  updateQuizItem,
} from '@/lib/redux/slices/quizSlice';
import { setupSupabaseReplication, type ReplicationsHolder } from '@/lib/replication';
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
  const [words, setWords] = useState<WordRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [missedWords, setMissedWords] = useState<MissedWordRecord[]>([]);
  const [fsrsRecords, setFsrsRecords] = useState<FsrsRecord[]>([]);
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
    });
  }, [
    quizRange,
    quizSource,
    quizDirection,
    quizGroupFilter,
    customStart,
    customEnd,
    practiceDisplayMode,
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

      const definitionsChanged =
        item.meaning !== freshMeaning ||
        (item.definitions?.length ?? 0) !== freshDefinitions.length;
      const tagsChanged = (item.tags?.length ?? 0) !== freshTags.length;
      const notesChanged = (item.notes || '') !== freshNotes;
      const wordChanged = item.word !== freshWord.word;
      const fsrsChanged =
        item.fsrsRecord?.dueAt !== freshFsrs?.dueAt ||
        item.fsrsRecord?.stability !== freshFsrs?.stability ||
        item.fsrsRecord?.difficulty !== freshFsrs?.difficulty ||
        item.fsrsRecord?.state !== freshFsrs?.state;

      if (definitionsChanged || tagsChanged || notesChanged || wordChanged || fsrsChanged) {
        hasChanges = true;
        const normalizedDefs = normalizeDefinitions(freshDefinitions, freshMeaning);
        return {
          ...item,
          word: freshWord.word,
          meaning: definitionsToMeaning(normalizedDefs),
          definitions: normalizedDefs,
          tags: freshTags,
          notes: freshNotes,
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
    let cleanupOnlineListener: (() => void) | null = null;
    let unsubscribeSyncState: (() => void) | null = null;

    const load = async () => {
      const db = await getDatabase();
      if (!isMounted) {
        return;
      }

      setDatabase(db);

      const wordQuery = db.words.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ updatedAt: 'desc' }],
      });

      wordSubscription = wordQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setWords(docs.map((doc) => toMutableWordRecord(doc.toJSON())));
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
          const updated = {
            ...record,
            meaning,
            definitions,
            updatedAt: new Date().toISOString(),
          };
          await database.words.upsert(updated);
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
      const updated = {
        ...record,
        meaning: definitionsToMeaning(updatedDefinitions),
        definitions: updatedDefinitions,
        updatedAt: new Date().toISOString(),
      };

      await database.words.upsert(updated);
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
          onSetQuizRange={(value) => dispatch(setQuizRange(value))}
          onSetQuizSource={(value) => dispatch(setQuizSource(value))}
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
