import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import type { WordRecord } from '@/lib/db';

type WordListProps = {
  words: WordRecord[];
  onDelete: (id: string) => Promise<void> | void;
  onEdit: (id: string, word: string, meaning: string) => Promise<void> | void;
};

export function WordList({ words, onDelete, onEdit }: WordListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftWord, setDraftWord] = useState('');
  const [draftMeaning, setDraftMeaning] = useState('');

  if (words.length === 0) {
    return <Text c="dimmed">No words yet. Add your first word above.</Text>;
  }

  const startEditing = (item: WordRecord) => {
    setEditingId(item.id);
    setDraftWord(item.word);
    setDraftMeaning(item.meaning);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftWord('');
    setDraftMeaning('');
  };

  const saveEditing = async () => {
    if (!editingId) {
      return;
    }

    const nextWord = draftWord.trim();
    const nextMeaning = draftMeaning.trim();
    if (!nextWord) {
      return;
    }

    await onEdit(editingId, nextWord, nextMeaning);
    cancelEditing();
  };

  return (
    <Stack gap="sm">
      {words.map((item) => {
        const isEditing = editingId === item.id;
        return (
          <Card key={item.id} withBorder radius="md" padding="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap={4} style={{ flex: 1 }}>
                <Group gap="sm">
                  <Text fw={600}>{item.word}</Text>
                  <Badge variant="light">{new Date(item.updatedAt).toLocaleDateString()}</Badge>
                </Group>
                {isEditing ? (
                  <Stack gap="sm">
                    <TextInput
                      label="Word"
                      value={draftWord}
                      onChange={(event) => setDraftWord(event.currentTarget.value)}
                      required
                    />
                    <Textarea
                      label="Meaning (optional)"
                      value={draftMeaning}
                      onChange={(event) => setDraftMeaning(event.currentTarget.value)}
                      minRows={3}
                    />
                    <Group justify="flex-end">
                      <Button variant="default" onClick={cancelEditing}>
                        Cancel
                      </Button>
                      <Button onClick={saveEditing}>
                        Save
                      </Button>
                    </Group>
                  </Stack>
                ) : (
                  <Text c="dimmed">
                    {item.meaning ? item.meaning : 'Meaning pending...'}
                  </Text>
                )}
              </Stack>
              {!isEditing && (
                <Group gap="xs">
                  <ActionIcon
                    aria-label={`Edit ${item.word}`}
                    variant="subtle"
                    onClick={() => startEditing(item)}
                  >
                    <IconEdit size={18} />
                  </ActionIcon>
                  <ActionIcon
                    aria-label={`Delete ${item.word}`}
                    color="red"
                    variant="subtle"
                    onClick={() => onDelete(item.id)}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              )}
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}
