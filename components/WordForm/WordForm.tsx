import { Button, Card, Group, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useRef, useState } from 'react';

type WordFormProps = {
  onAdd: (word: string, meaning: string) => Promise<void> | void;
  disabled?: boolean;
};

export function WordForm({ onAdd, disabled }: WordFormProps) {
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const wordInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = word.trim().length > 0 && !isSaving;

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) {
      event.preventDefault();
    }
    if (!canSubmit) {
      return;
    }

    setIsSaving(true);
    try {
      await onAdd(word.trim(), meaning.trim());
      setWord('');
      setMeaning('');
      // Auto-focus the word input after successful submission
      setTimeout(() => {
        wordInputRef.current?.focus();
      }, 0);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMeaningKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <Card withBorder radius="md" padding="lg" style={{ backgroundColor: 'var(--mantine-color-blue-0)' }}>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <div>
            <Text fw={600} mb="xs">Add New Word</Text>
            <Text size="sm" c="dimmed">
              Enter an English word and optionally add its definition. When online, definitions are automatically fetched.
            </Text>
          </div>
          <TextInput
            ref={wordInputRef}
            label="English Word"
            placeholder="e.g. concise, eloquent, pragmatic"
            value={word}
            onChange={(event) => setWord(event.currentTarget.value)}
            disabled={disabled || isSaving}
            required
          />
          <Textarea
            label="Definition (optional - auto-filled when online)"
            placeholder="Type a definition or leave blank"
            value={meaning}
            onChange={(event) => setMeaning(event.currentTarget.value)}
            onKeyDown={handleMeaningKeyDown}
            disabled={disabled || isSaving}
            minRows={2}
          />
          <Group justify="flex-end">
            <Button
              type="submit"
              disabled={!canSubmit || disabled}
              loading={isSaving}
              leftSection={<IconPlus size={18} />}
            >
              Add Word
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}
