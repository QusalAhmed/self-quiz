'use client';

import { Button, Group, Kbd, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { IconBrain } from '@tabler/icons-react';
import React from 'react';
import type { FsrsRating } from '@/lib/fsrs';

export type FsrsRatingBarProps = {
  intervals: Record<FsrsRating, { dueAt: string; intervalText: string }> | null;
  onRate: (rating: FsrsRating) => void;
  disabled?: boolean;
};

export const RATING_BUTTON_INFO = [
  {
    rating: 'again' as const,
    label: 'Again',
    shortcut: '1',
    color: 'red',
    className: 'rating-btn-again',
    situation: 'Forgot or incorrect answer',
    description: 'Select when you could not recall the answer or got it wrong.',
  },
  {
    rating: 'hard' as const,
    label: 'Hard',
    shortcut: '2',
    color: 'orange',
    className: 'rating-btn-hard',
    situation: 'Remembered with significant effort',
    description: 'Select when you recalled the answer, but it required heavy effort or hesitation.',
  },
  {
    rating: 'good' as const,
    label: 'Good',
    shortcut: '3',
    color: 'teal',
    className: 'rating-btn-good',
    situation: 'Recalled correctly with normal effort',
    description: 'Select when you remembered the answer correctly with expected recall effort.',
  },
  {
    rating: 'easy' as const,
    label: 'Easy',
    shortcut: '4',
    color: 'indigo',
    className: 'rating-btn-easy',
    situation: 'Instantly remembered with zero effort',
    description: 'Select when the answer was effortless and immediately obvious.',
  },
];

export function FsrsRatingBar({ intervals, onRate, disabled = false }: FsrsRatingBarProps) {
  return (
    <Stack gap="xs" align="center" style={{ width: '100%' }}>
      <Group gap={6} align="center" mb={2}>
        <IconBrain size={15} style={{ color: '#a855f7' }} />
        <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
          RATE YOUR RECALL
        </Text>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs" style={{ width: '100%' }}>
        {RATING_BUTTON_INFO.map(
          ({ rating, label, shortcut, color, className, situation, description }) => {
            const intervalText = intervals?.[rating]?.intervalText;

            return (
              <Tooltip
                key={rating}
                label={
                  <Stack gap={2} p={2} style={{ maxWidth: 220 }}>
                    <Text size="xs" fw={700}>
                      {label} [{shortcut}] — {situation}
                    </Text>
                    <Text size="xs" style={{ opacity: 0.9 }}>
                      {description}
                    </Text>
                    {intervalText && (
                      <Text size="xs" c="dimmed" style={{ fontSize: '0.72rem', marginTop: 2 }}>
                        Next review in: {intervalText}
                      </Text>
                    )}
                  </Stack>
                }
                withArrow
                multiline
                w={220}
                transitionProps={{ duration: 150 }}
              >
                <Button
                  size="md"
                  radius="lg"
                  variant="light"
                  color={color}
                  disabled={disabled}
                  onClick={() => onRate(rating)}
                  className={className}
                  style={{
                    fontWeight: 800,
                    width: '100%',
                    height: 'auto',
                    paddingTop: 8,
                    paddingBottom: 8,
                    paddingLeft: 6,
                    paddingRight: 6,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    position: 'relative',
                  }}
                >
                  <Kbd
                    size="xs"
                    style={{
                      position: 'absolute',
                      top: 5,
                      right: 6,
                      fontSize: '0.62rem',
                      padding: '1px 4px',
                      lineHeight: 1,
                      opacity: 0.8,
                      pointerEvents: 'none',
                    }}
                  >
                    {shortcut}
                  </Kbd>
                  <Stack gap={2} align="center">
                    {/* Next Review Time Interval (Anki style) */}
                    <Text
                      size="xs"
                      fw={900}
                      style={{
                        fontSize: '0.78rem',
                        lineHeight: 1,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {intervalText || (rating === 'again' ? '<1m' : label)}
                    </Text>

                    {/* Rating Label */}
                    <Text size="sm" fw={800} style={{ lineHeight: 1.15 }}>
                      {label}
                    </Text>
                  </Stack>
                </Button>
              </Tooltip>
            );
          }
        )}
      </SimpleGrid>
    </Stack>
  );
}
