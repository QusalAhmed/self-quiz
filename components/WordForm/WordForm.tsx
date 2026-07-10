import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Button,
    Card,
    Group,
    Stack,
    Text,
    TextInput,
    Textarea,
    MultiSelect,
    Select,
    ActionIcon,
    Tooltip,
    Divider,
} from '@mantine/core';
import { IconPlus, IconCheck, IconX } from '@tabler/icons-react';
import { EditWordModal } from '@/components/EditWordModal/EditWordModal';
import type { WordDefinition, WordRecord } from '@/lib/db';
import { PARTS_OF_SPEECH, definitionsToMeaning, normalizeDefinitions } from '@/lib/definitions';

export type WordFormEditValues = {
    word: string;
    meaning: string;
    definitions?: WordDefinition[];
    groups: string[];
};

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
        groups: string[]
    ) => Promise<void> | void;
    onSubmit: (
        word: string,
        meaning: string,
        definitions: WordDefinition[],
        groups: string[]
    ) => Promise<void> | void;
    onCancel?: () => void;
};

/** Form-local shape for a definition being edited. `examples` (AI-generated) are carried
 * through untouched; only `userExamples` are editable here. */
type DefinitionFormValue = {
    meaning: string;
    partOfSpeech: string;
    examples: string[];
    userExamples: string[];
};

function normalizeExamples(values: string[]): string[] {
    const trimmed = values.map((value) => value.trim()).filter(Boolean);
    return trimmed.length > 0 ? trimmed : [''];
}

function createEmptyDefinitionFormValue(): DefinitionFormValue {
    return { meaning: '', partOfSpeech: '', examples: [], userExamples: [''] };
}

function definitionsToFormValues(definitions: WordDefinition[]): DefinitionFormValue[] {
    if (definitions.length === 0) {
        return [createEmptyDefinitionFormValue()];
    }
    return definitions.map((definition) => ({
        meaning: definition.meaning,
        partOfSpeech: definition.partOfSpeech,
        examples: Array.isArray(definition.examples) ? definition.examples : [],
        userExamples: normalizeExamples(
            Array.isArray(definition.userExamples) ? definition.userExamples : []
        ),
    }));
}

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
    const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [editModalRecord, setEditModalRecord] = useState<WordRecord | null>(null);
    const wordInputRef = useRef<HTMLInputElement>(null);

    const resetForm = useCallback(() => {
        setWord('');
        setDefinitions([createEmptyDefinitionFormValue()]);
        setGroups([]);
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
                meaning: definition.meaning,
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
            await onSubmit(word.trim(), definitionsToMeaning(nextDefinitions), nextDefinitions, groups);
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

    const updateDefinition = (index: number, value: Partial<Pick<DefinitionFormValue, 'meaning' | 'partOfSpeech'>>) => {
        setDefinitions((prev) =>
            prev.map((item, i) => (i === index ? { ...item, ...value } : item))
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
                            style={{fontFamily: 'var(--font-title)'}}
                        >
                            {isEditMode ? 'Edit Vocabulary Word' : 'Add New Vocabulary Word'}
                        </Text>
                    </div>
                )}

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
                        <Card
                            key={`definition-${index}`}
                            withBorder
                            radius="md"
                            padding="sm"
                            style={{ background: 'rgba(99, 102, 241, 0.03)' }}
                        >
                            <Stack gap={8}>
                                <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
                                    <Text size="sm" fw={700} c="indigo" style={{ lineHeight: 1.4 }}>
                                        Definition {index + 1}
                                    </Text>
                                    <Tooltip label="Remove definition" withArrow>
                                        <ActionIcon
                                            variant="light"
                                            color="gray"
                                            size={inputSize}
                                            radius="md"
                                            onClick={() => removeDefinitionField(index)}
                                            disabled={disabled || isSaving || definitions.length === 1}
                                            type="button"
                                            aria-label="Remove definition"
                                        >
                                            <IconX size={16}/>
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                                <Group align="flex-end" gap="xs" wrap="wrap">
                                    <Select
                                        label={
                                            <Text size="xs" fw={600} c="dimmed">
                                                Part of speech
                                            </Text>
                                        }
                                        placeholder="Any"
                                        value={definition.partOfSpeech || null}
                                        onChange={(value) =>
                                            updateDefinition(index, {partOfSpeech: value ?? ''})
                                        }
                                        data={PARTS_OF_SPEECH.map((part) => ({
                                            value: part,
                                            label: part.charAt(0).toUpperCase() + part.slice(1),
                                        }))}
                                        disabled={disabled || isSaving}
                                        size="sm"
                                        radius="md"
                                        clearable
                                        searchable
                                        w={{ base: '100%', sm: 160 }}
                                        style={{flexShrink: 0}}
                                    />
                                    <Textarea
                                        label={
                                            <Text size="xs" fw={600} c="dimmed">
                                                Definition
                                            </Text>
                                        }
                                        placeholder="Type ..."
                                        value={definition.meaning}
                                        onChange={(event) =>
                                            updateDefinition(index, {meaning: event.currentTarget.value})
                                        }
                                        onKeyDown={handleDefinitionKeyDown}
                                        disabled={disabled || isSaving}
                                        minRows={1}
                                        size="sm"
                                        radius="md"
                                        autosize
                                        style={{flex: 1, minWidth: 200}}
                                    />
                                </Group>

                                <Divider label="Your examples for this definition" labelPosition="left" />

                                <Stack gap={6}>
                                    {definition.userExamples.map((example, exIndex) => (
                                        <Group key={`definition-${index}-example-${exIndex}`} align="flex-end" gap="xs" wrap="nowrap">
                                            <Textarea
                                                placeholder="Add an example sentence using this meaning..."
                                                value={example}
                                                onChange={(event) =>
                                                    updateDefinitionExample(
                                                        index,
                                                        exIndex,
                                                        event.currentTarget.value.replace(/\s+/g, ' ')
                                                    )
                                                }
                                                onKeyDown={handleExampleKeyDown}
                                                disabled={disabled || isSaving}
                                                minRows={1}
                                                size="sm"
                                                radius="md"
                                                autosize
                                                style={{flex: 1}}
                                            />
                                            <Tooltip label="Remove example" withArrow>
                                                <ActionIcon
                                                    variant="light"
                                                    color="gray"
                                                    size={inputSize}
                                                    radius="md"
                                                    onClick={() => removeDefinitionExampleField(index, exIndex)}
                                                    disabled={disabled || isSaving || definition.userExamples.length === 1}
                                                    type="button"
                                                    aria-label="Remove example"
                                                >
                                                    <IconX size={16}/>
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    ))}
                                    <Button
                                        variant="subtle"
                                        color="indigo"
                                        size="xs"
                                        radius="md"
                                        leftSection={<IconPlus size={14}/>}
                                        onClick={() => addDefinitionExampleField(index)}
                                        disabled={disabled || isSaving}
                                        type="button"
                                        w="fit-content"
                                    >
                                        Add example
                                    </Button>

                                    {definition.examples.length > 0 && (
                                        <Stack gap={2} mt={4}>
                                            <Text size="xs" fw={600} c="dimmed">
                                                AI-generated examples
                                            </Text>
                                            {definition.examples.map((example, exIndex) => (
                                                <Text
                                                    key={`definition-${index}-ai-example-${exIndex}`}
                                                    size="xs"
                                                    c="dimmed"
                                                    style={{lineHeight: 1.5, wordBreak: 'break-word'}}
                                                >
                                                    {`• ${example}`}
                                                </Text>
                                            ))}
                                        </Stack>
                                    )}
                                </Stack>
                            </Stack>
                        </Card>
                    ))}
                    <Button
                        variant="light"
                        color="indigo"
                        size="xs"
                        radius="md"
                        leftSection={<IconPlus size={14}/>}
                        onClick={addDefinitionField}
                        disabled={disabled || isSaving}
                        type="button"
                        w="fit-content"
                    >
                        Add definition
                    </Button>
                </Stack>

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
                            onKeyDown={handleNewGroupKeyDown}
                            disabled={disabled || isSaving}
                            size="sm"
                            radius="md"
                            style={{flex: 1}}
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
                            data={customGroups.map((g) => ({value: g, label: g}))}
                            disabled={disabled || isSaving}
                            size="sm"
                            radius="md"
                            style={{flex: 1}}
                            searchable
                            clearable
                        />
                    )}

                    {isAddingNewGroup ? (
                        <Group gap={4} style={{marginBottom: '4px'}}>
                            <Tooltip label="Add Group" withArrow>
                                <ActionIcon
                                    variant="filled"
                                    color="indigo"
                                    size="md"
                                    radius="md"
                                    onClick={() => {
                                        const trimmed = newGroupName.trim();
                                        if (trimmed) {
                                            onAddCustomGroup?.(trimmed);
                                            setGroups((prev) => Array.from(new Set([...prev, trimmed])));
                                        }
                                        setNewGroupName('');
                                        setIsAddingNewGroup(false);
                                    }}
                                    disabled={!newGroupName.trim() || disabled || isSaving}
                                >
                                    <IconCheck size={18}/>
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
                                    <IconX size={18}/>
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
                                style={{marginBottom: '2px'}}
                                onClick={() => setIsAddingNewGroup(true)}
                                disabled={disabled || isSaving}
                            >
                                <IconPlus size={20}/>
                            </ActionIcon>
                        </Tooltip>
                    )}
                </div>

                <Group justify="flex-end" gap={isEditMode ? 'xs' : 'sm'} mt={variant === 'plain' ? 'sm' : 'xs'}>
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
                        leftSection={isEditMode ? undefined : <IconPlus size={20}/>}
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
                onSave={async (id, nextWord, nextMeaning, nextDefinitions, nextGroups) => {
                    await onEditExisting(id, nextWord, nextMeaning, nextDefinitions, nextGroups);
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
