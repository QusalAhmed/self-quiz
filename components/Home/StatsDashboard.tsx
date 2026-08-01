import { Card, Group, SimpleGrid, Text } from '@mantine/core';
import { IconBook, IconBrain, IconHistory } from '@tabler/icons-react';
import React from 'react';

type StatsDashboardProps = {
  totalWords: number;
  todayCount: number;
  srsDueTodayCount: number;
  fsrsDueTodayCount: number;
  srsNextDueText?: string;
  fsrsNextDueText?: string;
  onOpenAllWordsQuiz: () => void;
  onOpenTodayQuiz: () => void;
  onOpenSrsQuiz: () => void;
  onOpenFsrsQuiz: () => void;
};

export function StatsDashboard({
  totalWords,
  todayCount,
  srsDueTodayCount,
  fsrsDueTodayCount,
  srsNextDueText,
  fsrsNextDueText,
  onOpenAllWordsQuiz,
  onOpenTodayQuiz,
  onOpenSrsQuiz,
  onOpenFsrsQuiz,
}: StatsDashboardProps) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" verticalSpacing="xs">
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
          <IconBook size={28} style={{ opacity: 0.25, color: '#6366f1' }} />
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
          <IconHistory size={28} style={{ opacity: 0.25, color: '#a855f7' }} />
        </Group>
      </Card>

      <Card
        className="glass-panel hover-lift"
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
            <Group gap="xs" align="baseline">
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
              {srsNextDueText && (
                <Text
                  size="xs"
                  fw={700}
                  c={srsDueTodayCount > 0 ? 'violet.4' : 'dimmed'}
                  style={{ opacity: 0.95 }}
                >
                  • {srsNextDueText}
                </Text>
              )}
            </Group>
          </div>
          <IconBrain size={28} style={{ opacity: 0.25, color: '#8b5cf6' }} />
        </Group>
      </Card>

      <Card
        className="glass-panel hover-lift"
        radius="lg"
        padding="md"
        style={{ borderLeft: '4px solid #06b6d4', cursor: 'pointer' }}
        onClick={onOpenFsrsQuiz}
      >
        <Group justify="space-between" align="center">
          <div>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
              FSRS DUE TODAY
            </Text>
            <Group gap="xs" align="baseline">
              <Text
                size="xl"
                fw={800}
                style={{
                  fontFamily: 'var(--font-title)',
                  marginTop: '4px',
                  color: fsrsDueTodayCount > 0 ? '#06b6d4' : undefined,
                }}
              >
                {fsrsDueTodayCount}
              </Text>
              {fsrsNextDueText && (
                <Text
                  size="xs"
                  fw={700}
                  c={fsrsDueTodayCount > 0 ? 'cyan.4' : 'dimmed'}
                  style={{ opacity: 0.95 }}
                >
                  • {fsrsNextDueText}
                </Text>
              )}
            </Group>
          </div>
          <IconBrain size={28} style={{ opacity: 0.25, color: '#06b6d4' }} />
        </Group>
      </Card>
    </SimpleGrid>
  );
}
