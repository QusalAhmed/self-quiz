import { Badge, Button, Card, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconChartBar, IconPlus, IconSparkles } from '@tabler/icons-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EditWordModal } from '@/components/EditWordModal/EditWordModal';
import { RichNoteEditor } from '@/components/RichNoteEditor/RichNoteEditor';
import { DefinitionEditorCard } from '@/components/WordForm/DefinitionEditorCard';
import { GroupSelector } from '@/components/WordForm/GroupSelector';
import { type WordFormEditValues, type DefinitionFormValue } from '@/components/WordForm/types';
import {
  createEmptyDefinitionFormValue,
  definitionsToFormValues,
} from '@/components/WordForm/utils';
import type { WordDefinition, WordRecord } from '@/lib/db';
import { definitionsToMeaning, normalizeDefinitions, sanitizeMeaning } from '@/lib/definitions';
import { DEFAULT_AI_EXAMPLE_COUNT, normalizeAiExampleCount } from '@/lib/examples';
import { getUsageFrequencyColor, normalizeUsageFrequency } from '@/lib/word-family';

export type { WordFormEditValues } from '@/components/WordForm/types';

type WordFormProps = {
  disabled?: boolean;
  customGroups: string[];
  onAddCustomGroup?: (group: string) => void;
  variant?: 'card' | 'embedded' | 'plain';
  editValues?: WordFormEditValues | null;
  existingWords?: WordRecord[];
  onEditExisting?: (
    id: string,
    word: string,
    meaning: string,
    definitions: WordDefinition[],
    groups: string[],
    aiExampleCount: number,
    notes?: string,
    usageFrequency?: string,
    generatorAiDetails?: string
  ) => Promise<void> | void;
  onSubmit: (
    word: string,
    meaning: string,
    definitions: WordDefinition[],
    groups: string[],
    aiExampleCount: number,
    notes?: string,
    usageFrequency?: string,
    generatorAiDetails?: string
  ) => Promise<void> | void;
  onCancel?: () => void;
};

const FREQUENCY_PRESETS = [
  'Top 500',
  'Top 1000',
  'Top 2000',
  'Top 3000',
  'Top 5000',
  'Top 10000',
  'Rare',
];

export function WordForm({
  disabled,
  customGroups,
  onAddCustomGroup,
  variant = 'card',
  editValues,
  existingWords,
  onEditExisting,
  onSubmit,
  onCancel,
}: WordFormProps) {
  const isEditMode = editValues != null;

  const [word, setWord] = useState('');
  const [definitions, setDefinitions] = useState<DefinitionFormValue[]>([
    createEmptyDefinitionFormValue(),
  ]);
  const [groups, setGroups] = useState<string[]>([]);
  const [aiExampleCount, setAiExampleCount] = useState(String(DEFAULT_AI_EXAMPLE_COUNT));
  const [notes, setNotes] = useState('');
  const [usageFrequency, setUsageFrequency] = useState('');
  const [generatorAiDetails, setGeneratorAiDetails] = useState('');
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editModalRecord, setEditModalRecord] = useState<WordRecord | null>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setWord('');
    setDefinitions([createEmptyDefinitionFormValue()]);
    setGroups([]);
    setAiExampleCount(String(DEFAULT_AI_EXAMPLE_COUNT));
    setNotes('');
    setUsageFrequency('');
    setGeneratorAiDetails('');
    setIsAddingNewGroup(false);
    setNewGroupName('');
  }, []);

  const findExistingWord = useCallback(
    (value: string): WordRecord | undefined => {
      const normalized = value.trim().toLowerCase();
      if (!normalized || !existingWords?.length) {
        return undefined;
      }
      return existingWords.find((item) => item.word.trim().toLowerCase() === normalized);
    },
    [existingWords]
  );

  const openEditModalForExistingWord = useCallback(
    (value: string) => {
      if (isEditMode || !onEditExisting) {
        return false;
      }
      const match = findExistingWord(value);
      if (!match) {
        return false;
      }
      setEditModalRecord(match);
      resetForm();
      return true;
    },
    [findExistingWord, isEditMode, onEditExisting, resetForm]
  );

  useEffect(() => {
    if (isEditMode && editValues) {
      setWord(editValues.word);
      const normalized = normalizeDefinitions(editValues.definitions, editValues.meaning);
      setDefinitions(definitionsToFormValues(normalized));
      setGroups(editValues.groups);
      setAiExampleCount(String(normalizeAiExampleCount(editValues.aiExampleCount)));
      setNotes(editValues.notes || '');
      setUsageFrequency(editValues.usageFrequency || '');
      setGeneratorAiDetails(editValues.generatorAiDetails || '');
      setIsAddingNewGroup(false);
      setNewGroupName('');
    }
  }, [isEditMode, editValues]);

  const canSubmit = word.trim().length > 0 && !isSaving;
  const inputSize = variant === 'card' ? 'md' : 'sm';
  const buttonSize = variant === 'embedded' ? 'xs' : variant === 'card' ? 'md' : 'sm';

  const parsedDefinitions = (): WordDefinition[] =>
    normalizeDefinitions(
      definitions.map((definition) => ({
        meaning: sanitizeMeaning(definition.meaning),
        partOfSpeech: definition.partOfSpeech,
        examples: definition.examples,
        userExamples: definition.userExamples,
      }))
    );

  const handleSubmit = async (event?: React.SubmitEvent<HTMLFormElement>) => {
    if (event) {
      event.preventDefault();
    }
    if (!canSubmit) {
      return;
    }

    if (!isEditMode && openEditModalForExistingWord(word)) {
      return;
    }

    setIsSaving(true);
    try {
      const nextDefinitions = parsedDefinitions();
      const normalizedFrequency = normalizeUsageFrequency(usageFrequency);
      await onSubmit(
        word.trim(),
        definitionsToMeaning(nextDefinitions),
        nextDefinitions,
        groups,
        normalizeAiExampleCount(aiExampleCount),
        notes,
        normalizedFrequency,
        generatorAiDetails.trim()
      );
      if (!isEditMode) {
        resetForm();
        setTimeout(() => {
          wordInputRef.current?.focus();
        }, 0);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDefinitionKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const handleWordKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const handleExampleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const handleNewGroupKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const trimmed = newGroupName.trim();
      if (trimmed) {
        onAddCustomGroup?.(trimmed);
        setGroups((prev) => Array.from(new Set([...prev, trimmed])));
      }
      setNewGroupName('');
      setIsAddingNewGroup(false);
    }
  };

  const updateDefinition = (
    index: number,
    value: Partial<Pick<DefinitionFormValue, 'meaning' | 'partOfSpeech'>>
  ) => {
    const updatedValue = { ...value };
    if (updatedValue.meaning !== undefined) {
      updatedValue.meaning = sanitizeMeaning(updatedValue.meaning);
    }
    setDefinitions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updatedValue } : item))
    );
  };

  const addDefinitionField = () => {
    setDefinitions((prev) => [...prev, createEmptyDefinitionFormValue()]);
  };

  const removeDefinitionField = (index: number) => {
    setDefinitions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [createEmptyDefinitionFormValue()];
    });
  };

  const updateDefinitionExample = (defIndex: number, exIndex: number, value: string) => {
    setDefinitions((prev) =>
      prev.map((item, i) =>
        i === defIndex
          ? {
              ...item,
              userExamples: item.userExamples.map((example, ei) =>
                ei === exIndex ? value : example
              ),
            }
          : item
      )
    );
  };

  const addDefinitionExampleField = (defIndex: number) => {
    setDefinitions((prev) =>
      prev.map((item, i) =>
        i === defIndex ? { ...item, userExamples: [...item.userExamples, ''] } : item
      )
    );
  };

  const removeDefinitionExampleField = (defIndex: number, exIndex: number) => {
    setDefinitions((prev) =>
      prev.map((item, i) => {
        if (i !== defIndex) {
          return item;
        }
        const next = item.userExamples.filter((_, ei) => ei !== exIndex);
        return { ...item, userExamples: next.length > 0 ? next : [''] };
      })
    );
  };

  const formContent = (
    <form onSubmit={handleSubmit}>
      <Stack gap={variant === 'embedded' ? 'md' : 'lg'}>
        {variant === 'card' && (
          <div>
            <Text
              fw={700}
              size="lg"
              className="text-gradient"
              mb={2}
              style={{ fontFamily: 'var(--font-title)' }}
            >
              {isEditMode ? 'Edit Vocabulary Word' : 'Add New Vocabulary Word'}
            </Text>
          </div>
        )}

        <TextInput
          ref={wordInputRef}
          data-autofocus
          label={
            <Text size="xs" fw={600} c="dimmed" span>
              English Word
            </Text>
          }
          placeholder="e.g. eloquent, pragmatic, nebulous"
          value={word}
          onChange={(event) => setWord(event.currentTarget.value)}
          onKeyDown={handleWordKeyDown}
          onBlur={() => {
            openEditModalForExistingWord(word);
          }}
          disabled={disabled || isSaving}
          required
          size={inputSize}
          radius="md"
        />

        <Stack gap="md">
          <Text size="xs" fw={600} c="dimmed">
            Definitions (optional) — add one entry per meaning
          </Text>
          {definitions.map((definition, index) => (
            <DefinitionEditorCard
              key={`definition-${index}`}
              definition={definition}
              index={index}
              inputSize={inputSize}
              disabled={disabled}
              isSaving={isSaving}
              definitionCount={definitions.length}
              onUpdateDefinition={updateDefinition}
              onRemoveDefinition={removeDefinitionField}
              onUpdateExample={updateDefinitionExample}
              onAddExample={addDefinitionExampleField}
              onRemoveExample={removeDefinitionExampleField}
              onDefinitionKeyDown={handleDefinitionKeyDown}
              onExampleKeyDown={handleExampleKeyDown}
            />
          ))}
          <Button
            variant="light"
            color="indigo"
            size="xs"
            radius="md"
            leftSection={<IconPlus size={14} />}
            onClick={addDefinitionField}
            disabled={disabled || isSaving}
            type="button"
            w="fit-content"
          >
            Add definition
          </Button>
        </Stack>

        {/* ── Usage Frequency & AI Generator Info Section ── */}
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Group gap={6}>
              <IconChartBar size={15} style={{ color: 'var(--mantine-color-indigo-4)' }} />
              <Text size="xs" fw={600} c="dimmed">
                Usage Frequency Tier (optional)
              </Text>
            </Group>
            {generatorAiDetails && (
              <Badge
                size="xs"
                variant="light"
                color="indigo"
                leftSection={<IconSparkles size={11} />}
              >
                {generatorAiDetails}
              </Badge>
            )}
          </Group>

          {/* Quick selection chips for standard frequency tiers */}
          <Group gap={6} wrap="wrap">
            {FREQUENCY_PRESETS.map((preset) => {
              const isSelected = normalizeUsageFrequency(usageFrequency) === preset;
              const color = getUsageFrequencyColor(preset);
              return (
                <Badge
                  key={preset}
                  size="sm"
                  radius="md"
                  variant={isSelected ? 'filled' : 'light'}
                  color={isSelected ? color : 'gray'}
                  style={{
                    cursor: 'pointer',
                    textTransform: 'none',
                    fontWeight: isSelected ? 700 : 500,
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => {
                    setUsageFrequency(isSelected ? '' : preset);
                  }}
                >
                  {preset}
                </Badge>
              );
            })}
          </Group>

          <Group grow gap="sm" mt={4}>
            <TextInput
              placeholder="Or custom frequency (e.g. Top 1500)"
              value={usageFrequency}
              onChange={(e) => setUsageFrequency(e.currentTarget.value)}
              disabled={disabled || isSaving}
              size="xs"
              radius="md"
            />
            <TextInput
              placeholder="AI Generator Details (e.g. Google Gemini)"
              value={generatorAiDetails}
              onChange={(e) => setGeneratorAiDetails(e.currentTarget.value)}
              disabled={disabled || isSaving}
              size="xs"
              radius="md"
            />
          </Group>
        </Stack>

        <GroupSelector
          customGroups={customGroups}
          groups={groups}
          isAddingNewGroup={isAddingNewGroup}
          newGroupName={newGroupName}
          disabled={disabled}
          isSaving={isSaving}
          onGroupsChange={setGroups}
          onNewGroupNameChange={setNewGroupName}
          onNewGroupKeyDown={handleNewGroupKeyDown}
          onStartAddingGroup={() => setIsAddingNewGroup(true)}
          onConfirmNewGroup={() => {
            const trimmed = newGroupName.trim();
            if (trimmed) {
              onAddCustomGroup?.(trimmed);
              setGroups((prev) => Array.from(new Set([...prev, trimmed])));
            }
            setNewGroupName('');
            setIsAddingNewGroup(false);
          }}
          onCancelNewGroup={() => {
            setNewGroupName('');
            setIsAddingNewGroup(false);
          }}
        />

        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            Rich Text Note (optional)
          </Text>
          <RichNoteEditor value={notes} onChange={setNotes} />
        </Stack>

        <Stack gap="sm">
          <TextInput
            label={
              <Text size="xs" fw={600} c="dimmed" span>
                AI examples per definition
              </Text>
            }
            description="Default 5. The app will ask AI for this many examples when possible."
            type="number"
            min={1}
            max={10}
            step={1}
            value={aiExampleCount}
            onChange={(event) => setAiExampleCount(event.currentTarget.value)}
            disabled={disabled || isSaving}
            size={inputSize}
            radius="md"
            style={{ maxWidth: 260 }}
          />
        </Stack>

        <Group
          justify="flex-end"
          gap={isEditMode ? 'xs' : 'sm'}
          mt={variant === 'plain' ? 'sm' : 'xs'}
        >
          {isEditMode && onCancel && (
            <Button
              variant="subtle"
              color="gray"
              size={buttonSize}
              radius="md"
              onClick={onCancel}
              disabled={isSaving}
              type="button"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!canSubmit || disabled}
            loading={isSaving}
            className={isEditMode ? undefined : 'btn-premium'}
            color={isEditMode ? 'indigo' : undefined}
            radius="md"
            size={buttonSize}
            leftSection={isEditMode ? undefined : <IconPlus size={buttonSize === 'md' ? 18 : 16} />}
          >
            {isEditMode ? 'Save Changes' : 'Save Word'}
          </Button>
        </Group>
      </Stack>
    </form>
  );

  const closeEditModal = () => {
    setEditModalRecord(null);
    setTimeout(() => {
      wordInputRef.current?.focus();
    }, 0);
  };

  const editModal =
    !isEditMode && onEditExisting ? (
      <EditWordModal
        opened={editModalRecord !== null}
        onClose={closeEditModal}
        wordRecord={editModalRecord}
        customGroups={customGroups}
        onSave={async (
          id,
          nextWord,
          nextMeaning,
          nextDefinitions,
          nextGroups,
          nextAiExampleCount,
          nextNotes,
          nextUsageFrequency,
          nextGeneratorAiDetails
        ) => {
          await onEditExisting(
            id,
            nextWord,
            nextMeaning,
            nextDefinitions,
            nextGroups,
            nextAiExampleCount,
            nextNotes,
            nextUsageFrequency,
            nextGeneratorAiDetails
          );
          closeEditModal();
        }}
        onAddCustomGroup={onAddCustomGroup}
      />
    ) : null;

  if (variant === 'card') {
    return (
      <>
        <Card
          className="glass-panel"
          radius="lg"
          padding={0}
          style={{
            borderLeft: '4px solid #6366f1',
            overflow: 'hidden',
            padding: 'clamp(16px, 4vw, 32px)',
          }}
        >
          {formContent}
        </Card>
        {editModal}
      </>
    );
  }

  return (
    <>
      {formContent}
      {editModal}
    </>
  );
}
