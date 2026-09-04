'use client';

import {
  Badge,
  Card,
  Divider,
  Group,
  Kbd,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconDeviceLaptop, IconKeyboard } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { AppIcon } from '@/components/Logo';

export function SettingsAboutTab() {
  const [diagnostics, setDiagnostics] = useState<{
    userAgent: string;
    online: boolean;
    hasLocalStorage: boolean;
    hasIndexedDb: boolean;
    hasWebSpeech: boolean;
    hasWebAudio: boolean;
    hasServiceWorker: boolean;
    screen: string;
  }>({
    userAgent: '',
    online: true,
    hasLocalStorage: false,
    hasIndexedDb: false,
    hasWebSpeech: false,
    hasWebAudio: false,
    hasServiceWorker: false,
    screen: '',
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setDiagnostics({
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      hasLocalStorage: typeof window.localStorage !== 'undefined',
      hasIndexedDb: typeof window.indexedDB !== 'undefined',
      hasWebSpeech: 'speechSynthesis' in window,
      hasWebAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
      hasServiceWorker: 'serviceWorker' in navigator,
      screen: `${window.innerWidth} × ${window.innerHeight} (${window.devicePixelRatio}x dpr)`,
    });
  }, []);

  const SHORTCUTS = [
    { key: 'Space', action: 'Flip card & reveal definition / answer' },
    { key: 'Enter / →', action: 'Advance to next card or complete session' },
    { key: '← / Backspace', action: 'Navigate to previous flashcard' },
    { key: '1, 2, 3, 4', action: 'Grade card: 1=Again, 2=Hard, 3=Good, 4=Easy' },
    { key: 'Z / U', action: 'Undo last card rating (session & completion)' },
    { key: 'R', action: 'Restart session from completion screen' },
    { key: 'M', action: 'Mark / unmark current word as Missed' },
    { key: 'P', action: 'Pronounce current vocabulary word' },
    { key: 'N', action: 'Toggle personal notes panel (after reveal)' },
    { key: 'E', action: 'Quick edit word / toggle custom examples' },
    { key: 'H / ?', action: 'Show interactive keyboard shortcuts dialog' },
    { key: 'Esc', action: 'Flip card back / back to library / dismiss modal' },
  ];

  const TECH_STACK = [
    { name: 'Next.js 16', desc: 'App Router & Fast Turbopack bundler' },
    { name: 'React 19', desc: 'Concurrent rendering & transitions' },
    { name: 'Mantine UI 9', desc: 'Accessible component ecosystem' },
    { name: 'RxDB & Dexie', desc: 'Local-first offline reactive database' },
    { name: 'Supabase', desc: 'PostgreSQL cloud replication' },
    { name: 'TS-FSRS v5', desc: 'Modern spaced repetition algorithm' },
    { name: 'Groq & Cloudflare', desc: 'High-speed AI example generation' },
    { name: 'Web Audio API', desc: 'Zero-latency synthesized audio soundboard' },
  ];

  return (
    <Stack gap="lg">
      {/* Application Overview */}
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
        <Group justify="space-between" align="center" mb="sm">
          <Group gap="md">
            <AppIcon size={48} radius={12} withGlow />
            <div>
              <Group gap="xs" align="center">
                <Text fw={700} size="lg">
                  English Word Memorizer & Quiz Companion
                </Text>
                <Badge color="indigo" variant="light" size="sm">
                  v1.0.0 Stable
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                Local-first spaced repetition vocabulary mastery application with AI intelligence
              </Text>
            </div>
          </Group>
        </Group>

        <Divider my="md" />

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          {TECH_STACK.map((tech) => (
            <Paper key={tech.name} withBorder p="xs" radius="md">
              <Text size="xs" fw={700} c="indigo">
                {tech.name}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                {tech.desc}
              </Text>
            </Paper>
          ))}
        </SimpleGrid>
      </Card>

      {/* Keyboard Shortcuts Cheatsheet */}
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
            <IconKeyboard size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Keyboard Shortcuts Cheatsheet
            </Text>
            <Text size="xs" c="dimmed">
              Speed up your daily review sessions with intuitive keyboard accelerators
            </Text>
          </div>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {SHORTCUTS.map((sc) => (
            <Paper key={sc.key} withBorder p="sm" radius="md">
              <Group justify="space-between" align="center">
                <Text size="xs" c="dimmed">
                  {sc.action}
                </Text>
                <Kbd size="xs">{sc.key}</Kbd>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      </Card>

      {/* System & Runtime Diagnostics */}
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
            <IconDeviceLaptop size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              System Diagnostics & Runtime Capabilities
            </Text>
            <Text size="xs" c="dimmed">
              Verified browser APIs and device specifications
            </Text>
          </div>
        </Group>

        <Table.ScrollContainer minWidth={500}>
          <Table verticalSpacing="xs">
            <Table.Tbody>
              <Table.Tr>
                <Table.Td fw={600} style={{ width: '35%' }}>
                  Network Connectivity
                </Table.Td>
                <Table.Td>
                  <Badge color={diagnostics.online ? 'teal' : 'red'} variant="dot" size="sm">
                    {diagnostics.online ? 'Online' : 'Offline'}
                  </Badge>
                </Table.Td>
              </Table.Tr>

              <Table.Tr>
                <Table.Td fw={600}>IndexedDB Storage Engine</Table.Td>
                <Table.Td>
                  <Badge
                    color={diagnostics.hasIndexedDb ? 'teal' : 'red'}
                    variant="light"
                    size="sm"
                  >
                    {diagnostics.hasIndexedDb ? 'Supported & Active' : 'Not Supported'}
                  </Badge>
                </Table.Td>
              </Table.Tr>

              <Table.Tr>
                <Table.Td fw={600}>Web Speech Synthesis (TTS)</Table.Td>
                <Table.Td>
                  <Badge
                    color={diagnostics.hasWebSpeech ? 'teal' : 'red'}
                    variant="light"
                    size="sm"
                  >
                    {diagnostics.hasWebSpeech ? 'Supported' : 'Not Supported'}
                  </Badge>
                </Table.Td>
              </Table.Tr>

              <Table.Tr>
                <Table.Td fw={600}>Web Audio Synthesis Engine</Table.Td>
                <Table.Td>
                  <Badge color={diagnostics.hasWebAudio ? 'teal' : 'red'} variant="light" size="sm">
                    {diagnostics.hasWebAudio ? 'Supported & Active' : 'Not Supported'}
                  </Badge>
                </Table.Td>
              </Table.Tr>

              <Table.Tr>
                <Table.Td fw={600}>PWA Service Worker</Table.Td>
                <Table.Td>
                  <Badge
                    color={diagnostics.hasServiceWorker ? 'teal' : 'red'}
                    variant="light"
                    size="sm"
                  >
                    {diagnostics.hasServiceWorker ? 'Registered & Active' : 'Not Registered'}
                  </Badge>
                </Table.Td>
              </Table.Tr>

              <Table.Tr>
                <Table.Td fw={600}>Viewport Resolution</Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {diagnostics.screen}
                  </Text>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}
