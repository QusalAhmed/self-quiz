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
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppDatabase, WordRecord } from '@/lib/db';
import { getDatabase } from '@/lib/db';
import { pullRemoteWords, pushAllLocalWords, pushWordToRemote } from '@/lib/sync';
import { PwaRegister } from '@/components/PwaRegister/PwaRegister';
import { QuizPanel, type QuizItem } from '@/components/QuizPanel/QuizPanel';
import { WordForm } from '@/components/WordForm/WordForm';
import { WordList } from '@/components/WordList/WordList';

const quizRanges = {
  all: 'All',
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

  const pageSize = 20;

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

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

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

      await pullRemoteWords(db.words);
      await pushAllLocalWords(db.words);
      if (isMounted) {
        setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    resetQuiz();
  }, [resetQuiz]);

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
          // Only fetch definition if device is online
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

  return (
    <Container size="md" py="xl">
      <PwaRegister />
      <Stack gap="xl">
        <Stack gap="xs">
          <Title order={2}>English Word Memorizer</Title>
          <Text c="dimmed">
            Save words locally and sync them to Supabase. Switch to quiz mode to practice.
          </Text>
        </Stack>

        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as 'study' | 'quiz')}
          data={[
            { label: 'Study', value: 'study' },
            { label: 'Quiz', value: 'quiz' },
          ]}
        />

        {mode === 'study' && (
          <Stack gap="lg">
            <WordForm onAdd={handleAdd} disabled={isLoading} />
            <Divider />
            <Group justify="space-between">
              <Title order={4}>Your words</Title>
              <Text c="dimmed">{filteredWords.length} saved</Text>
            </Group>
            <TextInput
              placeholder="Search words"
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.currentTarget.value);
                setPage(1);
              }}
            />
            <WordList words={pagedWords} onDelete={handleDelete} onEdit={handleEdit} />
            {totalPages > 1 && (
              <Group justify="center">
                <Pagination value={page} onChange={setPage} total={totalPages} />
              </Group>
            )}
          </Stack>
        )}

        {mode === 'quiz' && (
          <Stack gap="lg">
            <Select
              label="Date range"
              data={Object.entries(quizRanges).map(([value, label]) => ({
                value,
                label,
              }))}
              value={quizRange}
              onChange={(value) => setQuizRange((value as QuizRangeKey) ?? 'all')}
              allowDeselect={false}
            />
            <Group justify="space-between">
              <Text c="dimmed">
                {quizQueue.length === 0
                  ? 'No words in this range.'
                  : `Word ${Math.min(quizIndex + 1, quizQueue.length)} of ${quizQueue.length}`}
              </Text>
              <Button variant="light" onClick={resetQuiz} disabled={quizQueue.length === 0}>
                Restart quiz
              </Button>
            </Group>
            <QuizPanel
              item={currentQuizItem}
              revealed={revealed}
              onReveal={handleReveal}
              onNext={handleNext}
              onPrevious={handlePrevious}
              completed={completed}
              hasPrevious={quizIndex > 0}
            />
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
