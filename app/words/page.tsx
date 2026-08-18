'use client';

import {
  Box,
  Button,
  Container,
  Group,
  Modal,
  Stack,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EditWordModal } from '@/components/EditWordModal/EditWordModal';
import { GroupManager } from '@/components/GroupManager/GroupManager';
import { PwaRegister } from '@/components/PwaRegister/PwaRegister';
import { AppSidebar } from '@/components/Sidebar/AppSidebar';
import {
  type SearchScope,
  type WordSortOption,
  type WordStatusFilter,
  WordExplorerHeader,
} from '@/components/WordExplorer/WordExplorerHeader';
import { WordExplorerVirtualList } from '@/components/WordExplorer/WordExplorerVirtualList';
import { WordForm } from '@/components/WordForm/WordForm';
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
import { normalizeAiExampleCount } from '@/lib/examples';
import { createInitialFsrsRecord, softDeleteFsrsRecord, updateFsrsRecordContent } from '@/lib/fsrs';
import {
  getActiveGroupNames,
  getWordGroups,
  removeGroupFromWordGroups,
  replaceGroupInWordGroups,
  wordHasAnyGroup,
  wordHasGroup,
} from '@/lib/groups';
import { setupSupabaseReplication } from '@/lib/replication';
import { buildWordFamilyId, isWordFamilyId } from '@/lib/word-family';

export default function WordsPage() {
  const router = useRouter();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const [database, setDatabase] = useState<AppDatabase | null>(null);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [missedWords, setMissedWords] = useState<MissedWordRecord[]>([]);
  const [fsrsRecords, setFsrsRecords] = useState<FsrsRecord[]>([]);
  const [wordFamilies, setWordFamilies] = useState<Record<string, WordFamilyMemberRecord[]>>({});
  const [generatingExampleWordIds, setGeneratingExampleWordIds] = useState<Record<string, boolean>>(
    {}
  );
  const [generatingWordFamilyWordIds, setGeneratingWordFamilyWordIds] = useState<
    Record<string, boolean>
  >({});

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [selectedLetter, setSelectedLetter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('all');
  const [posFilter, setPosFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<WordStatusFilter>('all');
  const [sortOption, setSortOption] = useState<WordSortOption>('alphaAsc');
  const [density, setDensity] = useState<'detailed' | 'compact' | 'card'>('detailed');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<WordRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; word: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);

  // Timer ticker
  const [nowTicker, setNowTicker] = useState(() => new Date().toISOString());
  useEffect(() => {
    const timer = setInterval(() => setNowTicker(new Date().toISOString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const customGroups = useMemo(() => getActiveGroupNames(groups), [groups]);

  useEffect(() => {
    let isMounted = true;
    let wordSubscription: { unsubscribe: () => void } | null = null;
    let groupSubscription: { unsubscribe: () => void } | null = null;
    let missedSubscription: { unsubscribe: () => void } | null = null;
    let fsrsSubscription: { unsubscribe: () => void } | null = null;
    let wordFamilySubscription: { unsubscribe: () => void } | null = null;

    const load = async () => {
      const db = await getDatabase();
      if (!isMounted) {
        return;
      }
      setDatabase(db);

      wordSubscription = db.words
        .find({ selector: { isDeleted: { $ne: true } }, sort: [{ updatedAt: 'desc' }] })
        .$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setWords(docs.map((doc) => doc.toJSON() as WordRecord));
        });

      groupSubscription = db.groups
        .find({ selector: { isDeleted: { $ne: true } }, sort: [{ name: 'asc' }] })
        .$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setGroups(docs.map((doc) => doc.toJSON() as GroupRecord));
        });

      missedSubscription = db.missedWords
        .find({ selector: { isDeleted: { $ne: true } }, sort: [{ updatedAt: 'desc' }] })
        .$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setMissedWords(docs.map((doc) => doc.toJSON() as MissedWordRecord));
        });

      fsrsSubscription = db.fsrsRecords
        .find({ selector: { isDeleted: { $ne: true } }, sort: [{ dueAt: 'asc' }] })
        .$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setFsrsRecords(docs.map((doc) => doc.toJSON() as FsrsRecord));
        });

      wordFamilySubscription = db.wordFamilies
        .find({ selector: { isDeleted: { $ne: true } } })
        .$.subscribe((docs) => {
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

      setupSupabaseReplication(db);
    };

    void load();

    return () => {
      isMounted = false;
      wordSubscription?.unsubscribe();
      groupSubscription?.unsubscribe();
      missedSubscription?.unsubscribe();
      fsrsSubscription?.unsubscribe();
      wordFamilySubscription?.unsubscribe();
    };
  }, []);

  // Primary FSRS map by word ID
  const primaryFsrsByWordId = useMemo(() => {
    const map = new Map<string, FsrsRecord>();
    for (const r of fsrsRecords) {
      if (r.isDeleted) {
        continue;
      }
      if (r.quizMode === 'wordToMeaning' || !map.has(r.wordId)) {
        map.set(r.wordId, r);
      }
    }
    return map;
  }, [fsrsRecords]);

  // Available Alphabet First Letters for Scrubber
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    for (const w of words) {
      const first = w.word.trim().charAt(0).toUpperCase();
      if (first >= 'A' && first <= 'Z') {
        letters.add(first);
      } else if (first) {
        letters.add('#');
      }
    }
    return letters;
  }, [words]);

  // Counts for Stats Dashboard
  const todayCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return words.filter((w) => new Date(w.createdAt) >= todayStart).length;
  }, [words]);

  const fsrsDueTodayCount = useMemo(() => {
    return fsrsRecords.filter(
      (r) => !r.isDeleted && !isWordFamilyId(r.wordId) && r.dueAt <= nowTicker
    ).length;
  }, [fsrsRecords, nowTicker]);

  const masteredCount = useMemo(() => {
    let count = 0;
    for (const w of words) {
      const fsrs = primaryFsrsByWordId.get(w.id);
      if (fsrs && fsrs.state === 'Review') {
        count++;
      }
    }
    return count;
  }, [words, primaryFsrsByWordId]);

  const learningCount = useMemo(() => {
    let count = 0;
    for (const w of words) {
      const fsrs = primaryFsrsByWordId.get(w.id);
      if (
        !fsrs ||
        fsrs.state === 'Learning' ||
        fsrs.state === 'Relearning' ||
        fsrs.state === 'New'
      ) {
        count++;
      }
    }
    return count;
  }, [words, primaryFsrsByWordId]);

  const withNotesCount = useMemo(
    () => words.filter((w) => Boolean(w.notes && w.notes.trim())).length,
    [words]
  );

  // Group Management Helpers
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
        .findOne({ selector: { name: trimmed, isDeleted: { $ne: true } } })
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

  const handleCreateGroup = useCallback(
    async (name: string) => {
      await ensureGroupExists(name);
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

      const timestamp = new Date().toISOString();
      await database.groups.upsert({
        ...groupDoc.toJSON(),
        name: trimmed,
        updatedAt: timestamp,
      });

      const allWords = await database.words.find().exec();
      for (const wordDoc of allWords) {
        const record = wordDoc.toJSON() as WordRecord;
        if (!wordHasGroup(record, oldName)) {
          continue;
        }
        await database.words.upsert({
          ...record,
          customGroups: replaceGroupInWordGroups(getWordGroups(record), oldName, trimmed),
          updatedAt: timestamp,
        });
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
      const groupName = groupDoc.name;

      const timestamp = new Date().toISOString();
      await database.groups.upsert({
        ...groupDoc.toJSON(),
        isDeleted: true,
        updatedAt: timestamp,
      });

      const allWords = await database.words.find().exec();
      for (const wordDoc of allWords) {
        const record = wordDoc.toJSON() as WordRecord;
        if (!wordHasGroup(record, groupName)) {
          continue;
        }
        await database.words.upsert({
          ...record,
          customGroups: removeGroupFromWordGroups(getWordGroups(record), groupName),
          updatedAt: timestamp,
        });
      }
    },
    [database]
  );

  // Word Operations (Add, Edit, Delete, Refresh Examples, Refresh Word Family)
  const ensureMissingAiExamples = useCallback(
    async (wordId: string) => {
      if (!database || !navigator.onLine) {
        return;
      }
      const doc = await database.words.findOne(wordId).exec();
      if (!doc) {
        return;
      }
      const current = doc.toJSON() as WordRecord;
      const currentDefinitions = getWordDefinitions(current);
      const targetAiExampleCount = normalizeAiExampleCount(current.aiExampleCount);

      setGeneratingExampleWordIds((prev) => ({ ...prev, [wordId]: true }));
      try {
        const response = await fetch('/api/examples', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: current.word,
            meaning: current.meaning,
            definitions: currentDefinitions,
            count: targetAiExampleCount,
          }),
        });

        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (!Array.isArray(data?.definitions)) {
          return;
        }

        const updatedDefinitions = data.definitions;
        await database.words.upsert({
          ...current,
          definitions: updatedDefinitions,
          meaning: definitionsToMeaning(updatedDefinitions),
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error generating AI examples:', error);
      } finally {
        setGeneratingExampleWordIds((prev) => {
          const { [wordId]: _removed, ...rest } = prev;
          return rest;
        });
      }
    },
    [database]
  );

  const fetchAndStoreWordFamily = useCallback(
    async (wordId: string, word: string, meaning?: string) => {
      if (!database || !navigator.onLine) {
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
          return;
        }
        const data = await response.json();
        const members: Array<{
          word: string;
          partOfSpeech: string;
          banglaDefinition: string;
          englishDefinition: string;
          examples?: string[];
        }> = Array.isArray(data?.members) ? data.members : [];

        const timestamp = new Date().toISOString();
        for (const member of members) {
          const memberId = buildWordFamilyId(wordId, member.word);
          const record: WordFamilyMemberRecord = {
            id: memberId,
            wordId,
            word: member.word,
            partOfSpeech: member.partOfSpeech || '',
            banglaDefinition: member.banglaDefinition || '',
            englishDefinition: member.englishDefinition || '',
            examples: member.examples || [],
            createdAt: timestamp,
            updatedAt: timestamp,
            isDeleted: false,
            lastSyncedAt: '',
          };
          await database.wordFamilies.upsert(record);
        }
      } catch (error) {
        console.error('Error fetching word family:', error);
      } finally {
        setGeneratingWordFamilyWordIds((prev) => {
          const { [wordId]: _removed, ...rest } = prev;
          return rest;
        });
      }
    },
    [database]
  );

  const handleAddWord = async (
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
      word: word.trim(),
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

    // Initial FSRS records
    const fsrsQuizModes: import('@/lib/db').QuizMode[] = [
      'wordToMeaning',
      'meaningToWord',
      'spelling',
    ];
    for (const qMode of fsrsQuizModes) {
      const fsrsRecord = createInitialFsrsRecord(record.id, qMode, record.word, normalizedMeaning);
      await database.fsrsRecords.upsert(fsrsRecord);
    }

    void fetchAndStoreWordFamily(record.id, record.word, normalizedMeaning);
    if (normalizedDefinitions.length > 0) {
      void ensureMissingAiExamples(record.id);
    }
  };

  const handleEditWord = async (
    id: string,
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
    const doc = await database.words.findOne(id).exec();
    if (!doc) {
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

    const current = doc.toJSON() as WordRecord;
    const updated: WordRecord = {
      ...current,
      word: word.trim(),
      meaning: normalizedMeaning,
      definitions: normalizedDefinitions,
      aiExampleCount: normalizedAiExampleCount,
      customGroups: normalizedGroups,
      notes: notes || '',
      updatedAt: timestamp,
    };

    await database.words.upsert(updated);

    const fsrsDocs = await database.fsrsRecords.find({ selector: { wordId: id } }).exec();
    for (const fsrsDoc of fsrsDocs) {
      const updatedFsrs = updateFsrsRecordContent(
        fsrsDoc.toJSON() as FsrsRecord,
        updated.word,
        normalizedMeaning,
        timestamp
      );
      await database.fsrsRecords.upsert(updatedFsrs);
    }
  };

  const handleDeleteWord = async (id: string) => {
    if (!database) {
      return;
    }
    const doc = await database.words.findOne(id).exec();
    if (!doc) {
      return;
    }

    const timestamp = new Date().toISOString();
    await database.words.upsert({
      ...(doc.toJSON() as WordRecord),
      isDeleted: true,
      updatedAt: timestamp,
    });

    const fsrsDocs = await database.fsrsRecords.find({ selector: { wordId: id } }).exec();
    for (const fsrsDoc of fsrsDocs) {
      await database.fsrsRecords.upsert(
        softDeleteFsrsRecord(fsrsDoc.toJSON() as FsrsRecord, timestamp)
      );
    }
  };

  const handleDeleteWordFamilyMember = async (memberId: string) => {
    if (!database) {
      return;
    }
    const doc = await database.wordFamilies.findOne(memberId).exec();
    if (!doc) {
      return;
    }
    await database.wordFamilies.upsert({
      ...(doc.toJSON() as WordFamilyMemberRecord),
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleToggleMissed = async (wordId: string, word: string, meaning: string) => {
    if (!database) {
      return;
    }
    const missedId = buildMissedWordId(wordId, 'wordToMeaning');
    const existing = await database.missedWords.findOne(missedId).exec();
    const timestamp = new Date().toISOString();

    if (existing && !existing.isDeleted) {
      await database.missedWords.upsert({
        ...existing.toJSON(),
        isDeleted: true,
        updatedAt: timestamp,
      });
    } else {
      await database.missedWords.upsert({
        id: missedId,
        wordId,
        quizMode: 'wordToMeaning',
        word,
        meaning,
        missedAt: timestamp,
        missedCount: (existing?.missedCount || 0) + 1,
        updatedAt: timestamp,
        lastSyncedAt: '',
        isDeleted: false,
      });
    }
  };

  // Filter and Sort Engine
  const filteredWords = useMemo(() => {
    let result = words;

    // 1. Group filter
    if (groupFilter !== 'all') {
      if (groupFilter === 'none') {
        result = result.filter((w) => !wordHasAnyGroup(w));
      } else {
        result = result.filter((w) => wordHasGroup(w, groupFilter));
      }
    }

    // 2. Alphabet filter
    if (selectedLetter !== 'ALL') {
      if (selectedLetter === '#') {
        result = result.filter((w) => {
          const first = w.word.trim().charAt(0).toUpperCase();
          return first < 'A' || first > 'Z';
        });
      } else {
        result = result.filter((w) => w.word.trim().charAt(0).toUpperCase() === selectedLetter);
      }
    }

    // 3. Part of Speech filter
    if (posFilter !== 'all') {
      result = result.filter((w) => {
        const defs = getWordDefinitions(w);
        return defs.some((d) => d.partOfSpeech.toLowerCase().includes(posFilter.toLowerCase()));
      });
    }

    // 4. Learning & Memory Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'dueToday') {
        result = result.filter((w) => {
          const fsrs = primaryFsrsByWordId.get(w.id);
          return fsrs && !fsrs.isDeleted && fsrs.dueAt <= nowTicker;
        });
      } else if (statusFilter === 'learning') {
        result = result.filter((w) => {
          const fsrs = primaryFsrsByWordId.get(w.id);
          return (
            !fsrs ||
            fsrs.state === 'Learning' ||
            fsrs.state === 'Relearning' ||
            fsrs.state === 'New'
          );
        });
      } else if (statusFilter === 'review') {
        result = result.filter((w) => {
          const fsrs = primaryFsrsByWordId.get(w.id);
          return fsrs && fsrs.state === 'Review';
        });
      } else if (statusFilter === 'missed') {
        result = result.filter((w) => {
          return missedWords.some((m) => !m.isDeleted && m.wordId === w.id);
        });
      } else if (statusFilter === 'withNotes') {
        result = result.filter((w) => Boolean(w.notes && w.notes.trim()));
      } else if (statusFilter === 'withWordFamily') {
        result = result.filter((w) => {
          const fam = wordFamilies[w.id];
          return fam && fam.length > 0;
        });
      }
    }

    // 5. Search Query filter
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((w) => {
        if (w.word.toLowerCase().includes(query)) {
          return true;
        }

        if (searchScope === 'word') {
          return false;
        }

        const defs = getWordDefinitions(w);
        if (defs.some((d) => d.meaning.toLowerCase().includes(query))) {
          return true;
        }

        if (searchScope === 'all') {
          if (w.notes && w.notes.toLowerCase().includes(query)) {
            return true;
          }
          if (
            defs.some(
              (d) =>
                (d.examples && d.examples.some((e) => e.toLowerCase().includes(query))) ||
                (d.userExamples && d.userExamples.some((e) => e.toLowerCase().includes(query)))
            )
          ) {
            return true;
          }
          const family = wordFamilies[w.id];
          if (family && family.some((m) => m.word.toLowerCase().includes(query))) {
            return true;
          }
        }

        return false;
      });
    }

    // 6. Sorting
    const sorted = [...result];
    if (sortOption === 'alphaAsc') {
      sorted.sort((a, b) => a.word.localeCompare(b.word));
    } else if (sortOption === 'alphaDesc') {
      sorted.sort((a, b) => b.word.localeCompare(a.word));
    } else if (sortOption === 'newest') {
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sortOption === 'oldest') {
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else if (sortOption === 'updated') {
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } else if (sortOption === 'dueSoonest') {
      sorted.sort((a, b) => {
        const fsrsA = primaryFsrsByWordId.get(a.id);
        const fsrsB = primaryFsrsByWordId.get(b.id);
        if (!fsrsA) {
          return 1;
        }
        if (!fsrsB) {
          return -1;
        }
        return fsrsA.dueAt.localeCompare(fsrsB.dueAt);
      });
    } else if (sortOption === 'mostLapses') {
      sorted.sort((a, b) => {
        const lapsesA = primaryFsrsByWordId.get(a.id)?.lapses || 0;
        const lapsesB = primaryFsrsByWordId.get(b.id)?.lapses || 0;
        return lapsesB - lapsesA;
      });
    }

    return sorted;
  }, [
    words,
    groupFilter,
    selectedLetter,
    posFilter,
    statusFilter,
    searchQuery,
    searchScope,
    sortOption,
    primaryFsrsByWordId,
    missedWords,
    wordFamilies,
    nowTicker,
  ]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLetter('ALL');
    setGroupFilter('all');
    setPosFilter('all');
    setStatusFilter('all');
    setSortOption('alphaAsc');
  };

  const toggleTheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Box style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <AppSidebar
        mode="study"
        onSetMode={(m) => {
          if (m === 'quiz') {
            router.push('/');
          }
        }}
        onOpenAllWordsQuiz={() => router.push('/')}
        onOpenTodayQuiz={() => router.push('/')}
        onOpenFsrsQuiz={() => router.push('/')}
        onOpenGroupManager={() => setGroupManagerOpen(true)}
        totalWords={words.length}
        todayCount={todayCount}
        fsrsDueTodayCount={fsrsDueTodayCount}
        colorScheme={colorScheme}
        onToggleTheme={toggleTheme}
      />

      <Box style={{ flex: 1, minWidth: 0 }}>
        <Container size="md" py="xl">
          <PwaRegister />

          <Stack gap="xl">
            <WordExplorerHeader
              totalCount={words.length}
              filteredCount={filteredWords.length}
              masteredCount={masteredCount}
              learningCount={learningCount}
              dueTodayCount={fsrsDueTodayCount}
              withNotesCount={withNotesCount}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchScope={searchScope}
              onSearchScopeChange={setSearchScope}
              selectedLetter={selectedLetter}
              onSelectLetter={setSelectedLetter}
              availableLetters={availableLetters}
              groupFilter={groupFilter}
              onGroupFilterChange={setGroupFilter}
              customGroups={customGroups}
              posFilter={posFilter}
              onPosFilterChange={setPosFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortOption={sortOption}
              onSortOptionChange={setSortOption}
              density={density}
              onDensityChange={setDensity}
              onOpenAddModal={() => setAddModalOpen(true)}
              onOpenGroupManager={() => setGroupManagerOpen(true)}
            />

            <WordExplorerVirtualList
              words={filteredWords}
              fsrsRecords={fsrsRecords}
              missedRecords={missedWords}
              wordFamilies={wordFamilies}
              density={density}
              searchQuery={searchQuery}
              generatingExampleWordIds={generatingExampleWordIds}
              generatingWordFamilyWordIds={generatingWordFamilyWordIds}
              onEdit={(w) => setEditingWord(w)}
              onDelete={(id, word) => setDeleteConfirm({ id, word })}
              onRefreshExamples={ensureMissingAiExamples}
              onRefreshWordFamily={fetchAndStoreWordFamily}
              onDeleteWordFamilyMember={handleDeleteWordFamilyMember}
              onToggleMissed={handleToggleMissed}
              onGroupClick={(g) => setGroupFilter(g)}
              onResetFilters={handleResetFilters}
              onOpenAddModal={() => setAddModalOpen(true)}
            />
          </Stack>

          {/* Add Word Modal */}
          <Modal
            opened={addModalOpen}
            onClose={() => setAddModalOpen(false)}
            title={
              <Text fw={700} size="md" style={{ fontFamily: 'var(--font-title)' }}>
                Add New Vocabulary Word
              </Text>
            }
            centered
            radius="lg"
            size="md"
            overlayProps={{ backgroundOpacity: 0.45, blur: 4 }}
          >
            <WordForm
              variant="plain"
              customGroups={customGroups}
              onAddCustomGroup={(g) => void ensureGroupExists(g)}
              existingWords={words}
              onEditExisting={async (id, w, m, d, g, c, n) => {
                await handleEditWord(id, w, m, d, g, c, n);
                setAddModalOpen(false);
              }}
              onSubmit={async (w, m, d, g, c, n) => {
                await handleAddWord(w, m, d, g, c, n);
                setAddModalOpen(false);
              }}
              onCancel={() => setAddModalOpen(false)}
            />
          </Modal>

          {/* Edit Word Modal */}
          <EditWordModal
            opened={editingWord !== null}
            onClose={() => setEditingWord(null)}
            wordRecord={editingWord}
            customGroups={customGroups}
            onSave={async (id, w, m, d, g, c, n) => {
              await handleEditWord(id, w, m, d, g, c, n);
              setEditingWord(null);
            }}
            onAddCustomGroup={(g) => void ensureGroupExists(g)}
          />

          {/* Group Manager Modal */}
          <GroupManager
            opened={groupManagerOpen}
            onClose={() => setGroupManagerOpen(false)}
            groups={groups}
            onRename={handleRenameGroup}
            onDelete={handleDeleteGroup}
            onAdd={handleCreateGroup}
          />

          {/* Delete Confirmation Modal */}
          <Modal
            opened={deleteConfirm !== null}
            onClose={() => !isDeleting && setDeleteConfirm(null)}
            title={
              <Text fw={700} size="md" style={{ fontFamily: 'var(--font-title)' }}>
                Delete Word
              </Text>
            }
            centered
            radius="lg"
            size="sm"
            overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
          >
            <Stack gap="lg">
              <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                Are you sure you want to delete{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm?.word}</strong>?
                This will remove the word, its examples, and FSRS history.
              </Text>
              <Group justify="flex-end" gap="sm">
                <Button
                  variant="default"
                  size="sm"
                  radius="md"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  color="red"
                  size="sm"
                  radius="md"
                  loading={isDeleting}
                  onClick={async () => {
                    if (!deleteConfirm) {
                      return;
                    }
                    setIsDeleting(true);
                    try {
                      await handleDeleteWord(deleteConfirm.id);
                      setDeleteConfirm(null);
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                >
                  Delete
                </Button>
              </Group>
            </Stack>
          </Modal>
        </Container>
      </Box>
    </Box>
  );
}
