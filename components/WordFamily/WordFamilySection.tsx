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
  IconChartBar,
  IconChevronDown,
  IconChevronUp,
  IconHierarchy,
  IconRotateClockwise,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import React, { useState } from 'react';
import type { WordFamilyMemberRecord } from '@/lib/db';
import { getUsageFrequencyBadgeProps } from '@/lib/word-family';

export type WordFamilySectionProps = {
  wordId: string;
  word: string;
  members: WordFamilyMemberRecord[];
  isLoading?: boolean;
  defaultExpanded?: boolean;
  style?: React.CSSProperties;
  className?: string;
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
  defaultExpanded = false,
  style,
  className,
  onRefresh,
  onDeleteMember,
}: WordFamilySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<{
    id: string;
    word: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const validMembers = (members || []).filter((m) => !m.isDeleted);
  const aiModel = validMembers.find((m) => m.generatorAiDetails)?.generatorAiDetails;

  if (validMembers.length === 0 && !isLoading) {
    return null;
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmMember || !onDeleteMember) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDeleteMember(deleteConfirmMember.id);
      setDeleteConfirmMember(null);
    } catch (err) {
      console.error('Failed to delete word family member:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={className}
      style={{
        marginTop: 10,
        padding: '8px 12px',
        borderRadius: '8px',
        background: 'rgba(99, 102, 241, 0.05)',
        border: '1px solid rgba(99, 102, 241, 0.15)',
        ...style,
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap">
        <UnstyledButton
          onClick={() => setIsExpanded((prev) => !prev)}
          style={{ flex: 1, display: 'flex', alignItems: 'center' }}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} word family for ${word}`}
        >
          <Group gap={6} align="center">
            <ThemeIcon size="xs" variant="light" color="indigo" radius="xl">
              <IconHierarchy size={12} />
            </ThemeIcon>
            <Text size="xs" fw={700} c="indigo">
              Word Family {validMembers.length > 0 ? `(${validMembers.length})` : ''}
            </Text>
            {isLoading && validMembers.length === 0 && (
              <Badge size="xs" variant="light" color="indigo">
                Generating...
              </Badge>
            )}
            {aiModel && (
              <Badge
                size="xs"
                variant="subtle"
                color="indigo"
                leftSection={<IconSparkles size={10} />}
              >
                {aiModel}
              </Badge>
            )}
            {validMembers.length > 0 &&
              (isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />)}
          </Group>
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
          const freqBadge = m.usageFrequency ? getUsageFrequencyBadgeProps(m.usageFrequency) : null;

          return (
            <Tooltip
              key={m.id}
              label={
                freqBadge
                  ? `${m.word} (${m.partOfSpeech || 'word'}) • Frequency: ${freqBadge.label}`
                  : `${m.word} (${m.partOfSpeech || 'word'})`
              }
              withArrow
            >
              <Badge
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
                {freqBadge && (
                  <span
                    style={{
                      opacity: 0.9,
                      marginLeft: 6,
                      fontSize: '10px',
                      background: 'rgba(0, 0, 0, 0.15)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    {freqBadge.shortLabel}
                  </span>
                )}
              </Badge>
            </Tooltip>
          );
        })}
      </Group>

      {/* Expanded detailed breakdown */}
      <Collapse expanded={isExpanded}>
        <Stack gap="sm" mt={10}>
          {validMembers.map((m) => {
            const isHighlight = selectedMemberId === m.id;
            const posColor = getPosColor(m.partOfSpeech);
            const freqBadge = m.usageFrequency
              ? getUsageFrequencyBadgeProps(m.usageFrequency)
              : null;

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
                <Group justify="space-between" align="center" wrap="wrap" gap={8}>
                  <Group gap={8} align="center" wrap="wrap">
                    <Text size="md" fw={600} style={{ color: 'var(--text-primary)' }}>
                      {m.word}
                    </Text>
                    {m.partOfSpeech && (
                      <Badge size="xs" variant="dot" color={posColor}>
                        {m.partOfSpeech}
                      </Badge>
                    )}
                    {freqBadge && (
                      <Tooltip label={freqBadge.tooltip} withArrow>
                        <Badge
                          size="xs"
                          variant="light"
                          color={freqBadge.color}
                          leftSection={<IconChartBar size={11} />}
                          style={{ textTransform: 'none', fontWeight: 700 }}
                        >
                          {freqBadge.label}
                        </Badge>
                      </Tooltip>
                    )}
                    {m.generatorAiDetails && (
                      <Badge
                        size="xs"
                        variant="subtle"
                        color="indigo"
                        leftSection={<IconSparkles size={10} />}
                      >
                        {m.generatorAiDetails}
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

      {/* Delete Member Confirmation Modal */}
      <Modal
        opened={deleteConfirmMember !== null}
        onClose={() => setDeleteConfirmMember(null)}
        title={
          <Group gap={8}>
            <ThemeIcon color="red" variant="light" size="sm">
              <IconAlertTriangle size={14} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Delete Word Family Member
            </Text>
          </Group>
        }
        centered
        size="sm"
        radius="md"
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to remove{' '}
            <Text span fw={700} c="red">
              "{deleteConfirmMember?.word}"
            </Text>{' '}
            from the word family of <strong>{word}</strong>?
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              onClick={() => setDeleteConfirmMember(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button color="red" size="xs" loading={isDeleting} onClick={handleConfirmDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
