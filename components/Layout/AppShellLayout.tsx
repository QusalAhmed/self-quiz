'use client';

import { Box, useMantineColorScheme } from '@mantine/core';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GroupManager } from '@/components/GroupManager/GroupManager';
import { RootStatsSection } from '@/components/Layout/RootStatsSection';
import { PwaRegister } from '@/components/PwaRegister/PwaRegister';
import { AppSidebar } from '@/components/Sidebar/AppSidebar';
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
import {
  getWordGroups,
  removeGroupFromWordGroups,
  replaceGroupInWordGroups,
  wordHasGroup,
} from '@/lib/groups';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
  openAllWordsQuiz,
  openFsrsQuiz,
  openTodayQuiz,
  selectQuizState,
  setMode,
} from '@/lib/redux/slices/quizSlice';
import {
  setupSupabaseReplication,
  type ReplicationsHolder,
  type UnifiedSyncState,
} from '@/lib/replication';
import { resolveWordTextFromMainTable } from '@/lib/word-display';

type WordWithDefinitions<T> = T & { definitions?: WordDefinition[] };

export function AppShellLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { mode, quizDirection } = useAppSelector(selectQuizState);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const [words, setWords] = useState<WordRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [missedWords, setMissedWords] = useState<MissedWordRecord[]>([]);
  const [fsrsRecords, setFsrsRecords] = useState<FsrsRecord[]>([]);
  const [reviewLogsCount, setReviewLogsCount] = useState<number>(0);
  const [wordFamilies, setWordFamilies] = useState<Record<string, WordFamilyMemberRecord[]>>({});
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);

  // Real-Time Due Timer: Ticks every 10 seconds to refresh due counts
  const [nowTicker, setNowTicker] = useState(() => new Date().toISOString());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTicker(new Date().toISOString());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Sync and Network status
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
      console.error('Replication sync error in AppShellLayout:', error);
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, []);

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

  // Subscribe to RxDB database and Supabase replication
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
          setWords(docs.map((doc) => doc.toJSON() as WordRecord));
        });

        const groupQuery = db.groups.find({
          selector: { isDeleted: { $ne: true } },
        });
        groupSubscription = groupQuery.$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setGroups(docs.map((doc) => doc.toJSON() as GroupRecord));
        });

        const missedQuery = db.missedWords.find({
          selector: { isDeleted: { $ne: true } },
        });
        missedSubscription = missedQuery.$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setMissedWords(docs.map((doc) => doc.toJSON() as MissedWordRecord));
        });

        const fsrsQuery = db.fsrsRecords.find({
          selector: { isDeleted: { $ne: true } },
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

        // Initialize Supabase replication singleton
        const replications = setupSupabaseReplication(db);
        replicationsRef.current = replications;

        unsubscribeSyncState = replications.subscribeSyncState((newState) => {
          if (!isMounted) {
            return;
          }
          setSyncState(newState);
        });

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
      } catch (err) {
        console.error('Failed to initialize database in AppShellLayout:', err);
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
  }, [withSyncState]);

  // Group Management Handlers
  const handleAddGroup = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    const db = await getDatabase();
    const existingDoc = await db.groups
      .findOne({
        selector: { name: trimmed, isDeleted: { $ne: true } },
      })
      .exec();
    if (existingDoc) {
      return;
    }
    const timestamp = new Date().toISOString();
    await db.groups.upsert({
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
      lastSyncedAt: '',
    });
  }, []);

  const handleRenameGroup = useCallback(async (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    const db = await getDatabase();
    const groupDoc = await db.groups.findOne(id).exec();
    if (!groupDoc || groupDoc.isDeleted) {
      return;
    }
    const oldName = groupDoc.name;
    if (oldName === trimmed) {
      return;
    }
    const timestamp = new Date().toISOString();
    await db.groups.upsert({
      ...groupDoc.toJSON(),
      name: trimmed,
      updatedAt: timestamp,
    });
    const allWords = await db.words.find().exec();
    for (const wordDoc of allWords) {
      const record = wordDoc.toJSON() as WordRecord;
      if (!wordHasGroup(record, oldName)) {
        continue;
      }
      const nextRecord = {
        ...record,
        customGroups: replaceGroupInWordGroups(getWordGroups(record), oldName, trimmed),
        updatedAt: timestamp,
      };
      await db.words.upsert(nextRecord);
    }
  }, []);

  const handleDeleteGroup = useCallback(async (id: string) => {
    const db = await getDatabase();
    const groupDoc = await db.groups.findOne(id).exec();
    if (!groupDoc || groupDoc.isDeleted) {
      return;
    }
    const groupName = groupDoc.name;
    const timestamp = new Date().toISOString();
    await db.groups.upsert({
      ...groupDoc.toJSON(),
      isDeleted: true,
      updatedAt: timestamp,
    });
    const allWords = await db.words.find().exec();
    for (const wordDoc of allWords) {
      const record = wordDoc.toJSON() as WordRecord;
      if (!wordHasGroup(record, groupName)) {
        continue;
      }
      const nextRecord = {
        ...record,
        customGroups: removeGroupFromWordGroups(getWordGroups(record), groupName),
        updatedAt: timestamp,
      };
      await db.words.upsert(nextRecord);
    }
  }, []);

  // Derived metrics
  const wordsById = useMemo(() => {
    return new Map(words.map((word) => [word.id, word]));
  }, [words]);

  const todayCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return words.filter((word) => new Date(word.createdAt) >= todayStart).length;
  }, [words]);

  const fsrsDueRecords = useMemo(() => {
    return fsrsRecords
      .filter((r) => !r.isDeleted && r.quizMode === quizDirection && r.dueAt <= nowTicker)
      .map((record) => resolveWordTextFromMainTable(record, wordsById))
      .filter((record): record is WordWithDefinitions<FsrsRecord> => record !== null)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
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

  return (
    <Box style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <PwaRegister />

      {/* Permanent Desktop Sidebar + Mobile Drawer FAB */}
      <AppSidebar
        mode={mode}
        onSetMode={(m) => {
          dispatch(setMode(m));
          const targetPath = m === 'quiz' ? '/quiz' : '/';
          if (pathname !== targetPath) {
            router.push(targetPath);
          }
        }}
        onOpenAllWordsQuiz={() => {
          dispatch(openAllWordsQuiz());
          if (pathname !== '/quiz') {
            router.push('/quiz');
          }
        }}
        onOpenTodayQuiz={() => {
          dispatch(openTodayQuiz());
          if (pathname !== '/quiz') {
            router.push('/quiz');
          }
        }}
        onOpenFsrsQuiz={() => {
          dispatch(openFsrsQuiz());
          if (pathname !== '/quiz') {
            router.push('/quiz');
          }
        }}
        onOpenGroupManager={() => setGroupManagerOpen(true)}
        totalWords={words.length}
        todayCount={todayCount}
        fsrsDueTodayCount={fsrsDueTodayCount}
        colorScheme={colorScheme}
        onToggleTheme={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
      />

      {/* Main Right Content Column */}
      <Box
        component="main"
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Stats Section */}
        <RootStatsSection
          words={words}
          groups={groups}
          missedWords={missedWords}
          fsrsRecords={fsrsRecords}
          reviewLogsCount={reviewLogsCount}
          wordFamilies={wordFamilies}
          syncState={syncState}
          onlineStatus={onlineStatus}
          isSyncing={isSyncing}
          replicationsRef={replicationsRef}
          withSyncState={withSyncState}
          todayCount={todayCount}
          fsrsDueTodayCount={fsrsDueTodayCount}
          fsrsNextDueText={fsrsNextDueText}
        />

        {/* Page Content Body */}
        <Box style={{ flex: 1, width: '100%' }}>{children}</Box>
      </Box>

      {/* Global Group Manager Modal */}
      <GroupManager
        opened={groupManagerOpen}
        onClose={() => setGroupManagerOpen(false)}
        groups={groups}
        onRename={handleRenameGroup}
        onDelete={handleDeleteGroup}
        onAdd={handleAddGroup}
      />
    </Box>
  );
}
