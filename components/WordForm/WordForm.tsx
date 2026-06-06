import { Button, Card, Group, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useRef, useState } from 'react';

type WordFormProps = {
  onAdd: (word: string, meaning: string, example: string) => Promise<void> | void;
  disabled?: boolean;
};

export function WordForm({ onAdd, disabled }: WordFormProps) {
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
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
      await onAdd(word.trim(), meaning.trim(), example.trim());
      setWord('');
      setMeaning('');
      setExample('');
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
    <Card
      className="glass-panel"
      radius="lg"
      padding="xl"
      style={{
        borderLeft: '4px solid #6366f1',
        overflow: 'hidden',
      }}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          <div>
            <Text
              fw={700}
              size="lg"
              className="text-gradient"
              mb={2}
              style={{ fontFamily: 'var(--font-title)' }}
            >
              Add New Vocabulary Word
            </Text>
          </div>

          <TextInput
            ref={wordInputRef}
            label={
              <Text size="xs" fw={600} c="dimmed" span>
                English Word
              </Text>
            }
            placeholder="e.g. eloquent, pragmatic, nebulous"
            value={word}
            onChange={(event) => setWord(event.currentTarget.value)}
            disabled={disabled || isSaving}
            required
            size="md"
            radius="md"
          />

          <Textarea
            label={
              <Text size="xs" fw={600} c="dimmed">
                Definition (optional)
              </Text>
            }
            placeholder="Type your own definition here, or leave it blank to auto-fetch..."
            value={meaning}
            onChange={(event) => setMeaning(event.currentTarget.value)}
            onKeyDown={handleMeaningKeyDown}
            disabled={disabled || isSaving}
            minRows={2.5}
            size="sm"
            radius="md"
            autosize
          />

          <Textarea
            label={
              <Text size="xs" fw={600} c="dimmed">
                Example sentence (optional)
              </Text>
            }
            placeholder="Add your own example using this word..."
            autosize
            value={example}
            onChange={(event) => setExample(event.currentTarget.value.replace(/\s+/g, ' ').trim())}
            disabled={disabled || isSaving}
            minRows={2}
            size="sm"
            radius="md"
            onKeyDown={handleMeaningKeyDown}
          />

          <Group justify="flex-end" mt="xs">
            <Button
              type="submit"
              disabled={!canSubmit || disabled}
              loading={isSaving}
              className="btn-premium"
              radius="md"
              size="md"
              leftSection={<IconPlus size={20} />}
            >
              Save Word
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}
