'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Flex,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  ThemeIcon,
  Timeline,
  Tooltip,
} from '@mantine/core';
import {
  IconActivity,
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
  IconArrowsShuffle,
  IconBrain,
  IconCheck,
  IconClock,
  IconCloudCheck,
  IconCloudDownload,
  IconCloudOff,
  IconCloudUpload,
  IconDatabase,
  IconFolders,
  IconHierarchy,
  IconHistory,
  IconInfoCircle,
  IconListCheck,
  IconPlayerPause,
  IconPlayerPlay,
  IconRotateClockwise,
  IconTrash,
} from '@tabler/icons-react';
import React, { useState } from 'react';
import type {
  GlobalSyncStatus,
  SingleCollectionSyncState,
  SyncActivityEvent,
  SyncCollectionKey,
  UnifiedSyncState,
} from '@/lib/replication';

export type CloudSyncCardProps = {
  syncState?: UnifiedSyncState;
  unsyncedCount: number;
  onlineStatus: boolean;
  isSyncing: boolean;
  onSyncNow: () => Promise<void> | void;
  onTogglePause?: () => Promise<void> | void;
  onVerifyInSync?: () => Promise<boolean>;
  onSyncCollection?: (collection: SyncCollectionKey) => void;
  onPauseCollection?: (collection: SyncCollectionKey) => Promise<void>;
  onResumeCollection?: (collection: SyncCollectionKey) => Promise<void>;
  onClearActivities?: () => void;
  collectionCounts?: {
    words?: number;
    groups?: number;
    missedWords?: number;
    wordFamilies?: number;
    fsrsRecords?: number;
    srsPracticeWords?: number;
    dailyUsage?: number;
    reviewLogs?: number;
    settings?: number;
  };
};

const collectionIcons: Record<SyncCollectionKey, React.ComponentType<{ size?: number }>> = {
  words: IconDatabase,
  groups: IconFolders,
  missedWords: IconListCheck,
  wordFamilies: IconHierarchy,
  fsrsRecords: IconBrain,
  srsPracticeWords: IconArrowsShuffle,
  dailyUsage: IconClock,
  reviewLogs: IconHistory,
  settings: IconAdjustmentsHorizontal,
};

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) {
    return 'Never';
  }
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (diffMs < 5000) {
    return 'Just now';
  }
  if (diffMs < 60000) {
    return `${Math.floor(diffMs / 1000)}s ago`;
  }
  if (diffMs < 3600000) {
    return `${Math.floor(diffMs / 60000)}m ago`;
  }
  if (diffMs < 86400000) {
    return `${Math.floor(diffMs / 3600000)}h ago`;
  }
  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CloudSyncCard({
  syncState,
  unsyncedCount,
  onlineStatus,
  isSyncing,
  onSyncNow,
  onTogglePause,
  onVerifyInSync,
  onSyncCollection,
  onClearActivities,
  collectionCounts,
}: CloudSyncCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('collections');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const effectiveStatus: GlobalSyncStatus = !onlineStatus
    ? 'offline'
    : syncState?.status || (isSyncing ? 'syncing' : 'in_sync');

  const isActuallySyncing = isSyncing || syncState?.isActive || false;
  const isPaused = syncState?.isPaused || false;
  const totalSent = syncState?.totalSent || 0;
  const totalReceived = syncState?.totalReceived || 0;
  const lastSyncedText = formatRelativeTime(syncState?.lastSyncedAt || null);

  const handleVerify = async () => {
    if (!onVerifyInSync || isVerifying) {
      return;
    }
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const ok = await onVerifyInSync();
      setVerifyResult(
        ok
          ? '✓ 100% In-Sync — All local edits & remote checkpoints converged'
          : '⚠️ Verification encountered an issue. Check Activity log.'
      );
    } catch {
      setVerifyResult('⚠️ Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  // Status visual styles
  let statusColor = 'teal';
  let statusLabel = 'Fully Synced';
  let StatusIcon = IconCloudCheck;

  if (!onlineStatus) {
    statusColor = 'gray';
    statusLabel = 'Offline Mode';
    StatusIcon = IconCloudOff;
  } else if (effectiveStatus === 'error' || syncState?.error) {
    statusColor = 'red';
    statusLabel = 'Sync Issue';
    StatusIcon = IconAlertTriangle;
  } else if (isPaused) {
    statusColor = 'yellow';
    statusLabel = 'Sync Paused';
    StatusIcon = IconPlayerPause;
  } else if (isActuallySyncing) {
    statusColor = 'blue';
    statusLabel = 'Syncing...';
    StatusIcon = IconCloudUpload;
  } else if (unsyncedCount > 0) {
    statusColor = 'orange';
    statusLabel = `${unsyncedCount} Pending`;
    StatusIcon = IconCloudUpload;
  }

  const collectionsList: SingleCollectionSyncState[] = syncState?.collections
    ? Object.values(syncState.collections)
    : [
        {
          key: 'words',
          label: 'Words',
          tableName: 'words',
          isActive: isActuallySyncing,
          isPaused,
          error: null,
          lastSyncedAt: null,
          sentCount: 0,
          receivedCount: 0,
          pendingCount: 0,
        },
        {
          key: 'groups',
          label: 'Groups',
          tableName: 'groups',
          isActive: isActuallySyncing,
          isPaused,
          error: null,
          lastSyncedAt: null,
          sentCount: 0,
          receivedCount: 0,
          pendingCount: 0,
        },
        {
          key: 'missedWords',
          label: 'Missed Words',
          tableName: 'missed_words',
          isActive: isActuallySyncing,
          isPaused,
          error: null,
          lastSyncedAt: null,
          sentCount: 0,
          receivedCount: 0,
          pendingCount: 0,
        },
        {
          key: 'fsrsRecords',
          label: 'FSRS Records',
          tableName: 'fsrs_records',
          isActive: isActuallySyncing,
          isPaused,
          error: null,
          lastSyncedAt: null,
          sentCount: 0,
          receivedCount: 0,
          pendingCount: 0,
        },
        {
          key: 'srsPracticeWords',
          label: 'SRS Practice',
          tableName: 'srs_practice_words',
          isActive: isActuallySyncing,
          isPaused,
          error: null,
          lastSyncedAt: null,
          sentCount: 0,
          receivedCount: 0,
          pendingCount: 0,
        },
        {
          key: 'dailyUsage',
          label: 'Daily Usage',
          tableName: 'daily_usage',
          isActive: isActuallySyncing,
          isPaused,
          error: null,
          lastSyncedAt: null,
          sentCount: 0,
          receivedCount: 0,
          pendingCount: 0,
        },
      ];

  return (
    <>
      <Card
        className="glass-panel"
        radius="lg"
        padding="md"
        style={{
          border:
            effectiveStatus === 'error'
              ? '1px solid rgba(239, 68, 68, 0.4)'
              : isActuallySyncing
                ? '1px solid rgba(59, 130, 246, 0.4)'
                : undefined,
          transition: 'all 0.2s ease',
        }}
      >
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            {/* Status Avatar / Icon */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background:
                  effectiveStatus === 'error'
                    ? 'rgba(239, 68, 68, 0.12)'
                    : isActuallySyncing
                      ? 'rgba(59, 130, 246, 0.12)'
                      : isPaused
                        ? 'rgba(245, 158, 11, 0.12)'
                        : 'rgba(16, 185, 129, 0.12)',
                color:
                  effectiveStatus === 'error'
                    ? '#ef4444'
                    : isActuallySyncing
                      ? '#3b82f6'
                      : isPaused
                        ? '#f59e0b'
                        : '#10b981',
                flexShrink: 0,
              }}
            >
              <StatusIcon
                size={22}
                className={
                  isActuallySyncing
                    ? 'sync-spin-icon'
                    : effectiveStatus === 'in_sync'
                      ? 'sync-pulse-dot'
                      : undefined
                }
              />
            </div>

            {/* Title & Status info */}
            <div style={{ minWidth: 0 }}>
              <Group gap={6} align="center" wrap="nowrap">
                <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                  CLOUD SYNC
                </Text>
                {isPaused && (
                  <Badge size="xs" color="yellow" variant="dot">
                    Paused
                  </Badge>
                )}
              </Group>

              <Flex justify="flex-start" align="center" direction="row" gap={8} wrap="nowrap">
                <Text
                  size="md"
                  fw={800}
                  style={{
                    fontFamily: 'var(--font-title)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  c={statusColor}
                >
                  {statusLabel}
                </Text>

                {/* Session Traffic Pills */}
                {(totalSent > 0 || totalReceived > 0) && (
                  <Group gap={4} wrap="nowrap">
                    {totalSent > 0 && (
                      <Badge size="xs" variant="light" color="blue">
                        ↑ {totalSent}
                      </Badge>
                    )}
                    {totalReceived > 0 && (
                      <Badge size="xs" variant="light" color="teal">
                        ↓ {totalReceived}
                      </Badge>
                    )}
                  </Group>
                )}
              </Flex>

              <Text size="11px" c="dimmed">
                Last synced: {lastSyncedText}
              </Text>
            </div>
          </Group>

          {/* Action Buttons */}
          <Group gap={6} wrap="nowrap">
            {/* Sync Now Button */}
            {onlineStatus && (
              <Tooltip
                label={
                  isActuallySyncing
                    ? 'Syncing all 6 collections…'
                    : 'Sync now (RxDB pull + push all collections)'
                }
                withArrow
              >
                <ActionIcon
                  size="md"
                  variant="light"
                  color={isActuallySyncing ? 'blue' : 'teal'}
                  disabled={isActuallySyncing}
                  onClick={() => void onSyncNow()}
                  aria-label="Sync now"
                  radius="md"
                >
                  <IconRotateClockwise
                    size={18}
                    className={isActuallySyncing ? 'sync-spin-icon' : undefined}
                  />
                </ActionIcon>
              </Tooltip>
            )}

            {/* Pause / Resume Live Sync Button */}
            {onlineStatus && onTogglePause && (
              <Tooltip
                label={isPaused ? 'Resume live background sync' : 'Pause live background sync'}
                withArrow
              >
                <ActionIcon
                  size="md"
                  variant="subtle"
                  color={isPaused ? 'green' : 'gray'}
                  onClick={() => void onTogglePause()}
                  aria-label={isPaused ? 'Resume sync' : 'Pause sync'}
                  radius="md"
                >
                  {isPaused ? <IconPlayerPlay size={18} /> : <IconPlayerPause size={18} />}
                </ActionIcon>
              </Tooltip>
            )}

            {/* Detailed Diagnostics Hub Trigger */}
            <Tooltip label="Open RxDB Sync Diagnostics Hub" withArrow>
              <Button
                size="xs"
                variant="subtle"
                color="indigo"
                radius="md"
                onClick={() => setDetailsOpen(true)}
                leftSection={<IconActivity size={14} />}
                style={{ padding: '0 8px' }}
              >
                Details
              </Button>
            </Tooltip>
          </Group>
        </Group>
      </Card>

      {/* Sync Diagnostics & Controls Modal */}
      <Modal
        opened={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={
          <Group gap="xs">
            <ThemeIcon color="indigo" variant="light" size="md" radius="md">
              <IconCloudCheck size={18} />
            </ThemeIcon>
            <Text fw={700} size="lg" style={{ fontFamily: 'var(--font-title)' }}>
              RxDB Cloud Sync Hub
            </Text>
            <Badge color={statusColor} variant="light" size="sm">
              {statusLabel}
            </Badge>
          </Group>
        }
        size="lg"
        radius="lg"
        centered
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
          {/* Quick Overview Strip */}
          <Paper p="sm" radius="md" withBorder className="glass-panel">
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
              <div>
                <Text size="xs" c="dimmed">
                  Connection
                </Text>
                <Group gap={4} mt={2}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: onlineStatus ? '#10b981' : '#9ca3af',
                    }}
                  />
                  <Text size="sm" fw={600}>
                    {onlineStatus ? 'Connected' : 'Offline'}
                  </Text>
                </Group>
              </div>

              <div>
                <Text size="xs" c="dimmed">
                  Live Streaming
                </Text>
                <Text size="sm" fw={600} c={isPaused ? 'yellow' : 'teal'}>
                  {isPaused ? 'Paused' : 'Active (Live)'}
                </Text>
              </div>

              <div>
                <Text size="xs" c="dimmed">
                  Items Synced
                </Text>
                <Text size="sm" fw={600}>
                  ↑ {totalSent} / ↓ {totalReceived}
                </Text>
              </div>

              <div>
                <Text size="xs" c="dimmed">
                  Last Sync
                </Text>
                <Text size="sm" fw={600}>
                  {lastSyncedText}
                </Text>
              </div>
            </SimpleGrid>
          </Paper>

          {/* Master Actions Bar */}
          <Group justify="space-between" align="center" wrap="wrap">
            <Group gap="xs">
              <Button
                size="xs"
                variant="filled"
                color="indigo"
                leftSection={
                  <IconRotateClockwise
                    size={14}
                    className={isActuallySyncing ? 'sync-spin-icon' : undefined}
                  />
                }
                disabled={isActuallySyncing || !onlineStatus}
                onClick={() => void onSyncNow()}
              >
                {isActuallySyncing ? 'Syncing…' : 'Sync All Collections'}
              </Button>

              {onVerifyInSync && (
                <Button
                  size="xs"
                  variant="light"
                  color="teal"
                  leftSection={<IconCheck size={14} />}
                  loading={isVerifying}
                  disabled={!onlineStatus}
                  onClick={handleVerify}
                >
                  Verify In-Sync
                </Button>
              )}
            </Group>

            {onTogglePause && (
              <Switch
                label="Live Realtime Sync"
                size="sm"
                checked={!isPaused}
                disabled={!onlineStatus}
                onChange={() => void onTogglePause()}
              />
            )}
          </Group>

          {verifyResult && (
            <Paper p="xs" radius="md" bg="rgba(16, 185, 129, 0.08)" withBorder>
              <Text size="xs" fw={600} c="teal">
                {verifyResult}
              </Text>
            </Paper>
          )}

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="collections" leftSection={<IconDatabase size={14} />}>
                Collections ({collectionsList.length})
              </Tabs.Tab>
              <Tabs.Tab
                value="activities"
                leftSection={<IconActivity size={14} />}
                rightSection={
                  (syncState?.activities?.length ?? 0) > 0 ? (
                    <Badge size="xs" variant="filled" color="gray" circle>
                      {syncState?.activities?.length}
                    </Badge>
                  ) : undefined
                }
              >
                Activity Stream
              </Tabs.Tab>
              <Tabs.Tab value="architecture" leftSection={<IconInfoCircle size={14} />}>
                Replication Info
              </Tabs.Tab>
            </Tabs.List>

            {/* TAB 1: Collections Breakdown */}
            <Tabs.Panel value="collections" pt="sm">
              <Stack gap="xs">
                {collectionsList.map((col) => {
                  const IconComponent = collectionIcons[col.key] || IconDatabase;
                  const localCount = collectionCounts?.[col.key];

                  let colStatusColor = 'teal';
                  let colStatusText = 'In Sync';
                  if (col.error) {
                    colStatusColor = 'red';
                    colStatusText = 'Error';
                  } else if (col.isPaused || isPaused) {
                    colStatusColor = 'yellow';
                    colStatusText = 'Paused';
                  } else if (col.isActive) {
                    colStatusColor = 'blue';
                    colStatusText = 'Syncing';
                  }

                  return (
                    <Card key={col.key} className="sync-collection-card" padding="xs" radius="md">
                      <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap">
                          <ThemeIcon size="md" radius="md" variant="light" color={colStatusColor}>
                            <IconComponent size={18} />
                          </ThemeIcon>
                          <div>
                            <Group gap={6} align="center">
                              <Text size="sm" fw={700}>
                                {col.label}
                              </Text>
                              <Badge size="xs" variant="dot" color={colStatusColor}>
                                {colStatusText}
                              </Badge>
                            </Group>
                            <Text size="11px" c="dimmed">
                              Table: <code>{col.tableName}</code>
                              {localCount !== undefined && ` • ${localCount} docs stored`}
                            </Text>
                          </div>
                        </Group>

                        <Group gap="xs" wrap="nowrap">
                          <Badge size="xs" variant="light" color="blue">
                            ↑ {col.sentCount}
                          </Badge>
                          <Badge size="xs" variant="light" color="teal">
                            ↓ {col.receivedCount}
                          </Badge>

                          {onSyncCollection && (
                            <Tooltip label={`Sync ${col.label} only`} withArrow>
                              <ActionIcon
                                size="sm"
                                variant="subtle"
                                color="indigo"
                                disabled={!onlineStatus || col.isActive}
                                onClick={() => onSyncCollection(col.key)}
                              >
                                <IconRotateClockwise
                                  size={14}
                                  className={col.isActive ? 'sync-spin-icon' : undefined}
                                />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Group>

                      {col.error && (
                        <Text size="xs" c="red" mt={4} fw={500}>
                          Error: {col.error}
                        </Text>
                      )}
                    </Card>
                  );
                })}
              </Stack>
            </Tabs.Panel>

            {/* TAB 2: Live Activity Stream */}
            <Tabs.Panel value="activities" pt="sm">
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Text size="xs" fw={700} c="dimmed">
                    RECENT REPLICATION EVENTS
                  </Text>
                  {onClearActivities && (syncState?.activities?.length ?? 0) > 0 && (
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      color="gray"
                      leftSection={<IconTrash size={12} />}
                      onClick={onClearActivities}
                    >
                      Clear Log
                    </Button>
                  )}
                </Group>

                {!syncState?.activities || syncState.activities.length === 0 ? (
                  <Paper p="lg" radius="md" withBorder ta="center">
                    <IconActivity size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                    <Text size="sm" c="dimmed">
                      No replication events logged yet in this session.
                    </Text>
                  </Paper>
                ) : (
                  <ScrollArea.Autosize mah={280}>
                    <Timeline active={0} bulletSize={20} lineWidth={2}>
                      {syncState.activities.map((act: SyncActivityEvent) => {
                        let bulletColor = 'teal';
                        let BulletIcon = IconCheck;
                        if (act.type === 'sent') {
                          bulletColor = 'blue';
                          BulletIcon = IconCloudUpload;
                        } else if (act.type === 'received') {
                          bulletColor = 'teal';
                          BulletIcon = IconCloudDownload;
                        } else if (act.type === 'error') {
                          bulletColor = 'red';
                          BulletIcon = IconAlertTriangle;
                        } else if (act.type === 'paused') {
                          bulletColor = 'yellow';
                          BulletIcon = IconPlayerPause;
                        } else if (act.type === 'resumed') {
                          bulletColor = 'green';
                          BulletIcon = IconPlayerPlay;
                        } else if (act.type === 'resync') {
                          bulletColor = 'indigo';
                          BulletIcon = IconRotateClockwise;
                        }

                        return (
                          <Timeline.Item
                            key={act.id}
                            bullet={<BulletIcon size={12} />}
                            color={bulletColor}
                            title={
                              <Text size="xs" fw={600}>
                                {act.message}
                              </Text>
                            }
                          >
                            <Text size="10px" c="dimmed">
                              {formatRelativeTime(act.timestamp)}
                            </Text>
                          </Timeline.Item>
                        );
                      })}
                    </Timeline>
                  </ScrollArea.Autosize>
                )}
              </Stack>
            </Tabs.Panel>

            {/* TAB 3: Replication Info & Architecture */}
            <Tabs.Panel value="architecture" pt="sm">
              <Stack gap="xs">
                <Paper p="sm" radius="md" withBorder className="glass-panel">
                  <Text size="xs" fw={700} c="dimmed" mb={6}>
                    DATABASE & REPLICATION ARCHITECTURE
                  </Text>
                  <Stack gap={6}>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Client Storage Engine:
                      </Text>
                      <Text size="xs" fw={600}>
                        RxDB v16 + Dexie (IndexedDB)
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Remote Backend:
                      </Text>
                      <Text size="xs" fw={600}>
                        Supabase (PostgreSQL + Realtime)
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Replication Protocol:
                      </Text>
                      <Text size="xs" fw={600}>
                        Two-Way RxDB Replication with Checkpoints
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Deleted Record Strategy:
                      </Text>
                      <Text size="xs" fw={600}>
                        Soft Deletes (<code>_deleted</code> / <code>deleted</code>)
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Batch Size:
                      </Text>
                      <Text size="xs" fw={600}>
                        50 documents / pull & push batch
                      </Text>
                    </Group>
                  </Stack>
                </Paper>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Modal>
    </>
  );
}
