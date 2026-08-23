'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  CopyButton,
  Divider,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconBookmark,
  IconBookmarkOff,
  IconBrain,
  IconChartBar,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconEdit,
  IconHierarchy,
  IconNotes,
  IconRotateClockwise,
  IconSparkles,
  IconTrash,
  IconVolume,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import { RichNoteViewer } from '@/components/RichNoteViewer/RichNoteViewer';
import { WordActionIcon } from '@/components/WordActions/WordActionIcon';
import { WordFamilySection } from '@/components/WordFamily/WordFamilySection';
import { formatDate, formatRelativeShort } from '@/lib/dateUtils';
import type { FsrsRecord, MissedWordRecord, WordFamilyMemberRecord, WordRecord } from '@/lib/db';
import { getWordDefinitions } from '@/lib/definitions';
import { formatInterval } from '@/lib/fsrs';
import { getWordGroups } from '@/lib/groups';
import { getUsageFrequencyBadgeProps } from '@/lib/word-family';

export type WordViewDensity = 'detailed' | 'compact' | 'card';

export type WordDetailCardProps = {
  word: WordRecord;
  fsrsRecords?: FsrsRecord[];
  missedRecords?: MissedWordRecord[];
  wordFamilyMembers?: WordFamilyMemberRecord[];
  density?: WordViewDensity;
  searchQuery?: string;
  isGeneratingExamples?: boolean;
  isGeneratingWordFamily?: boolean;
  onEdit: (word: WordRecord) => void;
  onDelete: (id: string, word: string) => void;
  onRefreshExamples: (id: string) => void;
  onRefreshWordFamily?: (wordId: string, word: string) => void;
  onDeleteWordFamilyMember?: (memberId: string) => void;
  onToggleMissed?: (wordId: string, word: string, meaning: string) => void;
  onGroupClick?: (group: string) => void;
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

export function getPosBadgeColor(pos?: string): string {
  if (!pos) {
    return 'gray';
  }
  const normalized = pos.trim().toLowerCase();
  for (const [key, color] of Object.entries(POS_COLORS)) {
    if (normalized.includes(key)) {
      return color;
    }
  }
  return 'gray';
}

export function WordDetailCard({
  word,
  fsrsRecords = [],
  missedRecords = [],
  wordFamilyMembers = [],
  density = 'detailed',
  isGeneratingExamples = false,
  isGeneratingWordFamily = false,
  onEdit,
  onDelete,
  onRefreshExamples,
  onRefreshWordFamily,
  onDeleteWordFamilyMember,
  onToggleMissed,
  onGroupClick,
}: WordDetailCardProps) {
  const [examplesExpanded, setExamplesExpanded] = useState<Record<number, boolean>>({});
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [fsrsExpanded, setFsrsExpanded] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const definitions = useMemo(() => getWordDefinitions(word), [word]);
  const groups = useMemo(() => getWordGroups(word), [word]);

  // Spaced Repetition (FSRS) metrics for this word across quiz modes
  const wordFsrsRecords = useMemo(
    () => fsrsRecords.filter((r) => !r.isDeleted && r.wordId === word.id),
    [fsrsRecords, word.id]
  );

  const primaryFsrs = useMemo(
    () => wordFsrsRecords.find((r) => r.quizMode === 'wordToMeaning') || wordFsrsRecords[0],
    [wordFsrsRecords]
  );

  // Missed records for this word
  const wordMissedRecords = useMemo(
    () => missedRecords.filter((m) => !m.isDeleted && m.wordId === word.id),
    [missedRecords, word.id]
  );

  const isMissed = wordMissedRecords.length > 0;
  const totalMissedCount = useMemo(
    () => wordMissedRecords.reduce((acc, curr) => acc + curr.missedCount, 0),
    [wordMissedRecords]
  );

  // Audio pronunciation using Web Speech API
  const speakWord = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Retention score calculation (0 to 100) based on stability and state
  const retentionScore = useMemo(() => {
    if (!primaryFsrs) {
      return 0;
    }
    if (primaryFsrs.state === 'New') {
      return 10;
    }
    if (primaryFsrs.state === 'Learning' || primaryFsrs.state === 'Relearning') {
      return 35;
    }
    // For Review state, higher stability yields higher score
    const stabilityScore = Math.min(100, Math.round(primaryFsrs.stability * 10 + 40));
    return stabilityScore;
  }, [primaryFsrs]);

  const toggleDefinitionExample = (idx: number) => {
    setExamplesExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const hasNotes = Boolean(word.notes && word.notes.trim());

  return (
    <Card
      radius="lg"
      padding={density === 'compact' ? 'sm' : 'md'}
      className="glass-panel hover-lift"
      style={{
        borderLeft: isMissed
          ? '4px solid #ef4444'
          : primaryFsrs?.state === 'Review'
            ? '4px solid #22c55e'
            : '4px solid #6366f1',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* ── Top Header Section: Word Title, Audio, Badges & Action Toolbar ── */}
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <Stack gap={4} style={{ minWidth: 0, flex: '1 1 240px' }}>
          <Group gap={8} align="center" wrap="wrap">
            <Text
              component="h3"
              size="xl"
              fw={800}
              style={{
                fontFamily: 'var(--font-title)',
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                lineHeight: 1.2,
                wordBreak: 'break-word',
              }}
            >
              {word.word}
            </Text>

            {/* Pronunciation Audio Button */}
            <Tooltip label="Listen to pronunciation (US English)" withArrow position="top">
              <ActionIcon
                variant={isSpeaking ? 'filled' : 'light'}
                color="indigo"
                size="md"
                radius="xl"
                aria-label={`Pronounce ${word.word}`}
                onClick={() => speakWord(word.word)}
                style={{
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isSpeaking ? 'scale(1.15)' : undefined,
                }}
              >
                <IconVolume size={18} />
              </ActionIcon>
            </Tooltip>

            {/* Quick Copy Word */}
            <CopyButton value={word.word} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Copied to clipboard!' : 'Copy word'} withArrow>
                  <ActionIcon
                    variant="subtle"
                    color={copied ? 'teal' : 'gray'}
                    size="sm"
                    radius="md"
                    onClick={copy}
                    aria-label={`Copy ${word.word}`}
                  >
                    {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>

            {/* Part of Speech Badges for all primary definitions */}
            {definitions.map((def, i) =>
              def.partOfSpeech ? (
                <Badge
                  key={`pos-${i}`}
                  variant="dot"
                  color={getPosBadgeColor(def.partOfSpeech)}
                  size="sm"
                  radius="sm"
                  style={{ textTransform: 'none', fontWeight: 700 }}
                >
                  {def.partOfSpeech}
                </Badge>
              ) : null
            )}

            {/* Usage Frequency Badge */}
            {word.usageFrequency &&
              (() => {
                const freqBadge = getUsageFrequencyBadgeProps(word.usageFrequency);
                return (
                  <Tooltip label={freqBadge.tooltip} withArrow>
                    <Badge
                      variant="light"
                      color={freqBadge.color}
                      size="sm"
                      radius="sm"
                      leftSection={<IconChartBar size={12} />}
                      style={{ fontWeight: 700, textTransform: 'none' }}
                    >
                      {freqBadge.label}
                    </Badge>
                  </Tooltip>
                );
              })()}

            {/* Generator AI Details Badge */}
            {word.generatorAiDetails && (
              <Tooltip label={`AI Generator: ${word.generatorAiDetails}`} withArrow>
                <Badge
                  variant="subtle"
                  color="indigo"
                  size="sm"
                  radius="sm"
                  leftSection={<IconSparkles size={12} />}
                  style={{ textTransform: 'none' }}
                >
                  {word.generatorAiDetails}
                </Badge>
              </Tooltip>
            )}

            {/* Missed Indicator Badge */}
            {isMissed && (
              <Badge
                variant="filled"
                color="red"
                size="xs"
                radius="sm"
                leftSection={<IconAlertTriangle size={12} />}
                style={{ fontWeight: 700, textTransform: 'none' }}
              >
                Missed ×{totalMissedCount}
              </Badge>
            )}

            {/* FSRS Learning State Badge */}
            {primaryFsrs && (
              <Badge
                variant="light"
                color={
                  primaryFsrs.state === 'Review'
                    ? 'teal'
                    : primaryFsrs.state === 'Learning'
                      ? 'indigo'
                      : primaryFsrs.state === 'Relearning'
                        ? 'orange'
                        : 'gray'
                }
                size="xs"
                radius="sm"
                style={{ fontWeight: 700, textTransform: 'none' }}
              >
                {primaryFsrs.state}
              </Badge>
            )}

            {/* Custom Groups Badges */}
            {groups.map((groupName) => (
              <Badge
                key={`${word.id}-${groupName}`}
                variant="outline"
                color="grape"
                size="xs"
                radius="sm"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'none',
                  cursor: onGroupClick ? 'pointer' : 'default',
                }}
                onClick={() => onGroupClick?.(groupName)}
              >
                #{groupName}
              </Badge>
            ))}

            {/* Date Pill with Tooltip */}
            <Tooltip
              label={`Created: ${formatDate(word.createdAt)} • Updated: ${formatDate(word.updatedAt)}`}
              withArrow
            >
              <Badge
                variant="subtle"
                color="gray"
                size="xs"
                radius="sm"
                style={{ fontSize: '11px', textTransform: 'none' }}
              >
                {formatRelativeShort(word.updatedAt)}
              </Badge>
            </Tooltip>
          </Group>
        </Stack>

        {/* Action Toolbar */}
        <Group gap={4} style={{ flexShrink: 0 }}>
          {onToggleMissed && (
            <WordActionIcon
              label={isMissed ? 'Remove from missed list' : 'Bookmark as difficult / missed'}
              ariaLabel="Toggle missed status"
              color={isMissed ? 'teal' : 'gray'}
              size="sm"
              onClick={() => onToggleMissed(word.id, word.word, word.meaning)}
            >
              {isMissed ? <IconBookmark size={16} /> : <IconBookmarkOff size={16} />}
            </WordActionIcon>
          )}

          <WordActionIcon
            label="Regenerate AI example sentences"
            ariaLabel={`Regenerate examples for ${word.word}`}
            color="indigo"
            size="sm"
            onClick={() => onRefreshExamples(word.id)}
            disabled={isGeneratingExamples}
            loading={isGeneratingExamples}
          >
            <IconRotateClockwise size={16} />
          </WordActionIcon>

          {onRefreshWordFamily && (
            <WordActionIcon
              label={
                wordFamilyMembers.some((m) => !m.isDeleted)
                  ? `Regenerate word family for ${word.word}`
                  : `Generate word family for ${word.word}`
              }
              ariaLabel={
                wordFamilyMembers.some((m) => !m.isDeleted)
                  ? `Regenerate word family for ${word.word}`
                  : `Generate word family for ${word.word}`
              }
              color="indigo"
              size="sm"
              onClick={() => onRefreshWordFamily(word.id, word.word)}
              disabled={isGeneratingWordFamily}
              loading={isGeneratingWordFamily}
            >
              <IconHierarchy size={16} />
            </WordActionIcon>
          )}

          <WordActionIcon
            label="Edit word details"
            ariaLabel={`Edit ${word.word}`}
            color="indigo"
            size="sm"
            onClick={() => onEdit(word)}
          >
            <IconEdit size={16} />
          </WordActionIcon>

          <WordActionIcon
            label="Delete word"
            ariaLabel={`Delete ${word.word}`}
            color="red"
            size="sm"
            onClick={() => onDelete(word.id, word.word)}
          >
            <IconTrash size={16} />
          </WordActionIcon>
        </Group>
      </Group>

      {/* ── Definitions Breakdown (Oxford / Cambridge Dictionary style) ── */}
      <Stack gap="sm" mt="md">
        {definitions.length === 0 && (
          <Text size="sm" c="dimmed" fs="italic">
            {word.meaning || 'No definition available. Fetching or add one...'}
          </Text>
        )}

        {definitions.map((def, index) => {
          const userExamples = def.userExamples || [];
          const aiExamples = def.examples || [];
          const totalExamples = userExamples.length + aiExamples.length;
          const isExpanded = Boolean(examplesExpanded[index]);

          return (
            <Paper
              key={`def-${index}`}
              p="sm"
              radius="md"
              style={{
                background: 'rgba(99, 102, 241, 0.04)',
                border: '1px solid rgba(99, 102, 241, 0.12)',
              }}
            >
              <Stack gap={6}>
                <Group align="flex-start" wrap="nowrap" gap={8}>
                  <Badge
                    size="sm"
                    variant="light"
                    color="indigo"
                    radius="xl"
                    style={{ flexShrink: 0, fontWeight: 800, marginTop: 2 }}
                  >
                    {index + 1}
                  </Badge>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={6} align="center" wrap="wrap" mb={2}>
                      {def.partOfSpeech && (
                        <Badge
                          size="xs"
                          variant="filled"
                          color={getPosBadgeColor(def.partOfSpeech)}
                          radius="sm"
                          style={{ textTransform: 'none', fontWeight: 700 }}
                        >
                          {def.partOfSpeech}
                        </Badge>
                      )}
                    </Group>

                    <Text
                      size="sm"
                      fw={600}
                      style={{
                        color: 'var(--text-primary)',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                      }}
                    >
                      {def.meaning}
                    </Text>
                  </div>
                </Group>

                {/* Example Sentences Toggle & Content */}
                {totalExamples > 0 && (
                  <Stack gap={4} pl={{ base: 0, sm: 32 }} mt={4}>
                    <Group justify="flex-start">
                      <Button
                        variant="subtle"
                        color="indigo"
                        size="xs"
                        radius="md"
                        leftSection={
                          isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                        }
                        onClick={() => toggleDefinitionExample(index)}
                        style={{
                          fontWeight: 600,
                          height: 24,
                          paddingLeft: 6,
                          paddingRight: 8,
                          fontSize: '11px',
                        }}
                      >
                        {isExpanded ? 'Hide Examples' : `Example Sentences (${totalExamples})`}
                      </Button>
                    </Group>

                    <Collapse expanded={isExpanded}>
                      <ScrollArea.Autosize mah={200} offsetScrollbars scrollbarSize={6}>
                        <Stack gap={6} py={4} pl={8}>
                          {/* User-Authored Examples (Purple) */}
                          {userExamples.map((ex, exIdx) => (
                            <Group
                              key={`user-ex-${exIdx}`}
                              align="flex-start"
                              gap={6}
                              wrap="nowrap"
                            >
                              <Badge
                                size="xs"
                                variant="light"
                                color="grape"
                                radius="sm"
                                style={{ flexShrink: 0, marginTop: 2, fontSize: '9px' }}
                              >
                                My Note
                              </Badge>
                              <Text
                                size="xs"
                                fw={500}
                                style={{
                                  color: '#c084fc',
                                  lineHeight: 1.45,
                                  wordBreak: 'break-word',
                                }}
                              >
                                "{ex}"
                              </Text>
                            </Group>
                          ))}

                          {/* AI-Generated Examples (Indigo/Blue) */}
                          {aiExamples.map((ex, exIdx) => (
                            <Group key={`ai-ex-${exIdx}`} align="flex-start" gap={6} wrap="nowrap">
                              <ThemeIcon
                                size="xs"
                                variant="light"
                                color="indigo"
                                radius="sm"
                                style={{ flexShrink: 0, marginTop: 3 }}
                              >
                                <IconSparkles size={10} />
                              </ThemeIcon>
                              <Text
                                size="xs"
                                fw={500}
                                style={{
                                  color: '#818cf8',
                                  lineHeight: 1.45,
                                  wordBreak: 'break-word',
                                }}
                              >
                                "{ex}"
                              </Text>
                            </Group>
                          ))}
                        </Stack>
                      </ScrollArea.Autosize>
                    </Collapse>
                  </Stack>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      {/* ── Rich Personal Notes Section (TipTap formatted) ── */}
      {hasNotes && (
        <Paper
          p="sm"
          radius="md"
          mt="sm"
          style={{
            background: 'rgba(168, 85, 247, 0.05)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
          }}
        >
          <Group justify="space-between" align="center" mb={notesExpanded ? 6 : 0}>
            <Group
              gap={6}
              style={{ cursor: 'pointer' }}
              onClick={() => setNotesExpanded((prev) => !prev)}
            >
              <IconNotes size={16} style={{ color: '#a855f7' }} />
              <Text size="xs" fw={700} c="purple">
                Personal Study Notes & Mnemonics
              </Text>
              {notesExpanded ? (
                <IconChevronUp size={14} style={{ color: '#a855f7' }} />
              ) : (
                <IconChevronDown size={14} style={{ color: '#a855f7' }} />
              )}
            </Group>

            <Tooltip label="Edit notes via word editor" withArrow>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="grape"
                onClick={() => onEdit(word)}
                aria-label="Edit notes"
              >
                <IconEdit size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Collapse expanded={notesExpanded}>
            <Box mt={4} style={{ fontSize: '0.85rem' }}>
              <RichNoteViewer content={word.notes || ''} />
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* ── Word Family Tree Section ── */}
      <WordFamilySection
        wordId={word.id}
        word={word.word}
        members={wordFamilyMembers}
        isLoading={isGeneratingWordFamily}
        onRefresh={onRefreshWordFamily}
        onDeleteMember={onDeleteWordFamilyMember}
      />

      {/* ── Spaced Repetition (FSRS) & Memory Retention Footer ── */}
      {primaryFsrs && (
        <Paper
          p="xs"
          radius="md"
          mt="sm"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--card-border)',
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="xs">
            <Group
              gap={6}
              align="center"
              style={{ cursor: 'pointer' }}
              onClick={() => setFsrsExpanded((prev) => !prev)}
            >
              <IconBrain size={16} style={{ color: 'var(--mantine-color-indigo-4)' }} />
              <Text size="xs" fw={700} c="dimmed">
                Memory Retention:
              </Text>
              <Badge
                size="xs"
                variant="filled"
                color={retentionScore >= 70 ? 'teal' : retentionScore >= 40 ? 'indigo' : 'orange'}
                radius="sm"
              >
                {retentionScore}%
              </Badge>
              {primaryFsrs.dueAt && (
                <Text size="xs" c="dimmed" style={{ fontSize: '11px' }}>
                  • Next review: {formatInterval(primaryFsrs.dueAt, new Date())}
                </Text>
              )}
            </Group>

            <Button
              variant="subtle"
              color="indigo"
              size="xs"
              radius="sm"
              onClick={() => setFsrsExpanded((prev) => !prev)}
              rightSection={
                fsrsExpanded ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />
              }
              style={{ height: 22, fontSize: '10px', padding: '0 6px' }}
            >
              {fsrsExpanded ? 'Hide Stats' : 'FSRS Stats'}
            </Button>
          </Group>

          <Collapse expanded={fsrsExpanded}>
            <Divider my={6} style={{ borderColor: 'var(--card-border)' }} />
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
              <Stack gap={1}>
                <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>
                  State
                </Text>
                <Text size="xs" fw={700}>
                  {primaryFsrs.state}
                </Text>
              </Stack>

              <Stack gap={1}>
                <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>
                  Stability
                </Text>
                <Text size="xs" fw={700}>
                  {primaryFsrs.stability.toFixed(1)} days
                </Text>
              </Stack>

              <Stack gap={1}>
                <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>
                  Difficulty
                </Text>
                <Text size="xs" fw={700}>
                  {primaryFsrs.difficulty.toFixed(1)} / 10
                </Text>
              </Stack>

              <Stack gap={1}>
                <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>
                  Reviews / Lapses
                </Text>
                <Text size="xs" fw={700}>
                  {primaryFsrs.reps} reps / {primaryFsrs.lapses} lapses
                </Text>
              </Stack>
            </SimpleGrid>
          </Collapse>
        </Paper>
      )}
    </Card>
  );
}
