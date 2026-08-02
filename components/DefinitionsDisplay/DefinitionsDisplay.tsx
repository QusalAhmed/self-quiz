import { Badge, Button, Collapse, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useState } from 'react';
import type { WordDefinition } from '@/lib/db';
import { normalizeDefinitions } from '@/lib/definitions';

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
 * Renders a word's definitions normally, each shown separately with its own part-of-speech badge.
 * Contains a toggle button under each definition to open a dedicated scroller for examples.
 * User-authored examples and AI-generated examples are differentiated by distinct text colors.
 */
export function DefinitionsDisplay({
  definitions,
  fallbackMeaning = '',
  emptyText = 'No definition available',
  showExamples = true,
  align = 'left',
  meaningSize = 'sm',
  maxWidth,
  gap = 'md',
}: DefinitionsDisplayProps) {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});
  const normalized = normalizeDefinitions(definitions, fallbackMeaning);
  const isCenter = align === 'center';

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) => ({ ...prev, [index]: !prev[index] }));
  };

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
    <Stack
      gap={gap}
      style={
        maxWidth ? { width: '100%', maxWidth, margin: isCenter ? '0 auto' : undefined } : undefined
      }
    >
      {normalized.map((definition, index) => {
        const userExamples = definition.userExamples || [];
        const aiExamples = definition.examples || [];
        const totalExamples = userExamples.length + aiExamples.length;
        const isExpanded = Boolean(expandedIndices[index]);

        return (
          <Stack key={`definition-${index}`} gap={6}>
            <Text
              size={meaningSize}
              fw={meaningSize === 'lg' ? 600 : 600}
              style={{
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                wordBreak: 'break-word',
                textAlign: 'left',
              }}
            >
              <Text span size={meaningSize === 'lg' ? 'sm' : 'xs'} fw={700} c="dimmed" mr={6}>
                {index + 1}.
              </Text>
              {definition.partOfSpeech && (
                <Badge
                  variant="light"
                  color="indigo"
                  size={meaningSize === 'lg' ? 'sm' : 'xs'}
                  radius="sm"
                  mr={6}
                  style={{
                    textTransform: 'none',
                    display: 'inline-flex',
                    verticalAlign: 'baseline',
                  }}
                >
                  {definition.partOfSpeech}
                </Badge>
              )}
              {definition.meaning}
            </Text>

            {showExamples && totalExamples > 0 && (
              <Stack gap="xs" style={{ width: '100%' }} pl={{ base: 0, sm: 20 }}>
                <Group justify={isCenter ? 'center' : 'flex-start'}>
                  <Button
                    variant="subtle"
                    color="indigo"
                    size="xs"
                    radius="md"
                    leftSection={
                      isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                    }
                    onClick={() => toggleExpand(index)}
                    style={{ fontWeight: 600, height: 26, paddingLeft: 8, paddingRight: 8 }}
                  >
                    {isExpanded ? 'Hide Examples' : `Show Examples (${totalExamples})`}
                  </Button>
                </Group>

                <Collapse expanded={isExpanded}>
                  <ScrollArea.Autosize
                    mah={180}
                    offsetScrollbars
                    scrollbarSize={6}
                    type="auto"
                    style={{ width: '100%' }}
                  >
                    <Stack gap={4} py={4} pl={20}>
                      {/* User Authored Examples ("My Examples") — Purple / Grape Text */}
                      {userExamples.map((example, exampleIndex) => (
                        <Text
                          key={`definition-${index}-user-example-${exampleIndex}`}
                          size="sm"
                          fw={500}
                          style={{
                            color: '#c084fc',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            textAlign: 'left',
                          }}
                        >
                          {`• ${example}`}
                        </Text>
                      ))}

                      {/* AI Generated Examples — Indigo / Blue Text */}
                      {aiExamples.map((example, exampleIndex) => (
                        <Text
                          key={`definition-${index}-ai-example-${exampleIndex}`}
                          size="sm"
                          fw={500}
                          style={{
                            color: '#818cf8',
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                            textAlign: 'left',
                          }}
                        >
                          {`• ${example}`}
                        </Text>
                      ))}
                    </Stack>
                  </ScrollArea.Autosize>
                </Collapse>
              </Stack>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
