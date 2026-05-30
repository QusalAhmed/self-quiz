import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import type { WordRecord } from '@/lib/db';
import { formatDate } from '@/lib/dateUtils';

type WordListProps = {
  words: WordRecord[];
  onDelete: (id: string) => Promise<void> | void;
  onEdit: (id: string, word: string, meaning: string) => Promise<void> | void;
};

export function WordList({ words, onDelete, onEdit }: WordListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftWord, setDraftWord] = useState('');
  const [draftMeaning, setDraftMeaning] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (words.length === 0) {
    return (
      <Card withBorder radius="md" padding="lg" style={{ textAlign: 'center', backgroundColor: 'var(--mantine-color-gray-0)' }}>
        <Stack gap="sm" align="center">
          <Text c="dimmed" fw={500}>No words yet</Text>
          <Text size="sm" c="dimmed">Add your first word using the form above. Definitions will be auto-fetched when online!</Text>
        </Stack>
      </Card>
    );
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

  const openDeleteConfirm = (id: string, word: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmWord(word);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmId(null);
    setDeleteConfirmWord('');
    setIsDeleting(false);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(deleteConfirmId);
      closeDeleteConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Stack gap="sm">
        {words.map((item) => {
          const isEditing = editingId === item.id;
          return (
            <Card key={item.id} withBorder radius="md" padding="md">
              <Group justify="space-between" align="flex-start">
                <Stack gap={4} style={{ flex: 1 }}>
                  <Group gap="sm">
                    <Text fw={600}>{item.word}</Text>
                    <Badge variant="light">{formatDate(item.updatedAt)}</Badge>
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
                      onClick={() => openDeleteConfirm(item.id, item.word)}
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

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteConfirmId !== null}
        onClose={closeDeleteConfirm}
        title="Delete Word"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete <strong>{deleteConfirmWord}</strong>? This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDeleteConfirm} disabled={isDeleting}>
              Cancel
            </Button>
            <Button color="red" onClick={confirmDelete} loading={isDeleting}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
