import { ActionIcon, Card, Flex, Group, SimpleGrid, Text, Tooltip } from '@mantine/core';
import {
  IconBook,
  IconBrain,
  IconCloudCheck,
  IconCloudUpload,
  IconHistory,
  IconRotateClockwise,
} from '@tabler/icons-react';

type StatsDashboardProps = {
  totalWords: number;
  todayCount: number;
  srsDueTodayCount: number;
  unsyncedCount: number;
  onlineStatus: boolean;
  isSyncing: boolean;
  onSyncNow: () => Promise<void> | void;
  onOpenAllWordsQuiz: () => void;
  onOpenTodayQuiz: () => void;
  onOpenSrsQuiz: () => void;
};

export function StatsDashboard({
  totalWords,
  todayCount,
  srsDueTodayCount,
  unsyncedCount,
  onlineStatus,
  isSyncing,
  onSyncNow,
  onOpenAllWordsQuiz,
  onOpenTodayQuiz,
  onOpenSrsQuiz,
}: StatsDashboardProps) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" verticalSpacing="xs" autoFlow="auto-fit">
      <Card
        className="glass-panel"
        radius="lg"
        padding="md"
        style={{ borderLeft: '4px solid #6366f1', cursor: 'pointer' }}
        onClick={onOpenAllWordsQuiz}
      >
        <Group justify="space-between" align="center">
          <div>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
              TOTAL WORDS
            </Text>
            <Text
              size="xl"
              fw={800}
              style={{ fontFamily: 'var(--font-title)', marginTop: '4px' }}
            >
              {totalWords}
            </Text>
          </div>
          <IconBook size={28} style={{ opacity: 0.25, color: '#6366f1' }} />
        </Group>
      </Card>

      <Card
        className="glass-panel"
        radius="lg"
        padding="md"
        style={{ borderLeft: '4px solid #a855f7', cursor: 'pointer' }}
        onClick={onOpenTodayQuiz}
      >
        <Group justify="space-between" align="center">
          <div>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
              ADDED TODAY
            </Text>
            <Text
              size="xl"
              fw={800}
              style={{ fontFamily: 'var(--font-title)', marginTop: '4px' }}
            >
              {todayCount}
            </Text>
          </div>
          <IconHistory size={28} style={{ opacity: 0.25, color: '#a855f7' }} />
        </Group>
      </Card>

      <Card
        className="glass-panel"
        radius="lg"
        padding="md"
        style={{ borderLeft: '4px solid #8b5cf6', cursor: 'pointer' }}
        onClick={onOpenSrsQuiz}
      >
        <Group justify="space-between" align="center">
          <div>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
              SRS DUE TODAY
            </Text>
            <Text
              size="xl"
              fw={800}
              style={{
                fontFamily: 'var(--font-title)',
                marginTop: '4px',
                color: srsDueTodayCount > 0 ? '#8b5cf6' : undefined,
              }}
            >
              {srsDueTodayCount}
            </Text>
          </div>
          <IconBrain size={28} style={{ opacity: 0.25, color: '#8b5cf6' }} />
        </Group>
      </Card>

      <Card
        className="glass-panel"
        radius="lg"
        padding="md"
        style={{ borderLeft: '4px solid #10b981' }}
      >
        <Group justify="space-between" align="center">
          <div>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
              CLOUD SYNC
            </Text>
            <Flex justify="flex-start" align="center" direction="row" wrap="wrap">
              <Text size="lg" fw={700} c={unsyncedCount === 0 ? 'teal' : 'orange'} mt={4}>
                {unsyncedCount === 0 ? 'Fully Synced' : `${unsyncedCount} Sync Pending`}
              </Text>
              {onlineStatus && (
                <Tooltip label={isSyncing ? 'Syncing…' : 'Sync now'} withArrow>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="teal"
                    mt={4}
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
          {unsyncedCount === 0 ? (
            <IconCloudCheck size={28} style={{ opacity: 0.35, color: '#10b981' }} />
          ) : (
            <IconCloudUpload size={28} style={{ opacity: 0.35, color: '#f59e0b' }} />
          )}
        </Group>
      </Card>
    </SimpleGrid>
  );
}
