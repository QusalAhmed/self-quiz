import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
  MultiSelect,
} from '@mantine/core';
import { IconCheck, IconPlus, IconX } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import type { WordRecord } from '@/lib/db';
import { getWordGroups } from '@/lib/groups';

type EditWordModalProps = {
  opened: boolean;
  onClose: () => void;
  wordRecord: WordRecord | null;
  customGroups: string[];
  onSave: (
    id: string,
    word: string,
    meaning: string,
    userExamples: string[],
    customGroups: string[]
  ) => Promise<void> | void;
  onAddCustomGroup?: (group: string) => void;
};

export function EditWordModal({
  opened,
  onClose,
  wordRecord,
  customGroups,
  onSave,
  onAddCustomGroup,
}: EditWordModalProps) {
  const [draftWord, setDraftWord] = useState('');
  const [draftMeaning, setDraftMeaning] = useState('');
  const [draftUserExamples, setDraftUserExamples] = useState('');
  const [draftGroups, setDraftGroups] = useState<string[]>([]);
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (opened && wordRecord) {
      setDraftWord(wordRecord.word);
      setDraftMeaning(wordRecord.meaning);
      setDraftUserExamples(
        Array.isArray(wordRecord.userExamples) ? wordRecord.userExamples.join('\n') : ''
      );
      setDraftGroups(getWordGroups(wordRecord));
      setIsAddingNewGroup(false);
      setNewGroupName('');
    }
  }, [opened, wordRecord]);

  const handleSave = async () => {
    if (!wordRecord) return;
    setIsSaving(true);
    try {
      const parsedExamples = draftUserExamples
        .split('\n')
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      await onSave(
        wordRecord.id,
        draftWord.trim(),
        draftMeaning.trim(),
        parsedExamples,
        draftGroups
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!wordRecord) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="md" style={{ fontFamily: 'var(--font-title)' }}>
          Edit Word
        </Text>
      }
      centered
      radius="lg"
      size="md"
      overlayProps={{ backgroundOpacity: 0.45, blur: 4 }}
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
              Your Examples (optional, one per line)
            </Text>
          }
          value={draftUserExamples}
          onChange={(e) => setDraftUserExamples(e.currentTarget.value)}
          minRows={3}
          radius="md"
          size="sm"
        />

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="subtle" color="gray" size="sm" radius="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="indigo"
            size="sm"
            radius="md"
            onClick={handleSave}
            loading={isSaving}
            disabled={!draftWord.trim()}
          >
            Save Changes
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
