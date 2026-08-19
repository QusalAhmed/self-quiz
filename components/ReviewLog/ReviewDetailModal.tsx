'use client';

import {
  Badge,
  Box,
  Button,
  Code,
  Divider,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBrain,
  IconCode,
  IconCopy,
  IconHelpCircle,
} from '@tabler/icons-react';
import React, { useState } from 'react';
import type { ReviewLogRecord, WordRecord } from '@/lib/db';

export type ReviewDetailModalProps = {
  opened: boolean;
  onClose: () => void;
  reviewLog: ReviewLogRecord | null;
  wordRecord?: WordRecord | null;
  onEditWord?: (wordId: string) => void;
};

export function ReviewDetailModal({
  opened,
  onClose,
  reviewLog,
  wordRecord: _wordRecord,
  onEditWord,
}: ReviewDetailModalProps) {
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!reviewLog) {
    return null;
  }

  const {
    word,
    meaning,
    rating,
    stateBefore,
    stateAfter,
    reviewedAt,
    durationMs,
    stability,
    difficulty,
    elapsedDays,
    scheduledDays,
    dueAt,
    previousDueAt,
    lapses,
    reps,
    retrievability,
    quizMode,
  } = reviewLog;

  const reviewDate = new Date(reviewedAt);
  const formattedDate = reviewDate.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dueDate = dueAt ? new Date(dueAt) : null;
  const formattedDueDate = dueDate
    ? dueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'None';

  const ratingColors: Record<string, { bg: string; color: string; label: string }> = {
    again: { bg: 'rgba(239, 68, 68, 0.15)', color: 'red', label: 'Again (Forgot)' },
    hard: { bg: 'rgba(245, 158, 11, 0.15)', color: 'yellow', label: 'Hard (Hesitated)' },
    good: { bg: 'rgba(99, 102, 241, 0.15)', color: 'indigo', label: 'Good (Recalled)' },
    easy: { bg: 'rgba(16, 185, 129, 0.15)', color: 'teal', label: 'Easy (Instant)' },
  };

  const currentRatingConfig = ratingColors[rating] || ratingColors.good;

  const handleCopyJson = () => {
    void navigator.clipboard.writeText(JSON.stringify(reviewLog, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon size="md" radius="md" color={currentRatingConfig.color} variant="light">
            <IconBrain size={18} />
          </ThemeIcon>
          <Text fw={700} size="md">
            Review Event Details
          </Text>
        </Group>
      }
      size="lg"
      radius="xl"
      padding="lg"
    >
      <Stack gap="md">
        {/* Word Header Card */}
        <Paper
          p="md"
          radius="lg"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Box style={{ flex: 1, minWidth: 200 }}>
              <Text size="xs" c="dimmed" fw={600} style={{ letterSpacing: '0.04em' }}>
                VOCABULARY WORD
              </Text>
              <Title order={3} style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem' }}>
                {word}
              </Title>
              <Text size="sm" c="dimmed" mt={2}>
                {meaning}
              </Text>
            </Box>

            <Group gap="xs">
              <Badge
                size="lg"
                variant="filled"
                color={currentRatingConfig.color}
                radius="sm"
                style={{ textTransform: 'capitalize' }}
              >
                {currentRatingConfig.label}
              </Badge>
            </Group>
          </Group>
        </Paper>

        {/* Core Event Metrics */}
        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Text size="xs" c="dimmed" fw={600}>
              STATE CHANGE
            </Text>
            <Group gap={4} mt={2}>
              <Badge size="xs" variant="light" color="gray">
                {stateBefore}
              </Badge>
              <Text size="xs" c="dimmed">
                →
              </Text>
              <Badge
                size="xs"
                variant="light"
                color={stateAfter === 'Review' ? 'indigo' : stateAfter === 'Learning' ? 'orange' : 'teal'}
              >
                {stateAfter}
              </Badge>
            </Group>
          </Paper>

          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Text size="xs" c="dimmed" fw={600}>
              RESPONSE TIME
            </Text>
            <Text size="sm" fw={700} mt={2}>
              {durationMs > 0 ? `${(durationMs / 1000).toFixed(1)}s` : 'Instant (<0.1s)'}
            </Text>
          </Paper>

          <Paper p="xs" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
            <Text size="xs" c="dimmed" fw={600}>
              QUIZ DIRECTION
            </Text>
            <Badge size="xs" variant="outline" color="indigo" mt={2}>
              {quizMode === 'wordToMeaning' ? 'Word → Meaning' : 'Meaning → Word'}
            </Badge>
          </Paper>
        </SimpleGrid>

        {/* FSRS Diagnostics Grid */}
        <Paper
          p="md"
          radius="lg"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
        >
          <Text size="xs" fw={700} c="dimmed" mb="xs" style={{ letterSpacing: '0.04em' }}>
            FSRS-4.5 COMPUTED PARAMETERS
          </Text>

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <div>
              <Group gap={4}>
                <Text size="xs" c="dimmed" fw={600}>
                  STABILITY
                </Text>
                <Tooltip label="Estimated days the memory will remain above 90% retrievability." w={200}>
                  <IconHelpCircle size={12} style={{ opacity: 0.6 }} />
                </Tooltip>
              </Group>
              <Text size="lg" fw={800} c="indigo">
                {stability.toFixed(1)} <Text component="span" size="xs" c="dimmed">days</Text>
              </Text>
            </div>

            <div>
              <Group gap={4}>
                <Text size="xs" c="dimmed" fw={600}>
                  DIFFICULTY
                </Text>
                <Tooltip label="Inherent difficulty of the card on a 1 (easiest) to 10 (hardest) scale." w={200}>
                  <IconHelpCircle size={12} style={{ opacity: 0.6 }} />
                </Tooltip>
              </Group>
              <Text size="lg" fw={800} c={difficulty >= 7 ? 'red' : difficulty >= 5 ? 'yellow' : 'teal'}>
                {difficulty.toFixed(1)} <Text component="span" size="xs" c="dimmed">/ 10</Text>
              </Text>
            </div>

            <div>
              <Group gap={4}>
                <Text size="xs" c="dimmed" fw={600}>
                  RETRIEVABILITY
                </Text>
                <Tooltip label="Probability of successful recall when this review occurred." w={200}>
                  <IconHelpCircle size={12} style={{ opacity: 0.6 }} />
                </Tooltip>
              </Group>
              <Text size="lg" fw={800} c="teal">
                {((retrievability ?? 1) * 100).toFixed(0)}%
              </Text>
            </div>

            <div>
              <Group gap={4}>
                <Text size="xs" c="dimmed" fw={600}>
                  NEXT INTERVAL
                </Text>
                <Tooltip label="Scheduled interval until the card becomes due next." w={200}>
                  <IconHelpCircle size={12} style={{ opacity: 0.6 }} />
                </Tooltip>
              </Group>
              <Text size="lg" fw={800}>
                {scheduledDays > 0 ? `${scheduledDays}d` : '<1d'}
              </Text>
            </div>
          </SimpleGrid>

          <Divider my="sm" style={{ borderColor: 'var(--card-border)' }} />

          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
            <div>
              <Text size="xs" c="dimmed">
                Total Reps
              </Text>
              <Text size="sm" fw={600}>
                {reps} completed
              </Text>
            </div>

            <div>
              <Text size="xs" c="dimmed">
                Memory Lapses
              </Text>
              <Text size="sm" fw={600} c={lapses > 0 ? 'red' : 'dimmed'}>
                {lapses} {lapses === 1 ? 'lapse' : 'lapses'}
              </Text>
            </div>

            <div>
              <Text size="xs" c="dimmed">
                Elapsed Days
              </Text>
              <Text size="sm" fw={600}>
                {elapsedDays} days since last review
              </Text>
            </div>
          </SimpleGrid>
        </Paper>

        {/* Timestamps info */}
        <Paper p="sm" radius="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
          <Stack gap={4}>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Reviewed Timestamp:
              </Text>
              <Text size="xs" fw={600}>
                {formattedDate}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Next Scheduled Due:
              </Text>
              <Text size="xs" fw={600}>
                {formattedDueDate}
              </Text>
            </Group>
            {previousDueAt && (
              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  Previous Due:
                </Text>
                <Text size="xs" c="dimmed">
                  {new Date(previousDueAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </Group>
            )}
          </Stack>
        </Paper>

        {/* Raw JSON inspect button */}
        <div>
          <Group justify="space-between" align="center">
            <Button
              variant="subtle"
              size="xs"
              color="gray"
              leftSection={<IconCode size={14} />}
              onClick={() => setShowJson((v) => !v)}
            >
              {showJson ? 'Hide Raw JSON' : 'Inspect Raw JSON Payload'}
            </Button>

            {showJson && (
              <Button
                variant="subtle"
                size="xs"
                color={copied ? 'teal' : 'gray'}
                leftSection={<IconCopy size={14} />}
                onClick={handleCopyJson}
              >
                {copied ? 'Copied!' : 'Copy JSON'}
              </Button>
            )}
          </Group>

          {showJson && (
            <Box mt="xs">
              <Code block style={{ maxHeight: 200, overflowY: 'auto', fontSize: '0.75rem' }}>
                {JSON.stringify(reviewLog, null, 2)}
              </Code>
            </Box>
          )}
        </div>

        {/* Action Buttons */}
        <Group justify="space-between" mt="sm">
          {onEditWord && (
            <Button
              variant="light"
              color="indigo"
              size="sm"
              onClick={() => {
                onEditWord(reviewLog.wordId);
                onClose();
              }}
            >
              Edit Dictionary Word
            </Button>
          )}
          <Button variant="default" size="sm" onClick={onClose} ml="auto">
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
