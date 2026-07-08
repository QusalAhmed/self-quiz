import { Badge, Group, Stack, Text } from '@mantine/core';
import type { WordDefinition } from '@/lib/db';
import { normalizeDefinitions } from '@/lib/definitions';
import { getDefinitionExamples } from '@/lib/examples';

export type DefinitionsDisplayProps = {
  definitions?: WordDefinition[];
  fallbackMeaning?: string;
  emptyText?: string;
  /** Show each definition's own examples underneath it. Defaults to true. */
  showExamples?: boolean;
  align?: 'left' | 'center';
  /** Controls the meaning text size — use 'lg' for the quiz's big centered display. */
  meaningSize?: 'sm' | 'md' | 'lg';
  maxWidth?: number | string;
  gap?: number | string;
};

/**
 * Renders a word's definitions, each shown separately with its own part-of-speech badge
 * and example sentences (user-authored first, then AI-generated).
 */
export function DefinitionsDisplay({
  definitions,
  fallbackMeaning = '',
  emptyText = 'No definition available',
  showExamples = true,
  align = 'left',
  meaningSize = 'sm',
  maxWidth,
  gap = 'sm',
}: DefinitionsDisplayProps) {
  const normalized = normalizeDefinitions(definitions, fallbackMeaning);
  const isCenter = align === 'center';

  if (normalized.length === 0) {
    return (
      <Text
        size={meaningSize === 'lg' ? 'lg' : meaningSize}
        c="dimmed"
        style={{
          fontStyle: 'italic',
          lineHeight: 1.6,
          wordBreak: 'break-word',
          textAlign: isCenter ? 'center' : undefined,
          maxWidth,
          margin: isCenter ? '0 auto' : undefined,
        }}
      >
        {emptyText}
      </Text>
    );
  }

  return (
    <Stack gap={gap} style={maxWidth ? { width: '100%', maxWidth, margin: isCenter ? '0 auto' : undefined } : undefined}>
      {normalized.map((definition, index) => {
        const examples = showExamples ? getDefinitionExamples(definition) : [];
        return (
          <Stack key={`definition-${index}`} gap={4}>
            <Group gap={6} align="center" wrap="nowrap">
              <Text
                size={meaningSize === 'lg' ? 'sm' : 'xs'}
                fw={700}
                c="dimmed"
                style={{ lineHeight: 1.6, flexShrink: 0 }}
              >
                {index + 1}.
              </Text>
              {definition.partOfSpeech && (
                <Badge
                  variant="light"
                  color="indigo"
                  size={meaningSize === 'lg' ? 'sm' : 'xs'}
                  radius="sm"
                  style={{ textTransform: 'none', flexShrink: 0 }}
                >
                  {definition.partOfSpeech}
                </Badge>
              )}
              <Text
                size={meaningSize}
                fw={meaningSize === 'lg' ? 500 : 600}
                style={{
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  wordBreak: 'break-word',
                  flex: 1,
                  textAlign: 'left',
                }}
              >
                {definition.meaning}
              </Text>
            </Group>
            {examples.length > 0 && (
              <Stack gap={2} pl={20}>
                {examples.map((example, exampleIndex) => (
                  <Text
                    key={`definition-${index}-example-${exampleIndex}`}
                    size="sm"
                    style={{
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                      textAlign: 'left',
                    }}
                  >
                    {`• ${example}`}
                  </Text>
                ))}
              </Stack>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
