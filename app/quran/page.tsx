'use client';

import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconAdjustments, IconBook, IconPlayerPlay } from '@tabler/icons-react';
import Link from 'next/link';
import React, { Suspense, useState } from 'react';
import { AddQuranVerseModal, QuranVerseManager, useQuranVerse } from '@/components/QuranVerse';
import { useAppSettings } from '@/lib/settings';

function QuranPageContent() {
  const { settings } = useAppSettings();
  const { verses, isLoadingVerses, refreshVerses, showNextVerseNow, previewVerse } =
    useQuranVerse();

  const [addModalOpen, setAddModalOpen] = useState(false);

  return (
    <Container size="lg" px={{ base: 'xs', sm: 'md', md: 'lg' }} py={{ base: 'sm', sm: 'xl' }}>
      <Stack gap="xl">
        {/* Top Header Card */}
        <Paper
          p={{ base: 'md', sm: 'xl' }}
          radius="lg"
          style={{
            background:
              'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(99, 102, 241, 0.15) 50%, rgba(245, 158, 11, 0.1) 100%)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="md">
            <Group gap="md">
              <ThemeIcon
                size={48}
                radius="xl"
                variant="gradient"
                gradient={{ from: 'teal', to: 'indigo', deg: 45 }}
                style={{ boxShadow: '0 8px 16px rgba(16, 185, 129, 0.25)' }}
              >
                <IconBook size={26} />
              </ThemeIcon>

              <Stack gap={2}>
                <Group gap="xs" align="center">
                  <Title order={2} style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                    <span className="text-gradient">Quran Verse Companion</span>
                  </Title>
                  <Badge variant="light" color="teal" size="md">
                    114 Surahs
                  </Badge>
                  {settings.quranVerse.enabled && (
                    <Badge variant="filled" color="indigo" size="sm">
                      Popup every {settings.quranVerse.recurringIntervalMinutes}m
                    </Badge>
                  )}
                </Group>
                <Text size="sm" c="dimmed">
                  Uplifting & inspirational Quran verses with Arabic calligraphy, English & Bangla
                  translations, Tafsir & audio recitations
                </Text>
              </Stack>
            </Group>

            <Group gap="xs">
              <Button
                component={Link}
                href="/settings?tab=quran"
                variant="default"
                size="sm"
                leftSection={<IconAdjustments size={16} />}
              >
                Interval Settings
              </Button>

              <Button
                variant="filled"
                color="indigo"
                size="sm"
                leftSection={<IconPlayerPlay size={16} />}
                onClick={() => void showNextVerseNow({ force: true })}
              >
                Show Random Verse Now
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* Verses Management Table & Dashboard */}
        <QuranVerseManager
          verses={verses}
          isLoading={isLoadingVerses}
          onRefresh={() => void refreshVerses()}
          onPreviewVerse={(chapter, verse, record) => void previewVerse(chapter, verse, record)}
          onShowRandomNow={() => void showNextVerseNow({ force: true })}
        />

        {/* Add Modal */}
        <AddQuranVerseModal
          opened={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onVersesAdded={() => void refreshVerses()}
          existingVerseIds={verses.map((v) => v.id)}
        />
      </Stack>
    </Container>
  );
}

export default function QuranPage() {
  return (
    <Suspense
      fallback={
        <Box
          style={{
            display: 'flex',
            minHeight: '80vh',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Stack align="center" gap="sm">
            <Loader color="indigo" size="md" />
            <Text size="sm" c="dimmed">
              Loading Quran Verses Library...
            </Text>
          </Stack>
        </Box>
      }
    >
      <QuranPageContent />
    </Suspense>
  );
}
