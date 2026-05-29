import { Button, Group, Stack, TextInput, Textarea } from '@mantine/core';
import { useState } from 'react';

type WordFormProps = {
  onAdd: (word: string, meaning: string) => Promise<void> | void;
  disabled?: boolean;
};

export function WordForm({ onAdd, disabled }: WordFormProps) {
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <TextInput
          label="Word"
          placeholder="e.g. concise"
          value={word}
          onChange={(event) => setWord(event.currentTarget.value)}
          disabled={disabled}
          required
        />
        <Textarea
          label="Meaning (optional)"
          placeholder="Leave blank to auto-translate to Bangla"
          value={meaning}
          onChange={(event) => setMeaning(event.currentTarget.value)}
          onKeyDown={handleMeaningKeyDown}
          disabled={disabled}
          minRows={3}
        />
        <Group justify="flex-end">
          <Button type="submit" disabled={!canSubmit || disabled} loading={isSaving}>
            Add word
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
