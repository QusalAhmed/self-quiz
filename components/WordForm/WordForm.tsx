import {
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Textarea,
  MultiSelect,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconPlus, IconCheck, IconX } from '@tabler/icons-react';
import { useRef, useState } from 'react';

type WordFormProps = {
  onAdd: (word: string, meaning: string, example: string, groups: string[]) => Promise<void> | void;
  disabled?: boolean;
  customGroups: string[];
  onAddCustomGroup?: (group: string) => void;
};

export function WordForm({ onAdd, disabled, customGroups, onAddCustomGroup }: WordFormProps) {
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const wordInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = word.trim().length > 0 && !isSaving;

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) {
      event.preventDefault();
    }
    if (!canSubmit) {
      return;
    }

    setIsSaving(true);
    try {
      await onAdd(word.trim(), meaning.trim(), example.trim(), groups);
      setWord('');
      setMeaning('');
      setExample('');
      setGroups([]);
      setTimeout(() => {
        wordInputRef.current?.focus();
      }, 0);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMeaningKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <Card
      className="glass-panel"
      radius="lg"
      padding="xl"
      style={{
        borderLeft: '4px solid #6366f1',
        overflow: 'hidden',
      }}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          <div>
            <Text
              fw={700}
              size="lg"
              className="text-gradient"
              mb={2}
              style={{ fontFamily: 'var(--font-title)' }}
            >
              Add New Vocabulary Word
            </Text>
          </div>

          <TextInput
            ref={wordInputRef}
            label={
              <Text size="xs" fw={600} c="dimmed" span>
                English Word
              </Text>
            }
            placeholder="e.g. eloquent, pragmatic, nebulous"
            value={word}
            onChange={(event) => setWord(event.currentTarget.value)}
            disabled={disabled || isSaving}
            required
            size="md"
            radius="md"
          />

          <Textarea
            label={
              <Text size="xs" fw={600} c="dimmed">
                Definition (optional)
              </Text>
            }
            placeholder="Type your own definition here, or leave it blank to auto-fetch..."
            value={meaning}
            onChange={(event) => setMeaning(event.currentTarget.value)}
            onKeyDown={handleMeaningKeyDown}
            disabled={disabled || isSaving}
            minRows={2.5}
            size="sm"
            radius="md"
            autosize
          />

          <Textarea
            label={
              <Text size="xs" fw={600} c="dimmed">
                Example sentence (optional)
              </Text>
            }
            placeholder="Add your own example using this word..."
            autosize
            value={example}
            onChange={(event) => setExample(event.currentTarget.value.replace(/\s+/g, ' ').trim())}
            disabled={disabled || isSaving}
            minRows={2}
            size="sm"
            radius="md"
            onKeyDown={handleMeaningKeyDown}
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
                    disabled={disabled || isSaving}
                    size="sm"
                    radius="md"
                    style={{ flex: 1 }}
                />
            ) : (
                <MultiSelect
                    label={
                      <Text size="xs" fw={600} c="dimmed">
                        Groups (optional)
                      </Text>
                    }
                    placeholder="Choose one or more groups..."
                    value={groups}
                    onChange={setGroups}
                    data={customGroups.map((g) => ({ value: g, label: g }))}
                    disabled={disabled || isSaving}
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
                            setGroups((prev) => Array.from(new Set([...prev, trimmed])));
                          }
                          setNewGroupName('');
                          setIsAddingNewGroup(false);
                        }}
                        disabled={!newGroupName.trim() || disabled || isSaving}
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
                        disabled={disabled || isSaving}
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
                      disabled={disabled || isSaving}
                  >
                    <IconPlus size={20} />
                  </ActionIcon>
                </Tooltip>
            )}
          </div>

          <Group justify="flex-end" mt="xs">
            <Button
              type="submit"
              disabled={!canSubmit || disabled}
              loading={isSaving}
              className="btn-premium"
              radius="md"
              size="md"
              leftSection={<IconPlus size={20} />}
            >
              Save Word
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}
