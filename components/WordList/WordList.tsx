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
import { IconEdit, IconTrash, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (words.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 24px',
          borderRadius: '16px',
          border: '1.5px dashed rgba(99, 102, 241, 0.3)',
          background: 'rgba(99, 102, 241, 0.03)',
        }}
      >
        <Stack gap="sm" align="center">
          <Text fw={700} size="lg" className="text-gradient" style={{ fontFamily: 'var(--font-title)' }}>
            Your Vocabulary is Empty
          </Text>
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
            Add your first word using the panel above. When online, definitions will be automatically fetched.
          </Text>
        </Stack>
      </div>
    );
  }

  const startEditing = (item: WordRecord) => {
    setExpandedId(null);
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
    if (!editingId) return;
    const nextWord = draftWord.trim();
    const nextMeaning = draftMeaning.trim();
    if (!nextWord) return;
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
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteConfirmId);
      closeDeleteConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <Stack gap="sm">
        {words.map((item) => {
          const isEditing = editingId === item.id;
          const isExpanded = expandedId === item.id;
          const hasMeaning = Boolean(item.meaning);

          return (
            <Card
              key={item.id}
              radius="md"
              padding={0}
              className="word-card"
              style={{
                border: isEditing ? '1.5px solid rgba(99, 102, 241, 0.5)' : undefined,
                boxShadow: isEditing ? '0 0 0 3px rgba(99, 102, 241, 0.12)' : undefined,
              }}
            >
              {/* ── Main row (always visible) ── */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: 0,
                  padding: '12px 16px',
                }}
              >
                {/* Left: word + date badge */}
                <div style={{ minWidth: 0 }}>
                  <Group gap={8} wrap="wrap" align="center">
                    <Text
                      fw={700}
                      size="md"
                      style={{
                        fontFamily: 'var(--font-title)',
                        letterSpacing: '-0.01em',
                        color: 'var(--text-primary)',
                        wordBreak: 'break-word',
                      }}
                    >
                      {item.word}
                    </Text>
                    <Badge
                      variant="dot"
                      color={hasMeaning ? 'indigo' : 'orange'}
                      size="xs"
                      radius="sm"
                      style={{ fontSize: '10px', fontWeight: 600, textTransform: 'none' }}
                    >
                      {formatDate(item.updatedAt)}
                    </Badge>
                  </Group>

                  {/* Collapsed preview of meaning (one line) */}
                  {!isEditing && !isExpanded && hasMeaning && (
                    <Text
                      size="xs"
                      c="dimmed"
                      lineClamp={1}
                      style={{ marginTop: 2, lineHeight: 1.5, maxWidth: '100%' }}
                    >
                      {item.meaning}
                    </Text>
                  )}
                  {!isEditing && !isExpanded && !hasMeaning && (
                    <Text
                      size="xs"
                      style={{ marginTop: 2, color: 'var(--text-muted)', fontStyle: 'italic' }}
                    >
                      Fetching definition…
                    </Text>
                  )}
                </div>

                {/* Right: action buttons */}
                <Group gap={4} style={{ flexShrink: 0, marginLeft: 8 }}>
                  {!isEditing && (
                    <>
                      <ActionIcon
                        aria-label={`Expand ${item.word}`}
                        variant="subtle"
                        color="gray"
                        size="sm"
                        radius="md"
                        onClick={() => toggleExpand(item.id)}
                        style={{ transition: 'all 0.2s ease' }}
                      >
                        {isExpanded ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
                      </ActionIcon>
                      <ActionIcon
                        aria-label={`Edit ${item.word}`}
                        variant="subtle"
                        color="indigo"
                        size="sm"
                        radius="md"
                        onClick={() => startEditing(item)}
                        style={{ transition: 'all 0.2s ease' }}
                      >
                        <IconEdit size={15} />
                      </ActionIcon>
                      <ActionIcon
                        aria-label={`Delete ${item.word}`}
                        variant="subtle"
                        color="red"
                        size="sm"
                        radius="md"
                        onClick={() => openDeleteConfirm(item.id, item.word)}
                        style={{ transition: 'all 0.2s ease' }}
                      >
                        <IconTrash size={15} />
                      </ActionIcon>
                    </>
                  )}
                </Group>
              </div>

              {/* ── Expandable meaning section ── */}
              {!isEditing && isExpanded && (
                <div
                  style={{
                    padding: '12px 16px 14px',
                    borderTop: '1px solid var(--card-border)',
                  }}
                >
                  <Text
                    size="sm"
                    style={{
                      color: 'var(--text-secondary)',
                      lineHeight: 1.7,
                    }}
                  >
                    {hasMeaning ? item.meaning : 'No definition available yet.'}
                  </Text>
                </div>
              )}

              {/* ── Edit form section ── */}
              {isEditing && (
                <div
                  style={{
                    padding: '12px 16px 16px',
                    borderTop: '1px solid rgba(99, 102, 241, 0.15)',
                  }}
                >
                  <Stack gap="md">
                    <TextInput
                      label={<Text size="xs" fw={600} c="dimmed">Word</Text>}
                      value={draftWord}
                      onChange={(e) => setDraftWord(e.currentTarget.value)}
                      required
                      radius="md"
                      size="sm"
                    />
                    <Textarea
                      label={<Text size="xs" fw={600} c="dimmed">Definition</Text>}
                      value={draftMeaning}
                      onChange={(e) => setDraftMeaning(e.currentTarget.value)}
                      minRows={2}
                      radius="md"
                      size="sm"
                    />
                    <Group justify="flex-end" gap="xs">
                      <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        radius="md"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="btn-premium"
                        size="xs"
                        radius="md"
                        onClick={saveEditing}
                      >
                        Save Changes
                      </Button>
                    </Group>
                  </Stack>
                </div>
              )}
            </Card>
          );
        })}
      </Stack>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteConfirmId !== null}
        onClose={closeDeleteConfirm}
        title={
          <Text fw={700} size="md" style={{ fontFamily: 'var(--font-title)' }}>
            Delete Word
          </Text>
        }
        centered
        radius="lg"
        size="sm"
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
        styles={{
          content: {
            border: '1px solid var(--card-border)',
            background: 'var(--card-bg)',
          },
        }}
      >
        <Stack gap="lg">
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
            Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirmWord}</strong>?
            This will be removed from your local database and synced to Supabase.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="sm" radius="md" onClick={closeDeleteConfirm} disabled={isDeleting}>
              Cancel
            </Button>
            <Button color="red" size="sm" radius="md" onClick={confirmDelete} loading={isDeleting}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
