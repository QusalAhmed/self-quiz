'use client';

import { ActionIcon, Badge, Card, Flex, Group, Text, Tooltip } from '@mantine/core';
import { IconCloudCheck, IconCloudUpload, IconRotateClockwise } from '@tabler/icons-react';
import React from 'react';

export type CloudSyncCardProps = {
  unsyncedCount: number;
  onlineStatus: boolean;
  isSyncing: boolean;
  onSyncNow: () => Promise<void> | void;
};

export function CloudSyncCard({
  unsyncedCount,
  onlineStatus,
  isSyncing,
  onSyncNow,
}: CloudSyncCardProps) {
  return (
    <Card className="glass-panel" radius="lg" padding="md">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background:
                unsyncedCount === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              color: unsyncedCount === 0 ? '#10b981' : '#f59e0b',
            }}
          >
            {unsyncedCount === 0 ? <IconCloudCheck size={20} /> : <IconCloudUpload size={20} />}
          </div>
          <div>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
              CLOUD SYNC
            </Text>
            <Flex justify="flex-start" align="center" direction="row" gap={6}>
              <Text
                size="lg"
                fw={800}
                style={{ fontFamily: 'var(--font-title)' }}
                c={unsyncedCount === 0 ? 'teal' : 'orange'}
              >
                {unsyncedCount === 0 ? 'Fully Synced' : `${unsyncedCount} Sync Pending`}
              </Text>
              {onlineStatus && (
                <Tooltip
                  label={
                    isSyncing ? 'Syncing FSRS & Words…' : 'Sync now (syncs FSRS, Words, Groups)'
                  }
                  withArrow
                >
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="teal"
                    disabled={isSyncing}
                    onClick={() => void onSyncNow()}
                    aria-label="Sync now"
                  >
                    <IconRotateClockwise
                      size={16}
                      className={isSyncing ? 'sync-spin-icon' : undefined}
                    />
                  </ActionIcon>
                </Tooltip>
              )}
            </Flex>
          </div>
        </Group>

        <Tooltip
          label={onlineStatus ? 'Connected to cloud server' : 'Offline — changes saved locally'}
        >
          <Badge
            color={onlineStatus ? 'teal' : 'gray'}
            variant="light"
            radius="md"
            leftSection={
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: onlineStatus ? '#0ca678' : '#868e96',
                  marginRight: '2px',
                }}
              />
            }
          >
            {onlineStatus ? 'Online' : 'Offline'}
          </Badge>
        </Tooltip>
      </Group>
    </Card>
  );
}
