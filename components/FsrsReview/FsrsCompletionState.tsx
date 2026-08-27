import { Button, Card, Group, RollingNumber, Stack, Text, Title } from '@mantine/core';
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconCheck,
  IconConfetti,
  IconRotateClockwise,
} from '@tabler/icons-react';
import React, { useEffect } from 'react';

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
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        document.activeElement?.hasAttribute('contenteditable')
      ) {
        return;
      }

      if (
        canUndo &&
        onUndo &&
        (event.key === 'z' || event.key === 'Z' || event.key === 'u' || event.key === 'U')
      ) {
        event.preventDefault();
        onUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, onUndo]);

  return (
    <Card
      radius="24px"
      padding="xl"
      className="glass-panel"
      style={{
        border: '1px solid rgba(255, 255, 255, 0.12)',
        maxWidth: 580,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <Stack align="center" gap="lg" py="xl">
        {/* Celebration Icon Container */}
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
            border: '2px solid rgba(236, 72, 153, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(236, 72, 153, 0.3)',
          }}
        >
          <IconConfetti size={44} color="#ec4899" />
        </div>

        {/* Title & Subtitle */}
        <div>
          <Title
            order={2}
            style={{
              fontFamily: 'var(--font-title)',
              fontSize: '1.75rem',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Review Session Complete!
          </Title>
        </div>

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
              <Text
                component="div"
                size="2rem"
                fw={900}
                c="grape.4"
                style={{ fontFamily: 'var(--font-title)' }}
              >
                <RollingNumber value={reviewedCount} />
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
                <Text
                  component="div"
                  size="2rem"
                  fw={900}
                  c="teal.4"
                  style={{ fontFamily: 'var(--font-title)' }}
                >
                  <RollingNumber value={0} />
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
              Undo Rating
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
