'use client';

import { Box, Container, SimpleGrid, Stack } from '@mantine/core';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CloudSyncCard } from '@/components/Home/CloudSyncCard';
import { DailyUsageTimer } from '@/components/Home/DailyUsageTimer';
import { StatsDashboard } from '@/components/Home/StatsDashboard';
import {
  type FsrsRecord,
  getDatabase,
  type GroupRecord,
  type MissedWordRecord,
  type WordDefinition,
  type WordFamilyMemberRecord,
  type WordRecord,
} from '@/lib/db';
import { formatInterval } from '@/lib/fsrs';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
  openAllWordsQuiz,
  openFsrsQuiz,
  openTodayQuiz,
  selectQuizState,
} from '@/lib/redux/slices/quizSlice';
import {
  setupSupabaseReplication,
  type ReplicationsHolder,
  type SyncCollectionKey,
  type UnifiedSyncState,
} from '@/lib/replication';
import { resolveWordTextFromMainTable } from '@/lib/word-display';

type WordWithDefinitions<T> = T & { definitions?: WordDefinition[] };

export type RootStatsSectionProps = {
  words?: WordRecord[];
  groups?: GroupRecord[];
  missedWords?: MissedWordRecord[];
  fsrsRecords?: FsrsRecord[];
  reviewLogsCount?: number;
  wordFamilies?: Record<string, WordFamilyMemberRecord[]>;
  syncState?: UnifiedSyncState;
  onlineStatus?: boolean;
  isSyncing?: boolean;
  replicationsRef?: React.MutableRefObject<ReplicationsHolder | null>;
  withSyncState?: (task: () => Promise<void>) => Promise<void>;
  todayCount?: number;
  fsrsDueTodayCount?: number;
  fsrsNextDueText?: string;
  size?: 'md' | 'xl';
};

export function RootStatsSection(props: RootStatsSectionProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { quizDirection } = useAppSelector(selectQuizState);

  // Fallback internal states if props are not provided
  const [internalWords, setInternalWords] = useState<WordRecord[]>([]);
  const [internalGroups, setInternalGroups] = useState<GroupRecord[]>([]);
  const [internalMissedWords, setInternalMissedWords] = useState<MissedWordRecord[]>([]);
  const [internalFsrsRecords, setInternalFsrsRecords] = useState<FsrsRecord[]>([]);
  const [internalReviewLogsCount, setInternalReviewLogsCount] = useState<number>(0);
  const [internalWordFamilies, setInternalWordFamilies] = useState<
    Record<string, WordFamilyMemberRecord[]>
  >({});
  const [internalOnlineStatus, setInternalOnlineStatus] = useState(true);
  const [internalIsSyncing, setInternalIsSyncing] = useState(false);
  const [internalSyncState, setInternalSyncState] = useState<UnifiedSyncState | undefined>(
    undefined
  );
  const internalSyncInProgressRef = useRef(false);
  const internalReplicationsRef = useRef<ReplicationsHolder | null>(null);

  const hasProvidedState = props.words !== undefined;

  // Real-Time Due Timer: Ticks every 10 seconds to refresh due counts
  const [nowTicker, setNowTicker] = useState(() => new Date().toISOString());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTicker(new Date().toISOString());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const internalWithSyncState = useCallback(async (task: () => Promise<void>) => {
    if (internalSyncInProgressRef.current || !navigator.onLine) {
      return;
    }

    internalSyncInProgressRef.current = true;
    setInternalIsSyncing(true);
    try {
      await task();
    } catch (error) {
      console.error('Replication sync error in RootStatsSection:', error);
    } finally {
      internalSyncInProgressRef.current = false;
      setInternalIsSyncing(false);
    }
  }, []);

  // Track Network Status dynamically if not provided
  useEffect(() => {
    if (hasProvidedState || typeof window === 'undefined') {
      return;
    }
    setInternalOnlineStatus(navigator.onLine);
    const goOnline = () => setInternalOnlineStatus(true);
    const goOffline = () => setInternalOnlineStatus(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [hasProvidedState]);

  // Subscribe to RxDB database and Supabase replication ONLY if not provided
  useEffect(() => {
    if (hasProvidedState) {
      return;
    }

    let isMounted = true;
    let wordSubscription: { unsubscribe: () => void } | null = null;
    let groupSubscription: { unsubscribe: () => void } | null = null;
    let missedSubscription: { unsubscribe: () => void } | null = null;
    let fsrsSubscription: { unsubscribe: () => void } | null = null;
    let wordFamilySubscription: { unsubscribe: () => void } | null = null;
    let reviewLogSubscription: { unsubscribe: () => void } | null = null;
    let cleanupOnlineListener: (() => void) | null = null;
    let unsubscribeSyncState: (() => void) | null = null;

    const loadDb = async () => {
      try {
        const db = await getDatabase();
        if (!isMounted) {
          return;
        }

        const wordQuery = db.words.find({
          selector: { isDeleted: { $ne: true } },
        });
        wordSubscription = wordQuery.$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setInternalWords(docs.map((doc) => doc.toJSON() as WordRecord));
        });

        const groupQuery = db.groups.find({
          selector: { isDeleted: { $ne: true } },
        });
        groupSubscription = groupQuery.$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setInternalGroups(docs.map((doc) => doc.toJSON() as GroupRecord));
        });

        const missedQuery = db.missedWords.find({
          selector: { isDeleted: { $ne: true } },
        });
        missedSubscription = missedQuery.$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setInternalMissedWords(docs.map((doc) => doc.toJSON() as MissedWordRecord));
        });

        const fsrsQuery = db.fsrsRecords.find({
          selector: { isDeleted: { $ne: true } },
        });
        fsrsSubscription = fsrsQuery.$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setInternalFsrsRecords(docs.map((doc) => doc.toJSON() as FsrsRecord));
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
          setInternalWordFamilies(map);
        });

        const reviewLogQuery = db.reviewLogs.find({
          selector: { isDeleted: { $ne: true } },
        });
        reviewLogSubscription = reviewLogQuery.$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setInternalReviewLogsCount(docs.length);
        });

        // Initialize Supabase replication singleton
        const replications = setupSupabaseReplication(db);
        internalReplicationsRef.current = replications;

        unsubscribeSyncState = replications.subscribeSyncState((newState) => {
          if (!isMounted) {
            return;
          }
          setInternalSyncState(newState);
        });

        const handleOnline = () => {
          void internalWithSyncState(async () => {
            await internalReplicationsRef.current?.reSyncAll();
            await internalReplicationsRef.current?.awaitInSync();
          });
        };

        if (typeof window !== 'undefined') {
          window.addEventListener('online', handleOnline);
          cleanupOnlineListener = () => {
            window.removeEventListener('online', handleOnline);
          };
        }

        if (navigator.onLine) {
          void internalWithSyncState(async () => {
            await internalReplicationsRef.current?.reSyncAll();
            await internalReplicationsRef.current?.awaitInSync();
          });
        }
      } catch (err) {
        console.error('Failed to initialize database in RootStatsSection:', err);
      }
    };

    void loadDb();

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
  }, [hasProvidedState, internalWithSyncState]);

  // Resolve active state (from props or internal)
  const words = props.words ?? internalWords;
  const groups = props.groups ?? internalGroups;
  const missedWords = props.missedWords ?? internalMissedWords;
  const fsrsRecords = props.fsrsRecords ?? internalFsrsRecords;
  const reviewLogsCount = props.reviewLogsCount ?? internalReviewLogsCount;
  const wordFamilies = props.wordFamilies ?? internalWordFamilies;
  const syncState = props.syncState !== undefined ? props.syncState : internalSyncState;
  const onlineStatus = props.onlineStatus ?? internalOnlineStatus;
  const isSyncing = props.isSyncing ?? internalIsSyncing;
  const activeReplicationsRef = props.replicationsRef ?? internalReplicationsRef;
  const activeWithSyncState = props.withSyncState ?? internalWithSyncState;

  // Sync Action Handlers
  const handleManualSync = useCallback(async () => {
    await activeWithSyncState(async () => {
      await activeReplicationsRef.current?.reSyncAll();
      await activeReplicationsRef.current?.awaitInSync();
    });
  }, [activeWithSyncState, activeReplicationsRef]);

  const handleTogglePause = useCallback(async () => {
    if (!activeReplicationsRef.current) {
      return;
    }
    if (syncState?.isPaused) {
      await activeReplicationsRef.current.resumeAll();
    } else {
      await activeReplicationsRef.current.pauseAll();
    }
  }, [syncState?.isPaused, activeReplicationsRef]);

  const handleVerifyInSync = useCallback(async (): Promise<boolean> => {
    if (!activeReplicationsRef.current) {
      return true;
    }
    return activeReplicationsRef.current.awaitInSync();
  }, [activeReplicationsRef]);

  const handleSyncCollection = useCallback(
    (collection: SyncCollectionKey) => {
      activeReplicationsRef.current?.reSyncCollection(collection);
    },
    [activeReplicationsRef]
  );

  const handlePauseCollection = useCallback(
    async (collection: SyncCollectionKey) => {
      await activeReplicationsRef.current?.pauseCollection(collection);
    },
    [activeReplicationsRef]
  );

  const handleResumeCollection = useCallback(
    async (collection: SyncCollectionKey) => {
      await activeReplicationsRef.current?.resumeCollection(collection);
    },
    [activeReplicationsRef]
  );

  const handleClearActivities = useCallback(() => {
    activeReplicationsRef.current?.clearActivities();
  }, [activeReplicationsRef]);

  // Derived metrics
  const wordsById = useMemo(() => {
    return new Map(words.map((word) => [word.id, word]));
  }, [words]);

  const unsyncedCount = useMemo(() => {
    if (syncState !== undefined) {
      return syncState.pendingCount;
    }
    return 0;
  }, [syncState]);

  const computedTodayCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return words.filter((word) => new Date(word.createdAt) >= todayStart).length;
  }, [words]);

  const todayCount = props.todayCount !== undefined ? props.todayCount : computedTodayCount;

  const fsrsDueRecords = useMemo(() => {
    return fsrsRecords
      .filter((r) => !r.isDeleted && r.quizMode === quizDirection && r.dueAt <= nowTicker)
      .map((record) => resolveWordTextFromMainTable(record, wordsById))
      .filter((record): record is WordWithDefinitions<FsrsRecord> => record !== null)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }, [fsrsRecords, quizDirection, wordsById, nowTicker]);

  const computedFsrsDueTodayCount = useMemo(() => fsrsDueRecords.length, [fsrsDueRecords]);
  const fsrsDueTodayCount =
    props.fsrsDueTodayCount !== undefined ? props.fsrsDueTodayCount : computedFsrsDueTodayCount;

  const computedFsrsNextDueText = useMemo(() => {
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

  const fsrsNextDueText =
    props.fsrsNextDueText !== undefined ? props.fsrsNextDueText : computedFsrsNextDueText;

  // Quiz navigation triggers
  const handleOpenAllWordsQuiz = useCallback(() => {
    dispatch(openAllWordsQuiz());
    if (pathname !== '/quiz') {
      router.push('/quiz');
    }
  }, [dispatch, pathname, router]);

  const handleOpenTodayQuiz = useCallback(() => {
    dispatch(openTodayQuiz());
    if (pathname !== '/quiz') {
      router.push('/quiz');
    }
  }, [dispatch, pathname, router]);

  const handleOpenFsrsQuiz = useCallback(() => {
    dispatch(openFsrsQuiz());
    if (pathname !== '/quiz') {
      router.push('/quiz');
    }
  }, [dispatch, pathname, router]);

  const containerSize = props.size || (pathname === '/' ? 'md' : 'xl');

  return (
    <Container
      size={containerSize}
      pt={{ base: 'md', sm: 'xl' }}
      pb="sm"
      px={{ base: 'xs', sm: 'md' }}
      style={{ width: '100%' }}
    >
      <Stack gap="md">
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
            onOpenAllWordsQuiz={handleOpenAllWordsQuiz}
            onOpenTodayQuiz={handleOpenTodayQuiz}
            onOpenFsrsQuiz={handleOpenFsrsQuiz}
          />
        </Box>
      </Stack>
    </Container>
  );
}
