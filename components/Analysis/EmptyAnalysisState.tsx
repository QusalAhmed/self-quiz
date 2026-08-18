'use client';

import { Box, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { IconBook, IconBrain } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import React from 'react';

type EmptyAnalysisStateProps = {
  totalWords: number;
};

export function EmptyAnalysisState({ totalWords }: EmptyAnalysisStateProps) {
  const router = useRouter();

  return (
    <Card className="glass-panel" radius="xl" padding="xl" style={{ textAlign: 'center' }} py={48}>
      <Stack align="center" gap="md" maw={520} mx="auto">
        <Box
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
          }}
        >
          <IconBrain size={34} />
        </Box>

        <Title order={3} style={{ fontFamily: 'var(--font-title)', fontSize: '1.4rem' }}>
          No Learning Analytics Recorded Yet
        </Title>

        <Text size="sm" c="dimmed">
          {totalWords === 0
            ? 'Start by adding English vocabulary words to your dictionary. Once you practice flashcards and FSRS reviews, deep memory analytics and retention curves will appear here automatically.'
            : 'You have words in your dictionary, but no quiz or FSRS reviews have been completed yet. Complete a few review sessions to generate your memory stability metrics and study insights.'}
        </Text>

        <Group gap="sm" mt="sm">
          <Button
            variant="gradient"
            gradient={{ from: 'indigo', to: 'violet', deg: 45 }}
            radius="md"
            leftSection={<IconBrain size={16} />}
            onClick={() => router.push('/')}
          >
            Start Quiz / Review Session
          </Button>

          <Button
            variant="light"
            color="indigo"
            radius="md"
            leftSection={<IconBook size={16} />}
            onClick={() => router.push('/words')}
          >
            Dictionary Explorer
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
