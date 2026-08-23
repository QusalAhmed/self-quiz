'use client';

import {
  Card,
  ColorSwatch,
  Divider,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconCheck,
  IconLayoutDashboard,
  IconMoon,
  IconPalette,
  IconSparkles,
  IconSun,
  IconSunMoon,
} from '@tabler/icons-react';
import React from 'react';
import type { AccentColorKey, AppAppearanceSettings } from '@/lib/settings';

export interface SettingsAppearanceTabProps {
  settings: AppAppearanceSettings;
  onChange: (values: Partial<AppAppearanceSettings>) => void;
}

const ACCENT_COLORS: Array<{ key: AccentColorKey; label: string; color: string }> = [
  { key: 'indigo', label: 'Indigo', color: '#6366f1' },
  { key: 'violet', label: 'Violet', color: '#8b5cf6' },
  { key: 'blue', label: 'Sky Blue', color: '#3b82f6' },
  { key: 'teal', label: 'Teal', color: '#14b8a6' },
  { key: 'cyan', label: 'Cyan', color: '#06b6d4' },
  { key: 'emerald', label: 'Emerald', color: '#10b981' },
  { key: 'amber', label: 'Amber Gold', color: '#f59e0b' },
  { key: 'rose', label: 'Rose Pink', color: '#f43f5e' },
];

export function SettingsAppearanceTab({ settings, onChange }: SettingsAppearanceTabProps) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const handleSchemeChange = (value: string) => {
    const valid = value as 'light' | 'dark' | 'auto';
    setColorScheme(valid);
    onChange({ colorScheme: valid });
  };

  return (
    <Stack gap="lg">
      {/* Theme & Color Mode */}
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
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm" mb="md">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
              <IconPalette size={20} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="md">
                Color Mode & Theme
              </Text>
              <Text size="xs" c="dimmed">
                Switch between Light, Dark, or System synchronized color themes
              </Text>
            </div>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Paper
            withBorder
            p="md"
            radius="md"
            style={{
              cursor: 'pointer',
              border:
                colorScheme === 'light'
                  ? '2px solid var(--mantine-color-indigo-5)'
                  : '1px solid var(--card-border)',
              background: colorScheme === 'light' ? 'rgba(99, 102, 241, 0.08)' : 'var(--card-bg)',
              transition: 'all 0.2s ease',
            }}
            onClick={() => handleSchemeChange('light')}
          >
            <Group justify="space-between" align="center" mb="xs">
              <ThemeIcon color="yellow" variant="light" size="md" radius="xl">
                <IconSun size={18} />
              </ThemeIcon>
              {colorScheme === 'light' && (
                <ThemeIcon color="indigo" size="xs" radius="xl">
                  <IconCheck size={12} />
                </ThemeIcon>
              )}
            </Group>
            <Text fw={600} size="sm">
              Light Theme
            </Text>
            <Text size="xs" c="dimmed">
              Clean, crisp aesthetic tailored for well-lit environments
            </Text>
          </Paper>

          <Paper
            withBorder
            p="md"
            radius="md"
            style={{
              cursor: 'pointer',
              border:
                colorScheme === 'dark'
                  ? '2px solid var(--mantine-color-indigo-5)'
                  : '1px solid var(--card-border)',
              background: colorScheme === 'dark' ? 'rgba(99, 102, 241, 0.08)' : 'var(--card-bg)',
              transition: 'all 0.2s ease',
            }}
            onClick={() => handleSchemeChange('dark')}
          >
            <Group justify="space-between" align="center" mb="xs">
              <ThemeIcon color="violet" variant="light" size="md" radius="xl">
                <IconMoon size={18} />
              </ThemeIcon>
              {colorScheme === 'dark' && (
                <ThemeIcon color="indigo" size="xs" radius="xl">
                  <IconCheck size={12} />
                </ThemeIcon>
              )}
            </Group>
            <Text fw={600} size="sm">
              Dark Theme
            </Text>
            <Text size="xs" c="dimmed">
              High-contrast midnight theme easy on the eyes in low light
            </Text>
          </Paper>

          <Paper
            withBorder
            p="md"
            radius="md"
            style={{
              cursor: 'pointer',
              border:
                colorScheme === 'auto'
                  ? '2px solid var(--mantine-color-indigo-5)'
                  : '1px solid var(--card-border)',
              background: colorScheme === 'auto' ? 'rgba(99, 102, 241, 0.08)' : 'var(--card-bg)',
              transition: 'all 0.2s ease',
            }}
            onClick={() => handleSchemeChange('auto')}
          >
            <Group justify="space-between" align="center" mb="xs">
              <ThemeIcon color="blue" variant="light" size="md" radius="xl">
                <IconSunMoon size={18} />
              </ThemeIcon>
              {colorScheme === 'auto' && (
                <ThemeIcon color="indigo" size="xs" radius="xl">
                  <IconCheck size={12} />
                </ThemeIcon>
              )}
            </Group>
            <Text fw={600} size="sm">
              System Automatic
            </Text>
            <Text size="xs" c="dimmed">
              Dynamically matches your OS preferences
            </Text>
          </Paper>
        </SimpleGrid>
      </Card>

      {/* Accent Color Palette */}
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
            <IconSparkles size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Accent Color Palette
            </Text>
            <Text size="xs" c="dimmed">
              Select your favorite primary accent shade for buttons, badges, and progress curves
            </Text>
          </div>
        </Group>

        <SimpleGrid cols={{ base: 2, xs: 4, sm: 4 }} spacing="sm">
          {ACCENT_COLORS.map((item) => {
            const isSelected = settings.accentColor === item.key;
            return (
              <Paper
                key={item.key}
                withBorder
                p="sm"
                radius="md"
                style={{
                  cursor: 'pointer',
                  border: isSelected ? `2px solid ${item.color}` : '1px solid var(--card-border)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.06)' : 'var(--card-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
                onClick={() => onChange({ accentColor: item.key })}
              >
                <ColorSwatch color={item.color} size={24}>
                  {isSelected && <IconCheck size={12} color="#fff" />}
                </ColorSwatch>
                <div>
                  <Text size="xs" fw={isSelected ? 700 : 500}>
                    {item.label}
                  </Text>
                </div>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Card>

      {/* Layout & Typography Density */}
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
            <IconLayoutDashboard size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Display & Layout Density
            </Text>
            <Text size="xs" c="dimmed">
              Fine-tune the compactness of flashcards, tables, and dictionary list items
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={600}>
                UI Density Mode
              </Text>
              <Text size="xs" c="dimmed">
                Choose between spacious layout with extra padding or compact information-dense view
              </Text>
            </div>
            <SegmentedControl
              value={settings.uiDensity}
              onChange={(v) => onChange({ uiDensity: v as 'comfortable' | 'compact' })}
              data={[
                { label: 'Comfortable', value: 'comfortable' },
                { label: 'Compact', value: 'compact' },
              ]}
              color="indigo"
              size="xs"
            />
          </Group>

          <Divider />

          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={600}>
                Frosted Glassmorphism
              </Text>
              <Text size="xs" c="dimmed">
                Enable backdrop blur and glass effects on cards and modals (disable for lower-power
                devices)
              </Text>
            </div>
            <Switch
              checked={settings.cardGlassmorphism}
              onChange={(e) => onChange({ cardGlassmorphism: e.currentTarget.checked })}
              color="indigo"
            />
          </Group>

          <Divider />

          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={600}>
                Reduced Motion
              </Text>
              <Text size="xs" c="dimmed">
                Minimize interface transitions, scale animations, and card flipping effects
              </Text>
            </div>
            <Switch
              checked={settings.reducedMotion}
              onChange={(e) => onChange({ reducedMotion: e.currentTarget.checked })}
              color="indigo"
            />
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
