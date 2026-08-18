import {
  ActionIcon,
  Badge,
  Button,
  Collapse,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconHierarchy,
  IconRotateClockwise,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import React, { useState } from 'react';
import type { WordFamilyMemberRecord } from '@/lib/db';

type WordFamilySectionProps = {
  wordId: string;
  word: string;
  members: WordFamilyMemberRecord[];
  isLoading?: boolean;
  onRefresh?: (wordId: string, word: string) => Promise<void> | void;
  onDeleteMember?: (memberId: string) => Promise<void> | void;
};

const POS_COLORS: Record<string, string> = {
  noun: 'blue',
  verb: 'teal',
  adjective: 'grape',
  adverb: 'orange',
  pronoun: 'cyan',
  preposition: 'indigo',
  conjunction: 'pink',
  interjection: 'yellow',
};

function getPosColor(pos: string): string {
  const normalized = pos.trim().toLowerCase();
  for (const [key, color] of Object.entries(POS_COLORS)) {
    if (normalized.includes(key)) {
      return color;
    }
  }
  return 'gray';
}

export function WordFamilySection({
  wordId,
  word,
  members,
  isLoading = false,
  onRefresh,
  onDeleteMember,
}: WordFamilySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<{
    id: string;
    word: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Exclude main word from family members
  const normalizedWord = word.trim().toLowerCase();
  const validMembers = members.filter((m) => m.word.trim().toLowerCase() !== normalizedWord);

  const handleConfirmDelete = async () => {
    if (!deleteConfirmMember || !onDeleteMember) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDeleteMember(deleteConfirmMember.id);
      setDeleteConfirmMember(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (validMembers.length === 0) {
    if (!onRefresh) {
      return null;
    }
    return (
      <div
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px dashed rgba(99, 102, 241, 0.18)',
        }}
      >
        <Button
          size="sm"
          variant="light"
          color="indigo"
          radius="md"
          leftSection={isLoading ? undefined : <IconSparkles size={16} />}
          loading={isLoading}
          disabled={isLoading}
          onClick={(e) => {
            e.stopPropagation();
            void onRefresh(wordId, word);
          }}
          style={{
            fontSize: '12px',
            height: '24px',
            paddingLeft: '8px',
            paddingRight: '10px',
          }}
        >
          {isLoading ? 'Generating Family...' : 'Generate Word Family'}
        </Button>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 8,
        borderTop: '1px dashed rgba(99, 102, 241, 0.2)',
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" mb={isExpanded ? 8 : 0}>
        <UnstyledButton
          onClick={() => setIsExpanded((prev) => !prev)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
        >
          <IconHierarchy size={17} style={{ color: 'var(--mantine-color-indigo-5)' }} />
          <Text size="xs" fw={700} c="indigo">
            Word Family ({validMembers.length})
          </Text>
          {isExpanded ? (
            <IconChevronUp size={15} style={{ color: 'var(--mantine-color-indigo-5)' }} />
          ) : (
            <IconChevronDown size={15} style={{ color: 'var(--mantine-color-indigo-5)' }} />
          )}
        </UnstyledButton>

        {onRefresh && (
          <Tooltip label="Regenerate word family" withArrow position="top">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="indigo"
              loading={isLoading}
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                void onRefresh(wordId, word);
              }}
              aria-label={`Regenerate word family for ${word}`}
            >
              <IconRotateClockwise size={15} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {/* Summary chips row when collapsed or expanded */}
      <Group gap={8} mt={8} wrap="wrap">
        {validMembers.map((m) => {
          const isSelected = selectedMemberId === m.id;
          const posColor = getPosColor(m.partOfSpeech);

          return (
            <Badge
              key={m.id}
              size="md"
              radius="md"
              variant={isSelected ? 'filled' : 'light'}
              color={posColor}
              style={{
                cursor: 'pointer',
                textTransform: 'none',
                fontSize: '11px',
                padding: '0 10px',
                height: '26px',
                transition: 'all 0.15s ease',
              }}
              onClick={() => {
                if (!isExpanded) {
                  setIsExpanded(true);
                }
                setSelectedMemberId(selectedMemberId === m.id ? null : m.id);
              }}
            >
              <span style={{ fontWeight: 700 }}>{m.word}</span>
              {m.partOfSpeech ? (
                <span style={{ opacity: 0.85, marginLeft: 5, fontSize: '11px' }}>
                  ({m.partOfSpeech})
                </span>
              ) : null}
            </Badge>
          );
        })}
      </Group>

      {/* Expanded detailed breakdown */}
      <Collapse expanded={isExpanded}>
        <Stack gap="sm" mt={10}>
          {validMembers.map((m) => {
            const isHighlight = selectedMemberId === m.id;
            const posColor = getPosColor(m.partOfSpeech);

            return (
              <Paper
                key={m.id}
                p="sm"
                radius="md"
                withBorder
                style={{
                  background: isHighlight
                    ? 'rgba(99, 102, 241, 0.09)'
                    : 'rgba(255, 255, 255, 0.03)',
                  borderColor: isHighlight
                    ? 'rgba(99, 102, 241, 0.45)'
                    : 'rgba(99, 102, 241, 0.15)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Group justify="space-between" align="center" wrap="nowrap" gap={8}>
                  <Group gap={8} align="center" wrap="wrap">
                    <Text size="md" fw={600} style={{ color: 'var(--text-primary)' }}>
                      {m.word}
                    </Text>
                    {m.partOfSpeech && (
                      <Badge size="xs" variant="dot" color={posColor}>
                        {m.partOfSpeech}
                      </Badge>
                    )}
                    {m.banglaDefinition && (
                      <Text size="sm" fw={600} c="teal">
                        • {m.banglaDefinition}
                      </Text>
                    )}
                  </Group>

                  {onDeleteMember && (
                    <Tooltip label={`Remove "${m.word}" from family`} withArrow position="left">
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmMember({ id: m.id, word: m.word });
                        }}
                        aria-label={`Delete ${m.word} from family`}
                      >
                        <IconTrash size={15} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>

                {m.englishDefinition && (
                  <Text size="sm" c="orange" mt={4} style={{ lineHeight: 1.45 }}>
                    {m.englishDefinition}
                  </Text>
                )}

                {m.examples && m.examples.length > 0 && (
                  <Stack gap={3} mt={6}>
                    {m.examples.map((ex, idx) => (
                      <Text
                        key={idx}
                        size="sm"
                        fs="italic"
                        style={{
                          color: 'var(--text-secondary, rgba(255, 255, 255, 0.8))',
                          paddingLeft: 10,
                          borderLeft: '2px solid rgba(99, 102, 241, 0.35)',
                          lineHeight: 1.4,
                        }}
                      >
                        "{ex}"
                      </Text>
                    ))}
                  </Stack>
                )}
              </Paper>
            );
          })}
        </Stack>
      </Collapse>

      {/* Confirmation Modal */}
      <Modal
        opened={!!deleteConfirmMember}
        onClose={() => !isDeleting && setDeleteConfirmMember(null)}
        title={
          <Group gap="xs">
            <ThemeIcon color="red" variant="light" size="md" radius="md">
              <IconAlertTriangle size={16} />
            </ThemeIcon>
            <Text fw={700} size="md" style={{ fontFamily: 'var(--font-title)' }}>
              Remove from Word Family
            </Text>
          </Group>
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
        <Stack gap="md">
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
            Are you sure you want to remove{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirmMember?.word}</strong>{' '}
            from the word family of{' '}
            <strong style={{ color: 'var(--mantine-color-indigo-4)' }}>{word}</strong>?
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              size="sm"
              radius="md"
              onClick={() => setDeleteConfirmMember(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              color="red"
              size="sm"
              radius="md"
              onClick={handleConfirmDelete}
              loading={isDeleting}
            >
              Remove Word
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
