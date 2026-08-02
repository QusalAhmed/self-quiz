import { Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconCheck,
  IconConfetti,
  IconRotateClockwise,
} from '@tabler/icons-react';
import React from 'react';

export type FsrsCompletionStateProps = {
  reviewedCount: number;
  onRestartSession: () => void;
  onReturnToLibrary?: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
};

export function FsrsCompletionState({
  reviewedCount,
  onRestartSession,
  onReturnToLibrary,
  canUndo,
  onUndo,
}: FsrsCompletionStateProps) {
  return (
    <Card
      className="glass-panel animate-float"
      radius="xl"
      padding="xl"
      style={{
        textAlign: 'center',
        background:
          'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        boxShadow: '0 16px 40px rgba(168, 85, 247, 0.15)',
        maxWidth: 580,
        margin: '0 auto',
      }}
    >
      <Stack align="center" gap="md" py="xl">
        {/* Glowing Hero Trophy Halo */}
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 32px rgba(168, 85, 247, 0.4)',
          }}
        >
          <IconConfetti size={46} color="#ffffff" />
        </div>

        <Title
          order={2}
          style={{
            fontFamily: 'var(--font-title)',
            fontSize: '2rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          Review Session Complete! 🎉
        </Title>

        <Text size="sm" c="dimmed" style={{ maxWidth: 420, lineHeight: 1.6, fontWeight: 500 }}>
          You have mastered all due FSRS review cards for now. High five! New reviews will pop up as
          intervals expire.
        </Text>

        {/* Stats Grid */}
        <Group gap="md" mt="sm">
          <Card
            radius="lg"
            padding="md"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              minWidth: 140,
            }}
          >
            <Stack gap={2} align="center">
              <Text size="2rem" fw={900} c="grape.4" style={{ fontFamily: 'var(--font-title)' }}>
                {reviewedCount}
              </Text>
              <Text size="xs" c="dimmed" fw={700}>
                Cards Reviewed
              </Text>
            </Stack>
          </Card>

          <Card
            radius="lg"
            padding="md"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              minWidth: 140,
            }}
          >
            <Stack gap={2} align="center">
              <Group gap={4} align="center">
                <IconCheck size={20} color="#10b981" />
                <Text size="2rem" fw={900} c="teal.4" style={{ fontFamily: 'var(--font-title)' }}>
                  0
                </Text>
              </Group>
              <Text size="xs" c="dimmed" fw={700}>
                Cards Due Now
              </Text>
            </Stack>
          </Card>
        </Group>

        {/* Action Buttons */}
        <Group gap="md" mt="lg" justify="center" wrap="wrap">
          {canUndo && onUndo && (
            <Button
              size="lg"
              radius="xl"
              variant="light"
              color="grape"
              leftSection={<IconArrowBackUp size={20} />}
              onClick={onUndo}
              style={{ fontWeight: 700 }}
            >
              Undo Last Rating
            </Button>
          )}

          <Button
            size="lg"
            radius="xl"
            variant="gradient"
            gradient={{ from: 'violet', to: 'grape', deg: 135 }}
            leftSection={<IconRotateClockwise size={20} />}
            onClick={onRestartSession}
            style={{
              fontWeight: 800,
              fontFamily: 'var(--font-title)',
              boxShadow: '0 6px 20px rgba(168, 85, 247, 0.3)',
            }}
          >
            Review Deck Again
          </Button>

          {onReturnToLibrary && (
            <Button
              size="lg"
              radius="xl"
              variant="default"
              leftSection={<IconArrowLeft size={20} />}
              onClick={onReturnToLibrary}
              style={{ fontWeight: 700 }}
            >
              Back to Library
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
