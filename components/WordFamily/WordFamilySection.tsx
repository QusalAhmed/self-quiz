import {
  ActionIcon,
  Badge,
  Button,
  Collapse,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
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

  // Exclude main word from family members
  const normalizedWord = word.trim().toLowerCase();
  const validMembers = members.filter(
    (m) => m.word.trim().toLowerCase() !== normalizedWord
  );

  if (validMembers.length === 0) {
    if (!onRefresh) {
      return null;
    }
    return (
      <div
        style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: '1px dashed rgba(99, 102, 241, 0.15)',
        }}
      >
        <Button
          size="xs"
          variant="light"
          color="indigo"
          leftSection={isLoading ? undefined : <IconSparkles size={13} />}
          loading={isLoading}
          disabled={isLoading}
          onClick={(e) => {
            e.stopPropagation();
            void onRefresh(wordId, word);
          }}
          style={{
            fontSize: '11px',
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
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px dashed rgba(99, 102, 241, 0.18)',
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap" mb={isExpanded ? 6 : 0}>
        <UnstyledButton
          onClick={() => setIsExpanded((prev) => !prev)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        >
          <IconHierarchy size={14} style={{ color: 'var(--mantine-color-indigo-5)' }} />
          <Text size="xs" fw={700} c="indigo">
            Word Family ({validMembers.length})
          </Text>
          {isExpanded ? (
            <IconChevronUp size={12} style={{ color: 'var(--mantine-color-indigo-5)' }} />
          ) : (
            <IconChevronDown size={12} style={{ color: 'var(--mantine-color-indigo-5)' }} />
          )}
        </UnstyledButton>

        {onRefresh && (
          <Tooltip label="Regenerate word family" withArrow position="top">
            <ActionIcon
              size="xs"
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
              <IconRotateClockwise size={12} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {/* Summary chips row when collapsed or expanded */}
      <Group gap={6} mt={6} wrap="wrap">
        {validMembers.map((m) => {
          const isSelected = selectedMemberId === m.id;
          const posColor = getPosColor(m.partOfSpeech);

          return (
            <Badge
              key={m.id}
              size="sm"
              radius="sm"
              variant={isSelected ? 'filled' : 'light'}
              color={posColor}
              style={{
                cursor: 'pointer',
                textTransform: 'none',
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
                <span style={{ opacity: 0.8, marginLeft: 4, fontSize: '10px' }}>
                  ({m.partOfSpeech})
                </span>
              ) : null}
            </Badge>
          );
        })}
      </Group>

      {/* Expanded detailed breakdown */}
      <Collapse expanded={isExpanded}>
        <Stack gap="xs" mt={8}>
          {validMembers.map((m) => {
            const isHighlight = selectedMemberId === m.id;
            const posColor = getPosColor(m.partOfSpeech);

            return (
              <Paper
                key={m.id}
                p="xs"
                radius="sm"
                withBorder
                style={{
                  background: isHighlight
                    ? 'rgba(99, 102, 241, 0.08)'
                    : 'rgba(255, 255, 255, 0.03)',
                  borderColor: isHighlight
                    ? 'rgba(99, 102, 241, 0.4)'
                    : 'rgba(99, 102, 241, 0.12)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Group justify="space-between" align="center" wrap="nowrap" gap={6}>
                  <Group gap={6} align="center" wrap="wrap">
                    <Text size="sm" fw={700} style={{ color: 'var(--text-primary)' }}>
                      {m.word}
                    </Text>
                    {m.partOfSpeech && (
                      <Badge size="xs" variant="dot" color={posColor}>
                        {m.partOfSpeech}
                      </Badge>
                    )}
                    {m.banglaDefinition && (
                      <Text size="xs" fw={600} c="teal">
                        • {m.banglaDefinition}
                      </Text>
                    )}
                  </Group>

                  {onDeleteMember && (
                    <Tooltip label={`Remove "${m.word}" from family`} withArrow position="left">
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onDeleteMember(m.id);
                        }}
                        aria-label={`Delete ${m.word} from family`}
                      >
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>

                {m.englishDefinition && (
                  <Text size="xs" c="dimmed" mt={3} style={{ lineHeight: 1.4 }}>
                    {m.englishDefinition}
                  </Text>
                )}

                {m.examples && m.examples.length > 0 && (
                  <Stack gap={2} mt={4}>
                    {m.examples.map((ex, idx) => (
                      <Text
                        key={idx}
                        size="xs"
                        fs="italic"
                        style={{
                          color: 'var(--text-secondary, rgba(255, 255, 255, 0.75))',
                          paddingLeft: 8,
                          borderLeft: '2px solid rgba(99, 102, 241, 0.3)',
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
    </div>
  );
}
