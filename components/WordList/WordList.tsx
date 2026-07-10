import { Badge, Button, Card, Group, Modal, Stack, Text, Tooltip } from '@mantine/core';
import { IconEdit, IconTrash, IconRotateClockwise } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { DefinitionsDisplay } from '@/components/DefinitionsDisplay/DefinitionsDisplay';
import { WordActionIcon } from '@/components/WordActions/WordActionIcon';
import { WordForm } from '@/components/WordForm/WordForm';
import { formatDate, formatRelativeShort } from '@/lib/dateUtils';
import type { WordDefinition, WordRecord } from '@/lib/db';
import { getWordDefinitions } from '@/lib/definitions';
import { getWordGroups } from '@/lib/groups';

type WordListProps = {
    words: WordRecord[];
    onDelete: (id: string) => Promise<void> | void;
    onEdit: (
        id: string,
        word: string,
        meaning: string,
        definitions: WordDefinition[],
        customGroups: string[]
    ) => Promise<void> | void;
    onRefreshExamples: (id: string) => Promise<void> | void;
    customGroups: string[];
    onAddCustomGroup?: (group: string) => void;
    generatingExampleWordIds?: Record<string, boolean>;
};

export function WordList({
                             words,
                             onDelete,
                             onEdit,
                             onRefreshExamples,
                             customGroups,
                             onAddCustomGroup,
                             generatingExampleWordIds = {},
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
            definitions: getWordDefinitions(editingItem),
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
                        style={{fontFamily: 'var(--font-title)'}}
                    >
                        Your Vocabulary is Empty
                    </Text>
                    <Text size="sm" c="dimmed" style={{lineHeight: 1.6, maxWidth: 360, margin: '0 auto'}}>
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
                    const definitions = getWordDefinitions(item);
                    const hasMeaning = definitions.length > 0;
                    const isGeneratingExamples = generatingExampleWordIds[item.id];

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
                            <Group justify={'space-between'} wrap={'nowrap'}>
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

                                    <Tooltip label={formatDate(item.updatedAt)} withArrow arrowSize={8}>
                                        <Badge
                                            variant="filled"
                                            color={hasMeaning ? 'indigo' : 'orange'}
                                            size="xs"
                                            radius="sm"
                                            className="date-pill"
                                            style={{fontSize: '11px', fontWeight: 700, textTransform: 'none'}}
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
                                            style={{fontSize: '11px', fontWeight: 700, textTransform: 'none'}}
                                        >
                                            {groupName}
                                        </Badge>
                                    ))}
                                </Group>
                                <Group gap={4} style={{flexShrink: 0, marginLeft: 8}}>
                                    {!isEditing && (
                                        <>
                                            <WordActionIcon
                                                label="Generate new examples"
                                                ariaLabel={`Generate new examples for ${item.word}`}
                                                color="indigo"
                                                size="sm"
                                                onClick={() => onRefreshExamples(item.id)}
                                                disabled={isGeneratingExamples}
                                                loading={isGeneratingExamples}
                                            >
                                                <IconRotateClockwise size={15}/>
                                            </WordActionIcon>
                                            <WordActionIcon
                                                label="Edit word"
                                                ariaLabel={`Edit ${item.word}`}
                                                color="indigo"
                                                size="sm"
                                                onClick={() => setEditingId(item.id)}
                                            >
                                                <IconEdit size={15}/>
                                            </WordActionIcon>
                                            <WordActionIcon
                                                label="Delete word"
                                                ariaLabel={`Delete ${item.word}`}
                                                color="red"
                                                size="sm"
                                                onClick={() => openDeleteConfirm(item.id, item.word)}
                                            >
                                                <IconTrash size={15}/>
                                            </WordActionIcon>
                                        </>
                                    )}
                                </Group>
                            </Group>

                            {/* Definitions (always visible), each shown separately with its own examples */}
                            {!isEditing && (
                                <div style={{marginTop: 6}}>
                                    <DefinitionsDisplay
                                        definitions={definitions}
                                        emptyText="Fetching definition..."
                                    />
                                    {isGeneratingExamples && (
                                        <Text size="xs" c="dimmed" mt={6}>
                                            Generating examples...
                                        </Text>
                                    )}
                                </div>
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
                                        onSubmit={async (word, meaning, definitions, groups) => {
                                            if (!editingId) {
                                                return;
                                            }
                                            await onEdit(editingId, word, meaning, definitions, groups);
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
                    <Text fw={700} size="md" style={{fontFamily: 'var(--font-title)'}}>
                        Delete Word
                    </Text>
                }
                centered
                radius="lg"
                size="sm"
                overlayProps={{backgroundOpacity: 0.5, blur: 4}}
                styles={{
                    content: {
                        border: '1px solid var(--card-border)',
                        background: 'var(--card-bg)',
                    },
                }}
            >
                <Stack gap="lg">
                    <Text size="sm" c="dimmed" style={{lineHeight: 1.6}}>
                        Are you sure you want to delete{' '}
                        <strong style={{color: 'var(--text-primary)'}}>{deleteConfirmWord}</strong>? This will
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
