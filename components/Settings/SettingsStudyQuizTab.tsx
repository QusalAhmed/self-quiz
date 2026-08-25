'use client';

import {
  Card,
  Divider,
  Group,
  Paper,
  Radio,
  RollingNumber,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconBrain,
  IconEyeOff,
  IconListNumbers,
  IconPlayerTrackNext,
  IconVolume,
} from '@tabler/icons-react';
import React from 'react';
import type { QuizDirectionKey, QuizRangeKey } from '@/app/home/constants';
import type { AppStudyQuizSettings } from '@/lib/settings';

export interface SettingsStudyQuizTabProps {
  settings: AppStudyQuizSettings;
  onChange: (values: Partial<AppStudyQuizSettings>) => void;
}

const QUIZ_DIRECTIONS: Array<{ key: QuizDirectionKey; label: string; description: string }> = [
  {
    key: 'wordToMeaning',
    label: 'Word → Meaning',
    description: 'Prompt shows the English word; recall definition and examples',
  },
  {
    key: 'meaningToWord',
    label: 'Meaning → Word',
    description: 'Prompt shows definition; recall and spell the target English word',
  },
  {
    key: 'spelling',
    label: 'Spelling Practice',
    description: 'Hear pronunciation and definition; type the exact word',
  },
];

export function SettingsStudyQuizTab({ settings, onChange }: SettingsStudyQuizTabProps) {
  return (
    <Stack gap="lg">
      {/* Default Quiz Direction */}
      <Card
        withBorder
        radius="md"
        p={{ base: 'md', sm: 'lg' }}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <Group gap="sm" mb="md">
          <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
            <IconBrain size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Default Quiz Direction & Mode
            </Text>
            <Text size="xs" c="dimmed">
              Choose the primary testing orientation when launching quizzes and FSRS review decks
            </Text>
          </div>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {QUIZ_DIRECTIONS.map((dir) => {
            const isSelected = settings.defaultQuizDirection === dir.key;
            return (
              <Paper
                key={dir.key}
                withBorder
                p="md"
                radius="md"
                style={{
                  cursor: 'pointer',
                  border: isSelected
                    ? '2px solid var(--mantine-color-indigo-5)'
                    : '1px solid var(--card-border)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--card-bg)',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => onChange({ defaultQuizDirection: dir.key })}
              >
                <Radio
                  checked={isSelected}
                  onChange={() => onChange({ defaultQuizDirection: dir.key })}
                  label={
                    <Text fw={600} size="sm">
                      {dir.label}
                    </Text>
                  }
                  color="indigo"
                  mb="xs"
                />
                <Text size="xs" c="dimmed" pl={28}>
                  {dir.description}
                </Text>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Card>

      {/* Quiz Session Configuration */}
      <Card
        withBorder
        radius="md"
        p={{ base: 'md', sm: 'lg' }}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <Group gap="sm" mb="md">
          <ThemeIcon size="lg" radius="md" color="violet" variant="light">
            <IconListNumbers size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Session Sizing & Automation
            </Text>
            <Text size="xs" c="dimmed">
              Configure batch sizes, card pronunciation, and auto-progression
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          {/* Default Range */}
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Text size="sm" fw={600}>
                Default Quiz Batch Range
              </Text>
              <Text size="xs" c="dimmed">
                Number of cards loaded in a standard flashcard session
              </Text>
            </div>
            <Select
              value={settings.defaultQuizRange}
              onChange={(val) => onChange({ defaultQuizRange: (val || 'all') as QuizRangeKey })}
              data={[
                { value: 'all', label: 'All Words in Deck' },
                { value: '10', label: 'First 10 Words' },
                { value: '20', label: 'First 20 Words' },
                { value: '50', label: 'First 50 Words' },
                { value: '100', label: 'First 100 Words' },
              ]}
              size="xs"
              style={{ width: '100%', maxWidth: 200 }}
            />
          </Group>

          <Divider />

          {/* Auto Pronounce */}
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Group gap="xs">
                <IconVolume size={16} color="var(--mantine-color-indigo-5)" />
                <Text size="sm" fw={600}>
                  Auto-Pronounce Quiz Word
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Automatically vocalize the English word when a card is revealed or presented
              </Text>
            </div>
            <Switch
              checked={settings.autoPronounceQuizWord}
              onChange={(e) => onChange({ autoPronounceQuizWord: e.currentTarget.checked })}
              color="indigo"
            />
          </Group>

          <Divider />

          {/* Auto Advance */}
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Group gap="xs">
                <IconPlayerTrackNext size={16} color="var(--mantine-color-violet-5)" />
                <Text size="sm" fw={600}>
                  Auto-Advance to Next Card
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Automatically step to the next card after rating without requiring an extra click
              </Text>
            </div>
            <Switch
              checked={settings.autoAdvanceOnFlip}
              onChange={(e) => onChange({ autoAdvanceOnFlip: e.currentTarget.checked })}
              color="violet"
            />
          </Group>

          {settings.autoAdvanceOnFlip && (
            <Paper
              withBorder
              p="sm"
              radius="md"
              style={{ background: 'var(--mantine-color-default-hover)' }}
            >
              <Group justify="space-between" align="center" mb={6}>
                <Text size="xs" fw={600}>
                  Auto-Advance Delay: <RollingNumber value={settings.autoAdvanceDelayMs} /> ms
                </Text>
                <Text size="xs" c="dimmed">
                  <RollingNumber
                    value={settings.autoAdvanceDelayMs / 1000}
                    decimalScale={1}
                    suffix="s"
                  />
                </Text>
              </Group>
              <Slider
                value={settings.autoAdvanceDelayMs}
                onChange={(val) => onChange({ autoAdvanceDelayMs: val })}
                min={400}
                max={3000}
                step={100}
                color="violet"
                size="sm"
                marks={[
                  { value: 500, label: '0.5s' },
                  { value: 1200, label: '1.2s' },
                  { value: 2000, label: '2.0s' },
                  { value: 3000, label: '3.0s' },
                ]}
              />
            </Paper>
          )}

          <Divider />

          {/* Shuffle Choices */}
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Text size="sm" fw={600}>
                Randomize & Shuffle Card Order
              </Text>
              <Text size="xs" c="dimmed">
                Present cards in randomized order instead of alphabetical or chronological order
              </Text>
            </div>
            <Switch
              checked={settings.shuffleChoices}
              onChange={(e) => onChange({ shuffleChoices: e.currentTarget.checked })}
              color="teal"
            />
          </Group>
        </Stack>
      </Card>

      {/* Practice Mode Meanings Visibility */}
      <Card
        withBorder
        radius="md"
        p={{ base: 'md', sm: 'lg' }}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <Group gap="sm" mb="md">
          <ThemeIcon size="lg" radius="md" color="orange" variant="light">
            <IconEyeOff size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Practice Deck Meaning Visibility
            </Text>
            <Text size="xs" c="dimmed">
              Default visibility of definitions in Missed Words and SRS Practice lists
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Text size="sm" fw={600}>
                Hide Missed Words Meanings by Default
              </Text>
              <Text size="xs" c="dimmed">
                Blur meanings in the Missed Words table so you can test yourself before revealing
              </Text>
            </div>
            <Switch
              checked={settings.hideMissedMeaningsDefault}
              onChange={(e) => onChange({ hideMissedMeaningsDefault: e.currentTarget.checked })}
              color="orange"
            />
          </Group>

          <Divider />

          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Text size="sm" fw={600}>
                Hide SRS Practice Meanings by Default
              </Text>
              <Text size="xs" c="dimmed">
                Blur meanings in the SRS Practice table until hovered or clicked
              </Text>
            </div>
            <Switch
              checked={settings.hideSrsPracticeMeaningsDefault}
              onChange={(e) =>
                onChange({ hideSrsPracticeMeaningsDefault: e.currentTarget.checked })
              }
              color="orange"
            />
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
