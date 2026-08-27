import { Card, Group, RollingNumber, SimpleGrid, Text } from '@mantine/core';
import { IconBook, IconBrain, IconHistory } from '@tabler/icons-react';
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
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" verticalSpacing="xs">
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
            <Text
              component="div"
              size="xl"
              fw={800}
              style={{ fontFamily: 'var(--font-title)', marginTop: '4px' }}
            >
              <RollingNumber value={totalWords} thousandSeparator />
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
            <Text
              component="div"
              size="xl"
              fw={800}
              style={{ fontFamily: 'var(--font-title)', marginTop: '4px' }}
            >
              <RollingNumber value={todayCount} thousandSeparator />
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
                component="div"
                size="xl"
                fw={800}
                c={fsrsDueTodayCount > 0 ? 'pink.6' : undefined}
                style={{
                  fontFamily: 'var(--font-title)',
                  marginTop: '4px',
                }}
              >
                <RollingNumber value={fsrsDueTodayCount} thousandSeparator />
              </Text>
              {fsrsNextDueText && (
                <Text size="xs" fw={800} c={'pink.6'} style={{ opacity: 0.95 }}>
                  • {fsrsNextDueText}
                </Text>
              )}
            </Group>
          </div>
          <IconBrain size={28} style={{ opacity: 0.45, color: '#ec4899' }} />
        </Group>
      </Card>
    </SimpleGrid>
  );
}
