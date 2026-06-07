'use client';

import {
  Button,
  CloseButton,
  Container,
  Group,
  Pagination,
  Select,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  ActionIcon,
  Tooltip,
  useMantineColorScheme,
  Grid,
  Card,
  Badge,
  Divider,
} from '@mantine/core';
import {
  IconSearch,
  IconSun,
  IconMoon,
  IconCloudCheck,
  IconCloudUpload,
  IconWifi,
  IconWifiOff,
  IconBook,
  IconHistory,
  IconRotateClockwise,
  IconBookmarkOff,
  IconFlame,
  IconTarget,
  IconVolume,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PwaRegister } from '@/components/PwaRegister/PwaRegister';
import {
  QuizPanel,
  type QuizDirection,
  type QuizItem,
} from '@/components/QuizPanel/QuizPanel';
import { WordForm } from '@/components/WordForm/WordForm';
import { WordList } from '@/components/WordList/WordList';
import { getDatabase, type AppDatabase, type MissedWordRecord, type WordRecord } from '@/lib/db';
import { getDisplayExamples } from '@/lib/examples';
import {
  fetchMissingMeanings,
  pullRemoteMissedWords,
  pullRemoteWords,
  pushAllLocalMissedWords,
  pushAllLocalWords,
  pushMissedWordToRemote,
  pushWordToRemote,
  setupOnlineSyncListener,
} from '@/lib/sync';

const quizRanges = {
  all: 'All Words',
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Last 7 days',
  month: 'Last 30 days',
  year: 'This year',
  custom: 'Custom Range',
} as const;

const quizSources = {
  words: 'Regular',
  missed: 'Missed Words',
} as const;

const quizDirections = {
  wordToMeaning: 'Word → Meaning',
  meaningToWord: 'Meaning → Word',
} as const;

type QuizRangeKey = keyof typeof quizRanges;

type QuizSourceKey = keyof typeof quizSources;

type QuizDirectionKey = keyof typeof quizDirections;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRangeStart(range: QuizRangeKey, customStart?: string | null): Date | null {
  if (range === 'custom') {
    return customStart ? new Date(customStart) : null;
  }
  const now = new Date();
  if (range === 'all') {
    return null;
  }
  if (range === 'year') {
    return new Date(now.getFullYear(), 0, 1);
  }
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (range === 'yesterday') {
    const start = new Date(now);
    start.setDate(now.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  const days = range === 'week' ? 7 : 30;
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return start;
}

function getRangeEnd(range: QuizRangeKey, customEnd?: string | null): Date | null {
  if (range === 'custom') {
    return customEnd ? new Date(customEnd) : null;
  }
  const now = new Date();
  if (range === 'all') {
    return null;
  }
  if (range === 'today') {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end.setHours(23, 59, 59, 999);
    return end;
  }
  if (range === 'yesterday') {
    const end = new Date(now);
    end.setDate(now.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  return now;
}

function formatDateTimeLocal(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getInitialCustomStart(): string {
  const date = new Date();
  date.setDate(date.getDate() - 2);
  date.setHours(0, 0, 0, 0)
  return formatDateTimeLocal(date);
}

function getInitialCustomEnd(): string {
  return formatDateTimeLocal(new Date());
}

function toMutableWordRecord(record: any): WordRecord {
  return {
    ...record,
    examples: Array.isArray(record.examples) ? [...record.examples] : [],
    userExamples: Array.isArray(record.userExamples) ? [...record.userExamples] : [],
  } as WordRecord;
}

function capitalizeWord(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

async function requestExamples(word: string, meaning: string): Promise<string[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return [];
  }

  const response = await fetch('/api/examples', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, meaning }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn('Examples API error:', response.status, errorText);
    return [];
  }

  const data = await response.json();
  return Array.isArray(data?.examples)
    ? data.examples.map((item: string) => String(item).trim()).filter(Boolean)
    : [];
}

export default function HomePage() {
  const [database, setDatabase] = useState<AppDatabase | null>(null);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [missedWords, setMissedWords] = useState<MissedWordRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'study' | 'quiz'>('study');
  const [quizRange, setQuizRange] = useState<QuizRangeKey>('all');
  const [quizSource, setQuizSource] = useState<QuizSourceKey>('words');
  const [quizDirection, setQuizDirection] = useState<QuizDirectionKey>('wordToMeaning');
  const [customStart, setCustomStart] = useState<string>(() => getInitialCustomStart());
  const [customEnd, setCustomEnd] = useState<string>(() => getInitialCustomEnd());
  const [quizQueue, setQuizQueue] = useState<QuizItem[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Custom states for UI Enhancements
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [onlineStatus, setOnlineStatus] = useState(true);

  const pageSize = 15; // Enhanced list density
  const prevQuizRangeRef = useRef<QuizRangeKey>('all');
  const prevQuizSourceRef = useRef<QuizSourceKey>('words');
  const prevQuizDirectionRef = useRef<QuizDirectionKey>('wordToMeaning');
  const prevCustomStartRef = useRef<string>(customStart);
  const prevCustomEndRef = useRef<string>(customEnd);

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
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return words;
    }
    return words.filter((word) => word.word.toLowerCase().includes(query));
  }, [words, searchQuery]);

  const examplesById = useMemo(() => {
    return new Map(words.map((word) => [word.id, getDisplayExamples(word)]));
  }, [words]);

  const getExamplesForId = useCallback(
    (id: string) => {
      return examplesById.get(id) ?? [];
    },
    [examplesById]
  );

  const updateQuizQueueExamples = useCallback((id: string, examples: string[]) => {
    setQuizQueue((prev) => prev.map((item) => (item.id === id ? { ...item, examples } : item)));
  }, []);

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

  const quizCandidates = useMemo(() => {
    const start = getRangeStart(quizRange, customStart);
    const end = getRangeEnd(quizRange, customEnd);

    if (!start && quizRange !== 'all') {
      return [];
    }

    if (quizSource === 'missed') {
      return missedWords.filter((word) => {
        if (quizRange === 'all') {
          return true;
        }
        const createdAt = new Date(word.missedAt);
        if (end) {
          return createdAt >= (start as Date) && createdAt <= end;
        }
        return createdAt >= (start as Date);
      });
    }

    return words.filter((word) => {
      if (quizRange === 'all') {
        return true;
      }
      const createdAt = new Date(word.createdAt);
      if (end) {
        return createdAt >= (start as Date) && createdAt <= end;
      }
      return createdAt >= (start as Date);
    });
  }, [words, missedWords, quizRange, quizSource, customStart, customEnd]);

  const resetQuiz = useCallback(() => {
    const queue = shuffle(
      quizCandidates.map((word) => ({
        id: word.id,
        word: word.word,
        meaning: word.meaning,
        examples: getExamplesForId(word.id),
      }))
    );
    setQuizQueue(queue);
    setQuizIndex(0);
    setRevealed(false);
    setCompleted(queue.length === 0);
  }, [quizCandidates, getExamplesForId]);

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
    prevQuizDirectionRef.current = quizDirection;
    setRevealed(false);
  }, [quizDirection]);

  // Reset quiz ONLY when quiz range/source or custom range dates change
  useEffect(() => {
    const rangeChanged = prevQuizRangeRef.current !== quizRange;
    const sourceChanged = prevQuizSourceRef.current !== quizSource;
    const customStartChanged = prevCustomStartRef.current !== customStart;
    const customEndChanged = prevCustomEndRef.current !== customEnd;

    prevQuizRangeRef.current = quizRange;
    prevQuizSourceRef.current = quizSource;
    prevCustomStartRef.current = customStart;
    prevCustomEndRef.current = customEnd;

    if (
      (!rangeChanged && !sourceChanged && !customStartChanged && !customEndChanged) ||
      quizQueue.length === 0
    ) {
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
      quizCandidates.map((word) => ({
        id: word.id,
        word: word.word,
        meaning: word.meaning,
        examples: getExamplesForId(word.id),
      }))
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
    getExamplesForId,
  ]);

  useEffect(() => {
    let isMounted = true;
    let wordSubscription: { unsubscribe: () => void } | null = null;
    let missedSubscription: { unsubscribe: () => void } | null = null;
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
        setWords(
          docs.map((doc) => {
            const record = doc.toJSON();
            return {
              ...record,
              examples: Array.isArray(record.examples) ? [...record.examples] : [],
              userExamples: Array.isArray(record.userExamples) ? [...record.userExamples] : [],
            };
          })
        );
        setPage(1);
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

      console.log('App started: Syncing with remote...');
      await pushAllLocalMissedWords(db.missedWords);
      await pullRemoteMissedWords(db.missedWords);
      await pullRemoteWords(db.words);
      await pushAllLocalWords(db.words);

      if (navigator.onLine) {
        await fetchMissingMeanings(db.words);
      }

      cleanupOnlineListener = setupOnlineSyncListener(db.words, db.missedWords);

      if (isMounted) {
        setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
      wordSubscription?.unsubscribe();
      missedSubscription?.unsubscribe();
      cleanupOnlineListener?.();
    };
  }, []);

  const currentQuizItem = quizQueue[quizIndex] ?? null;
  const [isCurrentMarkedMissed, setIsCurrentMarkedMissed] = useState(false);
  const [hideMissedMeanings, setHideMissedMeanings] = useState(false);
  const [revealedMissedWordIds, setRevealedMissedWordIds] = useState<Record<string, boolean>>({});

  const checkCurrentWordMissedStatus = useCallback(async () => {
    if (!database || !currentQuizItem) {
      setIsCurrentMarkedMissed(false);
      return;
    }
    try {
      const doc = await database.missedWords.findOne(currentQuizItem.id).exec();
      const isMissed = !!doc && !doc.isDeleted;
      setIsCurrentMarkedMissed(isMissed);
      console.log(`[Check Missed Status] Word "${currentQuizItem.word}" is missed: ${isMissed}`);
    } catch (error) {
      console.error('Error checking missed status in DB:', error);
    }
  }, [database, currentQuizItem]);

  // Run check when word, database, or missedWords list changes
  useEffect(() => {
    checkCurrentWordMissedStatus();
  }, [currentQuizItem, database, missedWords, checkCurrentWordMissedStatus]);

  // Sync when page comes into focus, loads, or refreshes
  useEffect(() => {
    if (!database) {
      return;
    }

  }, [database, checkCurrentWordMissedStatus]);

  const handleAdd = async (word: string, meaning: string, example: string) => {
    if (!database) {
      return;
    }

    const timestamp = new Date().toISOString();
    const userExamples = example ? [example] : [];
    const record: WordRecord = {
      id: crypto.randomUUID(),
      word: capitalizeWord(word),
      meaning,
      examples: [],
      userExamples,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
      lastSyncedAt: '',
    };

    await database.words.upsert(record);
    await pushWordToRemote(database.words, record);

    if (meaning) {
      void (async () => {
        try {
          const examples = await requestExamples(record.word, meaning);
          if (examples.length === 0) {
            return;
          }

          const doc = await database.words.findOne(record.id).exec();
          if (!doc) {
            return;
          }

          const updated = {
            ...toMutableWordRecord(doc.toJSON()),
            examples,
            updatedAt: new Date().toISOString(),
          };

          await database.words.upsert(updated);
          await pushWordToRemote(database.words, updated);
        } catch (error) {
          console.error('Error fetching examples:', error);
        }
      })();
    }

    if (!meaning) {
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
          const aiMeaning = String(data?.meaning ?? '').trim();

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
          if (current.meaning) {
            console.log('Meaning already exists, skipping update');
            return;
          }

          const updated = {
            ...current,
            meaning: aiMeaning,
            updatedAt: new Date().toISOString(),
          };

          await database.words.upsert(updated);
          await pushWordToRemote(database.words, updated);

          const examples = await requestExamples(updated.word, aiMeaning);
          if (examples.length > 0) {
            const withExamples = {
              ...updated,
              examples,
              updatedAt: new Date().toISOString(),
            };
            await database.words.upsert(withExamples);
            await pushWordToRemote(database.words, withExamples);
          }

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
    userExamples: string[]
  ) => {
    if (!database) {
      return;
    }

    const doc = await database.words.findOne(id).exec();
    if (!doc) {
      return;
    }

    const timestamp = new Date().toISOString();
    const current = toMutableWordRecord(doc.toJSON());
    const record = {
      ...current,
      word,
      meaning,
      userExamples,
      updatedAt: timestamp,
    };

    await database.words.upsert(record);
    await pushWordToRemote(database.words, record);
    updateQuizQueueExamples(id, getDisplayExamples(record));
  };

  const handleRefreshExamples = async (id: string) => {
    if (!database) {
      return;
    }

    const doc = await database.words.findOne(id).exec();
    if (!doc) {
      return;
    }

    const record = toMutableWordRecord(doc.toJSON());
    let meaning = record.meaning.trim();

    if (!meaning) {
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
      meaning = String(data?.meaning ?? '').trim();

      if (meaning) {
        const updated = {
          ...record,
          meaning,
          updatedAt: new Date().toISOString(),
        };
        await database.words.upsert(updated);
        await pushWordToRemote(database.words, updated);
      }
    }

    if (!meaning) {
      return;
    }

    const examples = await requestExamples(record.word, meaning);
    if (examples.length === 0) {
      return;
    }

    const updated = {
      ...record,
      meaning,
      examples,
      userExamples: record.userExamples,
      updatedAt: new Date().toISOString(),
    };

    await database.words.upsert(updated);
    await pushWordToRemote(database.words, updated);
    updateQuizQueueExamples(id, getDisplayExamples(updated));
  };

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleMarkMissed = async () => {
    if (!database || !currentQuizItem) {
      return;
    }

    const timestamp = new Date().toISOString();
    const existing = await database.missedWords.findOne(currentQuizItem.id).exec();

    if (existing) {
      const current = existing.toJSON();
      const updated = {
        ...current,
        word: currentQuizItem.word,
        meaning: currentQuizItem.meaning,
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
      id: currentQuizItem.id,
      wordId: currentQuizItem.id,
      word: currentQuizItem.word,
      meaning: currentQuizItem.meaning,
      missedAt: timestamp,
      missedCount: 1,
      updatedAt: timestamp,
      lastSyncedAt: '',
      isDeleted: false,
    };

    await database.missedWords.upsert(record);
    await pushMissedWordToRemote(database.missedWords, record);
  };

  const handleUnmarkMissed = async (id: string) => {
    if (!database) {
      return;
    }

    const existing = await database.missedWords.findOne(id).exec();
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
  };

  const handleUnmarkAllMissed = async () => {
    if (!database || missedWords.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    for (const item of missedWords) {
      const record = {
        ...item,
        isDeleted: true,
        updatedAt: timestamp,
      };
      await database.missedWords.upsert(record);
      await pushMissedWordToRemote(database.missedWords, record);
    }
  };

  const handleToggleMissed = async () => {
    if (!currentQuizItem) {
      return;
    }
    if (isCurrentMarkedMissed) {
      await handleUnmarkMissed(currentQuizItem.id);
    } else {
      await handleMarkMissed();
    }
    await checkCurrentWordMissedStatus();
  };

  const handleNext = () => {
    const nextIndex = quizIndex + 1;
    if (nextIndex >= quizQueue.length) {
      setCompleted(true);
      setRevealed(false);
      return;
    }

    setQuizIndex(nextIndex);
    setRevealed(false);
  };

  const handlePrevious = () => {
    const prevIndex = Math.max(quizIndex - 1, 0);
    setQuizIndex(prevIndex);
    setRevealed(false);
  };

  const handleManualSync = async () => {
    if (!database) {
      return;
    }
    console.log('User triggered manual sync...');
    try {
      await pushAllLocalMissedWords(database.missedWords);
      await pullRemoteMissedWords(database.missedWords);
      await pullRemoteWords(database.words);
      await pushAllLocalWords(database.words);
      await fetchMissingMeanings(database.words);
      await checkCurrentWordMissedStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Container size="md" py="xl">
      <PwaRegister />
      <Stack gap="xl">
        {/* --- Gorgeous Glassmorphic Header Panel --- */}
        <Card className="glass-panel header-panel" padding="xl" radius="lg">
          <Group className="header-inner" justify="space-between" align="flex-start" wrap="wrap">
            <Stack className="header-left" gap="xs" style={{ flex: 1 }}>
              <Title
                order={1}
                style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span className="text-gradient">English Word Memorizer</span>
              </Title>
              <Text c="dimmed" size="sm" style={{ lineHeight: 1.5, maxWidth: '480px' }}>
                A modern local-first vocabulary companion. Learn new definitions, sync with Supabase
                Cloud, and practice dynamically offline.
              </Text>
            </Stack>

            {/* Quick Status Pill Bar & Theme Toggler */}
            <Group className="header-right" gap="xs" style={{ flexShrink: 0 }}>
              <Tooltip label={onlineStatus ? 'Online' : 'Offline'}>
                <Badge
                  color={onlineStatus ? 'teal' : 'red'}
                  variant="light"
                  size="md"
                  radius="md"
                  leftSection={onlineStatus ? <IconWifi size={14} /> : <IconWifiOff size={14} />}
                >
                  {onlineStatus ? 'Online' : 'Offline'}
                </Badge>
              </Tooltip>

              <Tooltip label="Toggle Theme">
                <ActionIcon
                  variant="subtle"
                  color="indigo"
                  size="lg"
                  radius="md"
                  onClick={toggleTheme}
                  style={{ transition: 'transform 0.3s ease' }}
                >
                  {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Card>

        {/* --- Interactive Statistics Dashboard Row --- */}
        <Grid gap="md" align="center">
          {/* Card 1: Total Words */}
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card
              className="glass-panel"
              radius="lg"
              padding="md"
              style={{ borderLeft: '4px solid #6366f1' }}
            >
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                    TOTAL WORDS
                  </Text>
                  <Text
                    size="xl"
                    fw={800}
                    style={{ fontFamily: 'var(--font-title)', marginTop: '4px' }}
                  >
                    {words.length}
                  </Text>
                </div>
                <IconBook size={28} style={{ opacity: 0.25, color: '#6366f1' }} />
              </Group>
            </Card>
          </Grid.Col>

          {/* Card 2: Today's Additions */}
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card
              className="glass-panel"
              radius="lg"
              padding="md"
              style={{ borderLeft: '4px solid #a855f7' }}
            >
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                    ADDED TODAY
                  </Text>
                  <Text
                    size="xl"
                    fw={800}
                    style={{ fontFamily: 'var(--font-title)', marginTop: '4px' }}
                  >
                    {todayCount}
                  </Text>
                </div>
                <IconHistory size={28} style={{ opacity: 0.25, color: '#a855f7' }} />
              </Group>
            </Card>
          </Grid.Col>

          {/* Card 3: Cloud Synchronization Status */}
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card
              className="glass-panel"
              radius="lg"
              padding="md"
              style={{ borderLeft: '4px solid #10b981' }}
            >
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                    CLOUD SYNC
                  </Text>
                  <Group gap={6} mt={4}>
                    <Text size="xl" fw={700} c={unsyncedCount === 0 ? 'teal' : 'orange'}>
                      {unsyncedCount === 0 ? 'Fully Synced' : `${unsyncedCount} Sync Pending`}
                    </Text>
                    {onlineStatus && (
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="teal"
                        onClick={handleManualSync}
                      >
                        <IconRotateClockwise size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                </div>
                {unsyncedCount === 0 ? (
                  <IconCloudCheck size={28} style={{ opacity: 0.35, color: '#10b981' }} />
                ) : (
                  <IconCloudUpload size={28} style={{ opacity: 0.35, color: '#f59e0b' }} />
                )}
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Mode Selector Panel */}
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as 'study' | 'quiz')}
          data={[
            { label: 'Study Library', value: 'study' },
            { label: 'Quiz Session', value: 'quiz' },
          ]}
          fullWidth
          size="md"
          radius="md"
          className="glass-panel"
          style={{ padding: '4px' }}
        />

        {/* --- STUDY MODE --- */}
        {mode === 'study' && (
          <Stack gap="lg">
            <WordForm onAdd={handleAdd} disabled={isLoading} />

            {/* Redesigned Glassmorphic Workspace Control Center */}
            <Card
              className="glass-panel"
              radius="lg"
              padding="lg"
              style={{
                borderLeft: '4px solid #a855f7',
                overflow: 'hidden',
              }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <IconBook size={22} style={{ color: '#a855f7' }} />
                    <Title
                      order={3}
                      style={{
                        fontFamily: 'var(--font-title)',
                        fontSize: '1.25rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      Your Workspace
                    </Title>
                  </Group>
                  <Badge
                    variant="gradient"
                    gradient={{ from: 'indigo', to: 'purple' }}
                    size="md"
                    radius="md"
                    style={{ fontWeight: 700 }}
                  >
                    {filteredWords.length} word{filteredWords.length !== 1 ? 's' : ''}
                  </Badge>
                </Group>

                <TextInput
                  placeholder="Search vocabulary by keyword..."
                  leftSection={<IconSearch size={18} style={{ opacity: 0.55, color: '#a855f7' }} />}
                  rightSection={
                    searchQuery ? (
                      <CloseButton
                        size="sm"
                        aria-label="Clear search"
                        onClick={() => {
                          setSearchQuery('');
                          setPage(1);
                        }}
                      />
                    ) : null
                  }
                  value={searchQuery}
                  size="md"
                  radius="md"
                  onChange={(event) => {
                    setSearchQuery(event.currentTarget.value);
                    setPage(1);
                  }}
                />
              </Stack>
            </Card>

            <WordList
              words={pagedWords}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onRefreshExamples={handleRefreshExamples}
            />

            {totalPages > 1 && (
              <Group justify="center" mt="sm">
                <div className="desktop-only">
                  <Pagination
                    value={page}
                    onChange={setPage}
                    total={totalPages}
                    radius="md"
                    color="indigo"
                    size="sm"
                    siblings={1}
                    boundaries={1}
                    withEdges
                  />
                </div>
                <div className="mobile-only">
                  <Group gap="sm" align="center">
                    <Button
                      variant="subtle"
                      color="indigo"
                      size="xs"
                      radius="md"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <Text
                      size="xs"
                      fw={700}
                      c="dimmed"
                      style={{ minWidth: 60, textAlign: 'center' }}
                    >
                      {page} / {totalPages}
                    </Text>
                    <Button
                      variant="subtle"
                      color="indigo"
                      size="xs"
                      radius="md"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </Group>
                </div>
              </Group>
            )}
          </Stack>
        )}

        {/* --- QUIZ MODE --- */}
        {mode === 'quiz' && (
          <Stack gap="lg" style={{ minHeight: '100vh' }}>
            <Card
              className="glass-panel"
              radius="lg"
              padding="lg"
              style={{ borderLeft: '4px solid #6366f1' }}
            >
              <Stack gap="md">
                <Grid align="flex-end" gap="md">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label={
                        <Text size="xs" fw={700} c="dimmed">
                          QUIZ POOL RANGE
                        </Text>
                      }
                      data={Object.entries(quizRanges).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      value={quizRange}
                      size="md"
                      radius="md"
                      onChange={(value) => setQuizRange((value as QuizRangeKey) ?? 'all')}
                      allowDeselect={false}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label={
                        <Text size="xs" fw={700} c="dimmed">
                          QUIZ SOURCE
                        </Text>
                      }
                      data={Object.entries(quizSources).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      value={quizSource}
                      size="md"
                      radius="md"
                      onChange={(value) => setQuizSource((value as QuizSourceKey) ?? 'words')}
                      allowDeselect={false}
                    />
                  </Grid.Col>

                  {quizRange !== 'custom' && (
                    <Grid.Col span={{ base: 12, sm: 12 }}>
                      <Group gap="lg" wrap="wrap" justify={'center'}>
                        <Button
                          variant="light"
                          color="indigo"
                          size="md"
                          radius="md"
                          onClick={resetQuiz}
                          disabled={quizQueue.length === 0}
                          leftSection={<IconRotateClockwise size={18} />}
                        >
                          Restart Quiz
                        </Button>
                        <Switch
                            onLabel={<Text size='md' style={{padding: '10px'}}>{quizDirections.meaningToWord}</Text>}
                            offLabel={<Text size='md' style={{padding: '10px'}}>{quizDirections.wordToMeaning}</Text>}
                          size="xl"
                          checked={quizDirection === 'meaningToWord'}
                          onChange={(event) =>
                            setQuizDirection(
                              event.currentTarget.checked ? 'meaningToWord' : 'wordToMeaning'
                            )
                          }
                        />
                      </Group>
                    </Grid.Col>
                  )}
                </Grid>

                {/* Custom Range date-time pickers */}
                {quizRange === 'custom' && (
                  <div
                    style={{
                      borderRadius: '12px',
                      border: '1px solid rgba(99,102,241,0.2)',
                      background: 'rgba(99,102,241,0.04)',
                      padding: '16px',
                    }}
                  >
                    <Stack gap="sm">
                      <Group gap="xs" align="center" mb={4}>
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                          }}
                        />
                        <Text size="xs" fw={700} c="indigo" style={{ letterSpacing: '0.05em' }}>
                          CUSTOM DATE RANGE
                        </Text>
                      </Group>
                      <Grid gap="md">
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                          <TextInput
                            label={
                              <Text size="xs" fw={600} c="dimmed">
                                From
                              </Text>
                            }
                            type="datetime-local"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.currentTarget.value)}
                            size="md"
                            radius="md"
                            max={customEnd}
                          />
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                          <TextInput
                            label={
                              <Text size="xs" fw={600} c="dimmed">
                                To
                              </Text>
                            }
                            type="datetime-local"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.currentTarget.value)}
                            size="md"
                            radius="md"
                            min={customStart}
                          />
                        </Grid.Col>
                      </Grid>
                      <Group justify="space-between" align="center" mt={4}>
                        <Text size="xs" c="dimmed">
                          {quizCandidates.length} word{quizCandidates.length !== 1 ? 's' : ''} in
                          this range
                        </Text>
                        <Group gap="md" align="center" wrap="wrap">
                          <Button
                            variant="light"
                            color="indigo"
                            size="sm"
                            radius="md"
                            onClick={resetQuiz}
                            disabled={quizQueue.length === 0}
                            leftSection={<IconRotateClockwise size={16} />}
                          >
                            Restart Quiz
                          </Button>
                          <Switch
                              onLabel={<Text size='md' style={{padding: '10px'}}>{quizDirections.meaningToWord}</Text>}
                              offLabel={<Text size='md' style={{padding: '10px'}}>{quizDirections.wordToMeaning}</Text>}
                              size="xl"
                              checked={quizDirection === 'meaningToWord'}
                              onChange={(event) =>
                                  setQuizDirection(
                                      event.currentTarget.checked ? 'meaningToWord' : 'wordToMeaning'
                                  )
                              }
                          />
                        </Group>
                      </Group>
                    </Stack>
                  </div>
                )}
              </Stack>
            </Card>

            <QuizPanel
              item={currentQuizItem}
              quizDirection={quizDirection as QuizDirection}
              revealed={revealed}
              onReveal={handleReveal}
              onMarkMissed={handleToggleMissed}
              isMarkedMissed={isCurrentMarkedMissed}
              onNext={handleNext}
              onPrevious={handlePrevious}
              completed={completed}
              hasPrevious={quizIndex > 0}
              currentIndex={quizIndex}
              totalCount={quizQueue.length}
              onRestart={resetQuiz}
              onRefreshExamples={handleRefreshExamples}
            />

            <Card
              className="glass-panel"
              radius="lg"
              padding="lg"
              style={{ borderLeft: '4px solid #ef4444', overflow: 'hidden' }}
            >
              {/* Header */}
              <Group justify="space-between" align="center" mb="md">
                <Group gap="sm">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(239,68,68,0.35)',
                    }}
                  >
                    <IconFlame size={18} color="white" />
                  </div>
                  <div>
                    <Title order={4} style={{ fontFamily: 'var(--font-title)', lineHeight: 1.2 }}>
                      Missed Words
                    </Title>
                    <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>
                      Words that need more practice
                    </Text>
                  </div>
                  {missedWords.length > 0 && (
                    <Badge
                      variant="gradient"
                      gradient={{ from: 'red', to: 'orange' }}
                      size="md"
                      radius="md"
                      style={{ fontWeight: 800 }}
                    >
                      {missedWords.length}
                    </Badge>
                  )}
                </Group>

                {missedWords.length > 0 && (
                  <Group gap="xs">
                    <Tooltip
                      label={hideMissedMeanings ? 'Show all meanings' : 'Hide all meanings'}
                      withArrow
                    >
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="md"
                        radius="md"
                        onClick={() => {
                          const nextVal = !hideMissedMeanings;
                          setHideMissedMeanings(nextVal);
                          if (nextVal) {
                            setRevealedMissedWordIds({});
                          }
                        }}
                      >
                        {hideMissedMeanings ? <IconEyeOff size={24} /> : <IconEye size={24} />}
                      </ActionIcon>
                    </Tooltip>
                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      radius="md"
                      leftSection={<IconBookmarkOff size={14} />}
                      onClick={handleUnmarkAllMissed}
                      style={{ opacity: 0.8 }}
                    >
                      Clear All
                    </Button>
                  </Group>
                )}
              </Group>

              <Divider
                style={{
                  borderColor: 'rgba(239,68,68,0.15)',
                  marginBottom: '16px',
                }}
              />

              {missedWords.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '36px 24px',
                    borderRadius: '12px',
                    border: '1.5px dashed rgba(239,68,68,0.2)',
                    background: 'rgba(239,68,68,0.03)',
                  }}
                >
                  <Stack gap="sm" align="center">
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'rgba(239,68,68,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconTarget size={24} style={{ color: '#ef4444', opacity: 0.5 }} />
                    </div>
                    <Text fw={600} size="sm" style={{ color: 'var(--text-secondary)' }}>
                      No missed words yet
                    </Text>
                    <Text
                      size="xs"
                      c="dimmed"
                      style={{ lineHeight: 1.5, maxWidth: 280, margin: '0 auto' }}
                    >
                      When you bookmark a word as missed during a quiz, it will appear here for
                      targeted practice.
                    </Text>
                  </Stack>
                </div>
              ) : (
                <Stack gap="sm">
                  {missedWords.map((word) => {
                    const count = word.missedCount;
                    const severity =
                      count >= 5
                        ? {
                            color: '#ef4444',
                            bg: 'rgba(239,68,68,0.08)',
                            border: 'rgba(239,68,68,0.25)',
                            label: 'Hot',
                            badgeColor: 'red' as const,
                          }
                        : count >= 3
                          ? {
                              color: '#f97316',
                              bg: 'rgba(249,115,22,0.07)',
                              border: 'rgba(249,115,22,0.2)',
                              label: 'Warm',
                              badgeColor: 'orange' as const,
                            }
                          : {
                              color: '#22c55e',
                              bg: 'rgba(34,197,94,0.06)',
                              border: 'rgba(34,197,94,0.18)',
                              label: 'New',
                              badgeColor: 'teal' as const,
                            };

                    const speakWord = (text: string) => {
                      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
                        return;
                      }
                      window.speechSynthesis.cancel();
                      const utterance = new SpeechSynthesisUtterance(text);
                      utterance.lang = 'en-US';
                      utterance.rate = 0.9;
                      window.speechSynthesis.speak(utterance);
                    };

                    const missedExamples = getExamplesForId(word.id);

                    return (
                      <div
                        key={word.id}
                        style={{
                          borderRadius: '12px',
                          border: `1px solid ${severity.border}`,
                          borderLeft: `4px solid ${severity.color}`,
                          background: severity.bg,
                          padding: '12px 16px',
                          transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                        }}
                        className="hover-lift"
                      >
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr auto',
                                alignItems: 'center',
                                gap: '12px',
                            }}>
                                <Group gap={8} align="center" wrap="wrap" mb={4}>
                                    <Text
                                        fw={700}
                                        size="md"
                                        style={{
                                            fontFamily: 'var(--font-title)',
                                            color: 'var(--text-primary)',
                                            letterSpacing: '-0.01em',
                                        }}
                                    >
                                        {word.word}
                                    </Text>
                                    <Badge
                                        color={severity.badgeColor}
                                        variant="light"
                                        size="xs"
                                        radius="sm"
                                        style={{ fontWeight: 700, fontSize: '10px' }}
                                    >
                                        ×{count} missed
                                    </Badge>
                                </Group>
                                <Group gap={4} style={{ flexShrink: 0 }}>
                                    <Tooltip label="Regenerate examples" withArrow>
                                        <ActionIcon
                                            variant="subtle"
                                            color="indigo"
                                            size="md"
                                            radius="md"
                                            onClick={() => handleRefreshExamples(word.id)}
                                            style={{ transition: 'all 0.2s ease' }}
                                        >
                                            <IconRotateClockwise size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Listen to pronunciation" withArrow>
                                        <ActionIcon
                                            variant="subtle"
                                            color="gray"
                                            size="md"
                                            radius="md"
                                            onClick={() => speakWord(word.word)}
                                            style={{ transition: 'all 0.2s ease' }}
                                        >
                                            <IconVolume size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Remove from missed list" withArrow>
                                        <ActionIcon
                                            variant="subtle"
                                            color="red"
                                            size="md"
                                            radius="md"
                                            onClick={() => handleUnmarkMissed(word.id)}
                                            style={{ transition: 'all 0.2s ease' }}
                                        >
                                            <IconBookmarkOff size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                            </div>
                          {!hideMissedMeanings || revealedMissedWordIds[word.id] ? (
                            <>
                              <Text
                                size="sm"
                                style={{
                                  color: 'var(--text-secondary)',
                                  lineHeight: 1.5,
                                  wordBreak: 'break-word',
                                }}
                              >
                                {word.meaning || (
                                  <span style={{ fontStyle: 'italic', opacity: 0.55 }}>
                                    No definition available
                                  </span>
                                )}
                              </Text>
                              {missedExamples.length > 0 && (
                                <Stack gap={2} mt={6}>
                                  <Text size="xs" fw={600} c="dimmed">
                                    Examples
                                  </Text>
                                  {missedExamples.map((example, index) => (
                                    <Text
                                      key={`${word.id}-missed-example-${index}`}
                                      size="sm"
                                      style={{
                                        color: 'var(--text-secondary)',
                                        lineHeight: 1.5,
                                        wordBreak: 'break-word',
                                      }}
                                    >
                                      {`• ${example}`}
                                    </Text>
                                  ))}
                                </Stack>
                              )}
                            </>
                          ) : (
                            <Button
                              variant="subtle"
                              color="indigo"
                              size="xs"
                              radius="sm"
                              onClick={() =>
                                setRevealedMissedWordIds((prev) => ({ ...prev, [word.id]: true }))
                              }
                              leftSection={<IconEye size={12} />}
                              style={{
                                fontSize: '11px',
                                height: '22px',
                                paddingLeft: '8px',
                                paddingRight: '8px',
                                display: 'inline-flex',
                                marginTop: '4px',
                              }}
                            >
                              Show Definition
                            </Button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </Stack>
              )}
            </Card>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
