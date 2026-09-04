'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  CopyButton,
  Group,
  Indicator,
  Kbd,
  Modal,
  Progress,
  RollingNumber,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowBackUp,
  IconCheck,
  IconCopy,
  IconEdit,
  IconEye,
  IconHelp,
  IconRotateClockwise,
  IconVolume,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { WordActionIcon } from '@/components/WordActions/WordActionIcon';
import { WordFamilySection } from '@/components/WordFamily/WordFamilySection';
import type { WordFamilyMemberRecord } from '@/lib/db';
import type { FsrsRating, FsrsRecord } from '@/lib/fsrs';
import { playReviewSound } from '@/lib/sound';
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
  onEditWord?: (wordId: string) => void;
  onRefreshWordFamily?: (wordId: string, word: string) => void;
  onDeleteWordFamilyMember?: (memberId: string) => void;
  onRefreshQuiz?: () => void;
  hasAddedWords?: boolean;
  addedWordsCount?: number;
};

export const FsrsCardViewer = memo(function FsrsCardViewer({
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
  onEditWord,
  onRefreshWordFamily,
  onDeleteWordFamilyMember,
  onRefreshQuiz,
  hasAddedWords = false,
  addedWordsCount = 0,
}: FsrsCardViewerProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const totalCardsInQueue = newCount + learningCount + reviewCount;
  const progressPercent =
    totalCardsInQueue > 0
      ? Math.min(
          100,
          Math.max(10, (1 - (newCount + learningCount) / (totalCardsInQueue + 1)) * 100)
        )
      : 100;

  /**
   * Positions the review card:
   * - Vertically centered if it fits within the viewport.
   * - At the top of the screen if it is taller than the viewport.
   */
  const positionReviewSection = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (typeof window === 'undefined') {
      return;
    }

    requestAnimationFrame(() => {
      const element = cardRef.current;
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const elementHeight = rect.height;
      const viewportHeight = window.innerHeight;
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
      const elementAbsoluteTop = rect.top + currentScrollY;

      const TOP_PADDING = 20;
      let targetScrollY: number;

      if (elementHeight + TOP_PADDING * 2 <= viewportHeight) {
        const verticalCenterMargin = (viewportHeight - elementHeight) / 2;
        targetScrollY = elementAbsoluteTop - verticalCenterMargin;
      } else {
        targetScrollY = elementAbsoluteTop - TOP_PADDING;
      }

      targetScrollY = Math.max(0, targetScrollY);

      if (Math.abs(currentScrollY - targetScrollY) > 5) {
        window.scrollTo({ top: targetScrollY, behavior });
      }
    });
  }, []);

  // Position on card change and reveal state change
  useEffect(() => {
    positionReviewSection();
  }, [card.dueAt, card.wordId, positionReviewSection]);

  useEffect(() => {
    positionReviewSection();
  }, [isRevealed, positionReviewSection]);

  // State for help modal
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Keyboard shortcuts
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
        positionReviewSection();
        return;
      }

      // Help modal: H or ?
      if (event.key === 'h' || event.key === 'H' || event.key === '?') {
        event.preventDefault();
        setShowHelpModal((prev) => !prev);
        return;
      }

      // Pronounce word: P
      if (onPronounce && (event.key === 'p' || event.key === 'P')) {
        event.preventDefault();
        onPronounce(card.word);
        return;
      }

      if (event.key === ' ' || event.code === 'Space') {
        if (!isRevealed) {
          event.preventDefault();
          onReveal();
          positionReviewSection();
          return;
        }
      }

      // Escape: flip card back to front when revealed
      if (event.key === 'Escape' && isRevealed) {
        event.preventDefault();
        onReveal();
        positionReviewSection();
        return;
      }

      if (isRevealed) {
        if (event.key === '1') {
          event.preventDefault();
          playReviewSound('again');
          onRate('again');
          positionReviewSection();
          return;
        }
        if (event.key === '2') {
          event.preventDefault();
          playReviewSound('hard');
          onRate('hard');
          positionReviewSection();
          return;
        }
        if (event.key === '3') {
          event.preventDefault();
          playReviewSound('good');
          onRate('good');
          positionReviewSection();
          return;
        }
        if (event.key === '4') {
          event.preventDefault();
          playReviewSound('easy');
          onRate('easy');
          positionReviewSection();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    canUndo,
    onUndo,
    isRevealed,
    onReveal,
    onRate,
    positionReviewSection,
    onPronounce,
    card.word,
  ]);

  // Keyboard shortcuts help content
  const helpModalContent = (
    <Stack gap="xs">
      <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.06em' }}>
        GENERAL
      </Text>
      <Table striped highlightOnHover withTableBorder withColumnBorders fz="sm">
        <Table.Tbody>
          {[
            ['Space', 'Reveal answer'],
            ['Escape', 'Flip card back to front'],
            ...(onPronounce ? [['P', 'Pronounce the word']] : []),
            ['Z / U', 'Undo last rating'],
            ['H / ?', 'Toggle this help'],
          ].map(([key, action]) => (
            <Table.Tr key={key}>
              <Table.Td>
                <Kbd size="xs">{key}</Kbd>
              </Table.Td>
              <Table.Td>{action}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.06em', marginTop: 8 }}>
        SRS RATINGS (after reveal)
      </Text>
      <Table striped highlightOnHover withTableBorder withColumnBorders fz="sm">
        <Table.Tbody>
          {[
            ['1', 'Again — Forgot / Incorrect'],
            ['2', 'Hard — Recalled with heavy effort'],
            ['3', 'Good — Recalled correctly'],
            ['4', 'Easy — Instantly recalled'],
          ].map(([key, action]) => (
            <Table.Tr key={key}>
              <Table.Td>
                <Kbd size="xs">{key}</Kbd>
              </Table.Td>
              <Table.Td>{action}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );

  // Determine card state color theme
  const stateBadgeProps =
    card.state === 'New'
      ? { color: 'blue', label: '✨ New Card' }
      : card.state === 'Learning' || card.state === 'Relearning'
        ? { color: 'orange', label: '⚡ Learning Step' }
        : { color: 'teal', label: '🧠 Due Review' };

  return (
    <Card
      ref={cardRef}
      className="glass-panel hover-lift"
      radius="xl"
      padding="md"
      p={{ base: 'md', sm: 'xl' }}
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
            {onRefreshQuiz && (
              <Tooltip
                label={
                  hasAddedWords
                    ? `${addedWordsCount} new due card${addedWordsCount > 1 ? 's' : ''} ready! Click to refresh.`
                    : 'Refresh review queue'
                }
                withArrow
              >
                <Indicator
                  disabled={!hasAddedWords}
                  color="violet"
                  size={10}
                  offset={2}
                  processing
                  styles={{
                    indicator: {
                      boxShadow:
                        '0 0 8px rgba(209, 192, 225, 0.9), 0 0 16px rgba(168, 85, 247, 0.6)',
                    },
                  }}
                >
                  <ActionIcon
                    variant="transparent"
                    color="violet"
                    size="sm"
                    radius="md"
                    onClick={onRefreshQuiz}
                    aria-label="Refresh review queue"
                  >
                    <IconRotateClockwise size={14} />
                  </ActionIcon>
                </Indicator>
              </Tooltip>
            )}
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
                    Reps: <RollingNumber value={card.reps ?? 0} />
                  </Badge>
                  <Badge
                    variant="outline"
                    color={card.lapses > 0 ? 'red' : 'gray'}
                    size="sm"
                    radius="md"
                  >
                    Lapses: <RollingNumber value={card.lapses ?? 0} />
                  </Badge>

                  {typeof card.stability === 'number' && card.stability > 0 && (
                    <Badge variant="outline" color="teal" size="sm" radius="md">
                      Stab:{' '}
                      {card.stability < 1 ? (
                        <RollingNumber value={Math.round(card.stability * 24)} suffix="h" />
                      ) : (
                        <RollingNumber value={card.stability} decimalScale={1} suffix="d" />
                      )}
                    </Badge>
                  )}

                  {typeof card.difficulty === 'number' && card.difficulty > 0 && (
                    <Badge variant="outline" color="orange" size="sm" radius="md">
                      Diff: <RollingNumber value={card.difficulty} decimalScale={1} suffix="/10" />
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

                  <CopyButton value={card.word} timeout={2000}>
                    {({ copied, copy }) => (
                      <WordActionIcon
                        label={copied ? 'Copied word to clipboard!' : 'Copy word'}
                        color={copied ? 'teal' : 'violet'}
                        variant="light"
                        size="lg"
                        radius="xl"
                        onClick={copy}
                        style={{
                          boxShadow: '0 4px 12px rgba(168, 85, 247, 0.2)',
                        }}
                      >
                        {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                      </WordActionIcon>
                    )}
                  </CopyButton>

                  {onEditWord && (
                    <WordActionIcon
                      label="Edit word"
                      color="violet"
                      variant="light"
                      size="lg"
                      radius="xl"
                      onClick={() => onEditWord(card.wordId)}
                      style={{
                        boxShadow: '0 4px 12px rgba(168, 85, 247, 0.2)',
                      }}
                    >
                      <IconEdit size={18} />
                    </WordActionIcon>
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
                    Show Answer{' '}
                    <Text span visibleFrom="sm" className="kbd-hint" inherit>
                      (Space)
                    </Text>
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

                  <CopyButton value={card.word} timeout={2000}>
                    {({ copied, copy }) => (
                      <WordActionIcon
                        label={copied ? 'Copied word to clipboard!' : 'Copy word'}
                        color={copied ? 'teal' : 'violet'}
                        variant="subtle"
                        size="sm"
                        radius="xl"
                        onClick={copy}
                      >
                        {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      </WordActionIcon>
                    )}
                  </CopyButton>

                  {onEditWord && (
                    <WordActionIcon
                      label="Edit word"
                      color="violet"
                      variant="subtle"
                      size="sm"
                      radius="xl"
                      onClick={() => onEditWord(card.wordId)}
                    >
                      <IconEdit size={16} />
                    </WordActionIcon>
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
        <Group
          justify="center"
          gap="lg"
          style={{ opacity: 0.65 }}
          wrap="wrap"
          visibleFrom="sm"
          className="kbd-hint"
        >
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
            <Text span fw={900} c="cyan.4">
              Escape
            </Text>{' '}
            Flip Back
          </Text>
          {onPronounce && (
            <Text size="xs" fw={700}>
              <Text span fw={900} c="violet.4">
                P
              </Text>{' '}
              Speak
            </Text>
          )}
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
          <Tooltip label="Show all keyboard shortcuts" withArrow>
            <Text
              size="xs"
              fw={700}
              c="indigo"
              style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
              onClick={() => setShowHelpModal(true)}
            >
              <Text span fw={900} c="indigo.4">
                H / ?
              </Text>{' '}
              Help
            </Text>
          </Tooltip>
        </Group>

        {/* Help Modal */}
        <Modal
          opened={showHelpModal}
          onClose={() => setShowHelpModal(false)}
          title={
            <Group gap="xs">
              <IconHelp size={18} color="#a855f7" />
              <Text fw={700} size="md">
                Keyboard Shortcuts
              </Text>
            </Group>
          }
          centered
          radius="lg"
          padding="lg"
          size="sm"
        >
          {helpModalContent}
        </Modal>
      </Stack>
    </Card>
  );
});
