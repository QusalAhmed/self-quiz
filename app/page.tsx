'use client';

import {
  Button,
  Container,
  Divider,
  Group,
  Pagination,
  Select,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
  ActionIcon,
  Tooltip,
  useMantineColorScheme,
  Grid,
  Card,
  Badge,
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
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppDatabase, WordRecord } from '@/lib/db';
import { getDatabase } from '@/lib/db';
import { fetchMissingMeanings, pullRemoteWords, pushAllLocalWords, pushWordToRemote, setupOnlineSyncListener } from '@/lib/sync';
import { PwaRegister } from '@/components/PwaRegister/PwaRegister';
import { QuizPanel, type QuizItem } from '@/components/QuizPanel/QuizPanel';
import { WordForm } from '@/components/WordForm/WordForm';
import { WordList } from '@/components/WordList/WordList';

const quizRanges = {
  all: 'All Words',
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Last 7 days',
  month: 'Last 30 days',
  year: 'This year',
} as const;

type QuizRangeKey = keyof typeof quizRanges;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRangeStart(range: QuizRangeKey): Date | null {
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

function getRangeEnd(range: QuizRangeKey): Date | null {
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

function capitalizeWord(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

export default function HomePage() {
  const [database, setDatabase] = useState<AppDatabase | null>(null);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'study' | 'quiz'>('study');
  const [quizRange, setQuizRange] = useState<QuizRangeKey>('all');
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
    const start = getRangeStart(quizRange);
    const end = getRangeEnd(quizRange);
    if (!start && quizRange !== 'all') {
      return [];
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
  }, [words, quizRange]);

  const resetQuiz = useCallback(() => {
    const queue = shuffle(
      quizCandidates.map((word) => ({
        id: word.id,
        word: word.word,
        meaning: word.meaning,
      }))
    );
    setQuizQueue(queue);
    setQuizIndex(0);
    setRevealed(false);
    setCompleted(queue.length === 0);
  }, [quizCandidates]);

  // Initialize quiz when candidates are available, only if quiz is empty
  useEffect(() => {
    if (quizQueue.length === 0 && quizCandidates.length > 0) {
      console.log('Initializing quiz with', quizCandidates.length, 'candidates');
      resetQuiz();
    }
  }, [quizCandidates.length, resetQuiz, quizQueue.length]);

  // Reset quiz ONLY when quiz range changes (not when words change)
  useEffect(() => {
    const rangeChanged = prevQuizRangeRef.current !== quizRange;
    prevQuizRangeRef.current = quizRange;

    if (!rangeChanged || quizQueue.length === 0) {
      return;
    }

    if (quizCandidates.length === 0) {
      console.log('No words in this range');
      setQuizQueue([]);
      setCompleted(true);
      return;
    }

    console.log('Quiz range changed, resetting quiz with', quizCandidates.length, 'filtered candidates');
    const queue = shuffle(
      quizCandidates.map((word) => ({
        id: word.id,
        word: word.word,
        meaning: word.meaning,
      }))
    );
    setQuizQueue(queue);
    setQuizIndex(0);
    setRevealed(false);
    setCompleted(queue.length === 0);
  }, [quizRange, quizCandidates]);

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    let cleanupOnlineListener: (() => void) | null = null;

    const load = async () => {
      const db = await getDatabase();
      if (!isMounted) {
        return;
      }

      setDatabase(db);

      const query = db.words.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ updatedAt: 'desc' }],
      });

      subscription = query.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setWords(docs.map((doc) => doc.toJSON()));
        setPage(1);
      });

      console.log('App started: Syncing with remote...');
      await pullRemoteWords(db.words);
      await pushAllLocalWords(db.words);
      
      if (navigator.onLine) {
        await fetchMissingMeanings(db.words);
      }

      cleanupOnlineListener = setupOnlineSyncListener(db.words);

      if (isMounted) {
        setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      cleanupOnlineListener?.();
    };
  }, []);

  // Sync when page comes into focus
  useEffect(() => {
    if (!database) {
      return;
    }

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        console.log('Page came into focus: Performing fresh sync...');
        try {
          await pullRemoteWords(database.words);
          await pushAllLocalWords(database.words);
          await fetchMissingMeanings(database.words);
          console.log('Sync completed successfully');
        } catch (error) {
          console.error('Error during visibility change sync:', error);
        }
      }
    };

    const handlePageShow = async () => {
      console.log('Page show event: Performing fresh sync...');
      try {
        await pullRemoteWords(database.words);
        await pushAllLocalWords(database.words);
        await fetchMissingMeanings(database.words);
        console.log('Sync completed after page show');
      } catch (error) {
        console.error('Error during page show sync:', error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [database]);

  const currentQuizItem = quizQueue[quizIndex] ?? null;

  const handleAdd = async (word: string, meaning: string) => {
    if (!database) {
      return;
    }

    const timestamp = new Date().toISOString();
    const record: WordRecord = {
      id: crypto.randomUUID(),
      word: capitalizeWord(word),
      meaning,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
      lastSyncedAt: '',
    };

    await database.words.upsert(record);
    await pushWordToRemote(database.words, record);

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
            console.warn('Definition API error for word:', record.word, 'Status:', response.status, errorText);
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

          const current = doc.toJSON();
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
      ...doc.toJSON(),
      isDeleted: true,
      updatedAt: timestamp,
    };

    await database.words.upsert(record);
    await pushWordToRemote(database.words, record);
  };

  const handleEdit = async (id: string, word: string, meaning: string) => {
    if (!database) {
      return;
    }

    const doc = await database.words.findOne(id).exec();
    if (!doc) {
      return;
    }

    const timestamp = new Date().toISOString();
    const record = {
      ...doc.toJSON(),
      word,
      meaning,
      updatedAt: timestamp,
    };

    await database.words.upsert(record);
    await pushWordToRemote(database.words, record);
  };

  const handleReveal = () => {
    setRevealed(true);
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
      await pullRemoteWords(database.words);
      await pushAllLocalWords(database.words);
      await fetchMissingMeanings(database.words);
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
        <Card className="glass-panel" padding="xl" radius="lg">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap="xs" style={{ flex: 1 }}>
              <Title order={1} style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-gradient">English Word Memorizer</span>
              </Title>
              <Text c="dimmed" size="sm" max-width="480px" style={{ lineHeight: 1.5 }}>
                A modern local-first vocabulary companion. Learn new definitions, sync with Supabase Cloud, and practice dynamically offline.
              </Text>
            </Stack>

            {/* Quick Status Pill Bar & Theme Toggler */}
            <Group gap="xs" style={{ flexShrink: 0 }}>
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
        <Grid gap="md">
          {/* Card 1: Total Words */}
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card className="glass-panel" radius="lg" padding="md" style={{ borderLeft: '4px solid #6366f1' }}>
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                    TOTAL WORDS
                  </Text>
                  <Text size="xl" fw={800} style={{ fontFamily: 'var(--font-title)', marginTop: '4px' }}>
                    {words.length}
                  </Text>
                </div>
                <IconBook size={28} style={{ opacity: 0.25, color: '#6366f1' }} />
              </Group>
            </Card>
          </Grid.Col>

          {/* Card 2: Today's Additions */}
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card className="glass-panel" radius="lg" padding="md" style={{ borderLeft: '4px solid #a855f7' }}>
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                    ADDED TODAY
                  </Text>
                  <Text size="xl" fw={800} style={{ fontFamily: 'var(--font-title)', marginTop: '4px' }}>
                    {todayCount}
                  </Text>
                </div>
                <IconHistory size={28} style={{ opacity: 0.25, color: '#a855f7' }} />
              </Group>
            </Card>
          </Grid.Col>

          {/* Card 3: Cloud Synchronization Status */}
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card className="glass-panel" radius="lg" padding="md" style={{ borderLeft: '4px solid #10b981' }}>
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                    CLOUD SYNC
                  </Text>
                  <Group gap={6} mt={4}>
                    <Text size="sm" fw={700} c={unsyncedCount === 0 ? 'teal' : 'orange'}>
                      {unsyncedCount === 0 ? 'Fully Synced' : `${unsyncedCount} Sync Pending`}
                    </Text>
                    {onlineStatus && (
                      <ActionIcon size="xs" variant="subtle" color="teal" onClick={handleManualSync}>
                        <IconRotateClockwise size={12} />
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
            
            <Divider my="sm" style={{ opacity: 0.5 }} />
            
            <Group justify="space-between" align="center">
              <Title order={3} style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem' }}>
                Your Workspace
              </Title>
              <Badge variant="light" color="indigo" size="lg" radius="sm">
                {filteredWords.length} Words Listed
              </Badge>
            </Group>

            <TextInput
              placeholder="Search through saved vocabulary..."
              leftSection={<IconSearch size={18} style={{ opacity: 0.5 }} />}
              value={searchQuery}
              size="md"
              radius="md"
              onChange={(event) => {
                setSearchQuery(event.currentTarget.value);
                setPage(1);
              }}
            />

            <WordList words={pagedWords} onDelete={handleDelete} onEdit={handleEdit} />

            {totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={totalPages}
                  radius="md"
                  color="indigo"
                />
              </Group>
            )}
          </Stack>
        )}

        {/* --- QUIZ MODE --- */}
        {mode === 'quiz' && (
          <Stack gap="lg">
            <Grid align="flex-end" gap="md">
              <Grid.Col span={{ base: 12, sm: 8 }}>
                <Select
                  label={<Text size="xs" fw={700} c="dimmed">QUIZ POOL RANGE</Text>}
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
              
              <Grid.Col span={{ base: 12, sm: 4 }}>
                <Button
                  variant="light"
                  color="indigo"
                  fullWidth
                  size="md"
                  radius="md"
                  onClick={resetQuiz}
                  disabled={quizQueue.length === 0}
                  leftSection={<IconRotateClockwise size={18} />}
                >
                  Restart Quiz
                </Button>
              </Grid.Col>
            </Grid>

            <QuizPanel
              item={currentQuizItem}
              revealed={revealed}
              onReveal={handleReveal}
              onNext={handleNext}
              onPrevious={handlePrevious}
              completed={completed}
              hasPrevious={quizIndex > 0}
              currentIndex={quizIndex}
              totalCount={quizQueue.length}
              onRestart={resetQuiz}
            />
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
