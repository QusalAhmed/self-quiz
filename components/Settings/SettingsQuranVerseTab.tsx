'use client';

import {
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconBook,
  IconClock,
  IconExternalLink,
  IconLanguage,
  IconPlayerPlay,
  IconVolume,
} from '@tabler/icons-react';
import Link from 'next/link';
import React from 'react';
import { AVAILABLE_RECITERS, AVAILABLE_TAFSIRS, AVAILABLE_TRANSLATIONS } from '@/lib/quran-api';
import type { AppQuranVerseSettings } from '@/lib/settings';

export interface SettingsQuranVerseTabProps {
  settings: AppQuranVerseSettings;
  onChange: (values: Partial<AppQuranVerseSettings>) => void;
  onTestPopup?: () => void;
}

const INTERVAL_PRESETS = [5, 10, 15, 30, 45, 60, 120];

export function SettingsQuranVerseTab({
  settings,
  onChange,
  onTestPopup,
}: SettingsQuranVerseTabProps) {
  const enTranslations = AVAILABLE_TRANSLATIONS.filter((t) => t.languageName === 'english');
  const bnTranslations = AVAILABLE_TRANSLATIONS.filter((t) => t.languageName === 'bengali');

  return (
    <Stack gap="lg">
      {/* Top Banner & Master Toggle */}
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
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Group gap="sm">
            <ThemeIcon
              size="xl"
              radius="md"
              variant="gradient"
              gradient={{ from: 'teal', to: 'indigo', deg: 45 }}
            >
              <IconBook size={24} />
            </ThemeIcon>
            <Stack gap={2}>
              <Title order={4} style={{ fontWeight: 700 }}>
                Inspirational Quran Verse Popups
              </Title>
              <Text size="xs" c="dimmed">
                Periodically shows uplifting Quran verses with Arabic script, English & Bangla
                translations, Tafsir & recitation audio
              </Text>
            </Stack>
          </Group>

          <Group gap="sm">
            {onTestPopup && (
              <Button
                variant="light"
                color="indigo"
                size="sm"
                leftSection={<IconPlayerPlay size={16} />}
                onClick={onTestPopup}
              >
                Test Popup Now
              </Button>
            )}

            <Switch
              size="md"
              color="teal"
              checked={settings.enabled}
              onChange={(e) => onChange({ enabled: e.currentTarget.checked })}
              label={settings.enabled ? 'Enabled' : 'Disabled'}
            />
          </Group>
        </Group>
      </Card>

      {/* Recurring Interval Configuration */}
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
            <IconClock size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Recurring Popup Interval
            </Text>
            <Text size="xs" c="dimmed">
              Define how frequently the motivational Quran verse popup appears
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          <Group gap="xs" wrap="wrap">
            {INTERVAL_PRESETS.map((minutes) => {
              const isSelected = settings.recurringIntervalMinutes === minutes;
              return (
                <Button
                  key={minutes}
                  variant={isSelected ? 'filled' : 'light'}
                  color={isSelected ? 'indigo' : 'gray'}
                  size="xs"
                  radius="md"
                  onClick={() => onChange({ recurringIntervalMinutes: minutes })}
                  style={{ fontWeight: 600 }}
                >
                  Every{' '}
                  {minutes >= 60
                    ? `${minutes / 60} hour${minutes > 60 ? 's' : ''}`
                    : `${minutes} mins`}
                </Button>
              );
            })}
          </Group>

          <Grid align="center">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <NumberInput
                label="Custom Minutes Interval"
                description="Interval in minutes (1 to 1440 mins)"
                value={settings.recurringIntervalMinutes}
                onChange={(val) =>
                  onChange({
                    recurringIntervalMinutes:
                      typeof val === 'number' ? Math.max(1, Math.min(1440, val)) : 15,
                  })
                }
                min={1}
                max={1440}
                step={5}
                size="sm"
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Paper
                p="sm"
                radius="md"
                withBorder
                style={{ background: 'rgba(99, 102, 241, 0.04)' }}
              >
                <Text size="xs" fw={700} c="indigo">
                  Current Schedule:
                </Text>
                <Text size="sm" fw={600} mt={2}>
                  Popup every {settings.recurringIntervalMinutes} minute(s)
                </Text>
                <Text size="xs" c="dimmed">
                  {settings.enabled
                    ? 'Timer is actively running in background.'
                    : 'Timer is currently paused (switch toggle above).'}
                </Text>
              </Paper>
            </Grid.Col>
          </Grid>
        </Stack>
      </Card>

      {/* Recitation Audio Preferences */}
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
          <ThemeIcon size="lg" radius="md" color="teal" variant="light">
            <IconVolume size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Recitation Audio & Sound
            </Text>
            <Text size="xs" c="dimmed">
              Choose your preferred Qari (reciter) and audio behavior
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          <Select
            label="Preferred Quran Reciter (Qari)"
            description="High-quality audio streams from Quran.com CDN"
            data={AVAILABLE_RECITERS.map((r) => ({
              value: String(r.id),
              label: `${r.reciterName} ${r.style ? `(${r.style})` : ''}`,
            }))}
            value={String(settings.preferredReciterId)}
            onChange={(val) => val && onChange({ preferredReciterId: parseInt(val, 10) })}
            size="sm"
          />

          <Divider style={{ borderColor: 'var(--card-border)' }} />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Paper p="sm" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" fw={600}>
                    Autoplay Recitation
                  </Text>
                  <Text size="xs" c="dimmed">
                    Automatically play recitation audio when popup opens
                  </Text>
                </div>
                <Switch
                  checked={settings.autoPlayAudio}
                  onChange={(e) => onChange({ autoPlayAudio: e.currentTarget.checked })}
                  color="teal"
                />
              </Group>
            </Paper>

            <Paper p="sm" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" fw={600}>
                    Sound Notification
                  </Text>
                  <Text size="xs" c="dimmed">
                    Play a gentle chime when a new popup is ready
                  </Text>
                </div>
                <Switch
                  checked={settings.soundNotification}
                  onChange={(e) => onChange({ soundNotification: e.currentTarget.checked })}
                  color="teal"
                />
              </Group>
            </Paper>
          </SimpleGrid>
        </Stack>
      </Card>

      {/* Translations & Tafsir Preferences */}
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
            <IconLanguage size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Translations & Tafsir Commentary
            </Text>
            <Text size="xs" c="dimmed">
              Choose your preferred English & Bangla translators and Tafsir sources
            </Text>
          </div>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Select
            label="🇬🇧 English Translation"
            data={enTranslations.map((t) => ({
              value: String(t.id),
              label: `${t.name} (${t.authorName})`,
            }))}
            value={String(settings.preferredEnglishTranslationId)}
            onChange={(val) =>
              val && onChange({ preferredEnglishTranslationId: parseInt(val, 10) })
            }
            size="sm"
          />

          <Select
            label="🇧🇩 Bangla Translation (বাংলা অনুবাদ)"
            data={bnTranslations.map((t) => ({
              value: String(t.id),
              label: `${t.name} (${t.authorName})`,
            }))}
            value={String(settings.preferredBanglaTranslationId)}
            onChange={(val) => val && onChange({ preferredBanglaTranslationId: parseInt(val, 10) })}
            size="sm"
          />

          <Select
            label="📖 Preferred Tafsir Source"
            data={AVAILABLE_TAFSIRS.map((t) => ({
              value: String(t.id),
              label: `${t.name} [${t.languageName.toUpperCase()}]`,
            }))}
            value={String(settings.preferredTafsirId)}
            onChange={(val) => val && onChange({ preferredTafsirId: parseInt(val, 10) })}
            size="sm"
          />

          <Box style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              component={Link}
              href="/quran"
              variant="light"
              color="indigo"
              fullWidth
              rightSection={<IconExternalLink size={16} />}
              size="sm"
            >
              Open Full Quran Verses Library
            </Button>
          </Box>
        </SimpleGrid>
      </Card>
    </Stack>
  );
}
