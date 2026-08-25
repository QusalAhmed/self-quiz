'use client';

import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Progress,
  Radio,
  RollingNumber,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconHierarchy,
  IconPlayerPlay,
  IconPlayerStop,
  IconSparkles,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { WordRecord } from '@/lib/db';

export type BatchWordFamilyModalProps = {
  opened: boolean;
  onClose: () => void;
  allMissingWords: WordRecord[];
  filteredMissingWords: WordRecord[];
  onGenerateWordFamily: (wordId: string, word: string, meaning?: string) => Promise<void>;
  onBatchComplete?: () => void;
};

export function BatchWordFamilyModal({
  opened,
  onClose,
  allMissingWords,
  filteredMissingWords,
  onGenerateWordFamily,
  onBatchComplete,
}: BatchWordFamilyModalProps) {
  const [selectedScope, setSelectedScope] = useState<'filtered' | 'all'>('filtered');
  const [isRunning, setIsRunning] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [currentWordName, setCurrentWordName] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errors, setErrors] = useState<Array<{ word: string; error: string }>>([]);

  const cancelRef = useRef(false);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (opened) {
      setIsRunning(false);
      setProgressIndex(0);
      setCurrentWordName('');
      setSuccessCount(0);
      setFailureCount(0);
      setIsCompleted(false);
      setErrors([]);
      cancelRef.current = false;

      // Default scope selection
      if (filteredMissingWords.length > 0 && filteredMissingWords.length < allMissingWords.length) {
        setSelectedScope('filtered');
      } else {
        setSelectedScope('all');
      }
    }
  }, [opened, allMissingWords.length, filteredMissingWords.length]);

  const targetWords = selectedScope === 'filtered' ? filteredMissingWords : allMissingWords;
  const totalTargetCount = targetWords.length;

  const handleStart = useCallback(async () => {
    if (targetWords.length === 0) {
      return;
    }
    setIsRunning(true);
    setIsCompleted(false);
    setProgressIndex(0);
    setSuccessCount(0);
    setFailureCount(0);
    setErrors([]);
    cancelRef.current = false;

    let successful = 0;
    let failed = 0;
    const failedList: Array<{ word: string; error: string }> = [];

    for (let i = 0; i < targetWords.length; i++) {
      if (cancelRef.current) {
        break;
      }
      const item = targetWords[i];
      setProgressIndex(i + 1);
      setCurrentWordName(item.word);

      try {
        await onGenerateWordFamily(item.id, item.word, item.meaning);
        successful++;
        setSuccessCount(successful);
      } catch (err: any) {
        failed++;
        setFailureCount(failed);
        failedList.push({
          word: item.word,
          error: err?.message || 'Failed to generate word family',
        });
        setErrors([...failedList]);
      }

      // Small delay between calls to prevent rate limits
      if (i < targetWords.length - 1 && !cancelRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }

    setIsRunning(false);
    setIsCompleted(true);
    setCurrentWordName('');
    onBatchComplete?.();
  }, [targetWords, onGenerateWordFamily, onBatchComplete]);

  const handleStop = () => {
    cancelRef.current = true;
    setIsRunning(false);
    setIsCompleted(true);
  };

  const handleModalClose = () => {
    if (isRunning) {
      cancelRef.current = true;
    }
    onClose();
  };

  const percentage =
    totalTargetCount > 0 ? Math.round((progressIndex / totalTargetCount) * 100) : 0;

  return (
    <Modal
      opened={opened}
      onClose={handleModalClose}
      title={
        <Group gap="xs">
          <ThemeIcon
            size="md"
            radius="md"
            variant="gradient"
            gradient={{ from: 'indigo', to: 'purple' }}
          >
            <IconHierarchy size={18} />
          </ThemeIcon>
          <Text fw={700} size="md" style={{ fontFamily: 'var(--font-title)' }}>
            Batch Generate Word Families
          </Text>
        </Group>
      }
      centered
      radius="lg"
      size="lg"
      closeOnClickOutside={!isRunning}
      closeOnEscape={!isRunning}
    >
      <Stack gap="md">
        {/* Informational Intro */}
        <Paper
          p="sm"
          radius="md"
          style={{
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
          }}
        >
          <Text size="xs" c="dimmed" lh={1.5}>
            This tool generates morphological word families, derivatives, Bengali definitions, and
            corpus usage frequencies for words where a word family was never created.
          </Text>
        </Paper>

        {/* Scope Selection (Disabled while running) */}
        {!isRunning && !isCompleted && (
          <Radio.Group
            value={selectedScope}
            onChange={(val) => setSelectedScope(val as 'filtered' | 'all')}
            label={
              <Text size="sm" fw={700} mb={6}>
                Select Generation Scope
              </Text>
            }
          >
            <Stack gap="xs">
              {filteredMissingWords.length > 0 &&
                filteredMissingWords.length < allMissingWords.length && (
                  <Radio
                    value="filtered"
                    label={
                      <Group gap="xs">
                        <Text size="sm">Currently Filtered Words</Text>
                        <Badge size="xs" color="indigo" variant="light">
                          <RollingNumber value={filteredMissingWords.length} /> words
                        </Badge>
                      </Group>
                    }
                  />
                )}
              <Radio
                value="all"
                label={
                  <Group gap="xs">
                    <Text size="sm">All Words Missing Word Families</Text>
                    <Badge size="xs" color="purple" variant="light">
                      <RollingNumber value={allMissingWords.length} /> words
                    </Badge>
                  </Group>
                }
              />
            </Stack>
          </Radio.Group>
        )}

        {/* Progress Display */}
        {(isRunning || isCompleted) && (
          <Paper
            p="md"
            radius="md"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--card-border)',
            }}
          >
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="sm" fw={700}>
                  {isRunning ? 'Generation in Progress...' : 'Batch Generation Finished'}
                </Text>
                <Text component="div" size="xs" fw={700} c="indigo">
                  <RollingNumber value={progressIndex} /> /{' '}
                  <RollingNumber value={totalTargetCount} /> (
                  <RollingNumber value={percentage} suffix="%" />)
                </Text>
              </Group>

              <Progress
                value={percentage}
                animated={isRunning}
                color="indigo"
                radius="xl"
                size="md"
              />

              {isRunning && currentWordName && (
                <Group gap={6} align="center" mt={2}>
                  <ThemeIcon size="xs" variant="light" color="indigo" radius="xl">
                    <IconSparkles size={12} />
                  </ThemeIcon>
                  <Text size="xs" c="dimmed">
                    Currently processing:{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{currentWordName}</strong>
                  </Text>
                </Group>
              )}

              <Group gap="xs" mt={4}>
                <Badge size="sm" color="teal" variant="light" leftSection={<IconCheck size={12} />}>
                  <RollingNumber value={successCount} /> Generated
                </Badge>
                {failureCount > 0 && (
                  <Badge
                    size="sm"
                    color="red"
                    variant="light"
                    leftSection={<IconAlertCircle size={12} />}
                  >
                    <RollingNumber value={failureCount} /> Failed
                  </Badge>
                )}
              </Group>
            </Stack>
          </Paper>
        )}

        {/* Failure Alerts */}
        {errors.length > 0 && (
          <Alert
            color="red"
            variant="light"
            title={`${errors.length} word(s) failed`}
            icon={<IconAlertCircle size={16} />}
          >
            <ScrollArea h={80} offsetScrollbars>
              <Stack gap={2}>
                {errors.map((e, i) => (
                  <Text key={i} size="xs">
                    • <strong>{e.word}</strong>: {e.error}
                  </Text>
                ))}
              </Stack>
            </ScrollArea>
          </Alert>
        )}

        {/* Actions Footer */}
        <Divider style={{ borderColor: 'var(--card-border)' }} />

        <Group justify="flex-end" gap="sm">
          {!isRunning && !isCompleted && (
            <>
              <Button variant="default" size="sm" radius="md" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button
                className="btn-premium"
                size="sm"
                radius="md"
                disabled={totalTargetCount === 0}
                leftSection={<IconPlayerPlay size={16} />}
                onClick={handleStart}
              >
                Start Generation (<RollingNumber value={totalTargetCount} />)
              </Button>
            </>
          )}

          {isRunning && (
            <Button
              variant="outline"
              color="red"
              size="sm"
              radius="md"
              leftSection={<IconPlayerStop size={16} />}
              onClick={handleStop}
            >
              Stop / Cancel
            </Button>
          )}

          {isCompleted && (
            <Button
              variant="filled"
              color="indigo"
              size="sm"
              radius="md"
              leftSection={<IconCheck size={16} />}
              onClick={handleModalClose}
            >
              Done
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
