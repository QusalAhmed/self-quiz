'use client';

import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertTriangle, IconRotateClockwise, IconSparkles, IconX } from '@tabler/icons-react';
import React from 'react';

export type RemovedQueueItem = {
  id: string;
  word: string;
  meaning?: string;
};

export type FsrsQueueChangeModalProps = {
  opened: boolean;
  onClose: () => void;
  onRefresh: () => void;
  removedItems: RemovedQueueItem[];
  addedCount?: number;
};

export function FsrsQueueChangeModal({
  opened,
  onClose,
  onRefresh,
  removedItems,
  addedCount = 0,
}: FsrsQueueChangeModalProps) {
  const removedCount = removedItems.length;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon color="red" variant="light" size="lg" radius="xl">
            <IconAlertTriangle size={20} />
          </ThemeIcon>
          <Text fw={800} size="md" style={{ fontFamily: 'var(--font-title)' }}>
            Quiz Queue Updated
          </Text>
        </Group>
      }
      centered
      radius="lg"
      size="md"
      overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      styles={{
        header: {
          borderBottom: '1px solid var(--card-border)',
          paddingBottom: '12px',
        },
        body: {
          paddingTop: '16px',
        },
      }}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
          {removedCount === 1 ? (
            <>A word in your active quiz session has been removed or modified in the database.</>
          ) : (
            <>
              <strong style={{ color: 'var(--mantine-color-red-6)' }}>{removedCount} words</strong>{' '}
              in your active quiz session have been removed or modified in the database.
            </>
          )}
        </Text>

        {removedCount > 0 && (
          <Card
            radius="md"
            padding="sm"
            style={{
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <Text size="xs" fw={700} c="red" mb={6} style={{ letterSpacing: '0.04em' }}>
              REMOVED WORDS ({removedCount})
            </Text>
            <ScrollArea.Autosize mah={140} offsetScrollbars>
              <Group gap={6} wrap="wrap">
                {removedItems.map((item) => (
                  <Badge
                    key={item.id}
                    color="red"
                    variant="light"
                    size="sm"
                    radius="sm"
                    style={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {item.word}
                  </Badge>
                ))}
              </Group>
            </ScrollArea.Autosize>
          </Card>
        )}

        {addedCount > 0 && (
          <Card
            radius="md"
            padding="xs"
            style={{
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
            }}
          >
            <Group gap="xs" align="center">
              <IconSparkles size={16} color="#a855f7" />
              <Text size="xs" fw={600} c="violet">
                {addedCount} new due card{addedCount > 1 ? 's are' : ' is'} also ready and will be
                included upon refresh.
              </Text>
            </Group>
          </Card>
        )}

        <Divider style={{ borderColor: 'var(--card-border)' }} />

        <Group justify="flex-end" gap="sm">
          <Button
            variant="subtle"
            color="gray"
            radius="md"
            onClick={onClose}
            leftSection={<IconX size={16} />}
          >
            Dismiss
          </Button>
          <Button
            variant="filled"
            color="indigo"
            radius="md"
            className="btn-premium"
            leftSection={<IconRotateClockwise size={16} />}
            onClick={() => {
              onRefresh();
              onClose();
            }}
          >
            Refresh Quiz Queue
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
