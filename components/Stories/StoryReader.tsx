'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Paper,
  RingProgress,
  RollingNumber,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconBook,
  IconCheck,
  IconCopy,
  IconHeart,
  IconHeartFilled,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconSparkles,
  IconTrash,
  IconVolume,
  IconX,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DefinitionsDisplay } from '@/components/DefinitionsDisplay/DefinitionsDisplay';
import { getDatabase, type StoryRecord, type WordRecord } from '@/lib/db';
import { isClozeAnswerCorrect, tokenizeStory, type StoryToken } from '@/lib/story';

export type StoryReaderProps = {
  story: StoryRecord;
  words?: WordRecord[];
  onBackToList?: () => void;
  onUpdateStory?: (story: StoryRecord) => void;
  onDeleteStory?: (id: string) => void;
  onGenerateNewClick?: () => void;
};

type ActiveModalWord = {
  word: string;
  meaning?: string;
  partOfSpeech?: string;
  definitions?: any[];
  customGroups?: string[];
};

export function StoryReader({
  story,
  words,
  onBackToList,
  onUpdateStory,
  onDeleteStory,
  onGenerateNewClick,
}: StoryReaderProps) {
  // Cloze Mode is enabled by default upon opening a story
  const [isClozeMode, setIsClozeMode] = useState(true);
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const [showBangla, setShowBangla] = useState(false);
  const [fontSize, setFontSize] = useState<'md' | 'lg' | 'xl'>('lg');
  const [isFavorite, setIsFavorite] = useState(story.isFavorite || false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Active word details modal for viewing all definitions
  const [activeWordForModal, setActiveWordForModal] = useState<ActiveModalWord | null>(null);

  // User input answers for Cloze blanks
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});

  // Audio Playback State (TTS)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Reset state whenever story changes
  useEffect(() => {
    setIsFavorite(story.isFavorite || false);
    setUserAnswers({});
    setHasEvaluated(false);
    setIsClozeMode(true);
    setShowBangla(false);
    setActiveWordForModal(null);
  }, [story.id, story.isFavorite]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Tokenize story into text and target words
  const tokens: StoryToken[] = useMemo(() => {
    return tokenizeStory(story.content, story.targetWords || []);
  }, [story.content, story.targetWords]);

  const targetTokens = useMemo(() => {
    return tokens.filter(
      (t): t is Extract<StoryToken, { type: 'target_word' }> => t.type === 'target_word'
    );
  }, [tokens]);

  // Word Bank words sorted alphabetically to avoid revealing blank sequence
  const wordBankWords = useMemo(() => {
    return [...(story.targetWords || [])].sort((a, b) => a.word.localeCompare(b.word));
  }, [story.targetWords]);

  // Count answered blanks
  const filledCount = useMemo(() => {
    let count = 0;
    for (const token of targetTokens) {
      if ((userAnswers[token.tokenIndex] || '').trim().length > 0) {
        count++;
      }
    }
    return count;
  }, [targetTokens, userAnswers]);

  // Evaluate Cloze score (calculated upon evaluation)
  const clozeResults = useMemo(() => {
    let correctCount = 0;
    const itemStatuses: Record<number, boolean> = {};

    for (const token of targetTokens) {
      const input = userAnswers[token.tokenIndex] || '';
      const isCorrect = isClozeAnswerCorrect(input, token.matchedWord, token.originalText);
      itemStatuses[token.tokenIndex] = isCorrect;
      if (isCorrect) {
        correctCount++;
      }
    }

    const total = targetTokens.length;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const isCompleted = total > 0 && correctCount === total;

    return {
      correctCount,
      total,
      percent,
      isCompleted,
      itemStatuses,
    };
  }, [targetTokens, userAnswers]);

  const handlePronounce = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleOpenWordModal = useCallback(
    (wordQuery: { word: string; wordId?: string; meaning?: string; partOfSpeech?: string }) => {
      handlePronounce(wordQuery.word);
      const cleanWord = wordQuery.word.trim().toLowerCase();
      const foundWord = words?.find(
        (w) => (!w.isDeleted && w.id === wordQuery.wordId) || w.word.toLowerCase() === cleanWord
      );

      if (foundWord) {
        setActiveWordForModal({
          word: foundWord.word,
          meaning: foundWord.meaning,
          definitions: foundWord.definitions,
          customGroups: foundWord.customGroups,
        });
      } else {
        setActiveWordForModal({
          word: wordQuery.word,
          meaning: wordQuery.meaning,
          partOfSpeech: wordQuery.partOfSpeech,
          definitions: wordQuery.meaning
            ? [
                {
                  meaning: wordQuery.meaning,
                  partOfSpeech: wordQuery.partOfSpeech || '',
                  examples: [],
                  userExamples: [],
                },
              ]
            : [],
        });
      }
    },
    [words, handlePronounce]
  );

  const handleEvaluate = () => {
    setHasEvaluated(true);
  };

  const handleResetCloze = () => {
    setUserAnswers({});
    setHasEvaluated(false);
  };

  const handlePlayStoryAudio = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    if (isAudioPaused) {
      window.speechSynthesis.resume();
      setIsAudioPaused(false);
      setIsPlayingAudio(true);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${story.title}. \n\n ${story.content}`);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;

    utterance.onend = () => {
      setIsPlayingAudio(false);
      setIsAudioPaused(false);
    };

    utterance.onerror = () => {
      setIsPlayingAudio(false);
      setIsAudioPaused(false);
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
    setIsAudioPaused(false);
  };

  const handlePauseStoryAudio = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    window.speechSynthesis.pause();
    setIsAudioPaused(true);
  };

  const handleStopStoryAudio = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    window.speechSynthesis.cancel();
    setIsPlayingAudio(false);
    setIsAudioPaused(false);
  };

  const handleToggleFavorite = async () => {
    const nextVal = !isFavorite;
    setIsFavorite(nextVal);
    const now = new Date().toISOString();

    const updated: StoryRecord = {
      ...story,
      isFavorite: nextVal,
      updatedAt: now,
    };

    try {
      const db = await getDatabase();
      await db.stories.upsert(updated);
      onUpdateStory?.(updated);
    } catch (err) {
      console.error('Failed to update favorite status:', err);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteModalOpen(false);
    const now = new Date().toISOString();

    try {
      const db = await getDatabase();
      await db.stories.upsert({
        ...story,
        isDeleted: true,
        updatedAt: now,
      });
      onDeleteStory?.(story.id);
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  const handleCopyStory = () => {
    const textToCopy = `${story.title}\n\n${story.content}${
      story.banglaTranslation ? `\n\n[বাংলা অনুবাদ]\n${story.banglaTranslation}` : ''
    }`;
    navigator.clipboard.writeText(textToCopy);
  };

  const fontSizeCss = {
    md: { fontSize: '1rem', lineHeight: '1.75' },
    lg: { fontSize: '1.18rem', lineHeight: '1.85' },
    xl: { fontSize: '1.35rem', lineHeight: '1.95' },
  }[fontSize];

  return (
    <Stack gap="lg" style={{ maxWidth: 880, margin: '0 auto', width: '100%' }}>
      {/* Top Navigation & Controls Bar */}
      <Group justify="space-between" align="center" wrap="wrap">
        <Group gap="xs">
          {onBackToList && (
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconArrowLeft size={16} />}
              onClick={onBackToList}
              size="sm"
            >
              Story Library
            </Button>
          )}
          {story.genre && (
            <Badge variant="light" color="indigo" size="md" radius="sm">
              {story.genre}
            </Badge>
          )}
        </Group>

        <Group gap="xs">
          {/* Audio narration */}
          {!isPlayingAudio ? (
            <Button
              size="xs"
              variant="light"
              color="teal"
              leftSection={<IconVolume size={14} />}
              onClick={handlePlayStoryAudio}
            >
              Read Aloud
            </Button>
          ) : (
            <Group gap={4}>
              <ActionIcon
                size="sm"
                color="teal"
                variant="light"
                onClick={isAudioPaused ? handlePlayStoryAudio : handlePauseStoryAudio}
              >
                {isAudioPaused ? <IconPlayerPlay size={14} /> : <IconPlayerPause size={14} />}
              </ActionIcon>
              <ActionIcon size="sm" color="red" variant="light" onClick={handleStopStoryAudio}>
                <IconPlayerStop size={14} />
              </ActionIcon>
            </Group>
          )}

          {/* Font Size Selector */}
          <SegmentedControl
            size="xs"
            value={fontSize}
            onChange={(val) => setFontSize(val as 'md' | 'lg' | 'xl')}
            data={[
              { value: 'md', label: 'A' },
              { value: 'lg', label: 'A+' },
              { value: 'xl', label: 'A++' },
            ]}
          />

          {/* Favorite */}
          <ActionIcon
            size="md"
            variant="subtle"
            color={isFavorite ? 'red' : 'gray'}
            onClick={handleToggleFavorite}
          >
            {isFavorite ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
          </ActionIcon>

          {/* Copy */}
          <Tooltip label="Copy story text" withArrow>
            <ActionIcon size="md" variant="subtle" color="gray" onClick={handleCopyStory}>
              <IconCopy size={18} />
            </ActionIcon>
          </Tooltip>

          {/* Delete */}
          <Tooltip label="Delete story" withArrow>
            <ActionIcon
              size="md"
              variant="subtle"
              color="red"
              onClick={() => setDeleteModalOpen(true)}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Main Story Container */}
      <Card
        padding="xl"
        radius="lg"
        className="glass-panel"
        style={{
          background: 'var(--card-bg)',
          borderColor: 'var(--card-border)',
        }}
      >
        <Stack gap="md">
          {/* Header & Cloze Mode Toggle Bar */}
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={4} style={{ flex: 1 }}>
              <Title order={2} style={{ letterSpacing: '-0.02em' }}>
                {story.title}
              </Title>
              <Group gap={6}>
                {story.genre && (
                  <Badge size="xs" variant="light" color="indigo">
                    {story.genre}
                  </Badge>
                )}
                {story.difficulty && (
                  <Badge
                    size="xs"
                    variant="light"
                    color={
                      story.difficulty === 'beginner'
                        ? 'teal'
                        : story.difficulty === 'advanced'
                          ? 'violet'
                          : 'blue'
                    }
                  >
                    {story.difficulty}
                  </Badge>
                )}
                <Text size="xs" c="dimmed">
                  Target Words ({story.targetWords?.length || 0}) • Created{' '}
                  {new Date(story.createdAt).toLocaleDateString()}
                </Text>
              </Group>
            </Stack>

            <Paper
              p="xs"
              radius="md"
              className="glass-panel"
              style={{
                background: isClozeMode
                  ? 'rgba(99, 102, 241, 0.1)'
                  : 'var(--card-bg-subtle)',
                borderColor: isClozeMode ? 'var(--card-border-glow)' : 'var(--card-border-subtle)',
              }}
            >
              <Group gap="xs">
                <IconSparkles
                  size={16}
                  color={isClozeMode ? 'var(--mantine-color-indigo-6)' : 'gray'}
                />
                <Switch
                  label={
                    <Text size="xs" fw={700} c={isClozeMode ? 'indigo' : undefined}>
                      Cloze Challenge
                    </Text>
                  }
                  size="sm"
                  checked={isClozeMode}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;
                    setIsClozeMode(checked);
                    if (!checked) {
                      setHasEvaluated(false);
                    }
                  }}
                />
              </Group>
            </Paper>
          </Group>

          {/* Word Bank / Vocabulary Chips Banner (Clicking opens all definitions modal) */}
          <Paper
            p="xs"
            radius="md"
            className="glass-panel"
            style={{
              background: 'var(--card-bg-subtle)',
              borderColor: 'var(--card-border-subtle)',
            }}
          >
            <Group justify="space-between" align="center" wrap="wrap">
              <Group gap="xs" style={{ flex: 1 }} wrap="wrap">
                <Text size="xs" fw={700} c="indigo">
                  Word Bank:
                </Text>
                {wordBankWords.map((tw) => (
                  <Tooltip
                    key={tw.wordId || tw.word}
                    label="Click to view all definitions & examples"
                    withArrow
                    position="top"
                  >
                    <Badge
                      variant="white"
                      color="indigo"
                      radius="sm"
                      style={{ cursor: 'pointer', userSelect: 'all' }}
                      onClick={() => handleOpenWordModal(tw)}
                    >
                      {tw.word}
                    </Badge>
                  </Tooltip>
                ))}
              </Group>

              {isClozeMode && !hasEvaluated && (
                <Text component="div" size="xs" fw={600} c="dimmed">
                  <RollingNumber value={filledCount} /> of{' '}
                  <RollingNumber value={targetTokens.length} /> blanks filled
                </Text>
              )}
            </Group>
          </Paper>

          {/* Evaluated Score Strip */}
          {isClozeMode && hasEvaluated && (
            <Card
              withBorder
              p="sm"
              radius="md"
              style={{
                borderColor: clozeResults.isCompleted
                  ? 'var(--mantine-color-teal-4)'
                  : 'var(--mantine-color-indigo-2)',
                background: clozeResults.isCompleted
                  ? 'var(--mantine-color-teal-0)'
                  : 'var(--mantine-color-indigo-0)',
              }}
            >
              <Group justify="space-between" align="center" wrap="wrap">
                <Group gap="sm">
                  <RingProgress
                    size={48}
                    thickness={5}
                    roundCaps
                    sections={[
                      {
                        value:
                          targetTokens.length > 0
                            ? (clozeResults.correctCount / targetTokens.length) * 100
                            : 0,
                        color: clozeResults.isCompleted ? 'teal' : 'indigo',
                      },
                    ]}
                  />
                  <Stack gap={0}>
                    <Text component="div" size="sm" fw={700}>
                      <RollingNumber value={clozeResults.correctCount} /> /{' '}
                      <RollingNumber value={targetTokens.length} /> Words Correct (
                      <RollingNumber value={clozeResults.percent} suffix="%" />)
                    </Text>
                    <Text size="xs" c="dimmed">
                      {clozeResults.isCompleted
                        ? '🎉 Outstanding! Perfect score!'
                        : clozeResults.correctCount > 0
                          ? 'Good effort! Review the missed words highlighted in red below.'
                          : 'Keep practicing! Review the correct answers highlighted below.'}
                    </Text>
                  </Stack>
                </Group>

                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="light"
                    color="indigo"
                    leftSection={<IconRefresh size={14} />}
                    onClick={handleResetCloze}
                  >
                    Try Again
                  </Button>
                </Group>
              </Group>
            </Card>
          )}

          {/* Audio Player Controls */}
          <Paper
            p="xs"
            radius="md"
            withBorder
            style={{
              background: 'var(--mantine-color-gray-0)',
            }}
          >
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Button
                  size="xs"
                  variant={isPlayingAudio ? 'filled' : 'light'}
                  color="indigo"
                  leftSection={
                    isPlayingAudio ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />
                  }
                  onClick={handlePlayStoryAudio}
                >
                  {isPlayingAudio ? (isAudioPaused ? 'Resume Story' : 'Pause') : 'Listen to Story'}
                </Button>

                {(isPlayingAudio || isAudioPaused) && (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    leftSection={<IconPlayerStop size={14} />}
                    onClick={handleStopStoryAudio}
                  >
                    Stop
                  </Button>
                )}
              </Group>

              {isPlayingAudio && !isAudioPaused && (
                <Badge size="sm" variant="dot" color="indigo">
                  Playing...
                </Badge>
              )}
            </Group>
          </Paper>

          <Divider my="xs" />

          {/* Story Body Content */}
          <div
            style={{
              ...fontSizeCss,
              color: 'var(--mantine-color-dark-8)',
              whiteSpace: 'pre-line',
            }}
          >
            {tokens.map((token, idx) => {
              if (token.type === 'text') {
                return <span key={idx}>{token.text}</span>;
              }

              const { tokenIndex, originalText, matchedWord, wordId, meaning, partOfSpeech } =
                token;

              if (isClozeMode) {
                // If not evaluated yet, show interactive blank input
                if (!hasEvaluated) {
                  const userVal = userAnswers[tokenIndex] || '';
                  return (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        verticalAlign: 'middle',
                        margin: '0 3px',
                      }}
                    >
                      <TextInput
                        size="xs"
                        value={userVal}
                        onChange={(e) => {
                          const val = e.currentTarget.value;
                          setUserAnswers((prev) => ({ ...prev, [tokenIndex]: val }));
                        }}
                        placeholder={`[ ${tokenIndex + 1} ]`}
                        aria-label={`Blank ${tokenIndex + 1}`}
                        styles={{
                          input: {
                            display: 'inline-block',
                            width: Math.max(90, Math.min(170, (matchedWord.length + 4) * 11)),
                            textAlign: 'center',
                            fontWeight: 700,
                            borderColor: 'var(--mantine-color-indigo-4)',
                            background: 'var(--mantine-color-white)',
                          },
                        }}
                      />
                    </span>
                  );
                }

                // If evaluated: show correct answer and user's wrong answer if present
                const userVal = (userAnswers[tokenIndex] || '').trim();
                const isCorrect = clozeResults.itemStatuses[tokenIndex] || false;

                if (isCorrect) {
                  return (
                    <UnstyledButton
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        verticalAlign: 'middle',
                        margin: '0 3px',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        handleOpenWordModal({ word: matchedWord, wordId, meaning, partOfSpeech })
                      }
                    >
                      <Tooltip
                        label={`Correct! "${originalText}" • Click to view all definitions`}
                        withArrow
                        position="top"
                        color="teal"
                      >
                        <Badge
                          size="md"
                          variant="light"
                          color="teal"
                          radius="sm"
                          style={{
                            textTransform: 'none',
                            fontWeight: 700,
                          }}
                          leftSection={<IconCheck size={12} />}
                        >
                          {originalText}
                        </Badge>
                      </Tooltip>
                    </UnstyledButton>
                  );
                }

                // User entered an incorrect word: show crossed-out wrong answer alongside correct answer
                if (userVal.length > 0) {
                  return (
                    <UnstyledButton
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        verticalAlign: 'middle',
                        margin: '0 4px',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        handleOpenWordModal({ word: matchedWord, wordId, meaning, partOfSpeech })
                      }
                    >
                      <Tooltip
                        label={`Your answer: "${userVal}" • Expected: "${originalText}" • Click for definitions`}
                        withArrow
                        position="top"
                        color="red"
                      >
                        <Group
                          gap={3}
                          wrap="nowrap"
                          style={{ display: 'inline-flex', verticalAlign: 'middle' }}
                        >
                          <Badge
                            size="md"
                            variant="light"
                            color="red"
                            radius="sm"
                            style={{
                              textDecoration: 'line-through',
                              textTransform: 'none',
                              fontWeight: 600,
                            }}
                            leftSection={<IconX size={12} />}
                          >
                            {userVal}
                          </Badge>
                          <Badge
                            size="md"
                            variant="filled"
                            color="teal"
                            radius="sm"
                            style={{
                              textTransform: 'none',
                              fontWeight: 700,
                            }}
                            leftSection={<IconCheck size={12} />}
                          >
                            {originalText}
                          </Badge>
                        </Group>
                      </Tooltip>
                    </UnstyledButton>
                  );
                }

                // User left the blank unanswered: show expected answer badge
                return (
                  <UnstyledButton
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      verticalAlign: 'middle',
                      margin: '0 3px',
                      cursor: 'pointer',
                    }}
                    onClick={() =>
                      handleOpenWordModal({ word: matchedWord, wordId, meaning, partOfSpeech })
                    }
                  >
                    <Tooltip
                      label={`Unanswered • Expected: "${originalText}" • Click for definitions`}
                      withArrow
                      position="top"
                      color="teal"
                    >
                      <Badge
                        size="md"
                        variant="light"
                        color="teal"
                        radius="sm"
                        style={{
                          textTransform: 'none',
                          fontWeight: 700,
                          border: '1px dashed var(--mantine-color-teal-6)',
                        }}
                        leftSection={<IconCheck size={12} />}
                      >
                        {originalText}
                      </Badge>
                    </Tooltip>
                  </UnstyledButton>
                );
              }

              // Standard Reading Mode: Highlighted Word (Click opens all definitions modal)
              return (
                <Tooltip
                  key={idx}
                  label="Click to view all definitions & examples"
                  withArrow
                  position="top"
                >
                  <UnstyledButton
                    style={{
                      color: 'var(--mantine-color-indigo-8)',
                      background: 'var(--mantine-color-indigo-1)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline dotted var(--mantine-color-indigo-5)',
                      display: 'inline-block',
                      margin: '0 1px',
                    }}
                    onClick={() =>
                      handleOpenWordModal({ word: matchedWord, wordId, meaning, partOfSpeech })
                    }
                  >
                    {originalText}
                  </UnstyledButton>
                </Tooltip>
              );
            })}
          </div>

          {/* Evaluate Action Button Bar (When in Cloze mode and not yet evaluated) */}
          {isClozeMode && !hasEvaluated && (
            <Card
              withBorder
              p="md"
              radius="md"
              mt="md"
              style={{
                background: 'var(--mantine-color-indigo-0)',
                borderColor: 'var(--mantine-color-indigo-2)',
              }}
            >
              <Group justify="space-between" align="center" wrap="wrap">
                <Stack gap={2}>
                  <Text size="sm" fw={700} c="indigo">
                    Ready to check your answers?
                  </Text>
                  <Text component="div" size="xs" c="dimmed">
                    You have completed <RollingNumber value={filledCount} /> of{' '}
                    <RollingNumber value={targetTokens.length} /> blanks.
                  </Text>
                </Stack>

                <Group gap="xs">
                  <Button
                    size="sm"
                    color="indigo"
                    leftSection={<IconCheck size={16} />}
                    onClick={handleEvaluate}
                  >
                    Evaluate Answers
                  </Button>
                </Group>
              </Group>
            </Card>
          )}

          {/* Bangla Translation & Summary Accordion */}
          {story.banglaTranslation && (
            <Stack gap="xs" mt="md">
              <Button
                variant="light"
                color="indigo"
                size="xs"
                onClick={() => setShowBangla((prev) => !prev)}
                leftSection={<IconBook size={14} />}
                style={{ width: 'fit-content' }}
              >
                {showBangla ? 'Hide Bangla Translation' : 'View Bangla Translation & Summary'}
              </Button>

              {showBangla && (
                <Paper
                  withBorder
                  p="md"
                  radius="md"
                  style={{
                    background: 'var(--mantine-color-indigo-0)',
                    borderColor: 'var(--mantine-color-indigo-2)',
                  }}
                >
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="xs" fw={700} c="indigo" tt="uppercase" lts={0.5}>
                        বাংলা অনুবাদ (Bangla Translation)
                      </Text>
                      <Tooltip label="Copy translation">
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="indigo"
                          onClick={() =>
                            navigator.clipboard.writeText(story.banglaTranslation || '')
                          }
                        >
                          <IconCopy size={12} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    <Text
                      size="sm"
                      style={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.8,
                        color: 'var(--mantine-color-dark-8)',
                      }}
                    >
                      {story.banglaTranslation}
                    </Text>
                  </Stack>
                </Paper>
              )}
            </Stack>
          )}

          {/* Bottom Action Footer */}
          <Divider my="sm" />
          <Group justify="space-between" align="center" wrap="wrap">
            <Group gap="xs">
              <Button
                variant="default"
                size="sm"
                leftSection={<IconCopy size={16} />}
                onClick={handleCopyStory}
              >
                Copy Story
              </Button>
            </Group>

            {onGenerateNewClick && (
              <Button
                color="indigo"
                size="sm"
                leftSection={<IconSparkles size={16} />}
                onClick={onGenerateNewClick}
              >
                Generate Another Story
              </Button>
            )}
          </Group>
        </Stack>
      </Card>

      {/* Word Definitions Modal (Shows all definitions upon clicking on a word) */}
      <Modal
        opened={Boolean(activeWordForModal)}
        onClose={() => setActiveWordForModal(null)}
        title={
          activeWordForModal && (
            <Group gap="xs" align="center">
              <IconBook size={22} color="var(--mantine-color-indigo-6)" />
              <Title order={3} style={{ letterSpacing: '-0.01em' }}>
                {activeWordForModal.word}
              </Title>
              <ActionIcon
                size="sm"
                color="indigo"
                variant="light"
                onClick={() => handlePronounce(activeWordForModal.word)}
                aria-label={`Pronounce ${activeWordForModal.word}`}
              >
                <IconVolume size={15} />
              </ActionIcon>
            </Group>
          )
        }
        centered
        radius="md"
        size="lg"
        overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
      >
        {activeWordForModal && (
          <Stack gap="md" py="xs">
            {activeWordForModal.customGroups && activeWordForModal.customGroups.length > 0 && (
              <Group gap={6}>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  Groups:
                </Text>
                {activeWordForModal.customGroups.map((g) => (
                  <Badge key={g} size="xs" variant="light" color="violet">
                    {g}
                  </Badge>
                ))}
              </Group>
            )}

            <div>
              <Text component="div" size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">
                Definitions (<RollingNumber value={activeWordForModal.definitions?.length || 1} />
                ):
              </Text>
              <DefinitionsDisplay
                definitions={activeWordForModal.definitions}
                fallbackMeaning={activeWordForModal.meaning}
                showExamples
                gap="md"
              />
            </div>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setActiveWordForModal(null)}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={
          <Group gap="xs">
            <IconTrash size={20} color="var(--mantine-color-red-6)" />
            <Title order={4}>Delete Story</Title>
          </Group>
        }
        centered
        radius="md"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete &ldquo;{story.title}&rdquo;? This action will move it to
            trash.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
