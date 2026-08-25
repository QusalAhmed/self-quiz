'use client';

import {
  ActionIcon,
  Badge,
  Card,
  Checkbox,
  Group,
  Paper,
  RollingNumber,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconSearch, IconTags, IconVolume, IconX } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import type { GroupRecord, StoryWordReference, WordRecord } from '@/lib/db';
import { normalizeDefinitions } from '@/lib/definitions';
import { getActiveGroupNames } from '@/lib/groups';

export type WordLibraryBrowserProps = {
  words: WordRecord[];
  groups: GroupRecord[];
  selectedWords: StoryWordReference[];
  onToggleWord: (word: StoryWordReference) => void;
  onSelectMultiple: (wordsToAdd: StoryWordReference[]) => void;
  onDeselectMultiple: (wordIdsToRemove: string[]) => void;
  maxWords?: number;
  disabled?: boolean;
};

export function WordLibraryBrowser({
  words,
  groups,
  selectedWords,
  onToggleWord,
  onSelectMultiple,
  onDeselectMultiple,
  maxWords = 15,
  disabled = false,
}: WordLibraryBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const customGroupNames = useMemo(() => getActiveGroupNames(groups), [groups]);

  // Set of currently selected word IDs / words
  const selectedWordIds = useMemo(() => {
    const set = new Set<string>();
    for (const sw of selectedWords) {
      if (sw.wordId) {
        set.add(sw.wordId);
      } else {
        set.add(sw.word.toLowerCase());
      }
    }
    return set;
  }, [selectedWords]);

  // Filtered words from user's library
  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return words.filter((w) => {
      if (w.isDeleted) {
        return false;
      }

      // Group filter
      if (selectedGroup !== 'all') {
        const inGroup =
          Array.isArray(w.customGroups) &&
          w.customGroups.some((g) => g.toLowerCase() === selectedGroup.toLowerCase());
        if (!inGroup) {
          return false;
        }
      }

      // Search query filter
      if (q) {
        const matchesWord = w.word.toLowerCase().includes(q);
        const matchesMeaning = (w.meaning || '').toLowerCase().includes(q);
        const matchesDefs = (w.definitions || []).some((d) =>
          (d.meaning || '').toLowerCase().includes(q)
        );
        if (!matchesWord && !matchesMeaning && !matchesDefs) {
          return false;
        }
      }

      return true;
    });
  }, [words, searchQuery, selectedGroup]);

  const handlePronounce = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleSelectAllVisible = () => {
    const remainingQuota = maxWords - selectedWords.length;
    if (remainingQuota <= 0) {
      return;
    }

    const wordsToAdd: StoryWordReference[] = [];
    for (const w of filteredWords) {
      if (!selectedWordIds.has(w.id) && !selectedWordIds.has(w.word.toLowerCase())) {
        const defs = normalizeDefinitions(w.definitions);
        const firstDef = defs[0];
        wordsToAdd.push({
          wordId: w.id,
          word: w.word,
          meaning: firstDef?.meaning || w.meaning || '',
          partOfSpeech: firstDef?.partOfSpeech || '',
        });
        if (wordsToAdd.length >= remainingQuota) {
          break;
        }
      }
    }

    if (wordsToAdd.length > 0) {
      onSelectMultiple(wordsToAdd);
    }
  };

  const handleDeselectAllVisible = () => {
    const idsToRemove = filteredWords
      .filter((w) => selectedWordIds.has(w.id) || selectedWordIds.has(w.word.toLowerCase()))
      .map((w) => w.id);

    if (idsToRemove.length > 0) {
      onDeselectMultiple(idsToRemove);
    }
  };

  const allVisibleSelected =
    filteredWords.length > 0 &&
    filteredWords.every(
      (w) => selectedWordIds.has(w.id) || selectedWordIds.has(w.word.toLowerCase())
    );

  const someVisibleSelected =
    filteredWords.some(
      (w) => selectedWordIds.has(w.id) || selectedWordIds.has(w.word.toLowerCase())
    ) && !allVisibleSelected;

  return (
    <Stack gap="sm">
      {/* Search & Filter Header */}
      <Group justify="space-between" align="center" wrap="wrap">
        <TextInput
          placeholder="Search library words or definitions..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          size="sm"
          style={{ flex: 1, minWidth: 200 }}
          rightSection={
            searchQuery ? (
              <ActionIcon size="xs" variant="subtle" onClick={() => setSearchQuery('')}>
                <IconX size={14} />
              </ActionIcon>
            ) : null
          }
        />

        {customGroupNames.length > 0 && (
          <Select
            size="sm"
            placeholder="Filter by Group..."
            value={selectedGroup}
            onChange={(val) => setSelectedGroup(val || 'all')}
            data={[
              { value: 'all', label: 'All Groups' },
              ...customGroupNames.map((g) => ({ value: g, label: g })),
            ]}
            leftSection={<IconTags size={14} />}
            style={{ width: 170 }}
            allowDeselect={false}
          />
        )}
      </Group>

      {/* Filter Chips Bar & Select All Action */}
      <Paper p="xs" radius="md" withBorder style={{ background: 'var(--mantine-color-gray-0)' }}>
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="xs">
            <Checkbox
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected}
              onChange={allVisibleSelected ? handleDeselectAllVisible : handleSelectAllVisible}
              disabled={disabled || (selectedWords.length >= maxWords && !allVisibleSelected)}
              label={
                <Text size="xs" fw={600}>
                  {allVisibleSelected ? (
                    'Deselect All Visible'
                  ) : (
                    <>
                      Select Visible (<RollingNumber value={filteredWords.length} />)
                    </>
                  )}
                </Text>
              }
            />
          </Group>

          <Group gap="xs">
            <Text size="xs" c="dimmed">
              Showing <RollingNumber value={filteredWords.length} /> of{' '}
              <RollingNumber value={words.filter((w) => !w.isDeleted).length} /> words
            </Text>
          </Group>
        </Group>
      </Paper>

      {/* Words List View */}
      <ScrollArea.Autosize mah={360} type="auto">
        <Stack gap={6}>
          {filteredWords.length > 0 ? (
            filteredWords.map((wordRec) => {
              const isSelected =
                selectedWordIds.has(wordRec.id) || selectedWordIds.has(wordRec.word.toLowerCase());
              const defs = normalizeDefinitions(wordRec.definitions);
              const firstDef = defs[0];
              const meaning = firstDef?.meaning || wordRec.meaning || 'No definition';
              const pos = firstDef?.partOfSpeech;

              const wordRef: StoryWordReference = {
                wordId: wordRec.id,
                word: wordRec.word,
                meaning,
                partOfSpeech: pos,
              };

              return (
                <Paper
                  key={wordRec.id}
                  p="xs"
                  radius="md"
                  withBorder
                  onClick={() => {
                    if (disabled) {
                      return;
                    }
                    if (!isSelected && selectedWords.length >= maxWords) {
                      return;
                    }
                    onToggleWord(wordRef);
                  }}
                  style={{
                    cursor: disabled ? 'default' : 'pointer',
                    background: isSelected
                      ? 'var(--mantine-color-indigo-0)'
                      : 'var(--mantine-color-body)',
                    borderColor: isSelected
                      ? 'var(--mantine-color-indigo-4)'
                      : 'var(--mantine-color-gray-2)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {}}
                        disabled={disabled || (!isSelected && selectedWords.length >= maxWords)}
                        style={{ pointerEvents: 'none' }}
                      />

                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="xs" align="center">
                          <Text size="sm" fw={700} c={isSelected ? 'indigo' : undefined} truncate>
                            {wordRec.word}
                          </Text>
                          {pos && (
                            <Badge size="xs" variant="light" color="gray">
                              {pos}
                            </Badge>
                          )}
                          {wordRec.customGroups?.map((g) => (
                            <Badge key={g} size="xs" variant="outline" color="violet">
                              {g}
                            </Badge>
                          ))}
                        </Group>

                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {meaning}
                        </Text>
                      </Stack>
                    </Group>

                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="indigo"
                      onClick={(e) => handlePronounce(wordRec.word, e)}
                      aria-label={`Pronounce ${wordRec.word}`}
                    >
                      <IconVolume size={14} />
                    </ActionIcon>
                  </Group>
                </Paper>
              );
            })
          ) : (
            <Card
              withBorder
              p="lg"
              radius="md"
              style={{ background: 'var(--mantine-color-gray-0)' }}
            >
              <Text size="sm" c="dimmed" ta="center">
                No matching words found in your library.
              </Text>
            </Card>
          )}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
