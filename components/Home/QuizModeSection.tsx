import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Grid,
  Group,
  Indicator,
  Paper,
  RollingNumber,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAdjustmentsHorizontal,
  IconBookmarkOff,
  IconBrain,
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconFlame,
  IconRotateClockwise,
  IconSparkles,
  IconTarget,
  IconTopologyStarRing3,
  IconVolume,
  IconX,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { memo, useMemo, useState, type ReactNode } from 'react';
import {
  practiceDisplayModes,
  quizDirections,
  quizRanges,
  quizSources,
  type PracticeDisplayKey,
  type QuizDirectionKey,
  type QuizRangeKey,
  type QuizSourceKey,
} from '@/app/home/constants';
import { ExportWordsModal } from '@/components/Home/ExportWordsModal';
import { MissedWordVirtualList } from '@/components/Practice/MissedWordVirtualList';
import { PracticeDisplayCombobox } from '@/components/Practice/PracticeDisplayCombobox';
import { QuizPanel, type QuizDirection, type QuizItem } from '@/components/QuizPanel/QuizPanel';
import type {
  MissedWordRecord,
  SrsPracticeRecord,
  WordDefinition,
  WordFamilyMemberRecord,
} from '@/lib/db';

type QuizModeSectionProps = {
  quizRange: QuizRangeKey;
  quizSource: QuizSourceKey;
  quizDirection: QuizDirectionKey;
  quizGroupFilter: string;
  customGroups: string[];
  customStart: string;
  customEnd: string;
  quizCandidatesCount: number;
  quizQueueLength: number;
  currentQuizItem: QuizItem | null;
  revealed: boolean;
  completed: boolean;
  quizIndex: number;
  isCurrentMarkedMissed: boolean;
  practiceDisplayMode: PracticeDisplayKey;
  hideMissedMeanings: boolean;
  hideSrsPracticeMeanings: boolean;
  revealedMissedWordIds: Record<string, boolean>;
  revealedSrsPracticeWordIds: Record<string, boolean>;
  missedWordsForMode: Array<MissedWordRecord & { definitions?: WordDefinition[] }>;
  fsrsForgettingWordsForMode?: Array<
    import('@/lib/db').FsrsRecord & { definitions?: WordDefinition[] }
  >;
  recentSrsPracticeWords?: Array<SrsPracticeRecord & { definitions?: WordDefinition[] }>;
  missedWordIdSet: Set<string>;
  generatingExampleWordIds: Record<string, boolean>;
  autoPronounceQuizWord: boolean;
  wordFamilies?: Record<string, WordFamilyMemberRecord[]>;
  generatingWordFamilyWordIds?: Record<string, boolean>;
  onSetQuizRange: (value: QuizRangeKey) => void;
  onSetQuizSource: (value: QuizSourceKey) => void;
  onSetQuizDirection: (value: QuizDirectionKey) => void;
  onSetQuizGroupFilter: (value: string) => void;
  onSetCustomStart: (value: string) => void;
  onSetCustomEnd: (value: string) => void;
  onResetQuiz: () => void;
  onReveal: () => void;
  onToggleMissed: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onRefreshExamples: (id: string) => Promise<void> | void;
  onRefreshWordFamily?: (wordId: string, word: string) => Promise<void> | void;
  onDeleteWordFamilyMember?: (memberId: string) => Promise<void> | void;
  onSrsRate?: (rating: import('@/lib/fsrs').FsrsRating) => void;
  srsIntervals?: Partial<Record<import('@/lib/fsrs').FsrsRating, string>>;
  onEditClick: (id: string) => void;
  onSetPracticeDisplayMode: (value: PracticeDisplayKey) => void;
  onSetAutoPronounceQuizWord: (value: boolean) => void;
  onSetHideMissedMeanings: (value: boolean) => void;
  onSetHideSrsPracticeMeanings: (value: boolean) => void;
  onSetRevealedMissedWordIds: (
    value: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => void;
  onSetRevealedSrsPracticeWordIds: (
    value: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => void;
  onUnmarkMissed: (id: string) => Promise<void> | void;
  onTogglePracticeMissed: (word: SrsPracticeRecord) => void;
  onOpenSrsPracticeQuiz: () => void;
  onStartForgettingQuiz?: () => void;
  onOpenClearAllMissed: () => void;
  onDeleteFsrsRecord?: (wordId: string, quizMode: QuizDirection) => void;
  canUndo?: boolean;
  onUndo?: () => void;
  hasAddedWords?: boolean;
  addedWordsCount?: number;
  hasRemovedWords?: boolean;
  removedWordsCount?: number;
  quizCandidates?: Array<
    | import('@/lib/db').WordRecord
    | import('@/lib/db').MissedWordRecord
    | import('@/lib/db').FsrsRecord
    | QuizItem
  >;
  words?: import('@/lib/db').WordRecord[];
  clusterContext?: import('@/lib/redux/slices/quizSlice').GroupQuizClusterContext | null;
  selectedGroupId?: string | null;
  onSetSelectedGroupId?: (groupId: string | null) => void;
  similarClusters?: import('@/lib/similar-words/clustering').SimilarWordCluster[];
  onClearGroupQuiz?: () => void;
};

export const QuizModeSection = memo(function QuizModeSection({
  quizRange,
  quizSource,
  quizDirection,
  quizGroupFilter,
  customGroups,
  customStart,
  customEnd,
  quizCandidatesCount,
  quizQueueLength,
  currentQuizItem,
  revealed,
  completed,
  quizIndex,
  isCurrentMarkedMissed,
  practiceDisplayMode,
  hideMissedMeanings,
  hideSrsPracticeMeanings: _hideSrsPracticeMeanings,
  revealedMissedWordIds,
  revealedSrsPracticeWordIds: _revealedSrsPracticeWordIds,
  missedWordsForMode,
  fsrsForgettingWordsForMode = [],
  recentSrsPracticeWords: _recentSrsPracticeWords,
  missedWordIdSet: _missedWordIdSet,
  generatingExampleWordIds,
  autoPronounceQuizWord,
  wordFamilies = {},
  generatingWordFamilyWordIds = {},
  onSetQuizRange,
  onSetQuizSource,
  onSetQuizDirection,
  onSetQuizGroupFilter,
  onSetCustomStart,
  onSetCustomEnd,
  onResetQuiz,
  onReveal,
  onToggleMissed,
  onNext,
  onPrevious,
  onRefreshExamples,
  onRefreshWordFamily,
  onDeleteWordFamilyMember,
  onSrsRate,
  srsIntervals,
  onEditClick,
  onSetPracticeDisplayMode,
  onSetAutoPronounceQuizWord,
  onSetHideMissedMeanings,
  onSetHideSrsPracticeMeanings: _onSetHideSrsPracticeMeanings,
  onSetRevealedMissedWordIds,
  onSetRevealedSrsPracticeWordIds: _onSetRevealedSrsPracticeWordIds,
  onUnmarkMissed,
  onTogglePracticeMissed: _onTogglePracticeMissed,
  onOpenSrsPracticeQuiz: _onOpenSrsPracticeQuiz,
  onStartForgettingQuiz,
  onOpenClearAllMissed,
  onDeleteFsrsRecord,
  canUndo,
  onUndo,
  hasAddedWords = false,
  addedWordsCount = 0,
  hasRemovedWords: _hasRemovedWords = false,
  removedWordsCount: _removedWordsCount = 0,
  quizCandidates,
  words,
  clusterContext,
  selectedGroupId,
  onSetSelectedGroupId,
  similarClusters = [],
  onClearGroupQuiz,
}: QuizModeSectionProps) {
  const router = useRouter();
  const displayedMissedItems = useMemo(() => {
    const fsrsWords = fsrsForgettingWordsForMode || [];
    if (practiceDisplayMode === 'fsrsAgainHard') {
      return fsrsWords;
    }
    if (practiceDisplayMode === 'fsrsAgain') {
      return fsrsWords.filter((w) => w.lastRating === 'again');
    }
    if (practiceDisplayMode === 'fsrsHard') {
      return fsrsWords.filter((w) => w.lastRating === 'hard');
    }
    // 'allMissed' or 'missed' or default: manual missed words
    return missedWordsForMode;
  }, [practiceDisplayMode, missedWordsForMode, fsrsForgettingWordsForMode]);

  const [optionsExpanded, setOptionsExpanded] = useState(true);
  const [exportModalConfig, setExportModalConfig] = useState<{
    opened: boolean;
    title: string;
    filenamePrefix: string;
    items: Array<any>;
  } | null>(null);

  const wordsMap = useMemo(() => {
    if (!words) {
      return undefined;
    }
    return new Map(words.map((w) => [w.id, w]));
  }, [words]);

  const clusterSelectData = useMemo(() => {
    const totalWords = similarClusters.reduce((acc, c) => acc + c.words.length, 0);
    const options = [
      {
        value: 'all',
        label: `✨ All Clustered Groups (${totalWords > 0 ? `${totalWords} words` : 'All Groups'})`,
      },
      ...similarClusters.map((c) => ({
        value: c.id,
        label: `${c.name} (${c.words.length} words • ${c.clusterType.replace('_', ' ')})`,
      })),
    ];

    // If a specific group is selected via clusterContext or URL but not yet in similarClusters list, add it so the dropdown is NEVER empty!
    if (
      selectedGroupId &&
      selectedGroupId !== 'all' &&
      !options.some((opt) => opt.value === selectedGroupId)
    ) {
      const name = clusterContext?.clusterName || selectedGroupId;
      const count = clusterContext?.words?.length ? ` (${clusterContext.words.length} words)` : '';
      const type = clusterContext?.clusterType
        ? ` • ${clusterContext.clusterType.replace('_', ' ')}`
        : '';
      options.splice(1, 0, {
        value: selectedGroupId,
        label: `${name}${count}${type}`,
      });
    }

    return options;
  }, [similarClusters, selectedGroupId, clusterContext]);

  const quizGroupSelectData = useMemo(() => {
    const seen = new Set<string>(['all', 'none']);
    const options = [
      { value: 'all', label: 'All Groups' },
      { value: 'none', label: 'No Group' },
    ];
    for (const g of customGroups) {
      const trimmed = g.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        options.push({ value: trimmed, label: trimmed });
      }
    }
    return options;
  }, [customGroups]);

  return (
    <Stack gap="lg" style={{ minHeight: '100vh' }}>
      {/* Group Quiz Active Banner */}
      {clusterContext && (
        <Paper
          p="md"
          radius="lg"
          style={{
            background:
              'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.12) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Group gap="sm" align="center">
              <ThemeIcon
                size="lg"
                radius="md"
                variant="gradient"
                gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
              >
                <IconTopologyStarRing3 size={20} />
              </ThemeIcon>
              <div>
                <Group gap={8} align="center" wrap="wrap">
                  <Text size="sm" fw={800} style={{ fontFamily: 'var(--font-title)' }}>
                    Group Quiz: {clusterContext.clusterName}
                  </Text>
                  {clusterContext.clusterType && (
                    <Badge size="xs" variant="light" color="indigo">
                      {clusterContext.clusterType.replace('_', ' ')}
                    </Badge>
                  )}
                  <Badge size="xs" variant="filled" color="indigo">
                    {quizCandidatesCount} Words in Pool
                  </Badge>
                </Group>
                {clusterContext.explanation && (
                  <Text size="xs" c="dimmed" mt={2}>
                    {clusterContext.explanation}
                  </Text>
                )}
              </div>
            </Group>

            <Group gap="xs">
              <Button
                size="xs"
                radius="md"
                variant="light"
                color="indigo"
                leftSection={<IconRotateClockwise size={14} />}
                onClick={onResetQuiz}
              >
                Restart Group Quiz
              </Button>
              {onClearGroupQuiz && (
                <Button
                  size="xs"
                  radius="md"
                  variant="subtle"
                  color="red"
                  leftSection={<IconX size={14} />}
                  onClick={onClearGroupQuiz}
                >
                  Exit Group Quiz
                </Button>
              )}
            </Group>
          </Group>
        </Paper>
      )}

      <Card
        className="glass-panel"
        radius="lg"
        padding="md"
        style={{ borderLeft: '4px solid #6366f1' }}
      >
        <Stack gap="sm">
          {/* Collapsible Header */}
          <Group
            justify="space-between"
            align="center"
            style={{ cursor: 'pointer' }}
            onClick={() => setOptionsExpanded((v) => !v)}
          >
            <Group gap="xs" align="center" wrap="wrap">
              <IconBrain size={18} style={{ color: '#6366f1' }} />
              <Text size="sm" fw={800} style={{ letterSpacing: '-0.01em' }}>
                Quiz Settings
              </Text>
              {quizSource === 'similarGroups' || clusterContext ? (
                <Badge size="xs" variant="filled" color="indigo">
                  🎯 Group:{' '}
                  {clusterContext?.clusterName ||
                    (selectedGroupId === 'all' || !selectedGroupId
                      ? 'All Groups'
                      : 'Similar Groups')}
                </Badge>
              ) : (
                <>
                  <Badge size="xs" variant="light" color="indigo">
                    {quizRanges[quizRange] || quizRange}
                  </Badge>
                  <Badge size="xs" variant="light" color="violet">
                    {quizSources[quizSource] || quizSource}
                  </Badge>
                </>
              )}
              <Badge size="xs" variant="light" color="teal">
                {quizDirections[quizDirection] || quizDirection}
              </Badge>
              {quizGroupFilter !== 'all' && (
                <Badge size="xs" variant="outline" color="gray">
                  Group: {quizGroupFilter}
                </Badge>
              )}
            </Group>

            <Button
              variant="subtle"
              color="indigo"
              size="xs"
              radius="md"
              leftSection={<IconAdjustmentsHorizontal size={14} />}
              rightSection={
                optionsExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
              }
              onClick={(e) => {
                e.stopPropagation();
                setOptionsExpanded((v) => !v);
              }}
            >
              {optionsExpanded ? 'Hide Options' : 'Options'}
            </Button>
          </Group>

          <Collapse expanded={optionsExpanded}>
            <Stack gap="md" mt="xs">
              <Grid align="flex-end" gap="md">
                <Grid.Col span={{ base: 12, sm: 3 }}>
                  <Text size="xs" fw={700} c="dimmed">
                    QUIZ POOL RANGE
                  </Text>
                  <SelectLike
                    data={Object.entries(quizRanges).map(([value, label]) => ({ value, label }))}
                    value={quizRange}
                    onChange={(value) => onSetQuizRange((value as QuizRangeKey) ?? 'all')}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 3 }}>
                  <Text size="xs" fw={700} c="dimmed">
                    QUIZ SOURCE
                  </Text>
                  <SelectLike
                    data={Object.entries(quizSources).map(([value, label]) => ({ value, label }))}
                    value={quizSource}
                    onChange={(value) => onSetQuizSource((value as QuizSourceKey) ?? 'words')}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 3 }}>
                  <Text size="xs" fw={700} c="dimmed">
                    QUIZ MODE
                  </Text>
                  <SelectLike
                    data={Object.entries(quizDirections).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    value={quizDirection}
                    onChange={(value) =>
                      onSetQuizDirection((value as QuizDirectionKey) ?? 'wordToMeaning')
                    }
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 3 }}>
                  <Text size="xs" fw={700} c="dimmed">
                    QUIZ GROUP
                  </Text>
                  <SelectLike
                    data={quizGroupSelectData}
                    value={quizGroupFilter}
                    onChange={(value) => onSetQuizGroupFilter(value ?? 'all')}
                  />
                </Grid.Col>
              </Grid>

              {quizSource === 'similarGroups' && (
                <div
                  style={{
                    borderRadius: '12px',
                    border: '1px solid rgba(99,102,241,0.25)',
                    background: 'rgba(99,102,241,0.06)',
                    padding: '14px 16px',
                  }}
                >
                  <Stack gap="xs">
                    <Group justify="space-between" align="center" wrap="wrap">
                      <Group gap="xs" align="center">
                        <IconTopologyStarRing3 size={18} style={{ color: '#6366f1' }} />
                        <Text size="xs" fw={700} c="indigo">
                          SELECT SIMILAR-WORD GROUP / CLUSTER
                        </Text>
                      </Group>
                      <Badge size="xs" variant="light" color="indigo">
                        {similarClusters.length} Groups Available
                      </Badge>
                    </Group>

                    <SelectLike
                      data={clusterSelectData}
                      value={selectedGroupId || 'all'}
                      onChange={(value) => onSetSelectedGroupId?.(value ?? 'all')}
                    />
                  </Stack>
                </div>
              )}

              {quizRange === 'custom' && (
                <div
                  style={{
                    borderRadius: '12px',
                    border: '1px solid rgba(99,102,241,0.2)',
                    background: 'rgba(99,102,241,0.04)',
                    padding: '16px',
                  }}
                >
                  <Stack gap="sm">
                    <Group gap="xs" align="center" mb={4}>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        }}
                      />
                      <Text size="xs" fw={700} c="indigo" style={{ letterSpacing: '0.05em' }}>
                        CUSTOM DATE RANGE
                      </Text>
                    </Group>
                    <Grid gap="md">
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <TextInput
                          label={
                            <Text size="xs" fw={600} c="dimmed">
                              From
                            </Text>
                          }
                          type="datetime-local"
                          value={customStart}
                          onChange={(e) => onSetCustomStart(e.currentTarget.value)}
                          size="md"
                          radius="md"
                          max={customEnd}
                        />
                      </Grid.Col>
                      <Grid.Col span={{ base: 12, sm: 6 }}>
                        <TextInput
                          label={
                            <Text size="xs" fw={600} c="dimmed">
                              To
                            </Text>
                          }
                          type="datetime-local"
                          value={customEnd}
                          onChange={(e) => onSetCustomEnd(e.currentTarget.value)}
                          size="md"
                          radius="md"
                          min={customStart}
                        />
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </div>
              )}

              <Group justify="space-between" align="center" mt="xs" gap="sm" wrap="wrap">
                <Text component="div" size="xs" c="dimmed">
                  <RollingNumber value={quizCandidatesCount} /> word
                  {quizCandidatesCount !== 1 ? 's' : ''} in this selection
                </Text>
                <Group gap="xs" wrap="wrap" justify="flex-end">
                  <Tooltip
                    label="Export current quiz selection words to CSV, JSON, or Plain Text"
                    withArrow
                  >
                    <Button
                      variant="light"
                      color="indigo"
                      size="sm"
                      radius="md"
                      leftSection={<IconDownload size={16} />}
                      onClick={() =>
                        setExportModalConfig({
                          opened: true,
                          title: 'Export Quiz Selection Words',
                          filenamePrefix: `quiz-${quizSource}-${quizDirection}`,
                          items:
                            quizCandidates && quizCandidates.length > 0
                              ? quizCandidates
                              : currentQuizItem
                                ? [currentQuizItem]
                                : [],
                        })
                      }
                      disabled={quizCandidatesCount === 0}
                      style={{ fontWeight: 600 }}
                    >
                      Export (<RollingNumber value={quizCandidatesCount} />)
                    </Button>
                  </Tooltip>

                  <Tooltip
                    label="Practice these words in natural context with an AI generated story"
                    withArrow
                  >
                    <Button
                      variant="light"
                      color="violet"
                      size="sm"
                      radius="md"
                      leftSection={<IconSparkles size={16} />}
                      onClick={() => {
                        const ids = (
                          quizCandidates && quizCandidates.length > 0
                            ? quizCandidates
                            : currentQuizItem
                              ? [currentQuizItem]
                              : []
                        )
                          .map((item) => item.id)
                          .slice(0, 10);
                        if (ids.length > 0) {
                          router.push(`/stories?words=${ids.join(',')}`);
                        } else {
                          router.push('/stories');
                        }
                      }}
                      disabled={quizCandidatesCount === 0}
                      style={{ fontWeight: 600 }}
                    >
                      AI Story
                    </Button>
                  </Tooltip>

                  <Tooltip
                    label="Automatically pronounce the word when it becomes visible in quiz"
                    withArrow
                  >
                    <Button
                      variant={autoPronounceQuizWord ? 'light' : 'subtle'}
                      color={autoPronounceQuizWord ? 'indigo' : 'gray'}
                      size="sm"
                      radius="md"
                      leftSection={<IconVolume size={16} />}
                      onClick={() => onSetAutoPronounceQuizWord(!autoPronounceQuizWord)}
                      style={{ fontWeight: 600 }}
                    >
                      {autoPronounceQuizWord ? 'Auto Pronounce On' : 'Auto Pronounce Off'}
                    </Button>
                  </Tooltip>
                  <Tooltip
                    label={
                      hasAddedWords
                        ? `${addedWordsCount} new due card${addedWordsCount > 1 ? 's' : ''} available! Click to refresh.`
                        : 'Restart or refresh the current quiz queue'
                    }
                    withArrow
                  >
                    <Indicator
                      disabled={!hasAddedWords}
                      color="violet"
                      size={9}
                      offset={3}
                      processing
                      styles={{
                        indicator: {
                          boxShadow:
                            '0 0 8px rgba(168, 85, 247, 0.9), 0 0 16px rgba(168, 85, 247, 0.6), 0 0 4px #ffffff',
                        },
                      }}
                    >
                      <Button
                        variant={hasAddedWords ? 'gradient' : 'light'}
                        gradient={
                          hasAddedWords ? { from: 'indigo', to: 'violet', deg: 135 } : undefined
                        }
                        color="indigo"
                        size="sm"
                        radius="md"
                        onClick={onResetQuiz}
                        disabled={quizQueueLength === 0 && !hasAddedWords}
                        leftSection={<IconRotateClockwise size={16} />}
                        className={hasAddedWords ? 'btn-premium btn-pulse' : undefined}
                        style={
                          hasAddedWords
                            ? {
                                boxShadow: '0 4px 15px rgba(168, 85, 247, 0.35)',
                                fontWeight: 700,
                              }
                            : undefined
                        }
                      >
                        {hasAddedWords ? 'Refresh Quiz' : 'Restart Quiz'}
                      </Button>
                    </Indicator>
                  </Tooltip>
                </Group>
              </Group>
            </Stack>
          </Collapse>
        </Stack>
      </Card>

      <QuizPanel
        item={currentQuizItem}
        quizDirection={quizDirection as QuizDirection}
        revealed={revealed}
        onReveal={onReveal}
        onMarkMissed={onToggleMissed}
        isMarkedMissed={isCurrentMarkedMissed}
        onNext={onNext}
        onPrevious={onPrevious}
        completed={completed}
        hasPrevious={quizIndex > 0}
        currentIndex={quizIndex}
        totalCount={quizQueueLength}
        onRestart={onResetQuiz}
        hasAddedWords={hasAddedWords}
        addedWordsCount={addedWordsCount}
        onRefreshExamples={onRefreshExamples}
        isGeneratingExamples={
          currentQuizItem ? Boolean(generatingExampleWordIds[currentQuizItem.id]) : false
        }
        autoPronounceWord={autoPronounceQuizWord}
        srsMode={quizSource === 'fsrs'}
        onSrsRate={quizSource === 'fsrs' ? onSrsRate : undefined}
        srsIntervals={quizSource === 'fsrs' ? srsIntervals : undefined}
        onEditClick={onEditClick}
        onDeleteFsrsRecord={onDeleteFsrsRecord}
        canUndo={canUndo}
        onUndo={onUndo}
        wordFamilyMembers={currentQuizItem ? wordFamilies[currentQuizItem.id] || [] : []}
        isGeneratingWordFamily={
          currentQuizItem ? Boolean(generatingWordFamilyWordIds[currentQuizItem.id]) : false
        }
        onRefreshWordFamily={onRefreshWordFamily}
        onDeleteWordFamilyMember={onDeleteWordFamilyMember}
      />

      <Card
        className="glass-panel"
        radius="lg"
        padding="sm"
        p={{ base: 'sm', sm: 'lg' }}
        style={{ borderLeft: '4px solid #ef4444', overflow: 'hidden' }}
      >
        <Group justify="space-between" align="center" mb="md" gap="md" wrap="wrap">
          <Group gap="sm" wrap="wrap">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background:
                  practiceDisplayMode === 'missed'
                    ? 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)'
                    : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  practiceDisplayMode === 'missed'
                    ? '0 4px 12px rgba(239,68,68,0.35)'
                    : '0 4px 12px rgba(139,92,246,0.35)',
              }}
            >
              {practiceDisplayMode === 'missed' ? (
                <IconFlame size={18} color="white" />
              ) : (
                <IconBrain size={18} color="white" />
              )}
            </div>
            <div>
              <Title order={4} style={{ fontFamily: 'var(--font-title)', lineHeight: 1.2 }}>
                {practiceDisplayModes[practiceDisplayMode]}
              </Title>
              <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>
                {quizDirections[quizDirection]}
              </Text>
            </div>
            <Badge
              variant="gradient"
              gradient={{ from: 'red', to: 'orange' }}
              size="md"
              radius="md"
              style={{ fontWeight: 800 }}
            >
              <RollingNumber value={displayedMissedItems.length} />
            </Badge>
          </Group>

          <Group gap="xs" wrap="wrap">
            <PracticeDisplayCombobox
              value={practiceDisplayMode}
              onChange={onSetPracticeDisplayMode}
            />
            <Tooltip
              label={hideMissedMeanings ? 'Show all meanings' : 'Hide all meanings'}
              withArrow
            >
              <ActionIcon
                variant="subtle"
                color="gray"
                size="md"
                radius="md"
                onClick={() => {
                  const nextVal = !hideMissedMeanings;
                  onSetHideMissedMeanings(nextVal);
                  if (nextVal) {
                    onSetRevealedMissedWordIds({});
                  }
                }}
              >
                {hideMissedMeanings ? <IconEyeOff size={24} /> : <IconEye size={24} />}
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Export displayed review/missed words" withArrow>
              <Button
                variant="light"
                color="red"
                size="xs"
                radius="md"
                leftSection={<IconDownload size={14} />}
                onClick={() =>
                  setExportModalConfig({
                    opened: true,
                    title: `Export ${practiceDisplayModes[practiceDisplayMode]}`,
                    filenamePrefix: `review-${practiceDisplayMode}-${quizDirection}`,
                    items: displayedMissedItems,
                  })
                }
                disabled={displayedMissedItems.length === 0}
              >
                Export (<RollingNumber value={displayedMissedItems.length} />)
              </Button>
            </Tooltip>

            <Button
              variant="light"
              color="indigo"
              size="xs"
              radius="md"
              leftSection={<IconBrain size={14} />}
              onClick={onStartForgettingQuiz || onResetQuiz}
              disabled={displayedMissedItems.length === 0}
            >
              Quiz
            </Button>

            {practiceDisplayMode === 'missed' && missedWordsForMode.length > 0 && (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                radius="md"
                leftSection={<IconBookmarkOff size={14} />}
                onClick={onOpenClearAllMissed}
                style={{ opacity: 0.8 }}
              >
                Clear All
              </Button>
            )}
          </Group>
        </Group>

        <Divider
          style={{
            borderColor: 'rgba(239,68,68,0.15)',
            marginBottom: '16px',
          }}
        />

        {displayedMissedItems.length === 0 ? (
          <EmptyPracticeState
            icon={<IconTarget size={24} style={{ color: '#ef4444', opacity: 0.5 }} />}
            title="No missed or forgotten words in this view"
            description={
              <>
                Words rated Again or Hard during FSRS quiz (with next review &gt; 6h) or bookmarked
                as missed in {quizDirections[quizDirection]} will appear here.
              </>
            }
            borderColor="rgba(239,68,68,0.2)"
            backgroundColor="rgba(239,68,68,0.03)"
            iconBackground="rgba(239,68,68,0.08)"
          />
        ) : (
          <MissedWordVirtualList
            words={displayedMissedItems}
            hideMissedMeanings={hideMissedMeanings}
            revealedMissedWordIds={revealedMissedWordIds}
            onRevealMissedWord={(id) =>
              onSetRevealedMissedWordIds((prev) => ({ ...prev, [id]: true }))
            }
            onRefreshExamples={onRefreshExamples}
            onUnmarkMissed={onUnmarkMissed}
            onEditClick={onEditClick}
            generatingExampleWordIds={generatingExampleWordIds}
            wordFamilies={wordFamilies}
            generatingWordFamilyWordIds={generatingWordFamilyWordIds}
            onRefreshWordFamily={onRefreshWordFamily}
            onDeleteWordFamilyMember={onDeleteWordFamilyMember}
          />
        )}
      </Card>

      {exportModalConfig && (
        <ExportWordsModal
          opened={exportModalConfig.opened}
          onClose={() => setExportModalConfig(null)}
          title={exportModalConfig.title}
          filenamePrefix={exportModalConfig.filenamePrefix}
          rawItems={exportModalConfig.items}
          wordsMap={wordsMap}
        />
      )}
    </Stack>
  );
});

type SelectLikeProps = {
  data: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string | null) => void;
};

function SelectLike({ data, value, onChange }: SelectLikeProps) {
  const uniqueData = useMemo(() => {
    const seen = new Set<string>();
    const result: typeof data = [];
    for (const item of data) {
      if (item && item.value && !seen.has(item.value)) {
        seen.add(item.value);
        result.push(item);
      }
    }
    return result;
  }, [data]);

  return (
    <Select
      data={uniqueData}
      value={value}
      size="md"
      radius="md"
      onChange={onChange}
      allowDeselect={false}
    />
  );
}

type EmptyPracticeStateProps = {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  borderColor: string;
  backgroundColor: string;
  iconBackground: string;
};

function EmptyPracticeState({
  icon,
  title,
  description,
  borderColor,
  backgroundColor,
  iconBackground,
}: EmptyPracticeStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '36px 24px',
        borderRadius: '12px',
        border: `1.5px dashed ${borderColor}`,
        background: backgroundColor,
      }}
    >
      <Stack gap="sm" align="center">
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: iconBackground,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
        <Text fw={600} size="sm" style={{ color: 'var(--text-secondary)' }}>
          {title}
        </Text>
        <Text size="xs" c="dimmed" style={{ lineHeight: 1.5, maxWidth: 320, margin: '0 auto' }}>
          {description}
        </Text>
      </Stack>
    </div>
  );
}
