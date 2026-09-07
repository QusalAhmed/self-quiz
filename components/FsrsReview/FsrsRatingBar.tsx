'use client';

import { Button, Group, Kbd, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { IconBrain } from '@tabler/icons-react';
import React, { useCallback, useEffect, useState } from 'react';
import type { FsrsRating } from '@/lib/fsrs';

export type FsrsIntervalItem = { dueAt?: string; intervalText?: string } | string;

export type FsrsRatingBarProps = {
  intervals?: Record<FsrsRating, FsrsIntervalItem> | Partial<Record<FsrsRating, string>> | null;
  onRate: (rating: FsrsRating) => void;
  disabled?: boolean;
  pressedRating?: FsrsRating | null;
  promptTitle?: string;
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
    rippleColor: 'rgba(239, 68, 68, 0.45)',
  },
  {
    rating: 'hard' as const,
    label: 'Hard',
    shortcut: '2',
    color: 'orange',
    className: 'rating-btn-hard',
    situation: 'Remembered with significant effort',
    description: 'Select when you recalled the answer, but it required heavy effort or hesitation.',
    rippleColor: 'rgba(245, 158, 11, 0.45)',
  },
  {
    rating: 'good' as const,
    label: 'Good',
    shortcut: '3',
    color: 'teal',
    className: 'rating-btn-good',
    situation: 'Recalled correctly with normal effort',
    description: 'Select when you remembered the answer correctly with expected recall effort.',
    rippleColor: 'rgba(16, 185, 129, 0.45)',
  },
  {
    rating: 'easy' as const,
    label: 'Easy',
    shortcut: '4',
    color: 'indigo',
    className: 'rating-btn-easy',
    situation: 'Instantly remembered with zero effort',
    description: 'Select when the answer was effortless and immediately obvious.',
    rippleColor: 'rgba(99, 102, 241, 0.45)',
  },
];

interface Ripple {
  id: number;
  x: number;
  y: number;
  rating: FsrsRating;
  color: string;
}

export function FsrsRatingBar({
  intervals,
  onRate,
  disabled = false,
  pressedRating = null,
  promptTitle = 'RATE YOUR RECALL',
}: FsrsRatingBarProps) {
  const [internalPressedRating, setInternalPressedRating] = useState<FsrsRating | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const activeRating = pressedRating ?? internalPressedRating;

  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(18);
      } catch {
        // Ignore devices where vibration API is restricted
      }
    }
  }, []);

  const handlePointerDown = (
    rating: FsrsRating,
    rippleColor: string,
    e: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (disabled) {
      return;
    }
    const rect = e.currentTarget?.getBoundingClientRect?.() || { left: 0, top: 0 };
    const rectLeft = typeof rect.left === 'number' && !Number.isNaN(rect.left) ? rect.left : 0;
    const rectTop = typeof rect.top === 'number' && !Number.isNaN(rect.top) ? rect.top : 0;
    const rawX = typeof e.clientX === 'number' && !Number.isNaN(e.clientX) ? e.clientX : 65;
    const rawY = typeof e.clientY === 'number' && !Number.isNaN(e.clientY) ? e.clientY : 25;
    const computedX = rawX - rectLeft;
    const computedY = rawY - rectTop;
    const x = Number.isFinite(computedX) ? computedX : 65;
    const y = Number.isFinite(computedY) ? computedY : 25;

    setRipples((prev) => [
      ...prev.slice(-6),
      {
        id: Date.now() + Math.random(),
        x,
        y,
        rating,
        color: rippleColor,
      },
    ]);
    setInternalPressedRating(rating);
    triggerHaptic();
  };

  const handlePointerUpOrLeave = () => {
    setInternalPressedRating(null);
  };

  // Trigger centered visual ripple when keyboard shortcut is triggered
  useEffect(() => {
    if (pressedRating) {
      const btnInfo = RATING_BUTTON_INFO.find((b) => b.rating === pressedRating);
      if (btnInfo) {
        setRipples((prev) => [
          ...prev.slice(-6),
          {
            id: Date.now() + Math.random(),
            x: 65,
            y: 25,
            rating: pressedRating,
            color: btnInfo.rippleColor,
          },
        ]);
        triggerHaptic();
      }
    }
  }, [pressedRating, triggerHaptic]);

  // Clean up ripples after animation duration
  useEffect(() => {
    if (ripples.length === 0) {
      return;
    }
    const timer = setTimeout(() => {
      setRipples([]);
    }, 600);
    return () => clearTimeout(timer);
  }, [ripples]);

  const handleButtonClick = (rating: FsrsRating, rippleColor: string) => {
    if (disabled) {
      return;
    }
    setInternalPressedRating(rating);
    setRipples((prev) => [
      ...prev.slice(-6),
      {
        id: Date.now() + Math.random(),
        x: 65,
        y: 25,
        rating,
        color: rippleColor,
      },
    ]);
    triggerHaptic();
    onRate(rating);
    setTimeout(() => {
      setInternalPressedRating(null);
    }, 150);
  };

  return (
    <Stack gap="xs" align="center" style={{ width: '100%' }}>
      <Group gap={6} align="center" mb={2}>
        <IconBrain size={15} style={{ color: '#a855f7' }} />
        <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
          {promptTitle}
        </Text>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs" style={{ width: '100%' }}>
        {RATING_BUTTON_INFO.map(
          ({ rating, label, shortcut, color, className, situation, description, rippleColor }) => {
            const rawInterval = intervals?.[rating];
            const intervalText =
              typeof rawInterval === 'string' ? rawInterval : rawInterval?.intervalText;

            const isPressed = activeRating === rating;

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
                  data-rating={rating}
                  onPointerDown={(e) => handlePointerDown(rating, rippleColor, e)}
                  onPointerUp={handlePointerUpOrLeave}
                  onPointerLeave={handlePointerUpOrLeave}
                  onClick={() => handleButtonClick(rating, rippleColor)}
                  className={`${className} ${isPressed ? 'is-pressed review-btn-pop' : ''}`}
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
                    overflow: 'hidden',
                  }}
                >
                  {/* Glowing Tactile Ripple */}
                  {ripples
                    .filter((r) => r.rating === rating)
                    .map((r) => (
                      <span
                        key={r.id}
                        className="review-tap-ripple"
                        style={{
                          left: r.x,
                          top: r.y,
                          width: 130,
                          height: 130,
                          backgroundColor: r.color,
                        }}
                      />
                    ))}

                  <Kbd
                    size="xs"
                    visibleFrom="sm"
                    className="kbd-hint"
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
                  <Stack gap={2} align="center" style={{ position: 'relative', zIndex: 2 }}>
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
