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
  Tooltip,
  MultiSelect,
} from '@mantine/core';
import {
  IconEdit,
  IconTrash,
  IconRotateClockwise,
  IconPlus,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';
import { formatDate, formatRelativeShort } from '@/lib/dateUtils';
import type { WordRecord } from '@/lib/db';
import { getDisplayExamples, parseExampleLines } from '@/lib/examples';
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
  const [draftWord, setDraftWord] = useState('');
  const [draftMeaning, setDraftMeaning] = useState('');
  const [draftUserExamples, setDraftUserExamples] = useState('');
  const [draftGroups, setDraftGroups] = useState<string[]>([]);
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  const startEditing = (item: WordRecord) => {
    setEditingId(item.id);
    setDraftWord(item.word);
    setDraftMeaning(item.meaning);
    setDraftUserExamples(Array.isArray(item.userExamples) ? item.userExamples.join('\n') : '');
    setDraftGroups(getWordGroups(item));
    setIsAddingNewGroup(false);
    setNewGroupName('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftWord('');
    setDraftMeaning('');
    setDraftUserExamples('');
    setDraftGroups([]);
    setIsAddingNewGroup(false);
    setNewGroupName('');
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
    await onEdit(
      editingId,
      nextWord,
      nextMeaning,
      parseExampleLines(draftUserExamples),
      draftGroups
    );
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
              {isEditing && (
                <div
                  style={{
                    padding: '12px 16px 16px',
                    borderTop: '1px solid rgba(99, 102, 241, 0.15)',
                  }}
                >
                  <Stack gap="md">
                    <TextInput
                      label={
                        <Text size="xs" fw={600} c="dimmed" span>
                          Word
                        </Text>
                      }
                      value={draftWord}
                      onChange={(e) => setDraftWord(e.currentTarget.value)}
                      required
                      radius="md"
                      size="sm"
                    />

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        alignItems: 'flex-end',
                        gap: '8px',
                      }}
                    >
                      {isAddingNewGroup ? (
                        <TextInput
                          label={
                            <Text size="xs" fw={600} c="dimmed">
                              Create New Group
                            </Text>
                          }
                          placeholder="Group name, e.g. Verbs, SAT prep"
                          value={newGroupName}
                          onChange={(event) => setNewGroupName(event.currentTarget.value)}
                          size="sm"
                          radius="md"
                          style={{ flex: 1 }}
                        />
                      ) : (
                        <MultiSelect
                          label={
                            <Text size="xs" fw={600} c="dimmed">
                              Groups
                            </Text>
                          }
                          placeholder="Choose one or more groups..."
                          value={draftGroups}
                          onChange={setDraftGroups}
                          data={customGroups.map((g) => ({ value: g, label: g }))}
                          size="sm"
                          radius="md"
                          style={{ flex: 1 }}
                          searchable
                          clearable
                        />
                      )}

                      {isAddingNewGroup ? (
                        <Group gap={4} style={{ marginBottom: '4px' }}>
                          <Tooltip label="Add Group" withArrow>
                            <ActionIcon
                              variant="filled"
                              color="indigo"
                              size="md"
                              radius="md"
                              onClick={() => {
                                const trimmed = newGroupName.trim();
                                if (trimmed) {
                                  if (onAddCustomGroup) {
                                    onAddCustomGroup(trimmed);
                                  }
                                  setDraftGroups((prev) => Array.from(new Set([...prev, trimmed])));
                                }
                                setNewGroupName('');
                                setIsAddingNewGroup(false);
                              }}
                              disabled={!newGroupName.trim()}
                            >
                              <IconCheck size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Cancel" withArrow>
                            <ActionIcon
                              variant="light"
                              color="gray"
                              size="md"
                              radius="md"
                              onClick={() => {
                                setNewGroupName('');
                                setIsAddingNewGroup(false);
                              }}
                            >
                              <IconX size={18} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      ) : (
                        <Tooltip label="Create new custom group" withArrow>
                          <ActionIcon
                            variant="light"
                            color="indigo"
                            size="lg"
                            radius="md"
                            style={{ marginBottom: '2px' }}
                            onClick={() => setIsAddingNewGroup(true)}
                          >
                            <IconPlus size={20} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </div>

                    <Textarea
                      label={
                        <Text size="xs" fw={600} c="dimmed">
                          Definition
                        </Text>
                      }
                      value={draftMeaning}
                      onChange={(e) => setDraftMeaning(e.currentTarget.value)}
                      minRows={2}
                      radius="md"
                      size="sm"
                    />
                    <Textarea
                      label={
                        <Text size="xs" fw={600} c="dimmed">
                          Your examples (one per line)
                        </Text>
                      }
                      value={draftUserExamples}
                      onChange={(e) => setDraftUserExamples(e.currentTarget.value)}
                      minRows={2}
                      radius="md"
                      size="sm"
                      placeholder="Add your own example sentences..."
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
                      <Button className="btn-premium" size="xs" radius="md" onClick={saveEditing}>
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
