import { ActionIcon, Badge, Button, Card, Group, Modal, Stack, Text, Tooltip } from '@mantine/core';
import { IconEdit, IconTrash, IconRotateClockwise } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { WordForm } from '@/components/WordForm/WordForm';
import { formatDate, formatRelativeShort } from '@/lib/dateUtils';
import type { WordRecord } from '@/lib/db';
import { getDisplayExamples } from '@/lib/examples';
import { getWordGroups } from '@/lib/groups';

type WordListProps = {
  words: WordRecord[];
  onDelete: (id: string) => Promise<void> | void;
  onEdit: (
    id: string,
    word: string,
    meaning: string,
    userExamples: string[],
    customGroups: string[]
  ) => Promise<void> | void;
  onRefreshExamples: (id: string) => Promise<void> | void;
  customGroups: string[];
  onAddCustomGroup?: (group: string) => void;
};

export function WordList({
  words,
  onDelete,
  onEdit,
  onRefreshExamples,
  customGroups,
  onAddCustomGroup,
}: WordListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const editingItem = useMemo(
    () => (editingId ? words.find((item) => item.id === editingId) ?? null : null),
    [editingId, words]
  );

  const editValues = useMemo(() => {
    if (!editingItem) {
      return null;
    }
    return {
      word: editingItem.word,
      meaning: editingItem.meaning,
      userExamples: Array.isArray(editingItem.userExamples) ? editingItem.userExamples : [],
      groups: getWordGroups(editingItem),
    };
  }, [editingItem]);

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
          <Text
            fw={700}
            size="lg"
            className="text-gradient"
            style={{ fontFamily: 'var(--font-title)' }}
          >
            Your Vocabulary is Empty
          </Text>
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
            Add your first word using the panel above. When online, definitions will be
            automatically fetched.
          </Text>
        </Stack>
      </div>
    );
  }

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
          const hasMeaning = Boolean(item.meaning);
          const displayExamples = getDisplayExamples(item);
          const hasExamples = displayExamples.length > 0;

          return (
            <Card
              key={item.id}
              radius="md"
              padding={0}
              className="word-card hover-lift"
              style={{
                borderLeft: isEditing
                  ? '4px solid #6366f1'
                  : hasMeaning
                    ? '4px solid rgba(99, 102, 241, 0.45)'
                    : '4px solid rgba(245, 158, 11, 0.45)',
                borderTop: isEditing ? '1px solid rgba(99, 102, 241, 0.5)' : undefined,
                borderRight: isEditing ? '1px solid rgba(99, 102, 241, 0.5)' : undefined,
                borderBottom: isEditing ? '1px solid rgba(99, 102, 241, 0.5)' : undefined,
                boxShadow: isEditing ? '0 0 0 3px rgba(99, 102, 241, 0.12)' : undefined,
                padding: '10px 10px',
              }}
            >
              {/* ── Main row (always visible) ── */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: 0,
                }}
              >
                {/* Left: word + date badge + definition */}
                <div style={{ minWidth: 0, paddingRight: 8 }}>
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

                    <Tooltip label={formatDate(item.updatedAt)} withArrow>
                      <Badge
                        variant="filled"
                        color={hasMeaning ? 'indigo' : 'orange'}
                        size="xs"
                        radius="sm"
                        className="date-pill"
                        style={{ fontSize: '11px', fontWeight: 700, textTransform: 'none' }}
                      >
                        {formatRelativeShort(item.updatedAt)}
                      </Badge>
                    </Tooltip>

                    {getWordGroups(item).map((groupName) => (
                      <Badge
                        key={`${item.id}-${groupName}`}
                        variant="outline"
                        color="grape"
                        size="xs"
                        radius="sm"
                        style={{ fontSize: '11px', fontWeight: 700, textTransform: 'none' }}
                      >
                        {groupName}
                      </Badge>
                    ))}
                  </Group>

                  {/* Meaning (always visible) */}
                  {!isEditing && (
                    <>
                      <Text
                        size="sm"
                        style={{
                          marginTop: 6,
                          color: hasMeaning ? 'var(--text-secondary)' : 'var(--text-muted)',
                          fontStyle: hasMeaning ? 'normal' : 'italic',
                          lineHeight: 1.6,
                          wordBreak: 'break-word',
                        }}
                      >
                        {hasMeaning ? item.meaning : 'Fetching definition…'}
                      </Text>
                    </>
                  )}
                </div>

                {/* Right: action buttons */}
                <Group gap={4} style={{ flexShrink: 0, marginLeft: 8 }}>
                  {!isEditing && (
                    <>
                      <Tooltip label="Generate new examples" withArrow>
                        <ActionIcon
                          aria-label={`Generate new examples for ${item.word}`}
                          variant="subtle"
                          color="indigo"
                          size="sm"
                          radius="md"
                          onClick={() => onRefreshExamples(item.id)}
                          style={{ transition: 'all 0.2s ease' }}
                        >
                          <IconRotateClockwise size={15} />
                        </ActionIcon>
                      </Tooltip>
                      <ActionIcon
                        aria-label={`Edit ${item.word}`}
                        variant="subtle"
                        color="indigo"
                        size="sm"
                        radius="md"
                        onClick={() => setEditingId(item.id)}
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

              {/*Examples*/}
              {!isEditing && hasExamples && (
                <Stack gap={2} mt={6}>
                  <Text size="xs" fw={600} c="dimmed">
                    Examples
                  </Text>
                  {displayExamples.map((example, index) => (
                    <Text
                      key={`${item.id}-example-${index}`}
                      size="sm"
                      style={{
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                      }}
                    >
                      {`• ${example}`}
                    </Text>
                  ))}
                </Stack>
              )}

              {/* ── Edit form section ── */}
              {isEditing && editValues && (
                <div
                  style={{
                    padding: '12px 16px 16px',
                    borderTop: '1px solid rgba(99, 102, 241, 0.15)',
                  }}
                >
                  <WordForm
                    variant="embedded"
                    customGroups={customGroups}
                    onAddCustomGroup={onAddCustomGroup}
                    editValues={editValues}
                    onSubmit={async (word, meaning, userExamples, groups) => {
                      if (!editingId) {
                        return;
                      }
                      await onEdit(editingId, word, meaning, userExamples, groups);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
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
            Are you sure you want to delete{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirmWord}</strong>? This will
            be removed from your local database and synced to Supabase.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              size="sm"
              radius="md"
              onClick={closeDeleteConfirm}
              disabled={isDeleting}
            >
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
