import type { KeyboardEvent } from 'react';
import { ActionIcon, Group, MultiSelect, Text, TextInput, Tooltip } from '@mantine/core';
import { IconCheck, IconPlus, IconX } from '@tabler/icons-react';

type GroupSelectorProps = {
  customGroups: string[];
  groups: string[];
  isAddingNewGroup: boolean;
  newGroupName: string;
  disabled?: boolean;
  isSaving: boolean;
  onGroupsChange: (value: string[]) => void;
  onNewGroupNameChange: (value: string) => void;
  onNewGroupKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onStartAddingGroup: () => void;
  onConfirmNewGroup: () => void;
  onCancelNewGroup: () => void;
};

export function GroupSelector({
  customGroups,
  groups,
  isAddingNewGroup,
  newGroupName,
  disabled,
  isSaving,
  onGroupsChange,
  onNewGroupNameChange,
  onNewGroupKeyDown,
  onStartAddingGroup,
  onConfirmNewGroup,
  onCancelNewGroup,
}: GroupSelectorProps) {
  return (
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
          label={<Text size="xs" fw={600} c="dimmed">Create New Group</Text>}
          placeholder="Group name, e.g. Verbs, SAT prep"
          value={newGroupName}
          onChange={(event) => onNewGroupNameChange(event.currentTarget.value)}
          onKeyDown={onNewGroupKeyDown}
          disabled={disabled || isSaving}
          size="sm"
          radius="md"
          style={{ flex: 1 }}
        />
      ) : (
        <MultiSelect
          label={<Text size="xs" fw={600} c="dimmed">Groups (optional)</Text>}
          placeholder="Choose one or more groups..."
          value={groups}
          onChange={onGroupsChange}
          data={customGroups.map((group) => ({ value: group, label: group }))}
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
              onClick={onConfirmNewGroup}
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
              onClick={onCancelNewGroup}
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
            onClick={onStartAddingGroup}
            disabled={disabled || isSaving}
          >
            <IconPlus size={20} />
          </ActionIcon>
        </Tooltip>
      )}
    </div>
  );
}
