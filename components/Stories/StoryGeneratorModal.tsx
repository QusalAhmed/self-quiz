'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Combobox,
  Divider,
  Group,
  Loader,
  Modal,
  Pill,
  PillsInput,
  RollingNumber,
  Select,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
  useCombobox,
} from '@mantine/core';
import {
  IconBookmarkOff,
  IconBrain,
  IconClock,
  IconDice,
  IconFlame,
  IconSparkles,
  IconTags,
  IconX,
} from '@tabler/icons-react';
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

export type StoryGeneratorModalProps = {
  opened: boolean;
  onClose: () => void;
  words: WordRecord[];
  groups: GroupRecord[];
  fsrsRecords: FsrsRecord[];
  missedWords: MissedWordRecord[];
  onStoryGenerated: (story: StoryRecord) => void;
  initialSelectedWordIds?: string[];
  initialPreset?: 'due' | 'missed' | 'difficult' | 'recent';
};

export function StoryGeneratorModal({
  opened,
  onClose,
  words,
  groups,
  fsrsRecords,
  missedWords,
  onStoryGenerated,
  initialSelectedWordIds,
  initialPreset,
}: StoryGeneratorModalProps) {
  const [selectedWords, setSelectedWords] = useState<StoryWordReference[]>([]);
  const [genre, setGenre] = useState<StoryGenre>('Daily Life & Slice of Life');
  const [length, setLength] = useState<StoryLengthKey>('medium');
  const [difficulty, setDifficulty] = useState<StoryDifficultyLevel>('intermediate');
  const [includeBangla, setIncludeBangla] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Search combobox for manual word selection
  const [search, setSearch] = useState('');
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch('');
    },
  });

  const customGroups = useMemo(() => getActiveGroupNames(groups), [groups]);
  const wordsById = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  // Load initial words or preset on open
  useEffect(() => {
    if (!opened) {
      return;
    }
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

    // Default to Due words preset if available, else missed, else recent
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
  }, [opened, initialSelectedWordIds, initialPreset, wordsById, fsrsRecords, missedWords, words]);

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

  const handleRemoveWord = useCallback((wordId: string) => {
    setSelectedWords((prev) => prev.filter((w) => w.wordId !== wordId));
  }, []);

  const handleAddWord = useCallback(
    (wordRecord: WordRecord) => {
      if (selectedWords.some((w) => w.wordId === wordRecord.id)) {
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
    const selectedIds = new Set(selectedWords.map((w) => w.wordId));
    return words
      .filter(
        (w) =>
          !w.isDeleted &&
          !selectedIds.has(w.id) &&
          (w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q))
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

      onStoryGenerated(newStoryRecord);
      onClose();
    } catch (err: any) {
      console.error('Failed to generate story:', err);
      setGenerationError(err?.message || 'Failed to generate story. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={isGenerating ? () => {} : onClose}
      title={
        <Group gap="xs">
          <IconSparkles size={22} color="var(--mantine-color-indigo-6)" />
          <Title order={4}>Generate AI Vocabulary Story</Title>
        </Group>
      }
      size="lg"
      centered
      radius="md"
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
    >
      <Stack gap="md">
        {/* Presets Bar */}
        <Stack gap="xs">
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={0.5}>
            Quick Presets
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
                data={Array.from(new Set(customGroups.map((g) => g.trim()).filter(Boolean))).map(
                  (g) => ({ value: g, label: g })
                )}
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

        {/* Selected Words Section */}
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Text component="div" size="xs" fw={700} c="dimmed" tt="uppercase" lts={0.5}>
              Target Words (<RollingNumber value={selectedWords.length} />)
            </Text>
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
                    size="lg"
                    variant="filled"
                    color="indigo"
                    radius="sm"
                    rightSection={
                      <ActionIcon
                        size="xs"
                        color="indigo"
                        variant="transparent"
                        onClick={() => handleRemoveWord(item.wordId || '')}
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
              <Text size="sm" c="dimmed" ta="center">
                No words selected yet. Pick a preset above or search below to add words.
              </Text>
            </Card>
          )}

          {/* Add Word Combobox */}
          <Combobox
            store={combobox}
            onOptionSubmit={(val) => {
              const w = wordsById.get(val);
              if (w) {
                handleAddWord(w);
              }
            }}
          >
            <Combobox.Target>
              <PillsInput
                size="sm"
                onClick={() => combobox.openDropdown()}
                disabled={isGenerating || selectedWords.length >= 12}
              >
                <Pill.Group>
                  <Combobox.EventsTarget>
                    <PillsInput.Field
                      value={search}
                      placeholder={
                        selectedWords.length >= 12
                          ? 'Maximum 12 words reached'
                          : 'Search and add word to story...'
                      }
                      onChange={(event) => {
                        combobox.updateSelectedOptionIndex();
                        setSearch(event.currentTarget.value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Backspace' && search.length === 0) {
                          event.preventDefault();
                          if (selectedWords.length > 0) {
                            handleRemoveWord(selectedWords[selectedWords.length - 1].wordId || '');
                          }
                        }
                      }}
                    />
                  </Combobox.EventsTarget>
                </Pill.Group>
              </PillsInput>
            </Combobox.Target>

            {filteredWordsForSearch.length > 0 && (
              <Combobox.Dropdown>
                <Combobox.Options>
                  {filteredWordsForSearch.map((w) => (
                    <Combobox.Option value={w.id} key={w.id}>
                      <Group justify="space-between">
                        <Text size="sm" fw={600}>
                          {w.word}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1} style={{ maxWidth: 200 }}>
                          {w.meaning}
                        </Text>
                      </Group>
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </Combobox.Dropdown>
            )}
          </Combobox>
        </Stack>

        <Divider />

        {/* Story Configuration */}
        <Stack gap="sm">
          <Select
            label="Story Genre / Theme"
            description="Choose the setting and narrative style"
            data={STORY_GENRES.map((g) => ({ value: g, label: g }))}
            value={genre}
            onChange={(val) => {
              if (val) {
                setGenre(val as StoryGenre);
              }
            }}
            disabled={isGenerating}
          />

          <Select
            label="Story Length"
            description="Control the length and depth of the narrative"
            value={length}
            onChange={(val) => val && setLength(val as StoryLengthKey)}
            data={STORY_LENGTH_OPTIONS.map((opt) => ({
              value: opt.key,
              label: `${opt.label} (${opt.wordCount})`,
            }))}
            disabled={isGenerating}
            allowDeselect={false}
          />

          <Select
            label="Difficulty Level"
            description="Grammar complexity and surrounding context vocabulary"
            value={difficulty}
            onChange={(val) => val && setDifficulty(val as StoryDifficultyLevel)}
            data={STORY_DIFFICULTY_OPTIONS.map((opt) => ({
              value: opt.key,
              label: `${opt.label} — ${opt.description}`,
            }))}
            disabled={isGenerating}
            allowDeselect={false}
          />

          <Switch
            label="Include Bangla Translation & Summary"
            description="Adds a bilingual translation alongside the story text"
            checked={includeBangla}
            onChange={(event) => setIncludeBangla(event.currentTarget.checked)}
            disabled={isGenerating}
          />
        </Stack>

        {generationError && (
          <Card
            withBorder
            p="sm"
            radius="md"
            style={{
              borderColor: 'var(--mantine-color-red-4)',
              background: 'var(--mantine-color-red-0)',
            }}
          >
            <Text size="sm" c="red" fw={500}>
              {generationError}
            </Text>
          </Card>
        )}

        <Group justify="flex-end" gap="sm" mt="xs">
          <Button variant="default" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button
            color="indigo"
            leftSection={
              isGenerating ? <Loader size="xs" color="white" /> : <IconSparkles size={16} />
            }
            onClick={handleGenerateStory}
            disabled={isGenerating || selectedWords.length === 0}
          >
            {isGenerating ? 'Generating Story with AI...' : 'Generate Story'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
