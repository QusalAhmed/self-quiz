'use client';

import { Container, SegmentedControl, Stack, useMantineColorScheme } from '@mantine/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  practiceDisplayModes,
  quizDirections,
  type PracticeDisplayKey,
  type QuizDirectionKey,
  type QuizRangeKey,
  type QuizSourceKey,
} from '@/app/home/constants';
import {
  capitalizeWord,
  getInitialCustomEnd,
  getInitialCustomStart,
  getMissingAiExampleDefinitionIndexes,
  getRangeEnd,
  getRangeStart,
  mergeExamplesIntoDefinitions,
  requestExamples,
  requestExamplesForDefinitions,
  shuffle,
  toMutableWordRecord,
} from '@/app/home/utils';
import { ClearMissedWordsModal } from '@/components/Home/ClearMissedWordsModal';
import { DailyUsageTimer } from '@/components/Home/DailyUsageTimer';
import { HomeHeader } from '@/components/Home/HomeHeader';
import { QuizModeSection } from '@/components/Home/QuizModeSection';
import { StatsDashboard } from '@/components/Home/StatsDashboard';
import { StudyModeSection } from '@/components/Home/StudyModeSection';
import { EditWordModal } from '@/components/EditWordModal/EditWordModal';
import { PwaRegister } from '@/components/PwaRegister/PwaRegister';
import { type QuizItem } from '@/components/QuizPanel/QuizPanel';
import {
  getDatabase,
  buildMissedWordId,
  type AppDatabase,
  type GroupRecord,
  type MissedWordRecord,
  type SrsPracticeRecord,
  type WordDefinition,
  type WordRecord,
} from '@/lib/db';
import { definitionsToMeaning, getWordDefinitions, normalizeDefinitions } from '@/lib/definitions';
import {
  getActiveGroupNames,
  getWordGroups,
  removeGroupFromWordGroups,
  replaceGroupInWordGroups,
  wordHasAnyGroup,
  wordHasGroup,
} from '@/lib/groups';
import { buildSrsId, computeSm2, createInitialSrsRecord, type SrsRating } from '@/lib/srs';
import { buildSrsPracticeId, createInitialSrsPracticeRecord } from '@/lib/srs-practice';
import {
  performFullSync,
  pushGroupToRemote,
  pushMissedWordToRemote,
  pushWordToRemote,
  pushSrsRecordToRemote,
  pushSrsPracticeWordToRemote,
  setupOnlineSyncListener,
} from '@/lib/sync';
import { mergeAiExamples, normalizeAiExampleCount, normalizeAiExamples } from '@/lib/examples';
import { resolveWordTextFromMainTable } from '@/lib/word-display';

type WordWithDefinitions<T> = T & { definitions?: WordDefinition[] };

export default function HomePage() {
  const [database, setDatabase] = useState<AppDatabase | null>(null);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [missedWords, setMissedWords] = useState<MissedWordRecord[]>([]);
  const [srsRecords, setSrsRecords] = useState<import('@/lib/db').SrsRecord[]>([]);
  const [srsPracticeWords, setSrsPracticeWords] = useState<SrsPracticeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'study' | 'quiz'>('study');
  const [quizRange, setQuizRange] = useState<QuizRangeKey>('all');
  const [quizSource, setQuizSource] = useState<QuizSourceKey>('words');
  const [quizDirection, setQuizDirection] = useState<QuizDirectionKey>('wordToMeaning');
  const [customStart, setCustomStart] = useState<string>(() => getInitialCustomStart());
  const [customEnd, setCustomEnd] = useState<string>(() => getInitialCustomEnd());
  const [quizQueue, setQuizQueue] = useState<QuizItem[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [editingQuizWordId, setEditingQuizWordId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'word' | 'wordAndDefinition'>('word');
  const [page, setPage] = useState(1);

  // Custom Groups states
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [quizGroupFilter, setQuizGroupFilter] = useState<string>('all');
  const [practiceDisplayMode, setPracticeDisplayMode] = useState<PracticeDisplayKey>('missed');
  const [hideSrsPracticeMeanings, setHideSrsPracticeMeanings] = useState(false);
  const [revealedSrsPracticeWordIds, setRevealedSrsPracticeWordIds] = useState<
    Record<string, boolean>
  >({});
  const [autoPronounceQuizWord, setAutoPronounceQuizWord] = useState(false);
  const [exampleGenerationCounts, setExampleGenerationCounts] = useState<Record<string, number>>({});

  const customGroups = useMemo(() => getActiveGroupNames(groups), [groups]);

  // Custom states for UI Enhancements
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgressRef = useRef(false);

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
  const prevQuizRangeRef = useRef<QuizRangeKey>('all');
  const prevQuizSourceRef = useRef<QuizSourceKey>('words');
  const prevQuizDirectionRef = useRef<QuizDirectionKey>('wordToMeaning');
  const prevCustomStartRef = useRef<string>(customStart);
  const prevCustomEndRef = useRef<string>(customEnd);
  const prevQuizGroupFilterRef = useRef<string>('all');

  const ensureGroupExists = useCallback(
    async (groupName: string) => {
      if (!database) {
        return;
      }

      const trimmed = groupName.trim();
      if (!trimmed) {
        return;
      }

      const existing = groups.find((g) => !g.isDeleted && g.name === trimmed);
      if (existing) {
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
      await pushGroupToRemote(database.groups, record);
    },
    [database, groups]
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
      await pushGroupToRemote(database.groups, updatedGroup);

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
        await pushWordToRemote(database.words, nextRecord);
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
      await pushGroupToRemote(database.groups, deletedGroup);

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
        await pushWordToRemote(database.words, nextRecord);
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
    return words.filter((word) => !word.lastSyncedAt || word.lastSyncedAt < word.updatedAt).length;
  }, [words]);

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

  // SRS records due for review (nextReviewAt <= now)
  const srsDueRecords = useMemo(() => {
    const now = new Date().toISOString();
    return srsRecords
      .filter((r) => !r.isDeleted && r.quizMode === quizDirection && r.nextReviewAt <= now)
      .map((record) => resolveWordTextFromMainTable(record, wordsById))
      .filter(
        (record): record is WordWithDefinitions<import('@/lib/db').SrsRecord> => record !== null
      )
      .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
  }, [srsRecords, quizDirection, wordsById]);

  const srsDueTodayCount = useMemo(() => srsDueRecords.length, [srsDueRecords]);

  const recentSrsPracticeWords = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return srsPracticeWords
      .filter(
        (record) =>
          !record.isDeleted &&
          record.quizMode === quizDirection &&
          new Date(record.practicedAt).getTime() >= cutoff
      )
      .map((record) => resolveWordTextFromMainTable(record, wordsById))
      .filter((record): record is WordWithDefinitions<SrsPracticeRecord> => record !== null)
      .sort((a, b) => b.practicedAt.localeCompare(a.practicedAt));
  }, [srsPracticeWords, quizDirection, wordsById]);

  const generatingExampleWordIds = useMemo(
    () => Object.fromEntries(Object.keys(exampleGenerationCounts).map((id) => [id, true])),
    [exampleGenerationCounts]
  );

  const getCandidateWordId = useCallback(
    (word: WordRecord | MissedWordRecord | import('@/lib/db').SrsRecord | SrsPracticeRecord) => {
      if (quizSource === 'missed') return (word as MissedWordRecord).wordId;
      if (quizSource === 'srs' || quizSource === 'srsPractice') {
        return (word as import('@/lib/db').SrsRecord | SrsPracticeRecord).wordId;
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
        await pushMissedWordToRemote(database.missedWords, updated);
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
      await pushMissedWordToRemote(database.missedWords, record);
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
      await pushMissedWordToRemote(database.missedWords, record);
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
    // SRS source ignores date range — scheduling is handled by the algorithm
    if (quizSource === 'srs') {
      let candidates: (WordRecord | MissedWordRecord | import('@/lib/db').SrsRecord)[] =
        srsDueRecords;
      if (quizGroupFilter !== 'all') {
        candidates = candidates.filter((item) => {
          const correspondingWord = words.find(
            (w) => w.id === (item as import('@/lib/db').SrsRecord).wordId
          );
          if (!correspondingWord) return quizGroupFilter === 'none';
          return quizGroupFilter === 'none'
            ? !wordHasAnyGroup(correspondingWord)
            : wordHasGroup(correspondingWord, quizGroupFilter);
        });
      }
      return candidates;
    }

    if (quizSource === 'srsPractice') {
      let candidates: SrsPracticeRecord[] = recentSrsPracticeWords;
      if (quizGroupFilter !== 'all') {
        candidates = candidates.filter((item) => {
          const correspondingWord = words.find((w) => w.id === item.wordId);
          if (!correspondingWord) return quizGroupFilter === 'none';
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

    let candidates: (WordRecord | MissedWordRecord)[]

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
    srsDueRecords,
    recentSrsPracticeWords,
    quizRange,
    quizSource,
    customStart,
    customEnd,
    quizGroupFilter,
  ]);

  const resetQuiz = useCallback(() => {
    const queue = shuffle(
      quizCandidates.map((word) => {
        const wordId = getCandidateWordId(word);
        const definitions = normalizeDefinitions((word as { definitions?: WordDefinition[] }).definitions, word.meaning);
        return {
          id: wordId,
          word: word.word,
          meaning: definitionsToMeaning(definitions),
          definitions,
          tags: words.find((w) => w.id === wordId)?.customGroups || [],
        };
      })
    );
    setQuizQueue(queue);
    setQuizIndex(0);
    setRevealed(false);
    setCompleted(queue.length === 0);
  }, [quizCandidates, getCandidateWordId, words]);

  // Initialize quiz when candidates are available, only if quiz is empty
  useEffect(() => {
    if (quizQueue.length === 0 && quizCandidates.length > 0) {
      console.log('Initializing quiz with', quizCandidates.length, 'candidates');
      resetQuiz();
    }
  }, [quizCandidates.length, resetQuiz, quizQueue.length]);

  useEffect(() => {
    if (prevQuizDirectionRef.current === quizDirection) {
      return;
    }
    setRevealed(false);
  }, [quizDirection]);

  // Reset quiz when quiz range/source, custom range dates, group, or quiz mode (for missed source) change
  useEffect(() => {
    const rangeChanged = prevQuizRangeRef.current !== quizRange;
    const sourceChanged = prevQuizSourceRef.current !== quizSource;
    const customStartChanged = prevCustomStartRef.current !== customStart;
    const customEndChanged = prevCustomEndRef.current !== customEnd;
    const directionChanged = prevQuizDirectionRef.current !== quizDirection;
    const groupChanged = prevQuizGroupFilterRef.current !== quizGroupFilter;

    prevQuizRangeRef.current = quizRange;
    prevQuizSourceRef.current = quizSource;
    prevCustomStartRef.current = customStart;
    prevCustomEndRef.current = customEnd;
    prevQuizDirectionRef.current = quizDirection;
    prevQuizGroupFilterRef.current = quizGroupFilter;

    const poolChanged =
      rangeChanged ||
      sourceChanged ||
      customStartChanged ||
      customEndChanged ||
      groupChanged ||
      (directionChanged && (quizSource === 'missed' || quizSource === 'srsPractice'));

    if (!poolChanged || quizQueue.length === 0) {
      return;
    }

    if (quizCandidates.length === 0) {
      console.log('No words in this range');
      setQuizQueue([]);
      setCompleted(true);
      return;
    }

    console.log('Quiz pool changed, resetting quiz with', quizCandidates.length, 'candidates');
    const queue = shuffle(
      quizCandidates.map((word) => {
        const wordId = getCandidateWordId(word);
        const definitions = normalizeDefinitions((word as { definitions?: WordDefinition[] }).definitions, word.meaning);
        return {
          id: wordId,
          word: word.word,
          meaning: definitionsToMeaning(definitions),
          definitions,
          tags: words.find((w) => w.id === wordId)?.customGroups || [],
        };
      })
    );
    setQuizQueue(queue);
    setQuizIndex(0);
    setRevealed(false);
    setCompleted(queue.length === 0);
  }, [
    quizRange,
    quizSource,
    quizCandidates,
    quizQueue.length,
    customStart,
    customEnd,
    getCandidateWordId,
    quizDirection,
    quizGroupFilter,
    words,
  ]);

  useEffect(() => {
    let isMounted = true;
    let wordSubscription: { unsubscribe: () => void } | null = null;
    let groupSubscription: { unsubscribe: () => void } | null = null;
    let missedSubscription: { unsubscribe: () => void } | null = null;
    let srsSubscription: { unsubscribe: () => void } | null = null;
    let srsPracticeSubscription: { unsubscribe: () => void } | null = null;
    let cleanupOnlineListener: (() => void) | null = null;

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
        setGroups(docs.map((doc) => doc.toJSON()));
      });

      const missedQuery = db.missedWords.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ updatedAt: 'desc' }],
      });

      missedSubscription = missedQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setMissedWords(docs.map((doc) => doc.toJSON()));
      });

      const srsQuery = db.srsRecords.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ nextReviewAt: 'asc' }],
      });

      srsSubscription = srsQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setSrsRecords(docs.map((doc) => doc.toJSON() as import('@/lib/db').SrsRecord));
      });

      const srsPracticeQuery = db.srsPracticeWords.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ practicedAt: 'desc' }],
      });

      srsPracticeSubscription = srsPracticeQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setSrsPracticeWords(docs.map((doc) => doc.toJSON() as SrsPracticeRecord));
      });

      // Mark UI as ready immediately — local DB is available
      if (isMounted) {
        setIsLoading(false);
      }

      // Set up online listener before kicking off background sync
      cleanupOnlineListener = setupOnlineSyncListener(
        db.words,
        db.missedWords,
        db.groups,
        db.srsRecords,
        db.srsPracticeWords,
        () =>
          withSyncState(() =>
            performFullSync(
              db.words,
              db.missedWords,
              db.groups,
              db.srsRecords,
              db.srsPracticeWords,
              db.dailyUsage
            )
          ),
        db.dailyUsage
      );

      // Sync in background — does not block UI rendering
      if (navigator.onLine) {
        console.log('App started online: Starting background sync...');
        void withSyncState(() =>
          performFullSync(
            db.words,
            db.missedWords,
            db.groups,
            db.srsRecords,
            db.srsPracticeWords,
            db.dailyUsage
          )
        );
      } else {
        console.log('App started offline: Using local data. Will sync when online.');
        // Flush outboxes eagerly when offline — they guard against future
        // online reconnects. The online listener will trigger the full sync.
        // Nothing more to do here; local DB is already loaded above.
      }
    };

    load().then(() => console.log("Data loaded"));

    return () => {
      isMounted = false;
      wordSubscription?.unsubscribe();
      groupSubscription?.unsubscribe();
      missedSubscription?.unsubscribe();
      srsSubscription?.unsubscribe();
      srsPracticeSubscription?.unsubscribe();
      cleanupOnlineListener?.();
    };
  }, []);

  const currentQuizItem = quizQueue[quizIndex] ?? null;
  const [hideMissedMeanings, setHideMissedMeanings] = useState(false);
  const [revealedMissedWordIds, setRevealedMissedWordIds] = useState<Record<string, boolean>>({});

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
      const existingNames = new Set(existingGroups.filter((g) => !g.isDeleted).map((g) => g.name));

      for (const name of legacyNames) {
        if (existingNames.has(name)) {
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
        await pushGroupToRemote(database.groups, record);
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
        await pushWordToRemote(database.words, updated);
        setQuizQueue((prev) =>
          prev.map((item) =>
            item.id === wordId
              ? {
                ...item,
                meaning: updated.meaning,
                definitions: updated.definitions,
              }
              : item
          )
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
    [database]
  );

  const handleAdd = async (
    word: string,
    meaning: string,
    definitions: WordDefinition[],
    selectedGroups: string[],
    aiExampleCount: number
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
    };

    await database.words.upsert(record);
    await pushWordToRemote(database.words, record);

    // Auto-enqueue word into SRS for all quiz modes
    const quizModes: import('@/lib/db').QuizMode[] = [
      'wordToMeaning',
      // 'meaningToWord',
      // 'spelling'
    ];
    for (const qMode of quizModes) {
      const srsRecord = createInitialSrsRecord(record.id, qMode, capitalizeWord(word), normalizedMeaning);
      await database.srsRecords.upsert(srsRecord);
      void pushSrsRecordToRemote(database.srsRecords, srsRecord);
    }

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
          const aiDefinitions = normalizeDefinitions(data?.definitions, String(data?.meaning ?? ''));
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
          await pushWordToRemote(database.words, updated);
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
    await pushWordToRemote(database.words, record);
  };

  const handleEdit = async (
    id: string,
    word: string,
    meaning: string,
    definitions: WordDefinition[],
    customGroups: string[],
    aiExampleCount: number
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
      updatedAt: timestamp,
    };

    await database.words.upsert(record);
    await pushWordToRemote(database.words, record);
    setQuizQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
            ...item,
            meaning: record.meaning,
            definitions: record.definitions,
          }
          : item
      )
    );

    if (normalizedDefinitions.length > 0) {
      void ensureMissingAiExamples(id).catch((error) => {
        console.error('Error filling missing AI examples after edit:', error);
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
          await pushWordToRemote(database.words, updated);
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
      await pushWordToRemote(database.words, updated);
      setQuizQueue((prev) =>
        prev.map((item) => (item.id === id ? { ...item, definitions: updatedDefinitions } : item))
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

  const handleReveal = () => {
    setRevealed(true);
  };
  const handleUnmarkMissed = async (id: string) => {
    if (!database) {
      return;
    }
    const existing = await database.missedWords.findOne(id).exec();
    if (!existing) {
      return;
    }
    await removeMissedWordRecord(existing.wordId, existing.quizMode);
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
      await pushMissedWordToRemote(database.missedWords, record);
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
    const nextIndex = quizIndex + 1;
    if (nextIndex >= quizQueue.length) {
      setCompleted(true);
      setRevealed(false);
      return;
    }

    setQuizIndex(nextIndex);
    setRevealed(false);
  }, [quizIndex, quizQueue.length]);

  const handlePrevious = useCallback(() => {
    const prevIndex = Math.max(quizIndex - 1, 0);
    setQuizIndex(prevIndex);
    setRevealed(false);
  }, [quizIndex]);

  const runFullSync = useCallback(async () => {
    if (!database) {
      return;
    }
    await withSyncState(async () => {
      await performFullSync(
        database.words,
        database.missedWords,
        database.groups,
        database.srsRecords,
        database.srsPracticeWords
      );
    });
  }, [database, withSyncState]);

  const handleManualSync = async () => {
    if (!database) {
      return;
    }
    console.log('User triggered manual sync...');
    await runFullSync();
  };

  useEffect(() => {
    if (!database || !onlineStatus) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void runFullSync();
    }, 10 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [database, onlineStatus, runFullSync]);

  // Automatically refresh the page after 10 minutes of inactivity
  useEffect(() => {
    let timerId = window.setTimeout(() => {
      window.location.reload();
    }, 10 * 60 * 1000);

    const resetTimer = () => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        window.location.reload();
      }, 10 * 60 * 1000);
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

  const handleSrsRate = useCallback(
    async (rating: SrsRating) => {
      if (!database || !currentQuizItem) return;

      const srsId = buildSrsId(currentQuizItem.id, quizDirection);
      const existingDoc = await database.srsRecords.findOne(srsId).exec();

      const timestamp = new Date().toISOString();
      const now = new Date();

      let currentState = existingDoc
        ? (existingDoc.toJSON() as import('@/lib/db').SrsRecord)
        : createInitialSrsRecord(
          currentQuizItem.id,
          quizDirection as import('@/lib/db').QuizMode,
          currentQuizItem.word,
          currentQuizItem.meaning
        );

      const { easeFactor, interval, repetitions, nextReviewAt } = computeSm2(
        currentState,
        rating,
        now
      );

      const updated: import('@/lib/db').SrsRecord = {
        ...currentState,
        word: currentQuizItem.word,
        meaning: currentQuizItem.meaning,
        easeFactor,
        interval,
        repetitions,
        nextReviewAt,
        lastReviewedAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
      };

      await database.srsRecords.upsert(updated);
      void pushSrsRecordToRemote(database.srsRecords, updated);

      const practiceId = buildSrsPracticeId(
        currentQuizItem.id,
        quizDirection as import('@/lib/db').QuizMode
      );
      const shouldAddToPractice = rating === 'again' || rating === 'hard';

      if (shouldAddToPractice) {
        const practiceRecord = {
          ...createInitialSrsPracticeRecord(
            currentQuizItem.id,
            quizDirection as import('@/lib/db').QuizMode,
            currentQuizItem.word,
            currentQuizItem.meaning,
            rating,
            timestamp
          ),
          updatedAt: timestamp,
          isDeleted: false,
        };

        await database.srsPracticeWords.upsert(practiceRecord);
        void pushSrsPracticeWordToRemote(database.srsPracticeWords, practiceRecord);
      } else {
        // if later rated good/easy, remove it from SRS Practice
        const existing = await database.srsPracticeWords.findOne(practiceId).exec();
        if (existing) {
          const deletedRecord = {
            ...(existing.toJSON() as SrsPracticeRecord),
            difficulty: rating,
            practicedAt: timestamp,
            updatedAt: timestamp,
            isDeleted: true,
          };
          await database.srsPracticeWords.upsert(deletedRecord);
          void pushSrsPracticeWordToRemote(database.srsPracticeWords, deletedRecord);
        }
      }

      // const practiceRecord = {
      //   ...createInitialSrsPracticeRecord(
      //     currentQuizItem.id,
      //     quizDirection as import('@/lib/db').QuizMode,
      //     currentQuizItem.word,
      //     currentQuizItem.meaning,
      //     rating,
      //     timestamp
      //   ),
      //   updatedAt: timestamp,
      // };
      //
      // await database.srsPracticeWords.upsert(practiceRecord);
      // void pushSrsPracticeWordToRemote(database.srsPracticeWords, practiceRecord);

      // Advance to next card automatically
      handleNext();
    },
    [database, currentQuizItem, quizDirection, handleNext]
  );

  return (
    <Container size="md" py="xl">
      <PwaRegister />

      <ClearMissedWordsModal
        opened={confirmClearAllOpen}
        count={missedWordsForMode.length}
        quizDirectionLabel={quizDirections[quizDirection]}
        onClose={() => setConfirmClearAllOpen(false)}
        onConfirm={handleConfirmClearAll}
      />

      <Stack gap="xl">
        <HomeHeader
          onlineStatus={onlineStatus}
          colorScheme={colorScheme}
          onToggleTheme={toggleTheme}
        />

        <DailyUsageTimer />

        <StatsDashboard
          totalWords={words.length}
          todayCount={todayCount}
          srsDueTodayCount={srsDueTodayCount}
          unsyncedCount={unsyncedCount}
          onlineStatus={onlineStatus}
          isSyncing={isSyncing}
          onSyncNow={handleManualSync}
          onOpenAllWordsQuiz={() => {
            setMode('quiz');
            setQuizSource('words');
            setQuizRange('all');
            setQuizGroupFilter('all');
          }}
          onOpenTodayQuiz={() => {
            setMode('quiz');
            setQuizSource('words');
            setQuizRange('today');
            setQuizGroupFilter('all');
          }}
          onOpenSrsQuiz={() => {
            setMode('quiz');
            setQuizSource('srs');
          }}
        />

        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as 'study' | 'quiz')}
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
            onSubmitWord={handleAdd}
            onAddCustomGroup={handleAddCustomGroup}
            onEditExisting={handleEdit}
            onDeleteWord={handleDelete}
            onEditWord={handleEdit}
            onRefreshExamples={handleRefreshExamples}
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
            recentSrsPracticeWords={recentSrsPracticeWords}
            missedWordIdSet={missedWordIdSet}
            generatingExampleWordIds={generatingExampleWordIds}
            autoPronounceQuizWord={autoPronounceQuizWord}
            onSetQuizRange={setQuizRange}
            onSetQuizSource={setQuizSource}
            onSetQuizDirection={setQuizDirection}
            onSetQuizGroupFilter={setQuizGroupFilter}
            onSetCustomStart={setCustomStart}
            onSetCustomEnd={setCustomEnd}
            onResetQuiz={resetQuiz}
            onReveal={handleReveal}
            onToggleMissed={handleToggleMissed}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onRefreshExamples={handleRefreshExamples}
            onSrsRate={handleSrsRate}
            onEditClick={(id) => setEditingQuizWordId(id)}
            onSetPracticeDisplayMode={setPracticeDisplayMode}
            onSetAutoPronounceQuizWord={setAutoPronounceQuizWord}
            onSetHideMissedMeanings={setHideMissedMeanings}
            onSetHideSrsPracticeMeanings={setHideSrsPracticeMeanings}
            onSetRevealedMissedWordIds={setRevealedMissedWordIds}
            onSetRevealedSrsPracticeWordIds={setRevealedSrsPracticeWordIds}
            onUnmarkMissed={handleUnmarkMissed}
            onTogglePracticeMissed={(word) =>
              void toggleMissedWordRecord(word.wordId, word.word, word.meaning, word.quizMode)
            }
            onOpenSrsPracticeQuiz={() => {
              setMode('quiz');
              setQuizSource('srsPractice');
              setQuizRange('all');
              setQuizGroupFilter('all');
            }}
            onOpenClearAllMissed={() => setConfirmClearAllOpen(true)}
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
        onSave={async (id, word, meaning, definitions, groups, aiExampleCount) => {
          await handleEdit(id, word, meaning, definitions, groups, aiExampleCount);
          setQuizQueue((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                  ...item,
                  word,
                  meaning,
                  definitions,
                  tags: groups,
                }
                : item
            )
          );
        }}
        onAddCustomGroup={handleAddCustomGroup}
      />
    </Container>
  );
}
