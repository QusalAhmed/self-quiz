import {
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  Indicator,
  Kbd,
  Modal,
  Paper,
  Progress,
  RingProgress,
  RollingNumber,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowBackUp,
  IconAward,
  IconBrain,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconHelp,
  IconNotes,
  IconRotateClockwise,
  IconTrash,
  IconVolume,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { quizDirections } from '@/app/home/constants';
import { DefinitionsDisplay } from '@/components/DefinitionsDisplay/DefinitionsDisplay';
import { RATING_BUTTON_INFO } from '@/components/FsrsReview';
import { RichNoteViewer } from '@/components/RichNoteViewer/RichNoteViewer';
import { WordActionIcon, WordActionMenu } from '@/components/WordActions';
import { WordFamilySection } from '@/components/WordFamily/WordFamilySection';
import type { FsrsRecord, WordDefinition, WordFamilyMemberRecord } from '@/lib/db';
import { normalizeDefinitions } from '@/lib/definitions';
import type { FsrsRating as SrsRating } from '@/lib/fsrs';
import { getAppSettings } from '@/lib/settings';
import { playReviewSound, playWordAudio } from '@/lib/sound';
import { notifyQuizCompleted } from '@/lib/system-notifications';

export type QuizItem = {
  id: string;
  word: string;
  meaning: string;
  definitions?: WordDefinition[];
  tags?: string[];
  notes?: string;
  fsrsRecord?: FsrsRecord;
  audioUrl?: string;
  phonetic?: string;
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
  hasAddedWords?: boolean;
  addedWordsCount?: number;
  wordFamilyMembers?: WordFamilyMemberRecord[];
  isGeneratingWordFamily?: boolean;
  onRefreshWordFamily?: (wordId: string, word: string) => void;
  onDeleteWordFamilyMember?: (memberId: string) => void;
};

export const QuizPanel = memo(function QuizPanel({
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
  hasAddedWords = false,
  addedWordsCount: _addedWordsCount = 0,
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
  const [showHelpModal, setShowHelpModal] = useState(false);
  const quizPanelRef = useRef<HTMLDivElement>(null);

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

  /**
   * Positions the quiz section:
   * - Vertically centered in the viewport if it fits on screen.
   * - At the top of the viewport if it is taller than the screen.
   */
  const positionQuizSection = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (typeof window === 'undefined') {
      return;
    }

    requestAnimationFrame(() => {
      const element = quizPanelRef.current;
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const elementHeight = rect.height;
      const viewportHeight = window.innerHeight;
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
      const elementAbsoluteTop = rect.top + currentScrollY;

      // Top margin buffer for comfort
      const TOP_PADDING = 20;

      let targetScrollY: number;

      // If the quiz section fits vertically within the screen
      if (elementHeight + TOP_PADDING * 2 <= viewportHeight) {
        // Center the quiz section vertically in the viewport
        const verticalCenterMargin = (viewportHeight - elementHeight) / 2;
        targetScrollY = elementAbsoluteTop - verticalCenterMargin;
      } else {
        // Does not fit on screen -> align to the top of the viewport
        targetScrollY = elementAbsoluteTop - TOP_PADDING;
      }

      targetScrollY = Math.max(0, targetScrollY);

      if (Math.abs(currentScrollY - targetScrollY) > 5) {
        window.scrollTo({ top: targetScrollY, behavior });
      }
    });
  }, []);

  /**
   * Ref that always holds the latest values needed by the keyboard shortcut handler.
   * Updated synchronously each render so the stable handler closure can read current values
   * without being re-registered on every state change.
   */
  const kbStateRef = useRef({
    canUndo: false as boolean | undefined,
    onUndo: undefined as (() => void) | undefined,
    completed: false,
    item: null as QuizItem | null,
    revealed: false,
    srsMode: false,
    onSrsRate: undefined as ((r: SrsRating) => void) | undefined,
    onReveal: () => {},
    onNext: () => {},
    hasPrevious: false,
    onPrevious: () => {},
    onMarkMissed: () => {},
    onRestart: undefined as (() => void) | undefined,
    quizDirection: 'wordToMeaning' as QuizDirection,
    hasNotes: false,
    hasExamples: false,
  });

  // Sync ref each render (no cost, no re-subscription)
  kbStateRef.current = {
    canUndo,
    onUndo,
    completed,
    item,
    revealed,
    srsMode,
    onSrsRate,
    onReveal,
    onNext,
    hasPrevious,
    onPrevious,
    onMarkMissed,
    onRestart,
    quizDirection,
    // hasNotes and hasExamples are filled in later each render after the values are computed;
    // they start as false and are patched below.
    hasNotes: false,
    hasExamples: false,
  };

  // Keyboard shortcut listener across all quiz interactions
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

      const {
        canUndo: _canUndo,
        onUndo: _onUndo,
        completed: _completed,
        item: _item,
        revealed: _revealed,
        srsMode: _srsMode,
        onSrsRate: _onSrsRate,
        onReveal: _onReveal,
        onNext: _onNext,
        hasPrevious: _hasPrevious,
        onPrevious: _onPrevious,
        onMarkMissed: _onMarkMissed,
        onRestart: _onRestart,
        quizDirection: _quizDirection,
        hasNotes: _hasNotes,
        hasExamples: _hasExamples,
      } = kbStateRef.current;

      // Help modal: H or ?
      if (event.key === 'h' || event.key === 'H' || event.key === '?') {
        event.preventDefault();
        setShowHelpModal((prev) => !prev);
        return;
      }

      // Undo shortcut: Z / U
      if (
        _canUndo &&
        _onUndo &&
        (event.key === 'z' || event.key === 'Z' || event.key === 'u' || event.key === 'U')
      ) {
        event.preventDefault();
        _onUndo();
        positionQuizSection();
        return;
      }

      // Restart shortcut on completion screen: R
      if (_completed && _onRestart && (event.key === 'r' || event.key === 'R')) {
        event.preventDefault();
        _onRestart();
        return;
      }

      if (_completed || !_item) {
        return;
      }

      // Pronounce word: P
      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        handleSpeakRef.current(_item.word, _item.audioUrl);
        return;
      }

      // Space: Reveal answer if hidden, or Next if revealed in standard mode
      if (event.key === ' ' || event.code === 'Space') {
        if (!_revealed) {
          event.preventDefault();
          _onReveal();
          positionQuizSection();
          return;
        } else if (!_srsMode) {
          event.preventDefault();
          _onNext();
          positionQuizSection();
          return;
        }
      }

      // Enter: Next card (alternative to Space) — only after reveal in standard mode
      if (event.key === 'Enter' && _revealed && !_srsMode) {
        event.preventDefault();
        _onNext();
        positionQuizSection();
        return;
      }

      // Escape: flip card back (un-reveal) when revealed
      if (event.key === 'Escape') {
        if (_revealed && _quizDirection !== 'spelling') {
          event.preventDefault();
          _onReveal();
        }
        return;
      }

      // Mark as Missed: M (standard mode only, not SRS)
      if (!_srsMode && (event.key === 'm' || event.key === 'M')) {
        event.preventDefault();
        _onMarkMissed();
        return;
      }

      // Toggle Notes: N (when notes are available, after reveal)
      if (_revealed && _hasNotes && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault();
        setShowNotes((prev) => !prev);
        positionQuizSection();
        return;
      }

      // Toggle My Examples: E
      if (_hasExamples && (event.key === 'e' || event.key === 'E')) {
        event.preventDefault();
        setShowUserExamples((prev) => !prev);
        positionQuizSection();
        return;
      }

      // SRS Rating shortcuts: 1, 2, 3, 4
      if (_srsMode && _revealed && _onSrsRate) {
        if (event.key === '1') {
          event.preventDefault();
          playReviewSound('again');
          _onSrsRate('again');
          positionQuizSection();
          return;
        }
        if (event.key === '2') {
          event.preventDefault();
          playReviewSound('hard');
          _onSrsRate('hard');
          positionQuizSection();
          return;
        }
        if (event.key === '3') {
          event.preventDefault();
          playReviewSound('good');
          _onSrsRate('good');
          positionQuizSection();
          return;
        }
        if (event.key === '4') {
          event.preventDefault();
          playReviewSound('easy');
          _onSrsRate('easy');
          positionQuizSection();
          return;
        }
      }

      // Navigation shortcuts
      if (event.key === 'ArrowRight' && _revealed && !_srsMode) {
        event.preventDefault();
        _onNext();
        positionQuizSection();
        return;
      }
      if (event.key === 'ArrowLeft' && _hasPrevious) {
        event.preventDefault();
        _onPrevious();
        positionQuizSection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionQuizSection]);

  const handleSpeak = useCallback((text: string, audioUrl?: string) => {
    const settings = getAppSettings();
    if (audioUrl && settings.audio.preferMwAudioOverTts !== false) {
      setIsPlayingAudio(true);
      playWordAudio(audioUrl, settings.audio.audioVolume ?? 1, () => {
        setIsPlayingAudio(false);
      });
      return;
    }

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

  /** Stable ref to handleSpeak for use inside keyboard handler */
  const handleSpeakRef = useRef(handleSpeak);
  handleSpeakRef.current = handleSpeak;
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
      handleSpeak(item.word, item.audioUrl);
    }, 300);

    return () => clearTimeout(timer);
  }, [autoPronounceWord, completed, handleSpeak, item, quizDirection, revealed]);

  // Reset spelling state and position quiz section on new item, direction change, or reveal
  useEffect(() => {
    setSpellingState('idle');
    setTypedWord('');
    setShowUserExamples(false);
    setShowNotes(false);
    positionQuizSection();
  }, [item?.id, quizDirection, positionQuizSection]);

  useEffect(() => {
    positionQuizSection();
  }, [revealed, positionQuizSection]);

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

  // Keyboard shortcut help content
  const helpModalContent = (
    <Stack gap="xs">
      <Text size="xs" c="dimmed" fw={700} style={{ letterSpacing: '0.06em' }}>
        GENERAL
      </Text>
      <Table striped highlightOnHover withTableBorder withColumnBorders fz="sm">
        <Table.Tbody>
          {[
            ['Space', 'Reveal answer / Next card'],
            ['Enter', 'Next card (after reveal, standard mode)'],
            ['← / →', 'Previous / Next card'],
            ['Escape', 'Flip card back to front'],
            ['P', 'Pronounce the word'],
            ['M', 'Toggle Mark as Missed (standard mode)'],
            ['N', 'Toggle Notes panel (after reveal)'],
            ['E', 'Toggle My Examples'],
            ['Z / U', 'Undo last rating'],
            ['R', 'Restart session (completion screen)'],
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
      {srsMode && (
        <>
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
        </>
      )}
    </Stack>
  );

  if (completed) {
    return (
      <Card
        className="glass-panel animate-float"
        radius="lg"
        padding="md"
        p={{ base: 'md', sm: 'xl' }}
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

          <Group justify="center" mt="md" gap="md" wrap="wrap">
            {canUndo && onUndo && (
              <Button
                variant="light"
                color="grape"
                size="md"
                radius="md"
                leftSection={<IconArrowBackUp size={18} />}
                onClick={() => {
                  onUndo();
                  positionQuizSection();
                }}
                style={{ fontWeight: 800 }}
              >
                Undo Rating
              </Button>
            )}

            {onRestart && totalCount > 0 && (
              <Indicator
                disabled={!hasAddedWords}
                color="violet"
                size={11}
                offset={4}
                processing
                styles={{
                  indicator: {
                    boxShadow:
                      '0 0 10px rgba(168, 85, 247, 0.9), 0 0 20px rgba(168, 85, 247, 0.6), 0 0 4px #ffffff',
                  },
                }}
              >
                <Button
                  onClick={onRestart}
                  className="btn-premium btn-pulse"
                  size="md"
                  radius="md"
                  leftSection={<IconRotateClockwise size={18} />}
                  rightSection={<Kbd size="xs" style={{ opacity: 0.75, fontSize: '0.62rem' }}>R</Kbd>}
                >
                  {hasAddedWords ? 'Refresh Session' : 'Restart Session'}
                </Button>
              </Indicator>
            )}
          </Group>

          <Text size="xs" c="dimmed" fw={500} style={{ opacity: 0.6 }}>
            Press{' '}
            <Kbd size="xs" style={{ fontSize: '0.65rem' }}>H</Kbd> for keyboard shortcuts
          </Text>
        </Stack>

        {/* Help Modal */}
        <Modal
          opened={showHelpModal}
          onClose={() => setShowHelpModal(false)}
          title={
            <Group gap="xs">
              <IconHelp size={18} color="#6366f1" />
              <Text fw={700} size="md">Keyboard Shortcuts</Text>
            </Group>
          }
          centered
          radius="lg"
          padding="lg"
          size="sm"
        >
          {helpModalContent}
        </Modal>
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

  // Patch kbStateRef so the stable keyboard handler can read the latest hasExamples value
  kbStateRef.current.hasExamples = allUserExamples.length > 0;

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
                      positionQuizSection();
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
              positionQuizSection();
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
        <WordActionMenu
          word={item.word}
          wordId={item.id}
          audioUrl={item.audioUrl}
          phonetic={item.phonetic}
          onSpeak={() => handleSpeak(item.word, item.audioUrl)}
          isPlayingAudio={isPlayingAudio}
          onAudioUpdated={(newAudioUrl, newPhonetic) => {
            if (item) {
              item.audioUrl = newAudioUrl;
              if (newPhonetic) {
                item.phonetic = newPhonetic;
              }
            }
          }}
          onEdit={
            onEditClick
              ? () => {
                  const baseId = item.id.includes(':') ? item.id.split(':')[0] : item.id;
                  onEditClick(baseId);
                }
              : undefined
          }
          isMissed={isMarkedMissed}
          onToggleMissed={includeMissed ? onMarkMissed : undefined}
          onDeleteFsrs={onDeleteFsrsRecord ? () => setConfirmDeleteFsrsOpened(true) : undefined}
          size="lg"
        />
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
      onRefreshExamples={
        showExamples && onRefreshExamples && item ? () => onRefreshExamples(item.id) : undefined
      }
      isGeneratingExamples={isGeneratingExamples}
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

  // Patch kbStateRef so the stable keyboard handler can read the latest hasNotes value
  kbStateRef.current.hasNotes = hasNotes;

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
        positionQuizSection();
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
    <Card ref={quizPanelRef} className="glass-panel" radius="lg" padding="md" p={{ base: 'md', sm: 'xl' }}>
      <Stack gap="xl">
        {/* Help Modal */}
        <Modal
          opened={showHelpModal}
          onClose={() => setShowHelpModal(false)}
          title={
            <Group gap="xs">
              <IconHelp size={18} color="#6366f1" />
              <Text fw={700} size="md">Keyboard Shortcuts</Text>
            </Group>
          }
          centered
          radius="lg"
          padding="lg"
          size="sm"
        >
          {helpModalContent}
        </Modal>
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
              duration: 0.45,
              ease: [0.23, 1, 0.32, 1],
            }}
            style={{
              transformStyle: 'preserve-3d',
              position: 'relative',
              width: '100%',
              display: 'grid',
              gridTemplateColumns: '1fr',
              gridTemplateRows: '1fr',
              willChange: 'transform',
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
                        positionQuizSection();
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

        {/* Keyboard Legend */}
        <Group justify="center" gap="md" style={{ opacity: 0.55 }} wrap="wrap">
          <Text size="xs" fw={700}>
            <Text span fw={900} c="grape.4">Space</Text>{' '}Reveal
          </Text>
          {!srsMode && (
            <Text size="xs" fw={700}>
              <Text span fw={900} c="indigo.4">Enter / →</Text>{' '}Next
            </Text>
          )}
          <Text size="xs" fw={700}>
            <Text span fw={900} c="violet.4">P</Text>{' '}Speak
          </Text>
          {!srsMode && (
            <Text size="xs" fw={700}>
              <Text span fw={900} c="orange.4">M</Text>{' '}Missed
            </Text>
          )}
          {canUndo && (
            <Text size="xs" fw={700}>
              <Text span fw={900} c="pink.4">Z / U</Text>{' '}Undo
            </Text>
          )}
          <Tooltip label="Show all keyboard shortcuts" withArrow>
            <Text
              size="xs"
              fw={700}
              c="indigo"
              style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
              onClick={() => setShowHelpModal(true)}
            >
              <Text span fw={900} c="indigo.4">H / ?</Text>{' '}Help
            </Text>
          </Tooltip>
        </Group>

        <Group justify="space-between" mt="sm">
          <Button
            variant="subtle"
            color="gray"
            onClick={() => {
              onPrevious();
              positionQuizSection();
            }}
            disabled={!hasPrevious}
            radius="md"
            leftSection={<IconChevronLeft size={18} />}
            rightSection={
              hasPrevious ? (
                <Kbd size="xs" style={{ opacity: 0.7, fontSize: '0.62rem', padding: '1px 4px' }}>←</Kbd>
              ) : undefined
            }
          >
            Back
          </Button>

          <Button
            onClick={() => {
              onNext();
              positionQuizSection();
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
});
