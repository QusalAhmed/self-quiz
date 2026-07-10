import { ActionIcon, Badge, Card, Group, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconMoon, IconSun, IconWifi, IconWifiOff } from '@tabler/icons-react';

type HomeHeaderProps = {
  onlineStatus: boolean;
  colorScheme: 'light' | 'dark' | 'auto';
  onToggleTheme: () => void;
};

export function HomeHeader({ onlineStatus, colorScheme, onToggleTheme }: HomeHeaderProps) {
  return (
    <Card className="glass-panel header-panel" padding="xl" radius="lg">
      <Group className="header-inner" justify="space-between" align="flex-start" wrap="wrap">
        <Stack className="header-left" gap="xs" style={{ flex: 1 }}>
          <Title
            order={1}
            style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span className="text-gradient">English Word Memorizer</span>
          </Title>
          <Text c="dimmed" size="sm" style={{ lineHeight: 1.5, maxWidth: '480px' }}>
            A modern local-first vocabulary companion. Learn new definitions, sync with Supabase
            Cloud, and practice dynamically offline.
          </Text>
        </Stack>

        <Group className="header-right" gap="xs" style={{ flexShrink: 0 }}>
          <Tooltip label={onlineStatus ? 'Online' : 'Offline'}>
            <Badge
              color={onlineStatus ? 'teal' : 'red'}
              variant="light"
              size="md"
              radius="md"
              leftSection={onlineStatus ? <IconWifi size={14} /> : <IconWifiOff size={14} />}
            >
              {onlineStatus ? 'Online' : 'Offline'}
            </Badge>
          </Tooltip>

          <Tooltip label="Toggle Theme">
            <ActionIcon
              variant="subtle"
              color="indigo"
              size="lg"
              radius="md"
              onClick={onToggleTheme}
              style={{ transition: 'transform 0.3s ease' }}
            >
              {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Card>
  );
}
