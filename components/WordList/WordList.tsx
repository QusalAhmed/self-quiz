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
      <Card
        className="glass-panel animate-float"
        radius="lg"
        padding="xl"
        style={{
          textAlign: 'center',
          border: '1px dashed var(--accent-gradient)',
          background: 'rgba(255, 255, 255, 0.05)',
        }}
      >
        <Stack gap="md" align="center" py="lg">
          <Text fw={700} size="xl" className="text-gradient" style={{ fontFamily: 'var(--font-title)' }}>
            Your Vocabulary is Empty
          </Text>
          <Text size="sm" c="dimmed" max-width="400px" style={{ lineHeight: 1.6 }}>
            Add your first word using the panel above. When you are online, definitions will be automatically fetched for you!
          </Text>
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
      <Stack gap="md">
        {words.map((item) => {
          const isEditing = editingId === item.id;
          return (
            <Card
              key={item.id}
              className="glass-panel hover-lift"
              radius="lg"
              padding="lg"
              style={{
                position: 'relative',
                overflow: 'visible',
              }}
            >
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap="xs" style={{ flex: 1 }}>
                  <Group gap="sm" align="center">
                    <Text
                      fw={700}
                      size="lg"
                      style={{
                        fontFamily: 'var(--font-title)',
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {item.word}
                    </Text>
                    <Badge
                      variant="light"
                      color="indigo"
                      size="sm"
                      radius="sm"
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'none',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Updated {formatDate(item.updatedAt)}
                    </Badge>
                  </Group>

                  {isEditing ? (
                    <Stack gap="md" mt="sm">
                      <TextInput
                        label={<Text size="xs" fw={600} c="dimmed">Word</Text>}
                        value={draftWord}
                        onChange={(event) => setDraftWord(event.currentTarget.value)}
                        required
                        radius="md"
                      />
                      <Textarea
                        label={<Text size="xs" fw={600} c="dimmed">Definition</Text>}
                        value={draftMeaning}
                        onChange={(event) => setDraftMeaning(event.currentTarget.value)}
                        minRows={3}
                        radius="md"
                      />
                      <Group justify="flex-end" gap="xs">
                        <Button variant="subtle" color="gray" onClick={cancelEditing} radius="md">
                          Cancel
                        </Button>
                        <Button className="btn-premium" onClick={saveEditing} radius="md">
                          Save Changes
                        </Button>
                      </Group>
                    </Stack>
                  ) : (
                    <Text
                      size="sm"
                      style={{
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                        fontStyle: item.meaning ? 'normal' : 'italic',
                      }}
                    >
                      {item.meaning ? item.meaning : 'Fetching meaning dynamically...'}
                    </Text>
                  )}
                </Stack>

                {!isEditing && (
                  <Group gap="xs" style={{ flexShrink: 0 }}>
                    <ActionIcon
                      aria-label={`Edit ${item.word}`}
                      variant="subtle"
                      color="indigo"
                      size="md"
                      radius="md"
                      onClick={() => startEditing(item)}
                      style={{
                        transition: 'all 0.2s ease',
                      }}
                      styles={{
                        root: {
                          '&:hover': {
                            backgroundColor: 'rgba(99, 102, 241, 0.1) !important',
                            transform: 'scale(1.05)',
                          },
                        },
                      }}
                    >
                      <IconEdit size={18} />
                    </ActionIcon>
                    <ActionIcon
                      aria-label={`Delete ${item.word}`}
                      color="red"
                      variant="subtle"
                      size="md"
                      radius="md"
                      onClick={() => openDeleteConfirm(item.id, item.word)}
                      style={{
                        transition: 'all 0.2s ease',
                      }}
                      styles={{
                        root: {
                          '&:hover': {
                            backgroundColor: 'rgba(239, 68, 68, 0.1) !important',
                            transform: 'scale(1.05)',
                          },
                        },
                      }}
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
        title={
          <Text fw={700} size="lg" style={{ fontFamily: 'var(--font-title)' }}>
            Confirm Deletion
          </Text>
        }
        centered
        radius="lg"
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        styles={{
          content: {
            border: '1px solid var(--card-border)',
            background: 'var(--card-bg)',
            backdropFilter: 'blur(16px)',
          },
        }}
      >
        <Stack gap="lg">
          <Text size="sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Are you sure you want to delete <strong>{deleteConfirmWord}</strong> from your workspace? This will sync across your offline storage and Supabase backend.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={closeDeleteConfirm} disabled={isDeleting} radius="md">
              Cancel
            </Button>
            <Button color="red" onClick={confirmDelete} loading={isDeleting} radius="md">
              Delete Word
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
