import { Card, Group, RollingNumber, SimpleGrid, Text } from '@mantine/core';
import { IconBook, IconBrain, IconHistory, IconWriting } from '@tabler/icons-react';
import React from 'react';

export type StatsDashboardProps = {
  totalWords: number;
  todayCount: number;
  fsrsMeaningDueTodayCount?: number;
  fsrsMeaningNextDueText?: string;
  onOpenFsrsMeaningQuiz?: () => void;
  // Backwards compatibility props
  fsrsDueTodayCount?: number;
  fsrsNextDueText?: string;
  onOpenFsrsQuiz?: () => void;

  fsrsSpellingDueTodayCount?: number;
  fsrsSpellingNextDueText?: string;
  onOpenFsrsSpellingQuiz?: () => void;

  onOpenAllWordsQuiz: () => void;
  onOpenTodayQuiz: () => void;
};

export function StatsDashboard({
  totalWords,
  todayCount,
  fsrsMeaningDueTodayCount,
  fsrsMeaningNextDueText,
  onOpenFsrsMeaningQuiz,
  fsrsDueTodayCount,
  fsrsNextDueText,
  onOpenFsrsQuiz,
  fsrsSpellingDueTodayCount,
  fsrsSpellingNextDueText,
  onOpenFsrsSpellingQuiz,
  onOpenAllWordsQuiz,
  onOpenTodayQuiz,
}: StatsDashboardProps) {
  const meaningCount = fsrsMeaningDueTodayCount ?? fsrsDueTodayCount ?? 0;
  const meaningNextDue = fsrsMeaningNextDueText ?? fsrsNextDueText;
  const handleMeaningQuiz = onOpenFsrsMeaningQuiz ?? onOpenFsrsQuiz ?? (() => {});

  const spellingCount = fsrsSpellingDueTodayCount ?? 0;
  const spellingNextDue = fsrsSpellingNextDueText;
  const handleSpellingQuiz = onOpenFsrsSpellingQuiz ?? (() => {});

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
        onClick={handleMeaningQuiz}
      >
        <Group justify="space-between" align="center">
          <div>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
              FSRS MEANING
            </Text>
            <Group gap="xs" align="baseline">
              <Text
                component="div"
                size="xl"
                fw={800}
                c={meaningCount > 0 ? 'pink.6' : undefined}
                style={{
                  fontFamily: 'var(--font-title)',
                  marginTop: '4px',
                }}
              >
                <RollingNumber value={meaningCount} thousandSeparator />
              </Text>
              {meaningNextDue && (
                <Text size="xs" fw={800} c="pink.6" style={{ opacity: 0.95 }}>
                  • {meaningNextDue}
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
        style={{ borderLeft: '4px solid #f97316', cursor: 'pointer' }}
        onClick={handleSpellingQuiz}
      >
        <Group justify="space-between" align="center">
          <div>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
              FSRS SPELLING
            </Text>
            <Group gap="xs" align="baseline">
              <Text
                component="div"
                size="xl"
                fw={800}
                c={spellingCount > 0 ? 'orange.6' : undefined}
                style={{
                  fontFamily: 'var(--font-title)',
                  marginTop: '4px',
                }}
              >
                <RollingNumber value={spellingCount} thousandSeparator />
              </Text>
              {spellingNextDue && (
                <Text size="xs" fw={800} c="orange.6" style={{ opacity: 0.95 }}>
                  • {spellingNextDue}
                </Text>
              )}
            </Group>
          </div>
          <IconWriting size={28} style={{ opacity: 0.45, color: '#f97316' }} />
        </Group>
      </Card>
    </SimpleGrid>
  );
}
