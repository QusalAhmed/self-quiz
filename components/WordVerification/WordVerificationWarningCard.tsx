'use client';

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  Loader,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconSparkles,
  IconWand,
  IconX,
} from '@tabler/icons-react';
import React, { useState } from 'react';
import { formatRelativeShort } from '@/lib/dateUtils';
import type { WordRecord } from '@/lib/db';
import { getWordVerificationIssue, type WordVerificationIssue } from '@/lib/word-verification';

export type WordVerificationWarningCardProps = {
  word: WordRecord;
  issue?: WordVerificationIssue | null;
  onFixSpelling?: (correctedWord: string) => Promise<void> | void;
  onFixDefinition?: (
    defIndex: number,
    newMeaning?: string,
    newPartOfSpeech?: string
  ) => Promise<void> | void;
  onAddSuggestedDefinition?: (newDef: {
    meaning: string;
    partOfSpeech: string;
  }) => Promise<void> | void;
  onDismiss?: () => Promise<void> | void;
  onReverify?: () => Promise<void> | void;
  isReverifying?: boolean;
  defaultExpanded?: boolean;
  compact?: boolean;
};

export function WordVerificationWarningCard({
  word,
  issue: directIssue,
  onFixSpelling,
  onFixDefinition,
  onAddSuggestedDefinition,
  onDismiss,
  onReverify,
  isReverifying = false,
  defaultExpanded = true,
  compact = false,
}: WordVerificationWarningCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [applyingFix, setApplyingFix] = useState<string | null>(null);

  const issue = directIssue ?? getWordVerificationIssue(word);
  if (!issue) {
    return null;
  }

  const isInvalid = issue.overallStatus === 'invalid' || !issue.isWordValid;
  const themeColor = isInvalid ? 'red' : 'yellow';

  const handleFixSpelling = async (suggestion: string) => {
    if (!onFixSpelling) {
      return;
    }
    setApplyingFix('spelling');
    try {
      await onFixSpelling(suggestion);
    } finally {
      setApplyingFix(null);
    }
  };

  const handleFixDefinition = async (
    defIndex: number,
    suggestedMeaning?: string,
    suggestedPartOfSpeech?: string
  ) => {
    if (!onFixDefinition) {
      return;
    }
    setApplyingFix(`def-${defIndex}`);
    try {
      await onFixDefinition(defIndex, suggestedMeaning, suggestedPartOfSpeech);
    } finally {
      setApplyingFix(null);
    }
  };

  const handleAddSuggestedDefinition = async (def: { meaning: string; partOfSpeech: string }) => {
    if (!onAddSuggestedDefinition) {
      return;
    }
    setApplyingFix('new-def');
    try {
      await onAddSuggestedDefinition(def);
    } finally {
      setApplyingFix(null);
    }
  };

  const handleDismiss = async () => {
    if (!onDismiss) {
      return;
    }
    setApplyingFix('dismiss');
    try {
      await onDismiss();
    } finally {
      setApplyingFix(null);
    }
  };

  // Find problematic definitions
  const problematicDefs = issue.definitions.filter(
    (d) =>
      !d.isAccurate || !d.partOfSpeechMatches || d.suggestedDefinition || d.suggestedPartOfSpeech
  );

  return (
    <Card
      radius="md"
      padding={compact ? 'xs' : 'sm'}
      style={{
        border: `1px solid var(--mantine-color-${themeColor}-6)`,
        backgroundColor: `var(--mantine-color-${themeColor}-light)`,
        marginTop: 6,
        marginBottom: 6,
      }}
      data-testid="word-verification-warning-card"
    >
      <Stack gap="xs">
        {/* ── Header ── */}
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="xs" align="center">
            <ThemeIcon size="sm" radius="xl" color={themeColor} variant="light">
              <IconAlertTriangle size={14} />
            </ThemeIcon>
            <Text fw={700} size="xs" c={isInvalid ? 'red.8' : 'yellow.9'}>
              {isInvalid ? 'AI Verification: Invalid Word / Issue' : 'AI Verification Warning'}
            </Text>
            {issue.generatorAiDetails && (
              <Badge
                variant="subtle"
                color={themeColor}
                size="xs"
                radius="sm"
                leftSection={<IconSparkles size={10} />}
                style={{ fontSize: '10px', textTransform: 'none' }}
              >
                {issue.generatorAiDetails}
              </Badge>
            )}
            {issue.verifiedAt && (
              <Text size="10px" c="dimmed">
                {formatRelativeShort(issue.verifiedAt)}
              </Text>
            )}
          </Group>

          <Group gap={6}>
            <Tooltip label={expanded ? 'Hide full details' : 'Show full details'} withArrow>
              <ActionIcon
                size="xs"
                variant="subtle"
                color={themeColor}
                onClick={() => setExpanded((prev) => !prev)}
                aria-label="Toggle verification details"
              >
                {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              </ActionIcon>
            </Tooltip>
            {onDismiss && (
              <Tooltip label="Dismiss warning" withArrow>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={handleDismiss}
                  loading={applyingFix === 'dismiss'}
                  aria-label="Close warning"
                >
                  <IconX size={13} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        {/* ── Summary Line (always visible) ── */}
        <Text size="xs" c="dimmed" style={{ lineHeight: 1.4 }}>
          {issue.wordSpellingSuggestion ? (
            <span>
              Possible spelling issue for <strong>&ldquo;{issue.word}&rdquo;</strong>. Suggested:{' '}
              <strong style={{ color: 'var(--mantine-color-yellow-9)' }}>
                {issue.wordSpellingSuggestion}
              </strong>
            </span>
          ) : (
            issue.wordFeedback || 'Issue detected with word or definition accuracy.'
          )}
        </Text>

        {/* ── Expanded Full Details & 1-Click Fixes ── */}
        <Collapse expanded={expanded}>
          <Stack gap="xs" mt={4}>
            {/* 1. Spelling suggestion fix */}
            {issue.wordSpellingSuggestion && (
              <Alert
                variant="light"
                color="yellow"
                radius="sm"
                icon={<IconAlertCircle size={15} />}
                title="Spelling Suggestion"
                styles={{ root: { padding: '8px 10px' }, message: { fontSize: '12px' } }}
              >
                <Stack gap={6}>
                  <Text size="xs">
                    {issue.wordFeedback ||
                      `"${issue.word}" does not appear in standard dictionaries. Did you mean "${issue.wordSpellingSuggestion}"?`}
                  </Text>
                  {onFixSpelling && (
                    <Group gap="xs">
                      <Button
                        size="compact-xs"
                        color="yellow"
                        variant="filled"
                        leftSection={<IconWand size={12} />}
                        loading={applyingFix === 'spelling'}
                        onClick={() => handleFixSpelling(issue.wordSpellingSuggestion!)}
                        aria-label={`Fix spelling to ${issue.wordSpellingSuggestion}`}
                      >
                        Change word to &ldquo;{issue.wordSpellingSuggestion}&rdquo;
                      </Button>
                    </Group>
                  )}
                </Stack>
              </Alert>
            )}

            {/* 2. Unrecognized word without spelling suggestion */}
            {!issue.isWordValid && !issue.wordSpellingSuggestion && (
              <Alert
                variant="light"
                color="red"
                radius="sm"
                icon={<IconAlertCircle size={15} />}
                title="Unrecognized Word"
                styles={{ root: { padding: '8px 10px' }, message: { fontSize: '12px' } }}
              >
                <Text size="xs">
                  {issue.wordFeedback ||
                    `"${issue.word}" could not be validated in English vocabulary references.`}
                </Text>
              </Alert>
            )}

            {/* 3. Problematic Definitions */}
            {problematicDefs.length > 0 && (
              <Stack gap={6}>
                <Text size="xs" fw={700} c="dimmed">
                  Definition Issues:
                </Text>
                {problematicDefs.map((def) => (
                  <Card
                    key={`prob-def-${def.index}`}
                    padding="xs"
                    radius="sm"
                    withBorder
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    <Stack gap={4}>
                      <Group justify="space-between" align="center">
                        <Text size="xs" fw={600}>
                          Definition #{def.index + 1}
                        </Text>
                        {!def.partOfSpeechMatches && def.detectedPartOfSpeech && (
                          <Badge size="xs" color="orange" variant="light">
                            POS Mismatch (Expected: {def.detectedPartOfSpeech})
                          </Badge>
                        )}
                      </Group>

                      {def.feedback && (
                        <Text size="xs" c="dimmed">
                          {def.feedback}
                        </Text>
                      )}

                      {def.suggestedDefinition && (
                        <Text size="xs">
                          <Text span fw={600} c="yellow.8">
                            Suggested meaning:{' '}
                          </Text>
                          {def.suggestedDefinition}
                        </Text>
                      )}

                      {def.suggestedPartOfSpeech && (
                        <Text size="xs">
                          <Text span fw={600} c="yellow.8">
                            Suggested Part of Speech:{' '}
                          </Text>
                          {def.suggestedPartOfSpeech}
                        </Text>
                      )}

                      <Group gap="xs" mt={2}>
                        {def.suggestedDefinition && onFixDefinition && (
                          <Button
                            size="compact-xs"
                            color="yellow"
                            variant="light"
                            leftSection={<IconWand size={11} />}
                            loading={applyingFix === `def-${def.index}`}
                            onClick={() =>
                              handleFixDefinition(
                                def.index,
                                def.suggestedDefinition,
                                def.suggestedPartOfSpeech
                              )
                            }
                            aria-label={`Apply suggested meaning for definition ${def.index + 1}`}
                          >
                            Apply suggested meaning
                          </Button>
                        )}
                        {def.suggestedPartOfSpeech &&
                          !def.suggestedDefinition &&
                          onFixDefinition && (
                            <Button
                              size="compact-xs"
                              color="orange"
                              variant="light"
                              leftSection={<IconWand size={11} />}
                              loading={applyingFix === `def-${def.index}`}
                              onClick={() =>
                                handleFixDefinition(def.index, undefined, def.suggestedPartOfSpeech)
                              }
                              aria-label={`Fix part of speech for definition ${def.index + 1}`}
                            >
                              Fix Part of Speech to &ldquo;{def.suggestedPartOfSpeech}&rdquo;
                            </Button>
                          )}
                      </Group>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            )}

            {/* 4. Suggested New Definition */}
            {issue.suggestedNewDefinition && (
              <Alert
                variant="light"
                color="indigo"
                radius="sm"
                icon={<IconSparkles size={15} />}
                title="Suggested Definition"
                styles={{ root: { padding: '8px 10px' }, message: { fontSize: '12px' } }}
              >
                <Stack gap={6}>
                  <Group gap={6} align="center">
                    {issue.suggestedNewDefinition.partOfSpeech && (
                      <Badge size="xs" color="indigo" variant="light">
                        {issue.suggestedNewDefinition.partOfSpeech}
                      </Badge>
                    )}
                    <Text size="xs">{issue.suggestedNewDefinition.meaning}</Text>
                  </Group>
                  {onAddSuggestedDefinition && (
                    <Group gap="xs">
                      <Button
                        size="compact-xs"
                        color="indigo"
                        variant="light"
                        leftSection={<IconWand size={11} />}
                        loading={applyingFix === 'new-def'}
                        onClick={() => handleAddSuggestedDefinition(issue.suggestedNewDefinition!)}
                        aria-label="Add suggested definition to word"
                      >
                        Add this definition
                      </Button>
                    </Group>
                  )}
                </Stack>
              </Alert>
            )}

            {/* ── Action Toolbar ── */}
            <Group justify="space-between" align="center" pt={4}>
              <Group gap="xs">
                {onDismiss && (
                  <Button
                    size="compact-xs"
                    color="gray"
                    variant="subtle"
                    loading={applyingFix === 'dismiss'}
                    onClick={handleDismiss}
                  >
                    Dismiss Warning
                  </Button>
                )}
              </Group>

              {onReverify && (
                <Button
                  size="compact-xs"
                  color="indigo"
                  variant="subtle"
                  leftSection={
                    isReverifying ? <Loader size={11} color="indigo" /> : <IconRefresh size={12} />
                  }
                  disabled={isReverifying}
                  onClick={onReverify}
                  aria-label="Re-verify word"
                >
                  {isReverifying ? 'Verifying...' : 'Re-verify'}
                </Button>
              )}
            </Group>
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
}
