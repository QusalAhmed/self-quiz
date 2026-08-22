'use client';

import { Badge, Button, Card, Group, Progress, Stack, Text, Title, Tooltip } from '@mantine/core';
import { IconArrowBackUp, IconEye, IconVolume } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import React from 'react';
import { WordFamilySection } from '@/components/WordFamily/WordFamilySection';
import type { WordFamilyMemberRecord } from '@/lib/db';
import type { FsrsRating, FsrsRecord } from '@/lib/fsrs';
import { FsrsCounterBadge } from './FsrsCounterBadge';
import { FsrsRatingBar } from './FsrsRatingBar';

export type FsrsCardViewerProps = {
  card: FsrsRecord;
  isRevealed: boolean;
  intervals: Record<FsrsRating, { dueAt: string; intervalText: string }> | null;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  canUndo?: boolean;
  wordFamilyMembers?: WordFamilyMemberRecord[];
  isGeneratingWordFamily?: boolean;
  onReveal: () => void;
  onRate: (rating: FsrsRating) => void;
  onUndo?: () => void;
  onPronounce?: (text: string) => void;
  onRefreshWordFamily?: (wordId: string, word: string) => void;
  onDeleteWordFamilyMember?: (memberId: string) => void;
};

export function FsrsCardViewer({
  card,
  isRevealed,
  intervals,
  newCount,
  learningCount,
  reviewCount,
  canUndo,
  wordFamilyMembers = [],
  isGeneratingWordFamily = false,
  onReveal,
  onRate,
  onUndo,
  onPronounce,
  onRefreshWordFamily,
  onDeleteWordFamilyMember,
}: FsrsCardViewerProps) {
  const totalCardsInQueue = newCount + learningCount + reviewCount;
  const progressPercent =
    totalCardsInQueue > 0
      ? Math.min(
          100,
          Math.max(10, (1 - (newCount + learningCount) / (totalCardsInQueue + 1)) * 100)
        )
      : 100;

  // Determine card state color theme
  const stateBadgeProps =
    card.state === 'New'
      ? { color: 'blue', label: '✨ New Card' }
      : card.state === 'Learning' || card.state === 'Relearning'
        ? { color: 'orange', label: '⚡ Learning Step' }
        : { color: 'teal', label: '🧠 Due Review' };

  return (
    <Card
      className="glass-panel hover-lift"
      radius="xl"
      padding="xl"
      style={{
        width: '100%',
        maxWidth: 640,
        margin: '0 auto',
        boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
        border: '1px solid rgba(168, 85, 247, 0.25)',
        minHeight: 380,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Session Progress Bar (Quizlet style) */}
      <Progress
        value={progressPercent}
        size="xs"
        color="grape"
        animated
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          borderRadius: 0,
        }}
      />

      <Stack gap="md" style={{ flex: 1, justifyContent: 'space-between' }} mt="xs">
        {/* Header Bar with Anki counter badge & Undo button */}
        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
          <Group gap={6} align="center">
            <Badge variant="light" color={stateBadgeProps.color} size="sm" radius="md">
              {stateBadgeProps.label}
            </Badge>
            <Text size="xs" c="dimmed" fw={600}>
              Due:{' '}
              {new Date(card.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Group>

          <Group gap="xs" align="center">
            <FsrsCounterBadge
              newCount={newCount}
              learningCount={learningCount}
              reviewCount={reviewCount}
            />
          </Group>
        </Group>

        <div style={{ perspective: '1200px', width: '100%', flex: 1, display: 'flex' }}>
          <motion.div
            key={card.wordId || card.dueAt}
            initial={false}
            animate={{ rotateY: isRevealed ? 180 : 0 }}
            transition={{
              duration: 0.6,
              ease: [0.23, 1, 0.32, 1],
            }}
            style={{
              transformStyle: 'preserve-3d',
              position: 'relative',
              width: '100%',
              display: 'grid',
              gridTemplateColumns: '1fr',
              gridTemplateRows: '1fr',
              alignItems: 'center',
            }}
          >
            {/* FRONT FACE (UNREVEALED) */}
            <div
              style={{
                gridArea: '1 / 1',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)',
                pointerEvents: isRevealed ? 'none' : 'auto',
                width: '100%',
              }}
            >
              <Stack align="center" gap="md" py="md">
                {/* FSRS Card Metadata & Undo Bar */}
                <Group justify="center" gap={6} wrap="wrap" mb={4}>
                  <Badge
                    variant="light"
                    color={stateBadgeProps.color}
                    size="sm"
                    radius="md"
                    style={{ fontWeight: 800 }}
                  >
                    {stateBadgeProps.label}
                  </Badge>
                  <Badge variant="outline" color="violet" size="sm" radius="md">
                    Reps: {card.reps ?? 0}
                  </Badge>
                  <Badge
                    variant="outline"
                    color={card.lapses > 0 ? 'red' : 'gray'}
                    size="sm"
                    radius="md"
                  >
                    Lapses: {card.lapses ?? 0}
                  </Badge>

                  {typeof card.stability === 'number' && card.stability > 0 && (
                    <Badge variant="outline" color="teal" size="sm" radius="md">
                      Stab:{' '}
                      {card.stability < 1
                        ? `${Math.round(card.stability * 24)}h`
                        : `${card.stability.toFixed(1)}d`}
                    </Badge>
                  )}

                  {typeof card.difficulty === 'number' && card.difficulty > 0 && (
                    <Badge variant="outline" color="orange" size="sm" radius="md">
                      Diff: {card.difficulty.toFixed(1)}/10
                    </Badge>
                  )}

                  {canUndo && onUndo && (
                    <Tooltip label="Undo last card rating" withArrow>
                      <Button
                        variant="light"
                        color="grape"
                        size="xs"
                        radius="md"
                        leftSection={<IconArrowBackUp size={14} />}
                        onClick={onUndo}
                        style={{ fontWeight: 800, height: 22, paddingLeft: 8, paddingRight: 8 }}
                      >
                        Undo
                      </Button>
                    </Tooltip>
                  )}
                </Group>

                <Group gap="sm" align="center" justify="center">
                  <Title
                    order={1}
                    style={{
                      fontFamily: 'var(--font-title)',
                      fontSize: '2.75rem',
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      textAlign: 'center',
                      background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'currentColor',
                    }}
                  >
                    {card.word}
                  </Title>

                  {onPronounce && (
                    <Tooltip label="Pronounce word" withArrow>
                      <Button
                        variant="light"
                        color="violet"
                        size="sm"
                        radius="xl"
                        p={8}
                        onClick={() => onPronounce(card.word)}
                        aria-label="Pronounce word"
                        style={{
                          boxShadow: '0 4px 12px rgba(168, 85, 247, 0.2)',
                        }}
                      >
                        <IconVolume size={20} />
                      </Button>
                    </Tooltip>
                  )}
                </Group>

                <Text size="xs" c="dimmed" fw={600} style={{ letterSpacing: '0.04em' }}>
                  Click below to reveal answer
                </Text>

                <Stack align="center" py="sm" style={{ width: '100%' }}>
                  <Button
                    size="lg"
                    radius="xl"
                    variant="gradient"
                    gradient={{ from: 'violet', to: 'grape', deg: 135 }}
                    leftSection={<IconEye size={22} />}
                    onClick={onReveal}
                    style={{
                      width: '100%',
                      maxWidth: 320,
                      fontWeight: 800,
                      fontSize: '1.05rem',
                      boxShadow: '0 6px 20px rgba(168, 85, 247, 0.35)',
                      fontFamily: 'var(--font-title)',
                    }}
                  >
                    Show Answer (Space)
                  </Button>
                </Stack>
              </Stack>
            </div>

            {/* BACK FACE (REVEALED) */}
            <div
              style={{
                gridArea: '1 / 1',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                pointerEvents: isRevealed ? 'auto' : 'none',
                width: '100%',
              }}
            >
              <Stack gap="md" style={{ width: '100%' }}>
                <Group justify="center" gap={6} wrap="wrap" mb={2}>
                  <Badge
                    variant="light"
                    color={stateBadgeProps.color}
                    size="sm"
                    radius="md"
                    style={{ fontWeight: 800 }}
                  >
                    {stateBadgeProps.label}
                  </Badge>
                  <Title
                    order={3}
                    style={{
                      fontFamily: 'var(--font-title)',
                      fontWeight: 800,
                      textAlign: 'center',
                    }}
                  >
                    {card.word}
                  </Title>
                  {onPronounce && (
                    <Tooltip label="Pronounce word" withArrow>
                      <Button
                        variant="subtle"
                        color="violet"
                        size="xs"
                        radius="xl"
                        p={4}
                        onClick={() => onPronounce(card.word)}
                      >
                        <IconVolume size={16} />
                      </Button>
                    </Tooltip>
                  )}
                </Group>

                <Card
                  radius="lg"
                  padding="md"
                  style={{
                    background: 'rgba(168, 85, 247, 0.08)',
                    borderLeft: '4px solid #a855f7',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    borderLeftWidth: 4,
                  }}
                >
                  <Group justify="space-between" align="center" mb={6}>
                    <Text size="xs" fw={800} c="grape.4" style={{ letterSpacing: '0.05em' }}>
                      DEFINITION / MEANING
                    </Text>
                  </Group>

                  <Text size="lg" fw={800} style={{ lineHeight: 1.45 }}>
                    {card.meaning}
                  </Text>
                </Card>

                <WordFamilySection
                  wordId={card.wordId}
                  word={card.word}
                  members={wordFamilyMembers}
                  isLoading={isGeneratingWordFamily}
                  onRefresh={onRefreshWordFamily}
                  onDeleteMember={onDeleteWordFamilyMember}
                />

                <FsrsRatingBar intervals={intervals} onRate={onRate} />
              </Stack>
            </div>
          </motion.div>
        </div>

        {/* Bottom Keyboard Legend */}
        <Group justify="center" gap="lg" style={{ opacity: 0.65 }}>
          {canUndo && (
            <Text size="xs" fw={700}>
              <Text span fw={900} c="pink.4">
                Z / U
              </Text>{' '}
              Undo
            </Text>
          )}
          <Text size="xs" fw={700}>
            <Text span fw={900} c="grape.4">
              Space
            </Text>{' '}
            Reveal
          </Text>
          <Text size="xs" fw={700}>
            <Text span fw={900} c="red.4">
              1
            </Text>{' '}
            Again
          </Text>
          <Text size="xs" fw={700}>
            <Text span fw={900} c="orange.4">
              2
            </Text>{' '}
            Hard
          </Text>
          <Text size="xs" fw={700}>
            <Text span fw={900} c="teal.4">
              3
            </Text>{' '}
            Good
          </Text>
          <Text size="xs" fw={700}>
            <Text span fw={900} c="indigo.4">
              4
            </Text>{' '}
            Easy
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
