import React, { useEffect, useRef, useState } from 'react';
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

export type WordFormEditValues = {
    word: string;
    meaning: string;
    userExamples: string[];
    groups: string[];
};

type WordFormProps = {
    disabled?: boolean;
    customGroups: string[];
    onAddCustomGroup?: (group: string) => void;
    variant?: 'card' | 'embedded' | 'plain';
    editValues?: WordFormEditValues | null;
    onSubmit: (
        word: string,
        meaning: string,
        userExamples: string[],
        groups: string[]
    ) => Promise<void> | void;
    onCancel?: () => void;
};

function normalizeExamples(values: string[]): string[] {
    const trimmed = values.map((value) => value.trim()).filter(Boolean);
    return trimmed.length > 0 ? trimmed : [''];
}

export function WordForm({
                             disabled,
                             customGroups,
                             onAddCustomGroup,
                             variant = 'card',
                             editValues,
                             onSubmit,
                             onCancel,
                         }: WordFormProps) {
    const isEditMode = editValues != null;

    const [word, setWord] = useState('');
    const [meaning, setMeaning] = useState('');
    const [examples, setExamples] = useState<string[]>(['']);
    const [groups, setGroups] = useState<string[]>([]);
    const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const wordInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditMode && editValues) {
            setWord(editValues.word);
            setMeaning(editValues.meaning);
            setExamples(normalizeExamples(editValues.userExamples));
            setGroups(editValues.groups);
            setIsAddingNewGroup(false);
            setNewGroupName('');
        }
    }, [isEditMode, editValues]);

    const canSubmit = word.trim().length > 0 && !isSaving;
    const inputSize = variant === 'card' ? 'md' : 'sm';
    const buttonSize = variant === 'embedded' ? 'xs' : variant === 'card' ? 'md' : 'sm';

    const resetForm = () => {
        setWord('');
        setMeaning('');
        setExamples(['']);
        setGroups([]);
        setIsAddingNewGroup(false);
        setNewGroupName('');
    };

    const parsedExamples = () => examples.map((value) => value.trim()).filter(Boolean);

    const handleSubmit = async (event?: React.SubmitEvent<HTMLFormElement>) => {
        if (event) {
            event.preventDefault();
        }
        if (!canSubmit) {
            return;
        }

        setIsSaving(true);
        try {
            await onSubmit(word.trim(), meaning.trim(), parsedExamples(), groups);
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

    const handleMeaningKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey && !isEditMode) {
            event.preventDefault();
            void handleSubmit();
        }
    };

    const updateExample = (index: number, value: string) => {
        setExamples((prev) => prev.map((item, i) => (i === index ? value : item)));
    };

    const addExampleField = () => {
        setExamples((prev) => [...prev, '']);
    };

    const removeExampleField = (index: number) => {
        setExamples((prev) => {
            const next = prev.filter((_, i) => i !== index);
            return next.length > 0 ? next : [''];
        });
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
                    disabled={disabled || isSaving}
                    required
                    size={inputSize}
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

                <Stack gap="xs">
                    <Text size="xs" fw={600} c="dimmed">
                        Examples (optional)
                    </Text>
                    {examples.map((example, index) => (
                        <Group key={`example-${index}`} align="flex-end" gap="xs" wrap="nowrap">
                            <Textarea
                                placeholder="Add an example sentence using this word..."
                                value={example}
                                onChange={(event) =>
                                    updateExample(index, event.currentTarget.value.replace(/\s+/g, ' ').trim())
                                }
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
                                    onClick={() => removeExampleField(index)}
                                    disabled={disabled || isSaving || examples.length === 1}
                                    type="button"
                                    aria-label="Remove example"
                                >
                                    <IconX size={16}/>
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    ))}
                    <Button
                        variant="light"
                        color="indigo"
                        size="xs"
                        radius="md"
                        leftSection={<IconPlus size={14}/>}
                        onClick={addExampleField}
                        disabled={disabled || isSaving}
                        type="button"
                        w="fit-content"
                    >
                        Add example
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

    if (variant === 'card') {
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
                {formContent}
            </Card>
        );
    }

    return formContent;
}
