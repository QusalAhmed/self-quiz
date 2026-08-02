'use client';

import { Badge, Button, Group, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { IconBrain } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import type { FsrsRating } from '@/lib/fsrs';

export type FsrsRatingBarProps = {
  intervals: Record<FsrsRating, { dueAt: string; intervalText: string }> | null;
  onRate: (rating: FsrsRating) => void;
  disabled?: boolean;
};

const RATING_BUTTONS = [
  {
    rating: 'again' as const,
    label: 'Again',
    color: 'red',
    className: 'rating-btn-again',
    defaultTooltip: 'Completely forgot — review again in 1 minute',
  },
  {
    rating: 'hard' as const,
    label: 'Hard',
    color: 'orange',
    className: 'rating-btn-hard',
    defaultTooltip: 'Hard — remembered with effort',
  },
  {
    rating: 'good' as const,
    label: 'Good',
    color: 'teal',
    className: 'rating-btn-good',
    defaultTooltip: 'Good — remembered correctly',
  },
  {
    rating: 'easy' as const,
    label: 'Easy',
    color: 'indigo',
    className: 'rating-btn-easy',
    defaultTooltip: 'Easy — recalled instantly',
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
        {RATING_BUTTONS.map(({ rating, label, color, className, defaultTooltip }) => {
          const intervalText = intervals?.[rating]?.intervalText;
          const tooltipLabel = intervalText
            ? `${label} — next review in ${intervalText}`
            : defaultTooltip;

          return (
            <Tooltip
              key={rating}
              label={tooltipLabel}
              withArrow
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
        })}
      </SimpleGrid>
    </Stack>
  );
}
