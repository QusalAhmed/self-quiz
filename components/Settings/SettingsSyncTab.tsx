'use client';

import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconActivity,
  IconCheck,
  IconCloudCheck,
  IconCloudOff,
  IconDatabase,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconServer,
  IconTrash,
  IconWifi,
  IconWifiOff,
} from '@tabler/icons-react';
import React, { useState } from 'react';
import type { ReplicationsHolder, SyncCollectionKey, UnifiedSyncState } from '@/lib/replication';

export interface SettingsSyncTabProps {
  syncState?: UnifiedSyncState;
  onlineStatus: boolean;
  isSyncing: boolean;
  replicationsRef?: React.MutableRefObject<ReplicationsHolder | null>;
  withSyncState?: (task: () => Promise<void>) => Promise<void>;
  collectionCounts: {
    words: number;
    groups: number;
    missedWords: number;
    wordFamilies: number;
    fsrsRecords: number;
    reviewLogs: number;
  };
}

export function SettingsSyncTab({
  syncState,
  onlineStatus,
  isSyncing,
  replicationsRef,
  withSyncState,
  collectionCounts,
}: SettingsSyncTabProps) {
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const handleManualSync = async () => {
    if (withSyncState && replicationsRef?.current) {
      await withSyncState(async () => {
        await replicationsRef.current?.reSyncAll();
        await replicationsRef.current?.awaitInSync();
      });
    }
  };

  const handleTogglePause = async () => {
    if (!replicationsRef?.current) {
      return;
    }
    if (syncState?.isPaused) {
      await replicationsRef.current.resumeAll();
    } else {
      await replicationsRef.current.pauseAll();
    }
  };

  const handleVerifyInSync = async () => {
    if (!replicationsRef?.current) {
      return;
    }
    setVerifying(true);
    setVerifyMessage(null);
    try {
      const inSync = await replicationsRef.current.awaitInSync();
      setVerifyMessage(
        inSync
          ? 'All collections are 100% in sync with the cloud!'
          : 'Replication completed with pending writes remaining.'
      );
    } catch {
      setVerifyMessage('Verification encountered an error.');
    } finally {
      setVerifying(false);
    }
  };

  const handleClearActivities = () => {
    replicationsRef?.current?.clearActivities();
  };

  const collections: Array<{
    key: SyncCollectionKey;
    label: string;
    count: number;
    status: 'synced' | 'pending' | 'paused';
  }> = [
    {
      key: 'words',
      label: 'Dictionary Words',
      count: collectionCounts.words,
      status: (syncState?.collections?.words?.pendingCount ?? 0) > 0 ? 'pending' : 'synced',
    },
    {
      key: 'groups',
      label: 'Custom Word Groups',
      count: collectionCounts.groups,
      status: (syncState?.collections?.groups?.pendingCount ?? 0) > 0 ? 'pending' : 'synced',
    },
    {
      key: 'missedWords',
      label: 'Missed Words Pool',
      count: collectionCounts.missedWords,
      status: (syncState?.collections?.missedWords?.pendingCount ?? 0) > 0 ? 'pending' : 'synced',
    },
    {
      key: 'fsrsRecords',
      label: 'FSRS Review Decks',
      count: collectionCounts.fsrsRecords,
      status: (syncState?.collections?.fsrsRecords?.pendingCount ?? 0) > 0 ? 'pending' : 'synced',
    },
    {
      key: 'wordFamilies',
      label: 'Word Families & Morphology',
      count: collectionCounts.wordFamilies,
      status: (syncState?.collections?.wordFamilies?.pendingCount ?? 0) > 0 ? 'pending' : 'synced',
    },
    {
      key: 'reviewLogs',
      label: 'Historical Review Logs',
      count: collectionCounts.reviewLogs,
      status: (syncState?.collections?.reviewLogs?.pendingCount ?? 0) > 0 ? 'pending' : 'synced',
    },
  ];

  return (
    <Stack gap="lg">
      {/* Cloud Replication Overview */}
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
        <Group justify="space-between" align="center" wrap="wrap" gap="sm" mb="md">
          <Group gap="sm">
            <ThemeIcon
              size="lg"
              radius="md"
              color={!onlineStatus ? 'red' : isSyncing ? 'violet' : 'teal'}
              variant="light"
            >
              {!onlineStatus ? (
                <IconCloudOff size={20} />
              ) : isSyncing ? (
                <IconRefresh size={20} />
              ) : (
                <IconCloudCheck size={20} />
              )}
            </ThemeIcon>
            <div>
              <Group gap="xs" align="center">
                <Text fw={700} size="md">
                  Supabase Cloud Replication
                </Text>
                <Badge
                  size="sm"
                  variant="dot"
                  color={!onlineStatus ? 'red' : isSyncing ? 'violet' : 'teal'}
                >
                  {!onlineStatus ? 'Offline' : isSyncing ? 'Syncing...' : 'Connected & Live'}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                Bi-directional live replication between local RxDB and remote PostgreSQL
              </Text>
            </div>
          </Group>

          <Group gap="xs" wrap="wrap">
            <Button
              size="xs"
              variant="light"
              color="indigo"
              loading={isSyncing}
              disabled={!onlineStatus}
              onClick={handleManualSync}
              leftSection={<IconRefresh size={14} />}
            >
              Sync Now
            </Button>

            <Button
              size="xs"
              variant="subtle"
              color={syncState?.isPaused ? 'teal' : 'gray'}
              onClick={handleTogglePause}
              leftSection={
                syncState?.isPaused ? <IconPlayerPlay size={14} /> : <IconPlayerPause size={14} />
              }
            >
              {syncState?.isPaused ? 'Resume Sync' : 'Pause Sync'}
            </Button>

            <Button
              size="xs"
              variant="subtle"
              color="teal"
              loading={verifying}
              onClick={handleVerifyInSync}
              leftSection={<IconCheck size={14} />}
            >
              Verify In-Sync
            </Button>
          </Group>
        </Group>

        {verifyMessage && (
          <Paper
            withBorder
            p="xs"
            radius="md"
            mb="md"
            style={{ background: 'rgba(20, 184, 166, 0.08)' }}
          >
            <Group gap="xs">
              <IconCheck size={16} color="var(--mantine-color-teal-6)" />
              <Text size="xs" fw={600} c="teal">
                {verifyMessage}
              </Text>
            </Group>
          </Paper>
        )}

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">
              Network Status
            </Text>
            <Group gap="xs" mt={4}>
              {onlineStatus ? (
                <IconWifi size={16} color="var(--mantine-color-teal-6)" />
              ) : (
                <IconWifiOff size={16} color="var(--mantine-color-red-6)" />
              )}
              <Text size="sm" fw={700}>
                {onlineStatus ? 'Online (Active)' : 'Offline (Local Only)'}
              </Text>
            </Group>
          </Paper>

          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">
              Pending Sync Queue
            </Text>
            <Group gap="xs" mt={4}>
              <IconActivity size={16} color="var(--mantine-color-indigo-6)" />
              <Text size="sm" fw={700}>
                {syncState?.pendingCount ?? 0} Document
                {(syncState?.pendingCount ?? 0) === 1 ? '' : 's'}
              </Text>
            </Group>
          </Paper>

          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">
              Last Synced
            </Text>
            <Group gap="xs" mt={4}>
              <IconServer size={16} color="var(--mantine-color-violet-6)" />
              <Text size="sm" fw={700}>
                {syncState?.lastSyncedAt
                  ? new Date(syncState.lastSyncedAt).toLocaleTimeString()
                  : 'Just now'}
              </Text>
            </Group>
          </Paper>
        </SimpleGrid>
      </Card>

      {/* Per-Collection Status Table */}
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
        <Group justify="space-between" align="center" mb="md">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" color="teal" variant="light">
              <IconDatabase size={20} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="md">
                Synchronized Collections
              </Text>
              <Text size="xs" c="dimmed">
                Status and document count across all RxDB client-side database tables
              </Text>
            </div>
          </Group>

          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<IconTrash size={14} />}
            onClick={handleClearActivities}
          >
            Clear Activity Log
          </Button>
        </Group>

        <Table.ScrollContainer minWidth={500}>
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Collection Table</Table.Th>
                <Table.Th>Local Count</Table.Th>
                <Table.Th>Sync Status</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {collections.map((col) => (
                <Table.Tr key={col.key}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {col.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {col.key}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="indigo" size="sm">
                      {col.count} records
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      variant="dot"
                      color={col.status === 'pending' ? 'orange' : 'teal'}
                      size="sm"
                    >
                      {col.status === 'pending' ? 'Pending Push' : 'In-Sync'}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="indigo"
                      onClick={() => replicationsRef?.current?.reSyncCollection(col.key)}
                    >
                      Resync
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}
