import { ActionIcon, Button, Group, Modal, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { IconCheck, IconEdit, IconTrash, IconX, IconAlertTriangle } from '@tabler/icons-react';
import { useState } from 'react';
import type { GroupRecord } from '@/lib/db';

type GroupManagerProps = {
  opened: boolean;
  onClose: () => void;
  groups: GroupRecord[];
  onRename: (id: string, newName: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onAdd: (name: string) => Promise<void> | void;
};

export function GroupManager({
  opened,
  onClose,
  groups,
  onRename,
  onDelete,
  onAdd,
}: GroupManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activeGroups = groups
    .filter((g) => !g.isDeleted)
    .sort((a, b) => a.name.localeCompare(b.name));

  const groupToDelete = confirmDeleteId
    ? activeGroups.find((g) => g.id === confirmDeleteId) ?? null
    : null;

  const startEditing = (group: GroupRecord) => {
    setEditingId(group.id);
    setDraftName(group.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftName('');
  };

  const saveEditing = async () => {
    if (!editingId) {
      return;
    }
    const trimmed = draftName.trim();
    if (!trimmed) {
      return;
    }
    setIsSaving(true);
    try {
      await onRename(editingId, trimmed);
      cancelEditing();
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      return;
    }
    setIsSaving(true);
    try {
      await onAdd(trimmed);
      setNewGroupName('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteId) return;
    setConfirmDeleteId(null);
    setIsSaving(true);
    try {
      await onDelete(confirmDeleteId);
      if (editingId === confirmDeleteId) {
        cancelEditing();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Delete confirmation modal */}
      <Modal
        opened={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title={
          <Group gap="xs" align="center">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'rgba(239,68,68,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconAlertTriangle size={15} color="#ef4444" />
            </div>
            <Text fw={700} size="md" style={{ fontFamily: 'var(--font-title)' }}>
              Delete Group?
            </Text>
          </Group>
        }
        centered
        radius="lg"
        size="sm"
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
        styles={{
          content: {
            border: '1px solid rgba(239,68,68,0.2)',
            background: 'var(--card-bg)',
          },
        }}
        zIndex={400}
      >
        <Stack gap="lg">
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
            Delete group{' '}
            <Text component="span" fw={700} c="var(--text-primary)">
              &ldquo;{groupToDelete?.name}&rdquo;
            </Text>
            ? Words in this group will <strong>not</strong> be deleted — they will simply lose
            this group tag. This action cannot be undone.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              color="gray"
              radius="md"
              size="sm"
              onClick={() => setConfirmDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              radius="md"
              size="sm"
              leftSection={<IconTrash size={15} />}
              onClick={() => void handleDeleteConfirmed()}
            >
              Delete Group
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Main GroupManager modal */}
      <Modal
        opened={opened}
        onClose={() => {
          cancelEditing();
          onClose();
        }}
        title={
          <Text fw={700} size="md" style={{ fontFamily: 'var(--font-title)' }}>
            Manage Groups
          </Text>
        }
        centered
        radius="lg"
        size="md"
        overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
        styles={{
          content: {
            border: '1px solid var(--card-border)',
            background: 'var(--card-bg)',
          },
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
            Create, rename, or delete vocabulary groups. Words can belong to multiple groups.
          </Text>

          <Group align="flex-end" gap="xs">
            <TextInput
              label={
                <Text size="xs" fw={600} c="dimmed">
                  New group
                </Text>
              }
              placeholder="e.g. Verbs, SAT prep"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.currentTarget.value)}
              disabled={isSaving}
              radius="md"
              size="sm"
              style={{ flex: 1 }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleAdd();
                }
              }}
            />
            <Button
              size="sm"
              radius="md"
              className="btn-premium"
              onClick={() => void handleAdd()}
              disabled={!newGroupName.trim() || isSaving}
              loading={isSaving}
            >
              Add
            </Button>
          </Group>

          {activeGroups.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">
              No groups yet. Create one above or assign groups when adding words.
            </Text>
          ) : (
            <Stack gap="xs">
              {activeGroups.map((group) => {
                const isEditing = editingId === group.id;
                return (
                  <Group
                    key={group.id}
                    justify="space-between"
                    wrap="nowrap"
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(99, 102, 241, 0.15)',
                      background: isEditing ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                    }}
                  >
                    {isEditing ? (
                      <>
                        <TextInput
                          value={draftName}
                          onChange={(event) => setDraftName(event.currentTarget.value)}
                          size="xs"
                          radius="md"
                          style={{ flex: 1 }}
                          disabled={isSaving}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void saveEditing();
                            }
                            if (event.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                        />
                        <Group gap={4} wrap="nowrap">
                          <Tooltip label="Save" withArrow>
                            <ActionIcon
                              variant="filled"
                              color="indigo"
                              size="sm"
                              radius="md"
                              onClick={() => void saveEditing()}
                              disabled={!draftName.trim() || isSaving}
                            >
                              <IconCheck size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Cancel" withArrow>
                            <ActionIcon
                              variant="light"
                              color="gray"
                              size="sm"
                              radius="md"
                              onClick={cancelEditing}
                              disabled={isSaving}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </>
                    ) : (
                      <>
                        <Text size="sm" fw={600} style={{ flex: 1, wordBreak: 'break-word' }}>
                          {group.name}
                        </Text>
                        <Group gap={4} wrap="nowrap">
                          <Tooltip label="Rename" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="indigo"
                              size="sm"
                              radius="md"
                              onClick={() => startEditing(group)}
                              disabled={isSaving}
                            >
                              <IconEdit size={15} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete group" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              radius="md"
                              onClick={() => setConfirmDeleteId(group.id)}
                              disabled={isSaving}
                            >
                              <IconTrash size={15} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </>
                    )}
                  </Group>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Modal>
    </>
  );
}
