import {
  ActionIcon,
  Button,
  Card,
  Group,
  Progress,
  Stack,
  Text,
  Title,
  RingProgress,
  Tooltip,
} from '@mantine/core';
import {
  IconAward,
  IconCopy,
  IconRotateClockwise,
  IconVolume,
  IconChevronLeft,
  IconChevronRight,
  IconBookmarkOff,
  IconBookmark,
} from '@tabler/icons-react';
import { useState } from 'react';

export type QuizItem = {
  id: string;
  word: string;
  meaning: string;
  examples?: string[];
};

type QuizPanelProps = {
  item: QuizItem | null;
  revealed: boolean;
  onReveal: () => void;
  onMarkMissed: () => void;
  isMarkedMissed: boolean;
  onNext: () => void;
  onPrevious: () => void;
  completed: boolean;
  hasPrevious: boolean;
  currentIndex?: number;
  totalCount?: number;
  onRestart?: () => void;
  onRefreshExamples?: (id: string) => void;
};

export function QuizPanel({
  item,
  revealed,
  onReveal,
  onMarkMissed,
  isMarkedMissed,
  onNext,
  onPrevious,
  completed,
  hasPrevious,
  currentIndex = 0,
  totalCount = 0,
  onRestart,
  onRefreshExamples,
}: QuizPanelProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleSpeak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // Cancel currently speaking voices
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  if (completed) {
    return (
      <Card
        className="glass-panel animate-float"
        radius="lg"
        padding="xl"
        style={{
          textAlign: 'center',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          background: 'rgba(99, 102, 241, 0.05)',
        }}
      >
        <Stack gap="xl" align="center" py="lg">
          <RingProgress
            size={120}
            roundCaps
            thickness={8}
            sections={[{ value: 100, color: 'indigo' }]}
            label={
              <Group justify="center">
                <IconAward size={48} style={{ color: '#6366f1' }} />
              </Group>
            }
          />

          <Stack gap="xs">
            <Title order={2} className="text-gradient" style={{ fontFamily: 'var(--font-title)' }}>
              Quiz Completed!
            </Title>
            <Text c="dimmed" size="sm" max-width="360px" mx="auto" style={{ lineHeight: 1.6 }}>
              Fantastic effort! You've mastered all {totalCount} words selected for this session.
              Repetition is key to long-term memory.
            </Text>
          </Stack>

          <Group justify="center" mt="md">
            {onRestart && (
              <Button
                onClick={onRestart}
                className="btn-premium btn-pulse"
                size="md"
                radius="md"
                leftSection={<IconRotateClockwise size={18} />}
              >
                Restart Session
              </Button>
            )}
          </Group>
        </Stack>
      </Card>
    );
  }

  if (!item) {
    return (
      <Card className="glass-panel" radius="lg" padding="xl" style={{ textAlign: 'center' }}>
        <Text c="dimmed" style={{ fontStyle: 'italic' }}>
          No vocabulary cards are available in the selected date range.
        </Text>
      </Card>
    );
  }

  // Calculate visual progress percentage
  const progressPercent =
    totalCount > 0 ? ((currentIndex + (revealed ? 1 : 0)) / totalCount) * 100 : 0;
  const examples = Array.isArray(item?.examples) ? item.examples : [];

  return (
    <Card className="glass-panel" radius="lg" padding="xl">
      <Stack gap="xl">
        {/* Progress Bar Header */}
        {totalCount > 0 && (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="xs" fw={700} c="indigo">
                SESSION PROGRESS
              </Text>
              <Text size="xs" fw={700} c="dimmed">
                {Math.min(currentIndex + 1, totalCount)} of {totalCount} Words
              </Text>
            </Group>
            <Progress
              value={progressPercent}
              size="sm"
              radius="xl"
              color="indigo"
              animated
              style={{ background: 'rgba(99, 102, 241, 0.1)' }}
            />
          </Stack>
        )}

        {/* Word Display Section */}
        <Stack gap="md" align="center" style={{ minHeight: '160px', justify: 'center' }}>
          <Group gap="sm" align="center">
            <Title
              order={1}
              style={{
                fontFamily: 'var(--font-title)',
                fontSize: '2.5rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                textAlign: 'center',
              }}
            >
              {item.word}
            </Title>
            <Group gap={6}>
              <ActionIcon
                aria-label="Speak pronunciation"
                variant="subtle"
                color={isPlayingAudio ? 'indigo' : 'gray'}
                size="lg"
                radius="md"
                onClick={() => handleSpeak(item.word)}
                style={{
                  transition: 'all 0.2s ease',
                }}
              >
                <IconVolume size={20} />
              </ActionIcon>
              <ActionIcon
                aria-label="Copy word"
                variant="subtle"
                color="gray"
                size="lg"
                radius="md"
                onClick={() => navigator.clipboard.writeText(item.word)}
              >
                <IconCopy size={20} />
              </ActionIcon>
              <Tooltip label={isMarkedMissed ? 'Unmark missed' : 'Mark as missed'}>
                <ActionIcon
                  aria-label={isMarkedMissed ? 'Unmark missed' : 'Mark as missed'}
                  variant="subtle"
                  color={isMarkedMissed ? 'teal' : 'red'}
                  size="lg"
                  radius="md"
                  onClick={onMarkMissed}
                >
                  {isMarkedMissed ? <IconBookmark size={20} /> : <IconBookmarkOff size={20} />}
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {/* Meaning Block */}
          <Stack style={{ width: '100%' }} mt="xs">
            {revealed ? (
              <Card
                radius="md"
                padding="md"
                style={{
                  background: 'rgba(99, 102, 241, 0.05)',
                  border: '1px solid rgba(99, 102, 241, 0.15)',
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'pulse 0.3s ease-out',
                }}
              >
                <Stack gap="sm" style={{ width: '100%' }}>
                  <Text
                    size="md"
                    fw={500}
                    style={{
                      color: 'var(--text-secondary)',
                      textAlign: 'center',
                      lineHeight: 1.6,
                    }}
                  >
                    {item.meaning ? item.meaning : 'No definition available.'}
                  </Text>
                  {examples.length > 0 && (
                    <Stack gap={2}>
                      <Text size="xs" fw={600} c="dimmed" style={{ textAlign: 'center' }}>
                        Examples
                      </Text>
                      {examples.map((example, index) => (
                        <Text
                          key={`${item.id}-quiz-example-${index}`}
                          size="sm"
                          style={{
                            color: 'var(--text-secondary)',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                          }}
                        >
                          {`• ${example}`}
                        </Text>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Card>
            ) : (
              <Button
                variant="light"
                color="indigo"
                onClick={onReveal}
                size="lg"
                radius="md"
                className="btn-pulse"
                style={{
                  height: '60px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
              >
                Show Definition
              </Button>
            )}
          </Stack>

          {revealed && onRefreshExamples && (
            <Group justify="center" mt="xs">
              <Button
                variant="subtle"
                size="xs"
                radius="md"
                leftSection={<IconRotateClockwise size={14} />}
                onClick={() => onRefreshExamples(item.id)}
              >
                Regenerate Examples
              </Button>
            </Group>
          )}
        </Stack>

        {/* Navigation Action Buttons */}
        <Group justify="space-between" mt="lg">
          <Button
            variant="subtle"
            color="gray"
            onClick={onPrevious}
            disabled={!hasPrevious}
            radius="md"
            leftSection={<IconChevronLeft size={18} />}
          >
            Back
          </Button>

          <Button
            onClick={onNext}
            className="btn-premium"
            radius="md"
            rightSection={<IconChevronRight size={18} />}
          >
            {currentIndex + 1 >= totalCount ? 'Complete Session' : 'Next Word'}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
