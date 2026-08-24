'use client';

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Combobox,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  Pill,
  PillsInput,
  Select,
  Stack,
  Switch,
  Tabs,
  Text,
  Title,
  Tooltip,
  useCombobox,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconBookmarkOff,
  IconBrain,
  IconClipboard,
  IconClock,
  IconDice,
  IconFlame,
  IconListCheck,
  IconSparkles,
  IconTags,
  IconX,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type FsrsRecord,
  getDatabase,
  type GroupRecord,
  type MissedWordRecord,
  type StoryRecord,
  type StoryWordReference,
  type WordRecord,
} from '@/lib/db';
import { normalizeDefinitions } from '@/lib/definitions';
import { getActiveGroupNames } from '@/lib/groups';
import {
  getDifficultWordsForStory,
  getDueWordsForStory,
  getMissedWordsForStory,
  getRandomWordsForStory,
  getRecentWordsForStory,
  getWordsByGroupForStory,
  STORY_DIFFICULTY_OPTIONS,
  STORY_GENRES,
  STORY_LENGTH_OPTIONS,
  type StoryDifficultyLevel,
  type StoryGenre,
  type StoryLengthKey,
} from '@/lib/story';
import { BatchPasteWordInput } from './BatchPasteWordInput';
import { WordLibraryBrowser } from './WordLibraryBrowser';

export type StoryCreatorProps = {
  words: WordRecord[];
  groups: GroupRecord[];
  fsrsRecords: FsrsRecord[];
  missedWords: MissedWordRecord[];
  initialSelectedWordIds?: string[];
  initialPreset?: 'due' | 'missed' | 'difficult' | 'recent' | 'random';
  initialGroup?: string;
  onStoryGenerated?: (story: StoryRecord) => void;
};

export function StoryCreator({
  words,
  groups,
  fsrsRecords,
  missedWords,
  initialSelectedWordIds,
  initialPreset,
  initialGroup,
  onStoryGenerated,
}: StoryCreatorProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<string | null>('presets');
  const [selectedWords, setSelectedWords] = useState<StoryWordReference[]>([]);
  const [genre, setGenre] = useState<StoryGenre>('Daily Life & Slice of Life');
  const [length, setLength] = useState<StoryLengthKey>('medium');
  const [difficulty, setDifficulty] = useState<StoryDifficultyLevel>('intermediate');
  const [includeBangla, setIncludeBangla] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Search combobox for manual word search
  const [search, setSearch] = useState('');
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch('');
    },
  });

  const customGroups = useMemo(() => getActiveGroupNames(groups), [groups]);
  const wordsById = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  // Load initial preset or words
  useEffect(() => {
    setGenerationError(null);

    if (initialSelectedWordIds && initialSelectedWordIds.length > 0) {
      const initial: StoryWordReference[] = [];
      for (const id of initialSelectedWordIds) {
        const w = wordsById.get(id);
        if (w && !w.isDeleted) {
          const defs = normalizeDefinitions(w.definitions);
          const firstDef = defs[0];
          initial.push({
            wordId: w.id,
            word: w.word,
            meaning: firstDef?.meaning || w.meaning || '',
            partOfSpeech: firstDef?.partOfSpeech || '',
          });
        }
      }
      if (initial.length > 0) {
        setSelectedWords(initial);
        return;
      }
    }

    if (initialGroup) {
      const groupWords = getWordsByGroupForStory(words, initialGroup, 6);
      if (groupWords.length > 0) {
        setSelectedWords(groupWords);
        return;
      }
    }

    if (initialPreset === 'missed') {
      setSelectedWords(getMissedWordsForStory(missedWords, words, 6));
      return;
    }
    if (initialPreset === 'difficult') {
      setSelectedWords(getDifficultWordsForStory(fsrsRecords, missedWords, words, 6));
      return;
    }
    if (initialPreset === 'recent') {
      setSelectedWords(getRecentWordsForStory(words, 6));
      return;
    }
    if (initialPreset === 'random') {
      setSelectedWords(getRandomWordsForStory(words, 6));
      return;
    }

    // Default to Due words if available, else missed, else recent
    const due = getDueWordsForStory(fsrsRecords, words, 6);
    if (due.length > 0) {
      setSelectedWords(due);
    } else {
      const missed = getMissedWordsForStory(missedWords, words, 6);
      if (missed.length > 0) {
        setSelectedWords(missed);
      } else {
        setSelectedWords(getRecentWordsForStory(words, 6));
      }
    }
  }, [
    initialSelectedWordIds,
    initialPreset,
    initialGroup,
    wordsById,
    fsrsRecords,
    missedWords,
    words,
  ]);

  const handleApplyPreset = useCallback(
    (presetType: 'due' | 'missed' | 'difficult' | 'recent' | 'random') => {
      if (presetType === 'due') {
        setSelectedWords(getDueWordsForStory(fsrsRecords, words, 6));
      } else if (presetType === 'missed') {
        setSelectedWords(getMissedWordsForStory(missedWords, words, 6));
      } else if (presetType === 'difficult') {
        setSelectedWords(getDifficultWordsForStory(fsrsRecords, missedWords, words, 6));
      } else if (presetType === 'random') {
        setSelectedWords(getRandomWordsForStory(words, 6));
      } else {
        setSelectedWords(getRecentWordsForStory(words, 6));
      }
    },
    [fsrsRecords, missedWords, words]
  );

  const handleApplyGroup = useCallback(
    (groupName: string) => {
      const groupWords = getWordsByGroupForStory(words, groupName, 6);
      if (groupWords.length > 0) {
        setSelectedWords(groupWords);
      }
    },
    [words]
  );

  const handleRemoveWord = useCallback((wordIdOrWord: string) => {
    setSelectedWords((prev) =>
      prev.filter((w) => (w.wordId || w.word).toLowerCase() !== wordIdOrWord.toLowerCase())
    );
  }, []);

  const handleToggleWord = useCallback((wordRef: StoryWordReference) => {
    setSelectedWords((prev) => {
      const key = (wordRef.wordId || wordRef.word).toLowerCase();
      const exists = prev.some((w) => (w.wordId || w.word).toLowerCase() === key);
      if (exists) {
        return prev.filter((w) => (w.wordId || w.word).toLowerCase() !== key);
      }
      if (prev.length >= 15) {
        return prev;
      }
      return [...prev, wordRef];
    });
  }, []);

  const handleSelectMultiple = useCallback((wordsToAdd: StoryWordReference[]) => {
    setSelectedWords((prev) => {
      const existingKeys = new Set(prev.map((w) => (w.wordId || w.word).toLowerCase()));
      const filtered = wordsToAdd.filter(
        (w) => !existingKeys.has((w.wordId || w.word).toLowerCase())
      );
      return [...prev, ...filtered].slice(0, 15);
    });
  }, []);

  const handleDeselectMultiple = useCallback((wordIdsToRemove: string[]) => {
    const removeSet = new Set(wordIdsToRemove.map((id) => id.toLowerCase()));
    setSelectedWords((prev) =>
      prev.filter((w) => !removeSet.has((w.wordId || w.word).toLowerCase()))
    );
  }, []);

  const handleAddSearchWord = useCallback(
    (wordRecord: WordRecord) => {
      if (
        selectedWords.some(
          (w) => (w.wordId || w.word).toLowerCase() === wordRecord.id.toLowerCase()
        )
      ) {
        return;
      }
      const defs = normalizeDefinitions(wordRecord.definitions);
      const firstDef = defs[0];
      setSelectedWords((prev) => [
        ...prev,
        {
          wordId: wordRecord.id,
          word: wordRecord.word,
          meaning: firstDef?.meaning || wordRecord.meaning || '',
          partOfSpeech: firstDef?.partOfSpeech || '',
        },
      ]);
      setSearch('');
      combobox.closeDropdown();
    },
    [selectedWords, combobox]
  );

  const filteredWordsForSearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return [];
    }
    const selectedIds = new Set(selectedWords.map((w) => (w.wordId || w.word).toLowerCase()));
    return words
      .filter(
        (w) =>
          !w.isDeleted &&
          !selectedIds.has(w.id.toLowerCase()) &&
          (w.word.toLowerCase().includes(q) || (w.meaning || '').toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [words, search, selectedWords]);

  const handleGenerateStory = async () => {
    if (selectedWords.length === 0) {
      setGenerationError('Please select at least 1 vocabulary word.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const payload = {
        targetWords: selectedWords,
        genre,
        length,
        difficulty,
        includeBangla,
      };

      const response = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const now = new Date().toISOString();

      const newStoryRecord: StoryRecord = {
        id: crypto.randomUUID ? crypto.randomUUID() : `story_${Date.now()}`,
        title: data.title || 'Vocabulary Story',
        content: data.content,
        banglaTranslation: data.banglaTranslation || '',
        genre,
        difficulty,
        targetWords: selectedWords,
        isFavorite: false,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
        lastSyncedAt: '',
      };

      // Persist to RxDB
      const db = await getDatabase();
      await db.stories.insert(newStoryRecord);

      if (onStoryGenerated) {
        onStoryGenerated(newStoryRecord);
      } else {
        // Navigate to stories reader with new story ID
        router.push(`/stories?id=${newStoryRecord.id}`);
      }
    } catch (err: any) {
      console.error('Failed to generate story:', err);
      setGenerationError(err?.message || 'Failed to generate story. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Grid gap="xl">
      {/* Left Column: Word Selection Suite */}
      <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
        <Paper p="md" radius="md" withBorder>
          <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
            <Tabs.List mb="md">
              <Tabs.Tab value="presets" leftSection={<IconBrain size={16} />}>
                Quick Presets & Search
              </Tabs.Tab>
              <Tabs.Tab value="browser" leftSection={<IconListCheck size={16} />}>
                Browse Library
              </Tabs.Tab>
              <Tabs.Tab value="paste" leftSection={<IconClipboard size={16} />}>
                Paste & Custom Words
              </Tabs.Tab>
            </Tabs.List>

            {/* TAB 1: Quick Presets & Search */}
            <Tabs.Panel value="presets">
              <Stack gap="md">
                <Stack gap="xs">
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={0.5}>
                    Smart Learning Presets
                  </Text>
                  <Group gap="xs" wrap="wrap">
                    <Button
                      size="xs"
                      variant="light"
                      color="indigo"
                      leftSection={<IconBrain size={14} />}
                      onClick={() => handleApplyPreset('due')}
                      disabled={isGenerating}
                    >
                      Due Today
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="orange"
                      leftSection={<IconBookmarkOff size={14} />}
                      onClick={() => handleApplyPreset('missed')}
                      disabled={isGenerating}
                    >
                      Missed Words
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      leftSection={<IconFlame size={14} />}
                      onClick={() => handleApplyPreset('difficult')}
                      disabled={isGenerating}
                    >
                      Difficult Words
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="teal"
                      leftSection={<IconClock size={14} />}
                      onClick={() => handleApplyPreset('recent')}
                      disabled={isGenerating}
                    >
                      Recent Words
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="cyan"
                      leftSection={<IconDice size={14} />}
                      onClick={() => handleApplyPreset('random')}
                      disabled={isGenerating}
                    >
                      Random Shuffle
                    </Button>
                    {customGroups.length > 0 && (
                      <Select
                        size="xs"
                        placeholder="By Group/Tag..."
                        data={customGroups.map((g) => ({ value: g, label: g }))}
                        onChange={(val) => {
                          if (val) {
                            handleApplyGroup(val);
                          }
                        }}
                        leftSection={<IconTags size={14} />}
                        style={{ width: 140 }}
                        disabled={isGenerating}
                        clearable
                      />
                    )}
                  </Group>
                </Stack>

                <Divider />

                {/* Combobox Search */}
                <Stack gap="xs">
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={0.5}>
                    Search & Add Individual Words
                  </Text>
                  <Combobox
                    store={combobox}
                    onOptionSubmit={(val) => {
                      const w = wordsById.get(val);
                      if (w) {
                        handleAddSearchWord(w);
                      }
                    }}
                  >
                    <Combobox.Target>
                      <PillsInput
                        size="sm"
                        onClick={() => combobox.openDropdown()}
                        disabled={isGenerating || selectedWords.length >= 15}
                      >
                        <Pill.Group>
                          <Combobox.EventsTarget>
                            <PillsInput.Field
                              value={search}
                              placeholder={
                                selectedWords.length >= 15
                                  ? 'Maximum 15 words reached'
                                  : 'Search by word or definition...'
                              }
                              onChange={(event) => {
                                combobox.updateSelectedOptionIndex();
                                setSearch(event.currentTarget.value);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Backspace' && search.length === 0) {
                                  event.preventDefault();
                                }
                              }}
                              onFocus={() => combobox.openDropdown()}
                            />
                          </Combobox.EventsTarget>
                        </Pill.Group>
                      </PillsInput>
                    </Combobox.Target>

                    <Combobox.Dropdown>
                      <Combobox.Options>
                        {filteredWordsForSearch.length > 0 ? (
                          filteredWordsForSearch.map((item) => (
                            <Combobox.Option value={item.id} key={item.id}>
                              <Group justify="space-between" wrap="nowrap">
                                <Text size="sm" fw={600}>
                                  {item.word}
                                </Text>
                                <Text size="xs" c="dimmed" lineClamp={1} style={{ maxWidth: 260 }}>
                                  {item.meaning}
                                </Text>
                              </Group>
                            </Combobox.Option>
                          ))
                        ) : search.trim().length > 0 ? (
                          <Combobox.Empty>No matching words found</Combobox.Empty>
                        ) : (
                          <Combobox.Empty>Type to search vocabulary library</Combobox.Empty>
                        )}
                      </Combobox.Options>
                    </Combobox.Dropdown>
                  </Combobox>
                </Stack>
              </Stack>
            </Tabs.Panel>

            {/* TAB 2: Browse Library & Multi-Select */}
            <Tabs.Panel value="browser">
              <WordLibraryBrowser
                words={words}
                groups={groups}
                selectedWords={selectedWords}
                onToggleWord={handleToggleWord}
                onSelectMultiple={handleSelectMultiple}
                onDeselectMultiple={handleDeselectMultiple}
                maxWords={15}
                disabled={isGenerating}
              />
            </Tabs.Panel>

            {/* TAB 3: Paste & Custom Words */}
            <Tabs.Panel value="paste">
              <BatchPasteWordInput
                words={words}
                selectedWords={selectedWords}
                onAddWords={handleSelectMultiple}
                maxWords={15}
                disabled={isGenerating}
              />
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Grid.Col>

      {/* Right Column: Target Words Tray & Story Configuration */}
      <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
        <Stack gap="md" style={{ position: 'sticky', top: 20 }}>
          {/* Target Words Tray */}
          <Paper p="md" radius="md" withBorder>
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <Text size="sm" fw={700}>
                    Target Words
                  </Text>
                  <Badge
                    size="sm"
                    variant={selectedWords.length > 0 ? 'filled' : 'light'}
                    color={selectedWords.length > 0 ? 'indigo' : 'gray'}
                  >
                    {selectedWords.length} / 15
                  </Badge>
                </Group>
                {selectedWords.length > 0 && (
                  <Button
                    variant="subtle"
                    color="gray"
                    size="compact-xs"
                    onClick={() => setSelectedWords([])}
                    disabled={isGenerating}
                  >
                    Clear all
                  </Button>
                )}
              </Group>

              {selectedWords.length > 0 ? (
                <Group gap="xs" wrap="wrap">
                  {selectedWords.map((item) => (
                    <Tooltip
                      key={item.wordId || item.word}
                      label={item.meaning || 'No definition'}
                      position="top"
                      withArrow
                    >
                      <Badge
                        size="md"
                        variant="filled"
                        color="indigo"
                        radius="sm"
                        rightSection={
                          <ActionIcon
                            size="xs"
                            color="indigo"
                            variant="transparent"
                            onClick={() => handleRemoveWord(item.wordId || item.word)}
                            disabled={isGenerating}
                          >
                            <IconX size={12} />
                          </ActionIcon>
                        }
                      >
                        {item.word}
                      </Badge>
                    </Tooltip>
                  ))}
                </Group>
              ) : (
                <Card
                  withBorder
                  p="sm"
                  radius="md"
                  style={{ background: 'var(--mantine-color-gray-0)' }}
                >
                  <Text size="xs" c="dimmed" ta="center">
                    No words selected. Choose a preset or browse library.
                  </Text>
                </Card>
              )}
            </Stack>
          </Paper>

          {/* Story Settings */}
          <Paper p="md" radius="md" withBorder>
            <Stack gap="md">
              <Title order={5}>Story Settings</Title>

              {/* Genre Selection */}
              <Select
                label="Story Genre / Theme"
                value={genre}
                onChange={(val) => val && setGenre(val as StoryGenre)}
                data={STORY_GENRES.map((g) => ({ value: g, label: g }))}
                size="sm"
                disabled={isGenerating}
              />

              {/* Length Selection */}
              <Select
                label="Story Length"
                description="Control the length and depth of the narrative"
                value={length}
                onChange={(val) => val && setLength(val as StoryLengthKey)}
                data={STORY_LENGTH_OPTIONS.map((opt) => ({
                  value: opt.key,
                  label: `${opt.label} (${opt.wordCount})`,
                }))}
                size="sm"
                disabled={isGenerating}
                allowDeselect={false}
              />

              {/* Difficulty Level Selection */}
              <Select
                label="Difficulty Level"
                description="Grammar complexity and surrounding context vocabulary"
                value={difficulty}
                onChange={(val) => val && setDifficulty(val as StoryDifficultyLevel)}
                data={STORY_DIFFICULTY_OPTIONS.map((opt) => ({
                  value: opt.key,
                  label: `${opt.label} — ${opt.description}`,
                }))}
                size="sm"
                disabled={isGenerating}
                allowDeselect={false}
              />

              {/* Bangla Translation Switch */}
              <Switch
                label="Include Bangla Translation"
                description="Translates the story to Bangla for bilingual comprehension"
                checked={includeBangla}
                onChange={(e) => setIncludeBangla(e.currentTarget.checked)}
                size="sm"
                color="indigo"
                disabled={isGenerating}
              />

              {/* Error Alert */}
              {generationError && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title="Generation Failed"
                  color="red"
                  variant="light"
                  radius="md"
                >
                  <Text size="xs">{generationError}</Text>
                </Alert>
              )}

              {/* Generate Button */}
              <Button
                size="md"
                color="indigo"
                leftSection={
                  isGenerating ? <Loader size={18} color="white" /> : <IconSparkles size={18} />
                }
                onClick={handleGenerateStory}
                loading={isGenerating}
                disabled={isGenerating || selectedWords.length === 0}
                fullWidth
              >
                {isGenerating
                  ? 'Writing AI Story...'
                  : `Generate Story (${selectedWords.length} words)`}
              </Button>
            </Stack>
          </Paper>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}
