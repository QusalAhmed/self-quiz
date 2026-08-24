'use client';

import { Button, Container, Group, Modal, Stack, Text } from '@mantine/core';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  capitalizeWord,
  mergeExamplesIntoDefinitions,
  requestExamplesForDefinitions,
  toMutableWordRecord,
} from '@/app/home/utils';
import { EditWordModal } from '@/components/EditWordModal/EditWordModal';
import { GroupManager } from '@/components/GroupManager/GroupManager';
import {
  type SearchScope,
  type WordSortOption,
  type WordStatusFilter,
  WordExplorerHeader,
} from '@/components/WordExplorer/WordExplorerHeader';
import { WordExplorerVirtualList } from '@/components/WordExplorer/WordExplorerVirtualList';
import { BatchWordFamilyModal } from '@/components/WordFamily/BatchWordFamilyModal';
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
import { notifyFsrsWordAdded, notifyWordSaved } from '@/lib/system-notifications';
import { buildWordFamilyId, isWordFamilyId } from '@/lib/word-family';
import { filterAndSortWords } from '@/lib/word-search';

export default function WordsPage() {
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
  const [sortOption, setSortOption] = useState<WordSortOption>('newest');
  const [density, setDensity] = useState<'detailed' | 'compact' | 'card'>('detailed');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<WordRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; word: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [batchWordFamilyModalOpen, setBatchWordFamilyModalOpen] = useState(false);

  // Timer ticker (refreshes every 30s for FSRS due date calculation)
  const [nowTicker, setNowTicker] = useState(() => new Date().toISOString());
  useEffect(() => {
    const timer = setInterval(() => setNowTicker(new Date().toISOString()), 30000);
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
      if (!database) {
        return;
      }

      setGeneratingExampleWordIds((prev) => ({ ...prev, [wordId]: true }));
      try {
        const doc = await database.words.findOne(wordId).exec();
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
          body: JSON.stringify({ word: capitalizeWord(word), meaning }),
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
          usageFrequency?: string;
          generatorAiDetails?: string;
        }> = Array.isArray(data?.members) ? data.members : [];

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
          const memberId = buildWordFamilyId(wordId, member.word);
          const record: WordFamilyMemberRecord = {
            id: memberId,
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

  const handleAddWord = useCallback(
    async (
      word: string,
      meaning: string,
      definitions: WordDefinition[],
      selectedGroups: string[],
      aiExampleCount: number,
      notes?: string,
      usageFrequency?: string,
      generatorAiDetails?: string
    ) => {
      if (!database) {
        return;
      }
      const capitalizedWord = capitalizeWord(word);
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
        word: capitalizedWord,
        meaning: normalizedMeaning,
        definitions: normalizedDefinitions,
        aiExampleCount: normalizedAiExampleCount,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
        lastSyncedAt: '',
        customGroups: normalizedGroups,
        notes: notes || '',
        usageFrequency: usageFrequency || '',
        generatorAiDetails: generatorAiDetails || '',
      };

      await database.words.upsert(record);
      void notifyWordSaved({ word: record.word, action: 'created' });

      // Initial FSRS records
      const fsrsQuizModes: import('@/lib/db').QuizMode[] = [
        'wordToMeaning',
        'meaningToWord',
        'spelling',
      ];
      for (const qMode of fsrsQuizModes) {
        const fsrsRecord = createInitialFsrsRecord(
          record.id,
          qMode,
          record.word,
          normalizedMeaning
        );
        await database.fsrsRecords.upsert(fsrsRecord);
      }
      void notifyFsrsWordAdded({
        word: record.word,
        quizMode: 'wordToMeaning',
        meaning: normalizedMeaning,
      });

      // Generate word family members using AI in background
      void fetchAndStoreWordFamily(record.id, record.word, normalizedMeaning).catch((error) => {
        console.error('Error generating word family after add:', error);
      });

      if (normalizedDefinitions.length > 0) {
        void ensureMissingAiExamples(record.id).catch((error) => {
          console.error('Error generating AI examples after add:', error);
        });
      }

      // If definitions are empty, fetch definition & meaning from /api/meaning automatically!
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

            // Now generate AI examples for the freshly fetched definitions
            await ensureMissingAiExamples(record.id);
            console.log('Definition and examples updated for word:', record.word, '-', aiMeaning);
          } catch (error) {
            console.error('Error fetching definition:', error);
          }
        })();
      }
    },
    [database, ensureGroupExists, ensureMissingAiExamples, fetchAndStoreWordFamily]
  );

  const handleEditWord = useCallback(
    async (
      id: string,
      word: string,
      meaning: string,
      definitions: WordDefinition[],
      selectedGroups: string[],
      aiExampleCount: number,
      notes?: string,
      usageFrequency?: string,
      generatorAiDetails?: string
    ) => {
      if (!database) {
        return;
      }
      const doc = await database.words.findOne(id).exec();
      if (!doc) {
        return;
      }

      const capitalizedWord = capitalizeWord(word);
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

      const current = toMutableWordRecord(doc.toJSON());
      const updated: WordRecord = {
        ...current,
        word: capitalizedWord,
        meaning: normalizedMeaning,
        definitions: normalizedDefinitions,
        aiExampleCount: normalizedAiExampleCount,
        customGroups: normalizedGroups,
        notes: notes !== undefined ? notes : current.notes || '',
        usageFrequency:
          usageFrequency !== undefined ? usageFrequency : current.usageFrequency || '',
        generatorAiDetails:
          generatorAiDetails !== undefined ? generatorAiDetails : current.generatorAiDetails || '',
        updatedAt: timestamp,
      };

      await database.words.upsert(updated);
      void notifyWordSaved({ word: updated.word, action: 'updated' });

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

      if (normalizedDefinitions.length > 0) {
        void ensureMissingAiExamples(id);
      }
    },
    [database, ensureGroupExists, ensureMissingAiExamples]
  );

  const handleDeleteWord = useCallback(
    async (id: string) => {
      if (!database) {
        return;
      }
      const doc = await database.words.findOne(id).exec();
      if (!doc) {
        return;
      }

      const timestamp = new Date().toISOString();
      const wordText = (doc.toJSON() as WordRecord).word;
      await database.words.upsert({
        ...(doc.toJSON() as WordRecord),
        isDeleted: true,
        updatedAt: timestamp,
      });
      void notifyWordSaved({ word: wordText, action: 'deleted' });

      const fsrsDocs = await database.fsrsRecords.find({ selector: { wordId: id } }).exec();
      for (const fsrsDoc of fsrsDocs) {
        await database.fsrsRecords.upsert(
          softDeleteFsrsRecord(fsrsDoc.toJSON() as FsrsRecord, timestamp)
        );
      }
    },
    [database]
  );

  const handleDeleteWordFamilyMember = useCallback(
    async (memberId: string) => {
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
    },
    [database]
  );

  const handleToggleMissed = useCallback(
    async (wordId: string, word: string, meaning: string) => {
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
    },
    [database]
  );

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
          return fam && fam.filter((m) => !m.isDeleted).length > 0;
        });
      } else if (statusFilter === 'withoutWordFamily') {
        result = result.filter((w) => {
          const fam = wordFamilies[w.id];
          return !fam || fam.filter((m) => !m.isDeleted).length === 0;
        });
      }
    }

    // 5 & 6. Search Filtering and Sorting
    return filterAndSortWords({
      words: result,
      searchQuery,
      searchScope,
      sortOption,
      wordFamilies,
      primaryFsrsByWordId,
    });
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

  const allMissingWordFamilyWords = useMemo(() => {
    return words.filter((w) => {
      const fam = wordFamilies[w.id];
      return !fam || fam.filter((m) => !m.isDeleted).length === 0;
    });
  }, [words, wordFamilies]);

  const filteredMissingWordFamilyWords = useMemo(() => {
    return filteredWords.filter((w) => {
      const fam = wordFamilies[w.id];
      return !fam || fam.filter((m) => !m.isDeleted).length === 0;
    });
  }, [filteredWords, wordFamilies]);

  // Memoized stable event callbacks
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedLetter('ALL');
    setGroupFilter('all');
    setPosFilter('all');
    setStatusFilter('all');
    setSortOption('newest');
  }, []);

  const handleEdit = useCallback((w: WordRecord) => {
    setEditingWord(w);
  }, []);

  const handleDeletePrompt = useCallback((id: string, word: string) => {
    setDeleteConfirm({ id, word });
  }, []);

  const handleRefreshExamplesCallback = useCallback(
    (id: string) => {
      void ensureMissingAiExamples(id);
    },
    [ensureMissingAiExamples]
  );

  const handleRefreshWordFamilyCallback = useCallback(
    (id: string, w: string) => {
      void fetchAndStoreWordFamily(id, w);
    },
    [fetchAndStoreWordFamily]
  );

  const handleDeleteWordFamilyMemberCallback = useCallback(
    (mid: string) => {
      void handleDeleteWordFamilyMember(mid);
    },
    [handleDeleteWordFamilyMember]
  );

  const handleToggleMissedCallback = useCallback(
    (id: string, w: string, m: string) => {
      void handleToggleMissed(id, w, m);
    },
    [handleToggleMissed]
  );

  const handleGroupClick = useCallback((g: string) => {
    setGroupFilter(g);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenAddModal = useCallback(() => setAddModalOpen(true), []);
  const handleOpenGroupManager = useCallback(() => setGroupManagerOpen(true), []);
  const handleOpenBatchWordFamilyModal = useCallback(() => setBatchWordFamilyModalOpen(true), []);

  return (
    <Container size="md" pt={0} pb={{ base: 'md', sm: 'xl' }} px={{ base: 'xs', sm: 'md' }}>
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
          missingWordFamilyCount={allMissingWordFamilyWords.length}
          onOpenBatchWordFamilyModal={handleOpenBatchWordFamilyModal}
          onOpenAddModal={handleOpenAddModal}
          onOpenGroupManager={handleOpenGroupManager}
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
          onEdit={handleEdit}
          onDelete={handleDeletePrompt}
          onRefreshExamples={handleRefreshExamplesCallback}
          onRefreshWordFamily={handleRefreshWordFamilyCallback}
          onDeleteWordFamilyMember={handleDeleteWordFamilyMemberCallback}
          onToggleMissed={handleToggleMissedCallback}
          onGroupClick={handleGroupClick}
          onResetFilters={handleResetFilters}
          onOpenAddModal={handleOpenAddModal}
        />
      </Stack>

      {/* Add Word Modal */}
      <Modal
        opened={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={
          <Text fw={700} size="md" style={{ fontFamily: 'var(--font-title)' }}>
            Add New Word
          </Text>
        }
        centered
        radius="lg"
        size="auto"
        overlayProps={{ backgroundOpacity: 0.45, blur: 4 }}
      >
        <WordForm
          variant="plain"
          customGroups={customGroups}
          onAddCustomGroup={(g) => void ensureGroupExists(g)}
          existingWords={words}
          onEditExisting={async (id, w, m, d, g, c, n, freq, genDetails) => {
            await handleEditWord(id, w, m, d, g, c, n, freq, genDetails);
            setAddModalOpen(false);
          }}
          onSubmit={async (w, m, d, g, c, n, freq, genDetails) => {
            await handleAddWord(w, m, d, g, c, n, freq, genDetails);
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
        onSave={async (id, w, m, d, g, c, n, freq, genDetails) => {
          await handleEditWord(id, w, m, d, g, c, n, freq, genDetails);
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

      {/* Batch Word Family Modal */}
      <BatchWordFamilyModal
        opened={batchWordFamilyModalOpen}
        onClose={() => setBatchWordFamilyModalOpen(false)}
        allMissingWords={allMissingWordFamilyWords}
        filteredMissingWords={filteredMissingWordFamilyWords}
        onGenerateWordFamily={fetchAndStoreWordFamily}
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
            <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm?.word}</strong>? This
            will remove the word, its examples, and FSRS history.
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
  );
}
