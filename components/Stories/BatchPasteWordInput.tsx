'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  RollingNumber,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconCheck, IconClipboard, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import React, { useState } from 'react';
import type { StoryWordReference, WordRecord } from '@/lib/db';
import { parsePastedWords } from '@/lib/story';

export type BatchPasteWordInputProps = {
  words: WordRecord[];
  selectedWords: StoryWordReference[];
  onAddWords: (wordsToAdd: StoryWordReference[]) => void;
  maxWords?: number;
  disabled?: boolean;
};

export function BatchPasteWordInput({
  words,
  selectedWords,
  onAddWords,
  maxWords = 15,
  disabled = false,
}: BatchPasteWordInputProps) {
  const [pasteText, setPasteText] = useState('');
  const [parsedRecognized, setParsedRecognized] = useState<StoryWordReference[]>([]);
  const [parsedUnrecognized, setParsedUnrecognized] = useState<
    Array<{ word: string; meaning: string; partOfSpeech?: string }>
  >([]);
  const [hasParsed, setHasParsed] = useState(false);

  // Single custom word state
  const [customWord, setCustomWord] = useState('');
  const [customMeaning, setCustomMeaning] = useState('');
  const [customPos, setCustomPos] = useState<string | null>('noun');

  const selectedSet = new Set(selectedWords.map((w) => (w.wordId || w.word).toLowerCase()));

  const handleParseText = () => {
    if (!pasteText.trim()) {
      return;
    }
    const result = parsePastedWords(pasteText, words);
    // Filter out already selected recognized words
    const newRecognized = result.recognized.filter(
      (r) => !selectedSet.has((r.wordId || r.word).toLowerCase())
    );
    // Filter out already selected unrecognized words
    const newUnrecognized = result.unrecognized.filter(
      (u) => !selectedSet.has(u.word.toLowerCase())
    );

    setParsedRecognized(newRecognized);
    setParsedUnrecognized(newUnrecognized);
    setHasParsed(true);
  };

  const handleUpdateUnrecognizedMeaning = (index: number, meaning: string) => {
    setParsedUnrecognized((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], meaning };
      }
      return next;
    });
  };

  const handleRemoveUnrecognized = (index: number) => {
    setParsedUnrecognized((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveRecognized = (wordIdOrWord: string) => {
    setParsedRecognized((prev) =>
      prev.filter((r) => (r.wordId || r.word).toLowerCase() !== wordIdOrWord.toLowerCase())
    );
  };

  const handleAddAllParsed = () => {
    const remainingQuota = maxWords - selectedWords.length;
    if (remainingQuota <= 0) {
      return;
    }

    const itemsToAdd: StoryWordReference[] = [];

    // Add recognized words first
    for (const r of parsedRecognized) {
      itemsToAdd.push(r);
      if (itemsToAdd.length >= remainingQuota) {
        break;
      }
    }

    // Add unrecognized words with meanings
    if (itemsToAdd.length < remainingQuota) {
      for (const u of parsedUnrecognized) {
        itemsToAdd.push({
          wordId: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          word: u.word,
          meaning: u.meaning.trim() || 'Custom vocabulary word',
          partOfSpeech: u.partOfSpeech || 'noun',
        });
        if (itemsToAdd.length >= remainingQuota) {
          break;
        }
      }
    }

    if (itemsToAdd.length > 0) {
      onAddWords(itemsToAdd);
      setPasteText('');
      setParsedRecognized([]);
      setParsedUnrecognized([]);
      setHasParsed(false);
    }
  };

  const handleAddSingleCustomWord = () => {
    const trimmed = customWord.trim();
    if (!trimmed) {
      return;
    }
    if (selectedWords.length >= maxWords) {
      return;
    }

    const newWordRef: StoryWordReference = {
      wordId: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      word: trimmed,
      meaning: customMeaning.trim() || 'Custom vocabulary word',
      partOfSpeech: customPos || 'noun',
    };

    onAddWords([newWordRef]);
    setCustomWord('');
    setCustomMeaning('');
  };

  const totalParsedCount = parsedRecognized.length + parsedUnrecognized.length;

  return (
    <Stack gap="md">
      {/* Batch Paste Section */}
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={700}>
            Paste Multiple Words
          </Text>
          <Text size="xs" c="dimmed">
            Separate with commas, spaces, or line breaks
          </Text>
        </Group>

        <Textarea
          placeholder="e.g. ephemeral, serendipity, solitude, resilient, nostalgic"
          value={pasteText}
          onChange={(e) => {
            setPasteText(e.currentTarget.value);
            setHasParsed(false);
          }}
          minRows={3}
          maxRows={6}
          autosize
          disabled={disabled}
        />

        <Group justify="flex-end">
          <Button
            size="xs"
            variant="light"
            color="indigo"
            leftSection={<IconClipboard size={14} />}
            onClick={handleParseText}
            disabled={disabled || !pasteText.trim()}
          >
            Parse & Match Words
          </Button>
        </Group>
      </Stack>

      {/* Parse Preview Results */}
      {hasParsed && (
        <Paper p="sm" radius="md" withBorder style={{ background: 'var(--mantine-color-gray-0)' }}>
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                Matched Preview ({totalParsedCount} words)
              </Text>
              {totalParsedCount > 0 && (
                <Button
                  size="xs"
                  color="indigo"
                  leftSection={<IconPlus size={14} />}
                  onClick={handleAddAllParsed}
                  disabled={disabled || selectedWords.length >= maxWords}
                >
                  Add All to Story (
                  <RollingNumber
                    value={Math.min(totalParsedCount, maxWords - selectedWords.length)}
                  />
                  )
                </Button>
              )}
            </Group>

            {/* Recognized from library */}
            {parsedRecognized.length > 0 && (
              <Stack gap={4}>
                <Text component="div" size="xs" fw={600} c="teal">
                  Found in Library (<RollingNumber value={parsedRecognized.length} />
                  ):
                </Text>
                <Group gap="xs" wrap="wrap">
                  {parsedRecognized.map((r) => (
                    <Badge
                      key={r.wordId || r.word}
                      size="md"
                      variant="light"
                      color="teal"
                      leftSection={<IconCheck size={12} />}
                      rightSection={
                        <ActionIcon
                          size="xs"
                          variant="transparent"
                          color="teal"
                          onClick={() => handleRemoveRecognized(r.wordId || r.word)}
                        >
                          <IconX size={10} />
                        </ActionIcon>
                      }
                    >
                      {r.word}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            )}

            {/* Unrecognized / new words */}
            {parsedUnrecognized.length > 0 && (
              <Stack gap={6}>
                <Text component="div" size="xs" fw={600} c="orange">
                  New / Unrecognized Words (<RollingNumber value={parsedUnrecognized.length} />
                  ):
                </Text>
                <Text size="xs" c="dimmed">
                  Optionally provide a meaning for better story context, or leave blank to
                  auto-generate.
                </Text>
                <Stack gap={6}>
                  {parsedUnrecognized.map((u, idx) => (
                    <Group key={idx} gap="xs" wrap="nowrap">
                      <Badge size="md" variant="filled" color="orange">
                        {u.word}
                      </Badge>
                      <TextInput
                        size="xs"
                        placeholder="Meaning/Definition (optional)"
                        value={u.meaning}
                        onChange={(e) =>
                          handleUpdateUnrecognizedMeaning(idx, e.currentTarget.value)
                        }
                        style={{ flex: 1 }}
                      />
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="gray"
                        onClick={() => handleRemoveUnrecognized(idx)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  ))}
                </Stack>
              </Stack>
            )}

            {totalParsedCount === 0 && (
              <Text size="xs" c="dimmed" ta="center">
                No valid words parsed from the input.
              </Text>
            )}
          </Stack>
        </Paper>
      )}

      <Divider label="OR" labelPosition="center" />

      {/* Single Custom Word Adder */}
      <Stack gap="xs">
        <Text size="sm" fw={700}>
          Add Custom Ad-Hoc Word
        </Text>
        <Text size="xs" c="dimmed">
          Practice any new word in the story even if it is not yet saved to your library.
        </Text>

        <Group gap="xs" align="flex-end">
          <TextInput
            size="sm"
            label="Word"
            placeholder="e.g. resplendent"
            value={customWord}
            onChange={(e) => setCustomWord(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 140 }}
            disabled={disabled}
          />
          <TextInput
            size="sm"
            label="Meaning (Optional)"
            placeholder="e.g. attractive and impressive"
            value={customMeaning}
            onChange={(e) => setCustomMeaning(e.currentTarget.value)}
            style={{ flex: 2, minWidth: 180 }}
            disabled={disabled}
          />
          <Select
            size="sm"
            label="Type"
            value={customPos}
            onChange={setCustomPos}
            data={[
              { value: 'noun', label: 'Noun' },
              { value: 'verb', label: 'Verb' },
              { value: 'adjective', label: 'Adjective' },
              { value: 'adverb', label: 'Adverb' },
            ]}
            style={{ width: 110 }}
            disabled={disabled}
          />
          <Button
            size="sm"
            color="indigo"
            leftSection={<IconPlus size={14} />}
            onClick={handleAddSingleCustomWord}
            disabled={disabled || !customWord.trim() || selectedWords.length >= maxWords}
          >
            Add
          </Button>
        </Group>
      </Stack>
    </Stack>
  );
}
