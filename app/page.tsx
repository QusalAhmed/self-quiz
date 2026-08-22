'use client';

import {
  Box,
  Container,
  SegmentedControl,
  SimpleGrid,
  Stack,
  useMantineColorScheme,
} from '@mantine/core';
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
import { CloudSyncCard } from '@/components/Home/CloudSyncCard';
import { DailyUsageTimer } from '@/components/Home/DailyUsageTimer';
import { QuizModeSection } from '@/components/Home/QuizModeSection';
import { StatsDashboard } from '@/components/Home/StatsDashboard';
import { StudyModeSection } from '@/components/Home/StudyModeSection';
import { PwaRegister } from '@/components/PwaRegister/PwaRegister';
import { AppSidebar } from '@/components/Sidebar/AppSidebar';
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
  formatInterval,
  type FsrsRating,
  softDeleteFsrsRecord,
  updateFsrsRecordContent,
} from '@/lib/fsrs';
import {
  getActiveGroupNames,
  getWordGroups,
  removeGroupFromWordGroups,
  replaceGroupInWordGroups,
  wordHasAnyGroup,
  wordHasGroup,
} from '@/lib/groups';
import { showQueueRefillNotification } from '@/lib/notifications';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
  computePoolSignature,
  nextCard,
  openAllWordsQuiz,
  openForgettingQuiz,
  openFsrsQuiz,
  openSrsPracticeQuiz,
  openTodayQuiz,
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
import {
  setupSupabaseReplication,
  type ReplicationsHolder,
  type SyncCollectionKey,
  type UnifiedSyncState,
} from '@/lib/replication';
import { resolveWordTextFromMainTable } from '@/lib/word-display';
import { buildWordFamilyId, type WordFamilyMember } from '@/lib/word-family';

type WordWithDefinitions<T> = T & { definitions?: WordDefinition[] };

export default function HomePage() {
  const dispatch = useAppDispatch();
  const {
    mode,
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
  const [reviewLogsCount, setReviewLogsCount] = useState<number>(0);
  const [wordFamilies, setWordFamilies] = useState<Record<string, WordFamilyMemberRecord[]>>({});
  const [generatingWordFamilyWordIds, setGeneratingWordFamilyWordIds] = useState<
    Record<string, boolean>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingQuizWordId, setEditingQuizWordId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'word' | 'wordAndDefinition'>('word');
  const [page, setPage] = useState(1);
  const cardPresentedAtRef = useRef<number>(Date.now());

  // Custom Groups states
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [exampleGenerationCounts, setExampleGenerationCounts] = useState<Record<string, number>>(
    {}
  );

  const customGroups = useMemo(() => getActiveGroupNames(groups), [groups]);

  // Real-Time Due Timer: Ticks every 1 second to update FSRS/SRS due cards automatically
  const [nowTicker, setNowTicker] = useState(() => new Date().toISOString());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTicker(new Date().toISOString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Custom states for UI Enhancements
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncState, setSyncState] = useState<UnifiedSyncState | undefined>(undefined);
  const syncInProgressRef = useRef(false);
  const replicationsRef = useRef<ReplicationsHolder | null>(null);

  const withSyncState = useCallback(async (task: () => Promise<void>) => {
    if (syncInProgressRef.current || !navigator.onLine) {
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);
    try {
      await task();
    } catch (error) {
      console.error(error);
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  const pageSize = 15; // Enhanced list density

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
      if (oldName === trimmed) {
        return;
      }

      const duplicate = groups.some((g) => !g.isDeleted && g.id !== id && g.name === trimmed);
      if (duplicate) {
        return;
      }

      const timestamp = new Date().toISOString();
      const updatedGroup: GroupRecord = {
        ...groupDoc.toJSON(),
        name: trimmed,
        updatedAt: timestamp,
      };
      await database.groups.upsert(updatedGroup);

      const allWords = await database.words.find().exec();
      for (const wordDoc of allWords) {
        const record = toMutableWordRecord(wordDoc.toJSON());
        if (!wordHasGroup(record, oldName)) {
          continue;
        }

        const nextRecord = {
          ...record,
          customGroups: replaceGroupInWordGroups(getWordGroups(record), oldName, trimmed),
          updatedAt: timestamp,
        };
        await database.words.upsert(nextRecord);
      }
    },
    [database, groups]
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

      const groupName = groupDoc.name;
      const timestamp = new Date().toISOString();
      const deletedGroup: GroupRecord = {
        ...groupDoc.toJSON(),
        isDeleted: true,
        updatedAt: timestamp,
      };
      await database.groups.upsert(deletedGroup);

      const allWords = await database.words.find().exec();
      for (const wordDoc of allWords) {
        const record = toMutableWordRecord(wordDoc.toJSON());
        if (!wordHasGroup(record, groupName)) {
          continue;
        }

        const nextRecord = {
          ...record,
          customGroups: removeGroupFromWordGroups(getWordGroups(record), groupName),
          updatedAt: timestamp,
        };
        await database.words.upsert(nextRecord);
      }
    },
    [database]
  );

  const handleCreateGroup = useCallback(
    async (name: string) => {
      await ensureGroupExists(name);
    },
    [ensureGroupExists]
  );

  // Track Network Status dynamically
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    setOnlineStatus(navigator.onLine);
    const goOnline = () => setOnlineStatus(true);
    const goOffline = () => setOnlineStatus(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const filteredWords = useMemo(() => {
    let list = words;
    if (groupFilter !== 'all') {
      if (groupFilter === 'none') {
        list = list.filter((w) => !wordHasAnyGroup(w));
      } else {
        list = list.filter((w) => wordHasGroup(w, groupFilter));
      }
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((word) => {
      if (word.word.toLowerCase().includes(query)) {
        return true;
      }
      if (searchScope === 'wordAndDefinition') {
        return getWordDefinitions(word).some((definition) =>
          definition.meaning.toLowerCase().includes(query)
        );
      }
      return false;
    });
  }, [words, searchQuery, searchScope, groupFilter]);

  const wordsById = useMemo(() => {
    return new Map(words.map((word) => [word.id, word]));
  }, [words]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / pageSize));

  const pagedWords = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredWords.slice(startIndex, startIndex + pageSize);
  }, [filteredWords, page]);

  // Compute Stats dashboard numbers
  const unsyncedCount = useMemo(() => {
    if (syncState !== undefined) {
      return syncState.pendingCount;
    }
    return 0;
  }, [syncState]);

  const todayCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return words.filter((word) => new Date(word.createdAt) >= todayStart).length;
  }, [words]);

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

  const fsrsDueTodayCount = useMemo(() => fsrsDueRecords.length, [fsrsDueRecords]);

  const fsrsNextDueText = useMemo(() => {
    const futureCards = fsrsRecords
      .filter((r) => !r.isDeleted && r.quizMode === quizDirection && r.dueAt > nowTicker)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

    if (fsrsDueTodayCount > 0) {
      if (futureCards.length > 0) {
        const interval = formatInterval(futureCards[0].dueAt, new Date(nowTicker));
        return `Next in ${interval}`;
      }
      return 'All due now';
    }

    if (futureCards.length > 0) {
      const interval = formatInterval(futureCards[0].dueAt, new Date(nowTicker));
      return `Next due in ${interval}`;
    }

    return fsrsRecords.some((r) => !r.isDeleted && r.quizMode === quizDirection)
      ? 'All caught up'
      : '';
  }, [fsrsRecords, quizDirection, nowTicker, fsrsDueTodayCount]);

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
      const missedId = buildMissedWordId(wordId, quizMode);
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
        wordId,
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

      const missedId = buildMissedWordId(wordId, quizMode);
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
      const missedId = buildMissedWordId(wordId, quizMode);
      const existing = await database?.missedWords.findOne(missedId).exec();
      if (existing && !existing.isDeleted) {
        await removeMissedWordRecord(wordId, quizMode);
      } else {
        await saveMissedWordRecord(wordId, word, meaning, quizMode);
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
          const correspondingWord = words.find((w) => w.id === wordId);
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
          const correspondingWord = words.find((w) => w.id === (item as FsrsRecord).wordId);
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
          const correspondingWord = words.find((w) => w.id === (item as MissedWordRecord).wordId);
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
      return fsrsRecords.find((f) => !f.isDeleted && f.wordId === wordId && f.quizMode === mode);
    },
    [fsrsRecords]
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
        const definitions = normalizeDefinitions(
          (word as { definitions?: WordDefinition[] }).definitions,
          word.meaning
        );
        const fsrsRecord = getFsrsRecordForWord(wordId, quizDirection);
        return {
          id: wordId,
          word: word.word,
          meaning: definitionsToMeaning(definitions),
          definitions,
          tags: words.find((w) => w.id === wordId)?.customGroups || [],
          notes:
            words.find((w) => w.id === wordId)?.notes || (word as { notes?: string }).notes || '',
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
    words,
    getFsrsRecordForWord,
    quizDirection,
    currentPoolSignature,
    dispatch,
  ]);

  // Synchronize card content in the active queue when words / FSRS records update in database
  useEffect(() => {
    if (words.length === 0 || quizQueue.length === 0) {
      return;
    }
    const wordsMap = new Map(words.map((w) => [w.id, w]));
    let hasChanges = false;
    const updatedQueue = quizQueue.map((item) => {
      const freshWord = wordsMap.get(item.id);
      if (!freshWord) {
        return item;
      }
      const freshDefinitions = normalizeDefinitions(freshWord.definitions, freshWord.meaning);
      const freshMeaning = definitionsToMeaning(freshDefinitions);
      const freshTags = freshWord.customGroups || [];
      const freshNotes = freshWord.notes || '';
      const freshFsrs = getFsrsRecordForWord(item.id, quizDirection);
      if (
        item.word !== freshWord.word ||
        item.meaning !== freshMeaning ||
        item.notes !== freshNotes ||
        JSON.stringify(item.tags) !== JSON.stringify(freshTags) ||
        JSON.stringify(item.definitions) !== JSON.stringify(freshDefinitions) ||
        item.fsrsRecord?.dueAt !== freshFsrs?.dueAt ||
        item.fsrsRecord?.stability !== freshFsrs?.stability
      ) {
        hasChanges = true;
        return {
          ...item,
          word: freshWord.word,
          meaning: freshMeaning,
          definitions: freshDefinitions,
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
  }, [words, quizQueue, getFsrsRecordForWord, quizDirection, dispatch]);

  // Manage quiz queue initialization:
  // - If filters change (poolSignature changed), generate new queue with new pool signature
  // - If poolSignature matches and queue already exists (e.g. returning from another page), KEEP IT WITHOUT RESHUFFLING
  // - If poolSignature matches but queue is empty and candidates exist, initialize / refill
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
      }
    }
  }, [
    poolSignature,
    currentPoolSignature,
    quizCandidates.length,
    quizQueue.length,
    quizSource,
    isInitialized,
    resetQuiz,
    dispatch,
  ]);

  useEffect(() => {
    let isMounted = true;
    let wordSubscription: { unsubscribe: () => void } | null = null;
    let groupSubscription: { unsubscribe: () => void } | null = null;
    let missedSubscription: { unsubscribe: () => void } | null = null;
    let fsrsSubscription: { unsubscribe: () => void } | null = null;
    let wordFamilySubscription: { unsubscribe: () => void } | null = null;
    let reviewLogSubscription: { unsubscribe: () => void } | null = null;
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
        setPage(1);
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

      const reviewLogQuery = db.reviewLogs.find({
        selector: { isDeleted: { $ne: true } },
      });

      reviewLogSubscription = reviewLogQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setReviewLogsCount(docs.length);
      });

      // Initialize automatic two-way Supabase replication
      const replications = setupSupabaseReplication(db);
      replicationsRef.current = replications;

      unsubscribeSyncState = replications.subscribeSyncState((newState) => {
        if (!isMounted) {
          return;
        }
        setSyncState(newState);
      });

      // Mark UI as ready immediately — local DB is available
      if (isMounted) {
        setIsLoading(false);
      }

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

      // Sync in background — does not block UI rendering
      if (navigator.onLine) {
        console.log('App started online: Starting background replication...');
        void withSyncState(async () => {
          await replicationsRef.current?.reSyncAll();
          await replicationsRef.current?.awaitInSync();
        });
      } else {
        console.log('App started offline: Using local data. Will sync when online.');
      }
    };

    load().then(() => console.log('Data loaded'));

    return () => {
      isMounted = false;
      wordSubscription?.unsubscribe();
      groupSubscription?.unsubscribe();
      missedSubscription?.unsubscribe();
      fsrsSubscription?.unsubscribe();
      wordFamilySubscription?.unsubscribe();
      reviewLogSubscription?.unsubscribe();
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
    const existing = fsrsRecords.find((r) => r.id === fsrsId);
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
  }, [currentQuizItem, quizSource, quizDirection, fsrsRecords]);

  const isCurrentMarkedMissed = useMemo(() => {
    if (!currentQuizItem) {
      return false;
    }

    const missedId = buildMissedWordId(currentQuizItem.id, quizDirection);
    return missedWords.some((item) => item.id === missedId && !item.isDeleted);
  }, [currentQuizItem, quizDirection, missedWords]);

  useEffect(() => {
    if (!database || isLoading) {
      return;
    }

    const migrateGroups = async () => {
      const legacyNames = new Set<string>();

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('self_quiz_custom_groups');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              for (const name of parsed) {
                if (typeof name === 'string' && name.trim()) {
                  legacyNames.add(name.trim());
                }
              }
            }
          } catch (error) {
            console.error('Failed to parse stored groups', error);
          }
        }
      }

      const allWords = await database.words.find().exec();
      for (const wordDoc of allWords) {
        for (const groupName of getWordGroups(toMutableWordRecord(wordDoc.toJSON()))) {
          legacyNames.add(groupName);
        }
      }

      const existingGroups = await database.groups.find().exec();
      const existingNames = new Set(
        existingGroups.filter((g) => !g.isDeleted).map((g) => g.name.trim().toLowerCase())
      );

      for (const name of legacyNames) {
        if (existingNames.has(name.toLowerCase())) {
          continue;
        }
        const timestamp = new Date().toISOString();
        const record: GroupRecord = {
          id: crypto.randomUUID(),
          name,
          createdAt: timestamp,
          updatedAt: timestamp,
          isDeleted: false,
          lastSyncedAt: '',
        };
        await database.groups.upsert(record);
      }

      if (typeof window !== 'undefined' && legacyNames.size > 0) {
        localStorage.removeItem('self_quiz_custom_groups');
      }
    };

    void migrateGroups();
  }, [database, isLoading]);

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

  const handleAdd = async (
    word: string,
    meaning: string,
    definitions: WordDefinition[],
    selectedGroups: string[],
    aiExampleCount: number,
    notes?: string
  ) => {
    if (!database) {
      return;
    }

    const normalizedGroups = Array.from(
      new Set(selectedGroups.map((g) => g.trim()).filter((g) => g.length > 0))
    );
    for (const groupName of normalizedGroups) {
      await ensureGroupExists(groupName);
    }

    const timestamp = new Date().toISOString();
    const normalizedDefinitions = normalizeDefinitions(definitions, meaning);
    const normalizedMeaning = definitionsToMeaning(normalizedDefinitions);
    const normalizedAiExampleCount = normalizeAiExampleCount(aiExampleCount);
    const record: WordRecord = {
      id: crypto.randomUUID(),
      word: capitalizeWord(word),
      meaning: normalizedMeaning,
      definitions: normalizedDefinitions,
      aiExampleCount: normalizedAiExampleCount,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
      lastSyncedAt: '',
      customGroups: normalizedGroups,
      notes: notes || '',
    };

    await database.words.upsert(record);

    // Auto-enqueue word into FSRS for all quiz modes

    const fsrsQuizModes: import('@/lib/db').QuizMode[] = [
      'wordToMeaning',
      'meaningToWord',
      'spelling',
    ];
    for (const qMode of fsrsQuizModes) {
      const fsrsRecord = createInitialFsrsRecord(
        record.id,
        qMode,
        capitalizeWord(word),
        normalizedMeaning
      );
      await database.fsrsRecords.upsert(fsrsRecord);
    }

    // Generate word family members using AI in background
    void fetchAndStoreWordFamily(record.id, record.word, normalizedMeaning).catch((error) => {
      console.error('Error generating word family after add:', error);
    });

    if (normalizedDefinitions.length > 0) {
      void ensureMissingAiExamples(record.id).catch((error) => {
        console.error('Error filling missing AI examples after add:', error);
      });
    }

    if (normalizedDefinitions.length === 0) {
      void (async () => {
        try {
          if (!navigator.onLine) {
            console.warn('Device is offline, skipping definition fetch for:', record.word);
            return;
          }

          const response = await fetch('/api/meaning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: record.word }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.warn(
              'Definition API error for word:',
              record.word,
              'Status:',
              response.status,
              errorText
            );
            return;
          }

          const data = await response.json();
          const aiDefinitions = normalizeDefinitions(
            data?.definitions,
            String(data?.meaning ?? '')
          );
          const aiMeaning = definitionsToMeaning(aiDefinitions);

          if (!aiMeaning) {
            console.warn('No definition returned for word:', record.word);
            return;
          }

          const doc = await database.words.findOne(record.id).exec();
          if (!doc) {
            console.warn('Word document not found after fetch:', record.id);
            return;
          }

          const current = toMutableWordRecord(doc.toJSON());
          if (getWordDefinitions(current).length > 0) {
            console.log('Meaning already exists, skipping update');
            return;
          }

          const updated = {
            ...current,
            meaning: aiMeaning,
            definitions: aiDefinitions,
            updatedAt: new Date().toISOString(),
          };

          await database.words.upsert(updated);
          const fsrsDocs = await database.fsrsRecords
            .find({
              selector: { wordId: record.id },
            })
            .exec();
          for (const fsrsDoc of fsrsDocs) {
            const updatedFsrs = updateFsrsRecordContent(
              fsrsDoc.toJSON() as FsrsRecord,
              record.word,
              aiMeaning,
              updated.updatedAt
            );
            await database.fsrsRecords.upsert(updatedFsrs);
          }
          await ensureMissingAiExamples(record.id);

          console.log('Definition updated for word:', record.word, '-', aiMeaning);
        } catch (error) {
          console.error('Error fetching definition:', error);
        }
      })();
    }
  };

  const handleDelete = async (id: string) => {
    if (!database) {
      return;
    }

    const doc = await database.words.findOne(id).exec();
    if (!doc) {
      return;
    }

    const timestamp = new Date().toISOString();
    const record = {
      ...toMutableWordRecord(doc.toJSON()),
      isDeleted: true,
      updatedAt: timestamp,
    };

    await database.words.upsert(record);
    const fsrsDocs = await database.fsrsRecords
      .find({
        selector: { wordId: id, isDeleted: { $ne: true } },
      })
      .exec();
    for (const fsrsDoc of fsrsDocs) {
      const deletedFsrs = softDeleteFsrsRecord(fsrsDoc.toJSON() as FsrsRecord, timestamp);
      await database.fsrsRecords.upsert(deletedFsrs);
    }

    const familyDocs = await database.wordFamilies
      .find({
        selector: { wordId: id, isDeleted: { $ne: true } },
      })
      .exec();
    for (const familyDoc of familyDocs) {
      const data = familyDoc.toJSON();
      await database.wordFamilies.upsert({
        ...data,
        examples: Array.from(data.examples || []),
        isDeleted: true,
        updatedAt: timestamp,
      });
    }
  };

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

  const [confirmClearAllOpen, setConfirmClearAllOpen] = useState(false);

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
    await toggleMissedWordRecord(
      currentQuizItem.id,
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

  const runFullSync = useCallback(async () => {
    if (!database) {
      return;
    }
    await withSyncState(async () => {
      await replicationsRef.current?.reSyncAll();
      await replicationsRef.current?.awaitInSync();
    });
  }, [database, withSyncState]);

  const handleManualSync = async () => {
    if (!database) {
      return;
    }
    console.log('User triggered manual sync...');
    await runFullSync();
  };

  const handleTogglePause = useCallback(async () => {
    if (!replicationsRef.current) {
      return;
    }
    if (replicationsRef.current.isPaused()) {
      await replicationsRef.current.resumeAll();
    } else {
      await replicationsRef.current.pauseAll();
    }
  }, []);

  const handleVerifyInSync = useCallback(async () => {
    if (!replicationsRef.current) {
      return false;
    }
    return await replicationsRef.current.awaitInSync();
  }, []);

  const handleSyncCollection = useCallback((collection: SyncCollectionKey) => {
    replicationsRef.current?.reSyncCollection(collection);
  }, []);

  const handlePauseCollection = useCallback(async (collection: SyncCollectionKey) => {
    await replicationsRef.current?.pauseCollection(collection);
  }, []);

  const handleResumeCollection = useCallback(async (collection: SyncCollectionKey) => {
    await replicationsRef.current?.resumeCollection(collection);
  }, []);

  const handleClearActivities = useCallback(() => {
    replicationsRef.current?.clearActivities();
  }, []);

  useEffect(() => {
    if (!database || !onlineStatus) {
      return;
    }

    const intervalId = window.setInterval(
      () => {
        void runFullSync();
      },
      10 * 60 * 1000
    );

    return () => window.clearInterval(intervalId);
  }, [database, onlineStatus, runFullSync]);

  // Automatically refresh the page after 10 minutes of inactivity
  useEffect(() => {
    let timerId = window.setTimeout(
      () => {
        window.location.reload();
      },
      10 * 60 * 1000
    );

    const resetTimer = () => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(
        () => {
          window.location.reload();
        },
        10 * 60 * 1000
      );
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      window.clearTimeout(timerId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  const toggleTheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

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
    async (rating: FsrsRating) => {
      if (!database || !currentQuizItem) {
        return;
      }

      const timestamp = new Date().toISOString();
      const now = new Date();
      const durationMs = Math.max(0, Date.now() - cardPresentedAtRef.current);

      const fsrsId = buildFsrsId(currentQuizItem.id, quizDirection as import('@/lib/db').QuizMode);
      const existingDoc = await database.fsrsRecords.findOne(fsrsId).exec();
      const currentState = existingDoc
        ? (existingDoc.toJSON() as FsrsRecord)
        : createInitialFsrsRecord(
            currentQuizItem.id,
            quizDirection as import('@/lib/db').QuizMode,
            currentQuizItem.word,
            currentQuizItem.meaning
          );

      dispatch(
        pushQuizHistory({
          fsrsRecord: currentState ? { ...currentState } : undefined,
          previousQueue: [...quizQueue],
          previousIndex: quizIndex,
          previousRevealed: revealed,
          previousCompleted: completed,
        })
      );

      const updated = {
        ...computeFsrs(currentState, rating, now, currentQuizItem.word, currentQuizItem.meaning),
        word: currentQuizItem.word,
        meaning: currentQuizItem.meaning,
        updatedAt: timestamp,
        isDeleted: false,
      };

      await database.fsrsRecords.upsert(updated);

      const reviewLog = createReviewLogEvent({
        currentState,
        updatedCard: updated,
        rating,
        durationMs,
        now,
      });

      try {
        await database.reviewLogs.insert(reviewLog);
      } catch (err) {
        console.error('Failed to insert review log event:', err);
      }

      dispatch(nextCard());
    },
    [database, currentQuizItem, quizDirection, quizIndex, quizQueue, revealed, completed, dispatch]
  );

  return (
    <Box style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <AppSidebar
        mode={mode}
        onSetMode={(m) => dispatch(setMode(m))}
        onOpenAllWordsQuiz={() => dispatch(openAllWordsQuiz())}
        onOpenTodayQuiz={() => dispatch(openTodayQuiz())}
        onOpenFsrsQuiz={() => dispatch(openFsrsQuiz())}
        onOpenGroupManager={() => setGroupManagerOpen(true)}
        totalWords={words.length}
        todayCount={todayCount}
        fsrsDueTodayCount={fsrsDueTodayCount}
        colorScheme={colorScheme}
        onToggleTheme={toggleTheme}
      />

      <Box style={{ flex: 1, minWidth: 0 }}>
        <Container size="md" py={{ base: 'md', sm: 'xl' }} px={{ base: 'xs', sm: 'md' }}>
          <PwaRegister />

          <ClearMissedWordsModal
            opened={confirmClearAllOpen}
            count={missedWordsForMode.length}
            quizDirectionLabel={quizDirections[quizDirection]}
            onClose={() => setConfirmClearAllOpen(false)}
            onConfirm={handleConfirmClearAll}
          />

          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <DailyUsageTimer />
              <Box id="cloud-sync-card">
                <CloudSyncCard
                  syncState={syncState}
                  unsyncedCount={unsyncedCount}
                  onlineStatus={onlineStatus}
                  isSyncing={isSyncing}
                  onSyncNow={handleManualSync}
                  onTogglePause={handleTogglePause}
                  onVerifyInSync={handleVerifyInSync}
                  onSyncCollection={handleSyncCollection}
                  onPauseCollection={handlePauseCollection}
                  onResumeCollection={handleResumeCollection}
                  onClearActivities={handleClearActivities}
                  collectionCounts={{
                    words: words.length,
                    groups: groups.length,
                    missedWords: missedWords.length,
                    wordFamilies: Object.values(wordFamilies).reduce(
                      (acc, list) => acc + list.length,
                      0
                    ),
                    fsrsRecords: fsrsRecords.length,
                    reviewLogs: reviewLogsCount,
                  }}
                />
              </Box>
            </SimpleGrid>

            <Box id="stats-dashboard">
              <StatsDashboard
                totalWords={words.length}
                todayCount={todayCount}
                fsrsDueTodayCount={fsrsDueTodayCount}
                fsrsNextDueText={fsrsNextDueText}
                onOpenAllWordsQuiz={() => dispatch(openAllWordsQuiz())}
                onOpenTodayQuiz={() => dispatch(openTodayQuiz())}
                onOpenFsrsQuiz={() => dispatch(openFsrsQuiz())}
              />
            </Box>

            <SegmentedControl
              value={mode}
              onChange={(value) => dispatch(setMode(value as 'study' | 'quiz'))}
              data={[
                { label: 'Study Library', value: 'study' },
                { label: 'Quiz Session', value: 'quiz' },
              ]}
              fullWidth
              size="md"
              radius="lg"
              className="glass-panel"
              style={{ padding: '4px' }}
            />

            {mode === 'study' && (
              <StudyModeSection
                isLoading={isLoading}
                customGroups={customGroups}
                words={words}
                pagedWords={pagedWords}
                filteredWordsCount={filteredWords.length}
                totalPages={totalPages}
                page={page}
                searchQuery={searchQuery}
                searchScope={searchScope}
                groupFilter={groupFilter}
                groupManagerOpen={groupManagerOpen}
                groups={groups}
                generatingExampleWordIds={generatingExampleWordIds}
                generatingWordFamilyWordIds={generatingWordFamilyWordIds}
                wordFamilies={wordFamilies}
                onSubmitWord={handleAdd}
                onAddCustomGroup={handleAddCustomGroup}
                onEditExisting={handleEdit}
                onDeleteWord={handleDelete}
                onEditWord={handleEdit}
                onRefreshExamples={handleRefreshExamples}
                onRefreshWordFamily={handleRefreshWordFamily}
                onDeleteWordFamilyMember={handleDeleteWordFamilyMember}
                onCreateGroup={handleCreateGroup}
                onRenameGroup={handleRenameGroup}
                onDeleteGroup={handleDeleteGroup}
                onOpenGroupManager={() => setGroupManagerOpen(true)}
                onCloseGroupManager={() => setGroupManagerOpen(false)}
                onSetSearchQuery={setSearchQuery}
                onSetSearchScope={setSearchScope}
                onSetGroupFilter={setGroupFilter}
                onSetPage={setPage}
              />
            )}

            {mode === 'quiz' && (
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
                onSetHideSrsPracticeMeanings={(value) =>
                  dispatch(setHideSrsPracticeMeanings(value))
                }
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
              />
            )}
          </Stack>

          <EditWordModal
            opened={editingQuizWordId !== null}
            onClose={() => setEditingQuizWordId(null)}
            wordRecord={
              editingQuizWordId ? words.find((w) => w.id === editingQuizWordId) || null : null
            }
            customGroups={customGroups}
            onSave={async (id, word, meaning, definitions, groups, aiExampleCount, notes) => {
              await handleEdit(id, word, meaning, definitions, groups, aiExampleCount, notes);
            }}
            onAddCustomGroup={handleAddCustomGroup}
          />
        </Container>
      </Box>
    </Box>
  );
}
