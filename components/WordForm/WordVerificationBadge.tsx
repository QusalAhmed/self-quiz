import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconRefresh,
  IconSparkles,
  IconWand,
} from '@tabler/icons-react';
import React from 'react';
import type { WordVerificationResult } from '@/lib/word-verification';

export type WordVerificationBadgeProps = {
  result: WordVerificationResult | null;
  isVerifying: boolean;
  error?: string | null;
  onApplySpellingSuggestion?: (word: string) => void;
  onApplyNewDefinition?: (def: { meaning: string; partOfSpeech: string }) => void;
  onReverify?: () => void;
  hasEmptyDefinitions?: boolean;
};

export function WordVerificationBadge({
  result,
  isVerifying,
  error,
  onApplySpellingSuggestion,
  onApplyNewDefinition,
  onReverify,
  hasEmptyDefinitions,
}: WordVerificationBadgeProps) {
  if (isVerifying) {
    return (
      <Card
        padding="xs"
        radius="md"
        className="glass-panel"
        style={{
          border: '1px solid rgba(99, 102, 241, 0.25)',
          background: 'rgba(99, 102, 241, 0.05)',
        }}
        data-testid="ai-verification-loading"
      >
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Loader size={14} color="indigo" />
            <Text size="xs" fw={600} c="indigo">
              Verifying word & definition with AI...
            </Text>
          </Group>
          <Badge size="xs" variant="light" color="indigo">
            Analyzing
          </Badge>
        </Group>
      </Card>
    );
  }

  if (error && !result) {
    return (
      <Group justify="space-between" align="center">
        <Text size="xs" c="dimmed">
          AI verification unavailable ({error})
        </Text>
        {onReverify && (
          <Tooltip label="Retry AI verification" withArrow>
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              onClick={onReverify}
              aria-label="Retry AI verification"
            >
              <IconRefresh size={12} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    );
  }

  if (!result) {
    return null;
  }

  const {
    isWordValid,
    wordSpellingSuggestion,
    wordFeedback,
    overallStatus,
    suggestedNewDefinition,
    generatorAiDetails,
  } = result;

  return (
    <Stack gap="xs" data-testid="ai-verification-container">
      {/* ── Spelling Correction Alert ── */}
      {wordSpellingSuggestion && onApplySpellingSuggestion && (
        <Alert
          variant="light"
          color="yellow"
          radius="md"
          icon={<IconAlertTriangle size={16} />}
          title="Spelling Suggestion"
          styles={{
            root: { padding: '8px 12px' },
            message: { fontSize: '12px' },
          }}
          data-testid="spelling-suggestion-alert"
        >
          <Stack gap={6}>
            <Text size="xs">
              Did you mean{' '}
              <Text span fw={700} c="yellow.8">
                &ldquo;{wordSpellingSuggestion}&rdquo;
              </Text>
              ? {wordFeedback}
            </Text>
            <Group gap="xs">
              <Button
                size="compact-xs"
                color="yellow"
                variant="filled"
                leftSection={<IconWand size={12} />}
                onClick={() => onApplySpellingSuggestion(wordSpellingSuggestion)}
                aria-label={`Fix spelling to ${wordSpellingSuggestion}`}
              >
                Change word to &ldquo;{wordSpellingSuggestion}&rdquo;
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}

      {/* ── Unrecognized / Invalid Word Warning ── */}
      {!isWordValid && !wordSpellingSuggestion && (
        <Alert
          variant="light"
          color="red"
          radius="md"
          icon={<IconAlertCircle size={16} />}
          title="Unrecognized Word"
          styles={{
            root: { padding: '8px 12px' },
            message: { fontSize: '12px' },
          }}
          data-testid="unrecognized-word-alert"
        >
          <Text size="xs">
            {wordFeedback || 'This does not appear to be a recognized English word.'}
          </Text>
        </Alert>
      )}

      {/* ── Suggestion for Empty or Inaccurate Definition ── */}
      {suggestedNewDefinition && hasEmptyDefinitions && onApplyNewDefinition && (
        <Card
          padding="xs"
          radius="md"
          style={{
            border: '1px solid rgba(139, 92, 246, 0.3)',
            background: 'rgba(139, 92, 246, 0.06)',
          }}
          data-testid="suggested-definition-card"
        >
          <Stack gap={6}>
            <Group justify="space-between" align="center">
              <Group gap={6}>
                <IconSparkles size={14} style={{ color: 'var(--mantine-color-violet-5)' }} />
                <Text size="xs" fw={600} c="violet">
                  AI Suggested Definition
                </Text>
                {suggestedNewDefinition.partOfSpeech && (
                  <Badge size="xs" variant="outline" color="violet">
                    {suggestedNewDefinition.partOfSpeech}
                  </Badge>
                )}
              </Group>
              <Button
                size="compact-xs"
                variant="filled"
                color="violet"
                leftSection={<IconWand size={12} />}
                onClick={() => onApplyNewDefinition(suggestedNewDefinition)}
                aria-label="Use AI definition"
              >
                Use AI Definition
              </Button>
            </Group>
            <Text size="xs" style={{ fontStyle: 'italic', lineHeight: 1.4 }}>
              &ldquo;{suggestedNewDefinition.meaning}&rdquo;
            </Text>
          </Stack>
        </Card>
      )}

      {/* ── Overall Status Banner ── */}
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          {overallStatus === 'valid' && (
            <Badge
              size="sm"
              variant="light"
              color="teal"
              leftSection={<IconCheck size={12} />}
              data-testid="ai-verification-badge-valid"
            >
              Verified with AI
            </Badge>
          )}
          {overallStatus === 'warning' && (
            <Badge
              size="sm"
              variant="light"
              color="yellow"
              leftSection={<IconAlertTriangle size={12} />}
              data-testid="ai-verification-badge-warning"
            >
              Needs Attention
            </Badge>
          )}
          {overallStatus === 'invalid' && (
            <Badge
              size="sm"
              variant="light"
              color="red"
              leftSection={<IconAlertCircle size={12} />}
              data-testid="ai-verification-badge-invalid"
            >
              Validation Issue
            </Badge>
          )}
          <Text size="xs" c="dimmed" truncate>
            {generatorAiDetails}
          </Text>
        </Group>

        {onReverify && (
          <Tooltip label="Re-verify with AI" withArrow>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="indigo"
              onClick={onReverify}
              aria-label="Re-verify with AI"
            >
              <IconRefresh size={14} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Stack>
  );
}
