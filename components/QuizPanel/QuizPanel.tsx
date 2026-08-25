import {
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  Kbd,
  Modal,
  Paper,
  Progress,
  RingProgress,
  RollingNumber,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowBackUp,
  IconAward,
  IconBookmark,
  IconBookmarkOff,
  IconBrain,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconCopy,
  IconEdit,
  IconNotes,
  IconRotateClockwise,
  IconTrash,
  IconVolume,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { quizDirections } from '@/app/home/constants';
import { DefinitionsDisplay } from '@/components/DefinitionsDisplay/DefinitionsDisplay';
import { RATING_BUTTON_INFO } from '@/components/FsrsReview';
import { RichNoteViewer } from '@/components/RichNoteViewer/RichNoteViewer';
import { WordActionIcon } from '@/components/WordActions/WordActionIcon';
import { WordFamilySection } from '@/components/WordFamily/WordFamilySection';
import type { FsrsRecord, WordDefinition, WordFamilyMemberRecord } from '@/lib/db';
import { normalizeDefinitions } from '@/lib/definitions';
import type { FsrsRating as SrsRating } from '@/lib/fsrs';
import { playReviewSound } from '@/lib/sound';
import { notifyQuizCompleted } from '@/lib/system-notifications';

export type QuizItem = {
  id: string;
  word: string;
  meaning: string;
  definitions?: WordDefinition[];
  tags?: string[];
  notes?: string;
  fsrsRecord?: FsrsRecord;
};

export type QuizDirection = 'wordToMeaning' | 'meaningToWord' | 'spelling';

type QuizPanelProps = {
  item: QuizItem | null;
  quizDirection: QuizDirection;
  revealed: boolean;
  onReveal: () => void;
  onMarkMissed: () => void;
  isMarkedMissed: boolean;
  onNext: () => void;
  onPrevious: () => void;
  completed: boolean;
  hasPrevious: boolean;
  currentIndex?: number;
  totalCount?: number;
  onRestart?: () => void;
  onRefreshExamples?: (id: string) => void;
  isGeneratingExamples?: boolean;
  autoPronounceWord?: boolean;
  /** Enable SRS rating mode — shows Again/Hard/Good/Easy buttons instead of bookmark */
  srsMode?: boolean;
  /** Called when user selects a rating in SRS mode */
  onSrsRate?: (rating: SrsRating) => void;
  /** Estimated next review interval per rating, e.g. { again: '1m', hard: '10m', good: '1d', easy: '4d' } */
  srsIntervals?: Partial<Record<SrsRating, string>>;
  onEditClick?: (id: string) => void;
  /** Called to delete FSRS record for selected quiz mode */
  onDeleteFsrsRecord?: (wordId: string, quizMode: QuizDirection) => void;
  canUndo?: boolean;
  onUndo?: () => void;
  wordFamilyMembers?: WordFamilyMemberRecord[];
  isGeneratingWordFamily?: boolean;
  onRefreshWordFamily?: (wordId: string, word: string) => void;
  onDeleteWordFamilyMember?: (memberId: string) => void;
};

export function QuizPanel({
  item,
  quizDirection,
  revealed,
  onReveal,
  onMarkMissed,
  isMarkedMissed,
  onNext,
  onPrevious,
  completed,
  hasPrevious,
  currentIndex = 0,
  totalCount = 0,
  onRestart,
  onRefreshExamples,
  isGeneratingExamples = false,
  autoPronounceWord = false,
  srsMode = false,
  onSrsRate,
  srsIntervals,
  onEditClick,
  onDeleteFsrsRecord,
  canUndo,
  onUndo,
  wordFamilyMembers = [],
  isGeneratingWordFamily = false,
  onRefreshWordFamily,
  onDeleteWordFamilyMember,
}: QuizPanelProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [typedWord, setTypedWord] = useState('');
  const [spellingState, setSpellingState] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [showUserExamples, setShowUserExamples] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [confirmDeleteFsrsOpened, setConfirmDeleteFsrsOpened] = useState(false);
  const quizPanelRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Z / U to undo last rating action
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') {
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

  const completionNotifiedRef = useRef(false);
  useEffect(() => {
    if (completed && totalCount > 0 && !completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      void notifyQuizCompleted({
        modeName: quizDirections[quizDirection],
        totalCards: totalCount,
      });
    } else if (!completed) {
      completionNotifiedRef.current = false;
    }
  }, [completed, totalCount, quizDirection]);

  const lastAutoPronouncedKeyRef = useRef<string | null>(null);

  const scrollToCenter = useCallback(() => {
    if (quizPanelRef.current) {
      const yOffset = -20;
      const element = quizPanelRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleSpeak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    if (!item || completed) {
      return;
    }

    const shouldAutoSpeak =
      (quizDirection === 'spelling' && !revealed) ||
      (autoPronounceWord &&
        (quizDirection === 'wordToMeaning' || (quizDirection === 'meaningToWord' && revealed)));

    if (!shouldAutoSpeak) {
      return;
    }

    const key = `${item.id}:${quizDirection}:${revealed ? 'revealed' : 'hidden'}`;
    if (lastAutoPronouncedKeyRef.current === key) {
      return;
    }

    const timer = setTimeout(() => {
      lastAutoPronouncedKeyRef.current = key;
      handleSpeak(item.word);
    }, 300);

    return () => clearTimeout(timer);
  }, [autoPronounceWord, completed, handleSpeak, item, quizDirection, revealed]);

  // Reset spelling state and scroll to top of quiz section on new item or direction change
  useEffect(() => {
    setSpellingState('idle');
    setTypedWord('');
    setShowUserExamples(false);
    setShowNotes(false);
    scrollToCenter();
  }, [item?.id, quizDirection, scrollToCenter]);

  const handleCheckSpelling = useCallback(() => {
    if (!item) {
      return;
    }
    const isCorrect = typedWord.trim().toLowerCase() === item.word.trim().toLowerCase();
    setSpellingState(isCorrect ? 'correct' : 'incorrect');
    if (!isCorrect && !isMarkedMissed) {
      onMarkMissed();
    }
    onReveal();
  }, [item, typedWord, isMarkedMissed, onMarkMissed, onReveal]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (revealed || completed) {
        return;
      }

      if (key === 'Backspace') {
        setTypedWord((prev) => prev.slice(0, -1));
      } else if (key === 'Clear') {
        setTypedWord('');
      } else if (key === 'Space') {
        setTypedWord((prev) => `${prev} `);
      } else if (key === 'Enter') {
        handleCheckSpelling();
      } else if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
        if (typedWord.length < 30) {
          setTypedWord((prev) => prev + key.toLowerCase());
        }
      }
    },
    [revealed, completed, typedWord, handleCheckSpelling]
  );

  // Keyboard listener for PC users
  useEffect(() => {
    if (quizDirection !== 'spelling' || revealed || completed) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          activeEl.hasAttribute('contenteditable')
        ) {
          return;
        }
      }

      const key = event.key;
      if (key === 'Backspace') {
        event.preventDefault();
        handleKeyPress('Backspace');
      } else if (key === ' ') {
        event.preventDefault();
        handleKeyPress('Space');
      } else if (key === 'Enter') {
        event.preventDefault();
        handleKeyPress('Enter');
      } else if (/^[a-zA-Z]$/.test(key)) {
        event.preventDefault();
        handleKeyPress(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [quizDirection, revealed, completed, handleKeyPress]);

  const KEYBOARD_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ];

  if (completed) {
    return (
      <Card
        className="glass-panel animate-float"
        radius="lg"
        padding="xl"
        style={{
          textAlign: 'center',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          background: 'rgba(99, 102, 241, 0.05)',
        }}
      >
        <Stack gap="xl" align="center" py="lg">
          <RingProgress
            size={120}
            roundCaps
            thickness={8}
            sections={[{ value: 100, color: 'indigo' }]}
            label={
              <Group justify="center">
                <IconAward size={48} style={{ color: '#6366f1' }} />
              </Group>
            }
          />

          <Stack gap="xs">
            <Title order={2} className="text-gradient" style={{ fontFamily: 'var(--font-title)' }}>
              Quiz Completed!
            </Title>
            <Text
              component="div"
              c="dimmed"
              size="sm"
              style={{ maxWidth: '360px', margin: '0 auto', lineHeight: 1.6 }}
            >
              {totalCount > 0 ? (
                <>
                  Fantastic effort! You&apos;ve mastered all <RollingNumber value={totalCount} />{' '}
                  words selected for this session. Repetition is key to long-term memory.
                </>
              ) : (
                'No vocabulary cards are available for this session.'
              )}
            </Text>
          </Stack>

          {onRestart && totalCount > 0 && (
            <Group justify="center" mt="md">
              <Button
                onClick={onRestart}
                className="btn-premium btn-pulse"
                size="md"
                radius="md"
                leftSection={<IconRotateClockwise size={18} />}
              >
                Restart Session
              </Button>
            </Group>
          )}
        </Stack>
      </Card>
    );
  }

  if (!item) {
    return (
      <Card className="glass-panel" radius="lg" padding="xl" style={{ textAlign: 'center' }}>
        <Text c="dimmed" style={{ fontStyle: 'italic' }}>
          No vocabulary cards are available in the selected date range.
        </Text>
      </Card>
    );
  }

  const progressPercent =
    totalCount > 0 ? ((currentIndex + (revealed ? 1 : 0)) / totalCount) * 100 : 0;
  const definitions = normalizeDefinitions(item?.definitions, item.meaning);
  const allUserExamples = definitions.flatMap((definition) => definition.userExamples);
  const isWordToMeaning = quizDirection === 'wordToMeaning';

  const userExamplesBlock =
    showUserExamples && allUserExamples.length > 0 ? (
      <Stack gap={2}>
        <Text size="xs" fw={600} c="dimmed" style={{ textAlign: 'center' }}>
          My Examples
        </Text>
        <ScrollArea.Autosize mah={250} offsetScrollbars scrollbarSize={8} scrollHideDelay={500}>
          {allUserExamples.map((example, index) => (
            <Text
              key={`${item.id}-quiz-user-example-${index}`}
              size="sm"
              style={{
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                wordBreak: 'break-word',
                display: 'flex',
              }}
            >
              • {example}
            </Text>
          ))}
        </ScrollArea.Autosize>
      </Stack>
    ) : null;

  const showUserExamplesButton =
    allUserExamples.length > 0 ? (
      <Button
        variant="outline"
        color="grape"
        size="sm"
        radius="md"
        leftSection={<IconNotes size={16} />}
        onClick={() => setShowUserExamples((prev) => !prev)}
      >
        {showUserExamples ? 'Hide My Examples' : 'Show My Examples'}
      </Button>
    ) : null;

  const tagsBlock =
    item.tags && item.tags.length > 0 ? (
      <Group gap="xs" justify="center" mt="sm">
        {item.tags.map((tag) => (
          <Badge key={tag} variant="light" color="grape" radius="sm">
            {tag}
          </Badge>
        ))}
      </Group>
    ) : null;

  const markMissedAction = (
    <WordActionIcon
      label={isMarkedMissed ? 'Unmark missed' : 'Mark as missed'}
      color={isMarkedMissed ? 'teal' : 'red'}
      size="lg"
      onClick={onMarkMissed}
      withArrow={false}
    >
      {isMarkedMissed ? <IconBookmark size={20} /> : <IconBookmarkOff size={20} />}
    </WordActionIcon>
  );

  // Review rating bar — shown after reveal in review mode (Anki + RemNote inspired)
  const srsRatingButtons =
    srsMode && revealed && onSrsRate ? (
      <Stack gap="xs" align="center" style={{ width: '100%' }}>
        <Group gap={6} align="center" mb={2}>
          <IconBrain size={15} style={{ color: '#a855f7' }} />
          <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.06em' }}>
            HOW WELL DID YOU RECALL THIS?
          </Text>
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs" style={{ width: '100%' }}>
          {RATING_BUTTON_INFO.map(
            ({ rating, label, shortcut, color, className, situation, description }) => {
              const intervalText = srsIntervals?.[rating];

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
                    onClick={() => {
                      playReviewSound(rating);
                      onSrsRate(rating);
                      scrollToCenter();
                    }}
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
    ) : null;

  const fsrsRecord =
    item?.fsrsRecord ||
    (srsMode
      ? {
          state: 'New' as const,
          reps: 0,
          lapses: 0,
          stability: 0,
          difficulty: 0,
        }
      : undefined);

  const fsrsMetaBar = (
    <Group justify="center" gap={6} wrap="wrap" mb={4}>
      {fsrsRecord && (
        <>
          <Badge
            variant="light"
            color={
              fsrsRecord.state === 'New'
                ? 'blue'
                : fsrsRecord.state === 'Learning' || fsrsRecord.state === 'Relearning'
                  ? 'orange'
                  : 'teal'
            }
            size="sm"
            radius="md"
            style={{ fontWeight: 800 }}
          >
            {fsrsRecord.state === 'New'
              ? '✨ New'
              : fsrsRecord.state === 'Learning' || fsrsRecord.state === 'Relearning'
                ? '⚡ Learning'
                : '🧠 Review'}
          </Badge>
          <Badge variant="outline" color="violet" size="sm" radius="md">
            Reps: <RollingNumber value={fsrsRecord.reps ?? 0} />
          </Badge>
          <Badge
            variant="outline"
            color={fsrsRecord.lapses > 0 ? 'red' : 'gray'}
            size="sm"
            radius="md"
          >
            Lapses: <RollingNumber value={fsrsRecord.lapses ?? 0} />
          </Badge>

          {typeof fsrsRecord.stability === 'number' && fsrsRecord.stability > 0 && (
            <Badge variant="outline" color="teal" size="sm" radius="md">
              Stab:{' '}
              {fsrsRecord.stability < 1 ? (
                <RollingNumber value={Math.round(fsrsRecord.stability * 24)} suffix="h" />
              ) : (
                <RollingNumber value={fsrsRecord.stability} decimalScale={1} suffix="d" />
              )}
            </Badge>
          )}

          {typeof fsrsRecord.difficulty === 'number' && fsrsRecord.difficulty > 0 && (
            <Badge variant="outline" color="orange" size="sm" radius="md">
              Diff: <RollingNumber value={fsrsRecord.difficulty} decimalScale={1} suffix="/10" />
            </Badge>
          )}
        </>
      )}

      {onRefreshExamples && item && (
        <Tooltip label="Regenerate AI examples" withArrow>
          <Button
            variant="light"
            color="indigo"
            size="xs"
            radius="md"
            leftSection={<IconRotateClockwise size={14} />}
            onClick={() => onRefreshExamples(item.id)}
            style={{ fontWeight: 800, height: 22, paddingLeft: 8, paddingRight: 8 }}
          >
            Regenerate Examples
          </Button>
        </Tooltip>
      )}

      {canUndo && onUndo && (
        <Tooltip label="Undo last card rating" withArrow>
          <Button
            variant="light"
            color="grape"
            size="xs"
            radius="md"
            leftSection={<IconArrowBackUp size={14} />}
            onClick={() => {
              onUndo();
              scrollToCenter();
            }}
            style={{ fontWeight: 800, height: 22, paddingLeft: 8, paddingRight: 8 }}
          >
            Undo Rating
          </Button>
        </Tooltip>
      )}
    </Group>
  );

  const wordWithActions = (includeMissed: boolean) => (
    <Stack gap="xs" align="center" style={{ width: '100%' }}>
      {fsrsMetaBar}
      <Group gap="sm" align="center" justify="center" wrap="wrap">
        <Title
          order={1}
          style={{
            fontFamily: 'var(--font-title)',
            fontSize: 'clamp(1.6rem, 5vw, 2.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            wordBreak: 'break-word',
          }}
        >
          {item.word}
        </Title>
        <Group gap={6}>
          <WordActionIcon
            label="Speak pronunciation"
            color={isPlayingAudio ? 'indigo' : 'gray'}
            size="lg"
            onClick={() => handleSpeak(item.word)}
            withArrow={false}
          >
            <IconVolume size={20} />
          </WordActionIcon>
          <WordActionIcon
            label="Copy word"
            size="lg"
            onClick={() => navigator.clipboard.writeText(item.word)}
            withArrow={false}
          >
            <IconCopy size={20} />
          </WordActionIcon>
          {onEditClick && (
            <WordActionIcon
              label="Edit word"
              size="lg"
              onClick={() => onEditClick(item.id)}
              withArrow={false}
            >
              <IconEdit size={20} />
            </WordActionIcon>
          )}
          {onDeleteFsrsRecord && (
            <WordActionIcon
              label="Delete FSRS record for this quiz mode"
              color="red"
              onClick={() => setConfirmDeleteFsrsOpened(true)}
              withArrow={false}
            >
              <IconTrash size={20} />
            </WordActionIcon>
          )}
          {includeMissed && markMissedAction}
        </Group>
      </Group>
    </Stack>
  );

  const examplesGenerationIndicator = isGeneratingExamples ? (
    <Text size="xs" c="dimmed" ta="center">
      Generating examples...
    </Text>
  ) : null;

  const renderDefinitionsBlock = (showExamples: boolean) => (
    <DefinitionsDisplay
      definitions={definitions}
      showExamples={showExamples}
      align="center"
      meaningSize="lg"
      maxWidth={620}
      emptyText="No definition available."
    />
  );

  // In meaningToWord mode the definition is shown as the *question*, before the word is
  // revealed — examples must stay hidden then since they'd give the word away. Everywhere
  // else the word is already visible, so examples can be shown alongside the definitions.
  const definitionsBlock = renderDefinitionsBlock(true);
  const definitionsBlockNoSpoilers = renderDefinitionsBlock(false);

  const hasNotes = Boolean(
    item?.notes &&
    item.notes.trim() !== '' &&
    item.notes.trim() !== '<p></p>' &&
    item.notes.trim() !== '<p><br></p>'
  );

  const noteBlock = hasNotes ? (
    <Stack gap="xs" align="center" style={{ width: '100%', maxWidth: 620 }}>
      <Button
        variant="subtle"
        color="grape"
        size="xs"
        radius="md"
        leftSection={<IconNotes size={14} />}
        rightSection={showNotes ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        onClick={() => setShowNotes((prev) => !prev)}
        style={{ fontWeight: 600, height: 26, paddingLeft: 8, paddingRight: 8 }}
      >
        {showNotes ? 'Hide Note' : 'Show Note'}
      </Button>

      <Collapse expanded={showNotes} style={{ width: '100%' }}>
        <Paper
          p="sm"
          radius="md"
          style={{
            background: 'rgba(168, 85, 247, 0.05)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            width: '100%',
          }}
        >
          <RichNoteViewer content={item?.notes || ''} />
        </Paper>
      </Collapse>
    </Stack>
  ) : null;

  const familyWordsBlock = item ? (
    <div style={{ width: '100%', maxWidth: 620 }}>
      <WordFamilySection
        wordId={item.id}
        word={item.word}
        members={wordFamilyMembers}
        isLoading={isGeneratingWordFamily}
        onRefresh={onRefreshWordFamily}
        onDeleteMember={onDeleteWordFamilyMember}
      />
    </div>
  ) : null;

  const revealButton = (
    <Button
      variant="light"
      color="indigo"
      onClick={() => {
        onReveal();
        scrollToCenter();
        setShowUserExamples(() => false);
      }}
      size="lg"
      radius="md"
      className="btn-pulse"
      disabled={!isWordToMeaning && definitions.length === 0}
      rightSection={
        <Kbd size="xs" style={{ opacity: 0.85, fontSize: '0.68rem', padding: '2px 6px' }}>
          Space
        </Kbd>
      }
      style={{
        height: '60px',
        fontSize: '1rem',
        fontWeight: 600,
        transition: 'all 0.2s ease',
      }}
    >
      {isWordToMeaning ? 'Show Definition' : 'Show Word'}
    </Button>
  );

  // const answerCard = (children: ReactNode) => (
  //     <Card
  //         radius="md"
  //         padding="md"
  //         style={{
  //             background: 'rgba(99, 102, 241, 0.05)',
  //             border: '1px solid rgba(99, 102, 241, 0.15)',
  //             minHeight: '60px',
  //             width: '100%',
  //             animation: 'pulse 0.3s ease-out',
  //         }}
  //     >
  //         <Stack gap="sm" style={{width: '100%'}} align="center">
  //             {children}
  //         </Stack>
  //     </Card>
  // );

  return (
    <Card ref={quizPanelRef} className="glass-panel" radius="lg" padding="xl">
      <Stack gap="xl">
        {totalCount > 0 && (
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="xs" fw={700} c="indigo">
                SESSION PROGRESS
              </Text>
              <Text component="div" size="xs" fw={700} c="dimmed">
                <RollingNumber value={Math.min(currentIndex + 1, totalCount)} /> of{' '}
                <RollingNumber value={totalCount} /> Words
              </Text>
            </Group>
            <Progress
              value={progressPercent}
              size="sm"
              radius="xl"
              color="indigo"
              animated
              style={{ background: 'rgba(99, 102, 241, 0.1)' }}
            />
          </Stack>
        )}

        <div style={{ perspective: '1200px', width: '100%' }}>
          <motion.div
            key={`${item.id}-${quizDirection}`}
            initial={false}
            animate={{ rotateY: revealed ? 180 : 0 }}
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
            }}
          >
            {/* FRONT FACE (UNREVEALED) */}
            <div
              style={{
                gridArea: '1 / 1',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)',
                pointerEvents: revealed ? 'none' : 'auto',
                width: '100%',
              }}
            >
              <Stack
                gap="md"
                align="center"
                style={{ minHeight: '160px', justifyContent: 'center', width: '100%' }}
              >
                {quizDirection === 'wordToMeaning' && (
                  <>
                    {wordWithActions(true)}
                    {showUserExamplesButton}
                    {userExamplesBlock}
                    {examplesGenerationIndicator}
                    {revealButton}
                  </>
                )}

                {quizDirection === 'meaningToWord' && (
                  <>
                    {fsrsMetaBar}
                    {definitionsBlockNoSpoilers}
                    {showUserExamplesButton}
                    {userExamplesBlock}
                    {examplesGenerationIndicator}
                    {revealButton}
                  </>
                )}

                {quizDirection === 'spelling' && (
                  <Stack gap="md" align="center" style={{ width: '100%' }}>
                    <Card
                      radius="md"
                      padding="md"
                      style={{
                        background: 'rgba(99, 102, 241, 0.05)',
                        border: '1px solid rgba(99, 102, 241, 0.15)',
                        width: '100%',
                        maxWidth: '300px',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleSpeak(item.word)}
                      className="hover-lift"
                    >
                      <Group gap="sm" justify="center">
                        <WordActionIcon
                          label="Speak pronunciation"
                          variant="gradient"
                          gradient={{ from: 'indigo', to: 'purple' }}
                          color={isPlayingAudio ? 'indigo' : 'gray'}
                          size="lg"
                          withArrow={false}
                        >
                          <IconVolume size={20} />
                        </WordActionIcon>
                        <Text fw={600} size="sm" c="indigo">
                          {isPlayingAudio ? 'Speaking...' : 'Listen to Word'}
                        </Text>
                      </Group>
                    </Card>

                    {definitionsBlockNoSpoilers}

                    <TextInput
                      value={typedWord}
                      readOnly
                      placeholder="Listen and type..."
                      size="lg"
                      radius="md"
                      style={{ width: '100%', maxWidth: '300px' }}
                      styles={{
                        input: {
                          textAlign: 'center',
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          backgroundColor: 'rgba(0, 0, 0, 0.03)',
                          color: 'var(--text-primary)',
                          cursor: 'default',
                          borderColor: '#6366f1',
                          borderStyle: 'dashed',
                        },
                      }}
                    />

                    <Text size="xs" c="dimmed" style={{ textAlign: 'center' }}>
                      Type using physical keyboard or screen keys below.
                    </Text>

                    <Stack
                      gap="xs"
                      style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}
                      mt="xs"
                    >
                      {KEYBOARD_ROWS.map((row, rowIndex) => (
                        <Group key={rowIndex} gap="xs" justify="center" wrap="nowrap">
                          {row.map((key) => (
                            <Button
                              key={key}
                              variant="light"
                              color="gray"
                              onClick={() => handleKeyPress(key)}
                              style={{
                                flex: 1,
                                minWidth: '24px',
                                maxWidth: '40px',
                                height: '40px',
                                padding: 0,
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                borderRadius: '6px',
                                border: '1px solid var(--card-border)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                transition: 'all 0.1s ease',
                              }}
                              className="hover-lift"
                            >
                              {key}
                            </Button>
                          ))}
                        </Group>
                      ))}
                      <Group gap="xs" justify="center" wrap="nowrap">
                        <Button
                          variant="light"
                          color="red"
                          onClick={() => handleKeyPress('Clear')}
                          style={{
                            height: '40px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                          }}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="light"
                          color="gray"
                          onClick={() => handleKeyPress('Space')}
                          style={{
                            height: '40px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                          }}
                        >
                          Space
                        </Button>
                        <Button
                          variant="light"
                          color="orange"
                          onClick={() => handleKeyPress('Backspace')}
                          style={{
                            height: '40px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            borderRadius: '6px',
                          }}
                        >
                          Delete
                        </Button>
                      </Group>
                    </Stack>

                    <Button
                      variant="gradient"
                      gradient={{ from: 'indigo', to: 'purple' }}
                      onClick={() => {
                        handleCheckSpelling();
                        scrollToCenter();
                      }}
                      size="lg"
                      radius="md"
                      className="btn-pulse btn-premium"
                      disabled={typedWord.trim().length === 0}
                      style={{
                        height: '50px',
                        fontSize: '1rem',
                        fontWeight: 600,
                        width: '100%',
                        maxWidth: '300px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Check Spelling
                    </Button>
                  </Stack>
                )}
              </Stack>
            </div>

            {/* BACK FACE (REVEALED) */}
            <div
              style={{
                gridArea: '1 / 1',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                pointerEvents: revealed ? 'auto' : 'none',
                width: '100%',
              }}
            >
              <Stack
                gap="md"
                align="center"
                style={{ minHeight: '160px', justifyContent: 'center', width: '100%' }}
              >
                {quizDirection === 'wordToMeaning' && (
                  <>
                    {wordWithActions(true)}
                    {definitionsBlock}
                    {noteBlock}
                    {familyWordsBlock}
                    {tagsBlock}
                    {srsRatingButtons}
                  </>
                )}

                {quizDirection === 'meaningToWord' && (
                  <Stack gap="md" align="center" style={{ width: '100%' }}>
                    {definitionsBlock}
                    {wordWithActions(true)}
                    {noteBlock}
                    {familyWordsBlock}
                    {tagsBlock}
                    {srsRatingButtons}
                  </Stack>
                )}

                {quizDirection === 'spelling' && (
                  <Stack gap="md" align="center" style={{ width: '100%' }}>
                    {spellingState === 'correct' ? (
                      <Stack gap="xs" align="center" style={{ width: '100%' }}>
                        <Text
                          fw={800}
                          c="green.6"
                          size="xl"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '1.5rem',
                          }}
                        >
                          Correct! 🎉
                        </Text>
                        <Text size="md" c="dimmed" style={{ textAlign: 'center' }}>
                          You spelled{' '}
                          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                            {item.word}
                          </span>{' '}
                          correctly.
                        </Text>
                      </Stack>
                    ) : (
                      <Stack gap="xs" align="center" style={{ width: '100%' }}>
                        <Text
                          fw={800}
                          c="red.6"
                          size="xl"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '1.5rem',
                          }}
                        >
                          Incorrect ❌
                        </Text>
                        <Text size="md" c="dimmed" style={{ textAlign: 'center' }}>
                          Your spelling:{' '}
                          <span
                            style={{
                              color: 'var(--text-primary)',
                              textDecoration: 'line-through',
                              fontWeight: 600,
                            }}
                          >
                            {typedWord || '(empty)'}
                          </span>
                        </Text>
                        <Text size="md" c="dimmed" style={{ textAlign: 'center' }}>
                          Correct spelling:{' '}
                          <span style={{ color: '#22c55e', fontWeight: 800, fontSize: '1.25rem' }}>
                            {item.word}
                          </span>
                        </Text>
                      </Stack>
                    )}

                    <Divider style={{ width: '100%', borderColor: 'var(--card-border)' }} />

                    <Stack gap="md" align="center" style={{ width: '100%' }}>
                      {wordWithActions(true)}
                      {definitionsBlock}
                      {noteBlock}
                      {familyWordsBlock}
                      {tagsBlock}
                      {srsRatingButtons}
                    </Stack>
                  </Stack>
                )}
              </Stack>
            </div>
          </motion.div>
        </div>

        <Group justify="space-between" mt="sm">
          <Button
            variant="subtle"
            color="gray"
            onClick={() => {
              onPrevious();
              scrollToCenter();
            }}
            disabled={!hasPrevious}
            radius="md"
            leftSection={<IconChevronLeft size={18} />}
          >
            Back
          </Button>

          <Button
            onClick={() => {
              onNext();
              scrollToCenter();
            }}
            className="btn-premium"
            radius="md"
            rightSection={<IconChevronRight size={18} />}
          >
            {currentIndex + 1 >= totalCount ? 'Complete Session' : 'Next Word'}
          </Button>
        </Group>

        <Modal
          opened={confirmDeleteFsrsOpened}
          onClose={() => setConfirmDeleteFsrsOpened(false)}
          title={
            <Group gap="xs">
              <IconTrash size={20} color="#ef4444" />
              <Text fw={700} size="md">
                Delete FSRS Record
              </Text>
            </Group>
          }
          centered
          radius="lg"
          padding="lg"
        >
          <Stack gap="md">
            <Text size="sm">
              Are you sure you want to delete the FSRS record for <b>"{item?.word}"</b> in{' '}
              <b>{quizDirections[quizDirection]}</b> mode?
            </Text>
            <Text size="xs" c="dimmed">
              This will remove this card from your FSRS review queue for this mode and soft-delete
              its FSRS learning history.
            </Text>
            <Group justify="flex-end" gap="xs" mt="sm">
              <Button
                variant="default"
                radius="md"
                onClick={() => setConfirmDeleteFsrsOpened(false)}
              >
                Cancel
              </Button>
              <Button
                color="red"
                radius="md"
                onClick={() => {
                  setConfirmDeleteFsrsOpened(false);
                  if (item && onDeleteFsrsRecord) {
                    onDeleteFsrsRecord(item.id, quizDirection);
                  }
                }}
              >
                Delete Record
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Card>
  );
}
