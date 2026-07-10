import type { KeyboardEvent } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Group,
  Select,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';
import { PARTS_OF_SPEECH } from '@/lib/definitions';
import type { DefinitionFormValue } from './types';

type DefinitionEditorCardProps = {
  definition: DefinitionFormValue;
  index: number;
  inputSize: 'sm' | 'md';
  disabled?: boolean;
  isSaving: boolean;
  definitionCount: number;
  onUpdateDefinition: (
    index: number,
    value: Partial<Pick<DefinitionFormValue, 'meaning' | 'partOfSpeech'>>
  ) => void;
  onRemoveDefinition: (index: number) => void;
  onUpdateExample: (definitionIndex: number, exampleIndex: number, value: string) => void;
  onAddExample: (definitionIndex: number) => void;
  onRemoveExample: (definitionIndex: number, exampleIndex: number) => void;
  onDefinitionKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onExampleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export function DefinitionEditorCard({
  definition,
  index,
  inputSize,
  disabled,
  isSaving,
  definitionCount,
  onUpdateDefinition,
  onRemoveDefinition,
  onUpdateExample,
  onAddExample,
  onRemoveExample,
  onDefinitionKeyDown,
  onExampleKeyDown,
}: DefinitionEditorCardProps) {
  return (
    <Card
      withBorder
      radius="md"
      padding="sm"
      style={{ background: 'rgba(99, 102, 241, 0.03)' }}
    >
      <Stack gap={8}>
        <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
          <Text size="sm" fw={700} c="indigo" style={{ lineHeight: 1.4 }}>
            Definition {index + 1}
          </Text>
          <Tooltip label="Remove definition" withArrow>
            <ActionIcon
              variant="light"
              color="gray"
              size={inputSize}
              radius="md"
              onClick={() => onRemoveDefinition(index)}
              disabled={disabled || isSaving || definitionCount === 1}
              type="button"
              aria-label="Remove definition"
            >
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group align="flex-end" gap="xs" wrap="wrap">
          <Select
            label={<Text size="xs" fw={600} c="dimmed">Part of speech</Text>}
            placeholder="Any"
            value={definition.partOfSpeech || null}
            onChange={(value) => onUpdateDefinition(index, { partOfSpeech: value ?? '' })}
            data={PARTS_OF_SPEECH.map((part) => ({
              value: part,
              label: part.charAt(0).toUpperCase() + part.slice(1),
            }))}
            disabled={disabled || isSaving}
            size="sm"
            radius="md"
            clearable
            searchable
            w={{ base: '100%', sm: 160 }}
            style={{ flexShrink: 0 }}
          />
          <Textarea
            label={<Text size="xs" fw={600} c="dimmed">Definition</Text>}
            placeholder="Type ..."
            value={definition.meaning}
            onChange={(event) => onUpdateDefinition(index, { meaning: event.currentTarget.value })}
            onKeyDown={onDefinitionKeyDown}
            disabled={disabled || isSaving}
            minRows={1}
            size="sm"
            radius="md"
            autosize
            style={{ flex: 1, minWidth: 200 }}
          />
        </Group>

        <Divider label="Your examples for this definition" labelPosition="left" />

        <Stack gap={6}>
          {definition.userExamples.map((example, exampleIndex) => (
            <Group
              key={`definition-${index}-example-${exampleIndex}`}
              align="flex-end"
              gap="xs"
              wrap="nowrap"
            >
              <Textarea
                placeholder="Add an example sentence using this meaning..."
                value={example}
                onChange={(event) =>
                  onUpdateExample(
                    index,
                    exampleIndex,
                    event.currentTarget.value.replace(/\s+/g, ' ')
                  )
                }
                onKeyDown={onExampleKeyDown}
                disabled={disabled || isSaving}
                minRows={1}
                size="sm"
                radius="md"
                autosize
                style={{ flex: 1 }}
              />
              <Tooltip label="Remove example" withArrow>
                <ActionIcon
                  variant="light"
                  color="gray"
                  size={inputSize}
                  radius="md"
                  onClick={() => onRemoveExample(index, exampleIndex)}
                  disabled={disabled || isSaving || definition.userExamples.length === 1}
                  type="button"
                  aria-label="Remove example"
                >
                  <IconX size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          ))}

          <Button
            variant="subtle"
            color="indigo"
            size="xs"
            radius="md"
            leftSection={<IconPlus size={14} />}
            onClick={() => onAddExample(index)}
            disabled={disabled || isSaving}
            type="button"
            w="fit-content"
          >
            Add example
          </Button>

          {definition.examples.length > 0 && (
            <Stack gap={2} mt={4}>
              <Text size="xs" fw={600} c="dimmed">
                AI-generated examples
              </Text>
              {definition.examples.map((example, exampleIndex) => (
                <Text
                  key={`definition-${index}-ai-example-${exampleIndex}`}
                  size="xs"
                  c="dimmed"
                  style={{ lineHeight: 1.5, wordBreak: 'break-word' }}
                >
                  {`• ${example}`}
                </Text>
              ))}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
