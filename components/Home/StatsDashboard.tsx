import { Button, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconBook, IconBrain, IconChartBar, IconHistory } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import React from 'react';

type StatsDashboardProps = {
  totalWords: number;
  todayCount: number;
  fsrsDueTodayCount: number;
  fsrsNextDueText?: string;
  onOpenAllWordsQuiz: () => void;
  onOpenTodayQuiz: () => void;
  onOpenFsrsQuiz: () => void;
};

export function StatsDashboard({
  totalWords,
  todayCount,
  fsrsDueTodayCount,
  fsrsNextDueText,
  onOpenAllWordsQuiz,
  onOpenTodayQuiz,
  onOpenFsrsQuiz,
}: StatsDashboardProps) {
  const router = useRouter();

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" verticalSpacing="xs">
      <Card
        className="glass-panel hover-lift"
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
            <Text size="xl" fw={800} style={{ fontFamily: 'var(--font-title)', marginTop: '4px' }}>
              {totalWords}
            </Text>
          </div>
          <IconBook size={28} style={{ opacity: 0.35, color: '#6366f1' }} />
        </Group>
      </Card>

      <Card
        className="glass-panel hover-lift"
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
            <Text size="xl" fw={800} style={{ fontFamily: 'var(--font-title)', marginTop: '4px' }}>
              {todayCount}
            </Text>
          </div>
          <IconHistory size={28} style={{ opacity: 0.35, color: '#a855f7' }} />
        </Group>
      </Card>

      <Card
        className="glass-panel hover-lift"
        radius="lg"
        padding="md"
        style={{ borderLeft: '4px solid #ec4899', cursor: 'pointer' }}
        onClick={onOpenFsrsQuiz}
      >
        <Group justify="space-between" align="center">
          <div>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
              DUE FOR REVIEW (FSRS)
            </Text>
            <Group gap="xs" align="baseline">
              <Text
                size="xl"
                fw={800}
                c={fsrsDueTodayCount > 0 ? 'pink.6' : undefined}
                style={{
                  fontFamily: 'var(--font-title)',
                  marginTop: '4px',
                }}
              >
                {fsrsDueTodayCount}
              </Text>
              {fsrsNextDueText && (
                <Text
                  size="xs"
                  fw={800}
                  c={fsrsDueTodayCount > 0 ? 'pink.6' : 'dimmed'}
                  style={{ opacity: 0.95 }}
                >
                  • {fsrsNextDueText}
                </Text>
              )}
            </Group>
          </div>
          <IconBrain size={28} style={{ opacity: 0.45, color: '#ec4899' }} />
        </Group>
      </Card>

      <Card
        className="glass-panel hover-lift"
        radius="lg"
        padding="md"
        style={{ borderLeft: '4px solid #10b981', cursor: 'pointer' }}
        onClick={() => router.push('/analysis')}
      >
        <Group justify="space-between" align="center">
          <div>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
              LEARNING ANALYSIS
            </Text>
            <Text
              size="sm"
              fw={800}
              c="teal.6"
              style={{ fontFamily: 'var(--font-title)', marginTop: '8px' }}
            >
              View Full Insights →
            </Text>
          </div>
          <IconChartBar size={28} style={{ opacity: 0.45, color: '#10b981' }} />
        </Group>
      </Card>
    </SimpleGrid>
  );
}
