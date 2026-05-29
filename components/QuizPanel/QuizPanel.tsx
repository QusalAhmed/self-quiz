import { ActionIcon, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';
import { useEffect } from 'react';

export type QuizItem = {
  id: string;
  word: string;
  meaning: string;
};

type QuizPanelProps = {
  item: QuizItem | null;
  revealed: boolean;
  onReveal: () => void;
  onNext: () => void;
  onPrevious: () => void;
  completed: boolean;
  hasPrevious: boolean;
};

export function QuizPanel({
  item,
  revealed,
  onReveal,
  onNext,
  onPrevious,
  completed,
  hasPrevious,
}: QuizPanelProps) {
  useEffect(() => {
    if (!item) {
      return;
    }
  }, [item]);

  if (completed) {
    return <Text c="teal">Great job! You have covered all words in this quiz.</Text>;
  }

  if (!item) {
    return <Text c="dimmed">No words available for this quiz range.</Text>;
  }

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={4}>{item.word}</Title>
          <ActionIcon
            aria-label="Copy word"
            variant="light"
            onClick={() => navigator.clipboard.writeText(item.word)}
          >
            <IconCopy size={18} />
          </ActionIcon>
        </Group>
        <Stack gap="xs">
          {revealed ? (
            <Text c="dimmed">{item.meaning}</Text>
          ) : (
            <Button variant="light" onClick={onReveal}>
              Show meaning
            </Button>
          )}
        </Stack>
        <Group justify="space-between">
          <Group gap="sm">
            <Button variant="default" onClick={onPrevious} disabled={!hasPrevious}>
              Previous word
            </Button>
          </Group>
          <Button onClick={onNext}>Next word</Button>
        </Group>
      </Stack>
    </Card>
  );
}
