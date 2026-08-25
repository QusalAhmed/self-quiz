'use client';

import { Container, Stack } from '@mantine/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  capitalizeWord,
  getMissingAiExampleDefinitionIndexes,
  mergeExamplesIntoDefinitions,
  requestExamples,
  requestExamplesForDefinitions,
  toMutableWordRecord,
} from '@/app/home/utils';
import { EditWordModal } from '@/components/EditWordModal/EditWordModal';
import { StudyModeSection } from '@/components/Home/StudyModeSection';
import { BatchWordFamilyModal } from '@/components/WordFamily/BatchWordFamilyModal';
import {
  type AppDatabase,
  type FsrsRecord,
  getDatabase,
  type GroupRecord,
  type WordDefinition,
  type WordFamilyMemberRecord,
  type WordRecord,
} from '@/lib/db';
import { definitionsToMeaning, getWordDefinitions, normalizeDefinitions } from '@/lib/definitions';
import { mergeAiExamples, normalizeAiExampleCount, normalizeAiExamples } from '@/lib/examples';
import { createInitialFsrsRecord, softDeleteFsrsRecord, updateFsrsRecordContent } from '@/lib/fsrs';
import {
  getActiveGroupNames,
  getWordGroups,
  removeGroupFromWordGroups,
  replaceGroupInWordGroups,
  wordHasAnyGroup,
  wordHasGroup,
} from '@/lib/groups';
import { useAppDispatch } from '@/lib/redux/hooks';
import { setMode } from '@/lib/redux/slices/quizSlice';
import { setupSupabaseReplication, type ReplicationsHolder } from '@/lib/replication';
import { notifyFsrsWordAdded, notifyWordSaved } from '@/lib/system-notifications';
import { buildWordFamilyId, type WordFamilyMember } from '@/lib/word-family';

export default function HomePage() {
  const dispatch = useAppDispatch();

  const [database, setDatabase] = useState<AppDatabase | null>(null);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [wordFamilies, setWordFamilies] = useState<Record<string, WordFamilyMemberRecord[]>>({});
  const [generatingWordFamilyWordIds, setGeneratingWordFamilyWordIds] = useState<
    Record<string, boolean>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'word' | 'wordAndDefinition'>('word');
  const [page, setPage] = useState(1);

  // Custom Groups states
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [batchWordFamilyModalOpen, setBatchWordFamilyModalOpen] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [exampleGenerationCounts, setExampleGenerationCounts] = useState<Record<string, number>>(
    {}
  );

  const customGroups = useMemo(() => getActiveGroupNames(groups), [groups]);

  // Set mode to 'study' in Redux
  useEffect(() => {
    dispatch(setMode('study'));
  }, [dispatch]);

  // Sync & Replication
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
      console.error(error);
    } finally {
      syncInProgressRef.current = false;
    }
  }, []);

  const pageSize = 15;

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

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / pageSize));

  const pagedWords = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredWords.slice(startIndex, startIndex + pageSize);
  }, [filteredWords, page]);

  const generatingExampleWordIds = useMemo(
    () => Object.fromEntries(Object.keys(exampleGenerationCounts).map((id) => [id, true])),
    [exampleGenerationCounts]
  );

  useEffect(() => {
    let isMounted = true;
    let wordSubscription: { unsubscribe: () => void } | null = null;
    let groupSubscription: { unsubscribe: () => void } | null = null;
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
      wordFamilySubscription?.unsubscribe();
      cleanupOnlineListener?.();
      unsubscribeSyncState?.();
    };
  }, [withSyncState]);

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

  const missingWordFamilyWords = useMemo(() => {
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

  const handleAdd = async (
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
      usageFrequency: usageFrequency || '',
      generatorAiDetails: generatorAiDetails || '',
    };

    await database.words.upsert(record);
    void notifyWordSaved({ word: capitalizeWord(word), action: 'created' });

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
    void notifyFsrsWordAdded({
      word: capitalizeWord(word),
      quizMode: 'wordToMeaning',
      meaning: normalizedMeaning,
    });

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
    void notifyWordSaved({ word: record.word, action: 'deleted' });
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

  return (
    <Container size="md" pt={0} pb={{ base: 'md', sm: 'xl' }} px={{ base: 'xs', sm: 'md' }}>
      <Stack gap="xl">
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
          missingWordFamilyCount={missingWordFamilyWords.length}
          onOpenBatchWordFamilyModal={() => setBatchWordFamilyModalOpen(true)}
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
      </Stack>

      <EditWordModal
        opened={editingWordId !== null}
        onClose={() => setEditingWordId(null)}
        wordRecord={editingWordId ? words.find((w) => w.id === editingWordId) || null : null}
        customGroups={customGroups}
        onSave={async (id, word, meaning, definitions, groups, aiExampleCount, notes) => {
          await handleEdit(id, word, meaning, definitions, groups, aiExampleCount, notes);
        }}
        onAddCustomGroup={handleAddCustomGroup}
      />

      <BatchWordFamilyModal
        opened={batchWordFamilyModalOpen}
        onClose={() => setBatchWordFamilyModalOpen(false)}
        allMissingWords={missingWordFamilyWords}
        filteredMissingWords={filteredMissingWordFamilyWords}
        onGenerateWordFamily={fetchAndStoreWordFamily}
      />
    </Container>
  );
}
