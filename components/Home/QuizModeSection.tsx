import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Collapse,
  Divider,
  Grid,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAdjustmentsHorizontal,
  IconBookmarkOff,
  IconBrain,
  IconChevronDown,
  IconChevronUp,
  IconEye,
  IconEyeOff,
  IconFlame,
  IconRotateClockwise,
  IconTarget,
  IconVolume,
} from '@tabler/icons-react';
import { useMemo, useState, type ReactNode } from 'react';
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
};

export function QuizModeSection({
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
}: QuizModeSectionProps) {
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

  return (
    <Stack gap="lg" style={{ minHeight: '100vh' }}>
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
              <Badge size="xs" variant="light" color="indigo">
                {quizRanges[quizRange] || quizRange}
              </Badge>
              <Badge size="xs" variant="light" color="violet">
                {quizSources[quizSource] || quizSource}
              </Badge>
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
                    data={[
                      { value: 'all', label: 'All Groups' },
                      { value: 'none', label: 'No Group' },
                      ...customGroups.map((g) => ({ value: g, label: g })),
                    ]}
                    value={quizGroupFilter}
                    onChange={(value) => onSetQuizGroupFilter(value ?? 'all')}
                  />
                </Grid.Col>
              </Grid>

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
                <Text size="xs" c="dimmed">
                  {quizCandidatesCount} word{quizCandidatesCount !== 1 ? 's' : ''} in this selection
                </Text>
                <Group gap="xs" wrap="wrap" justify="flex-end">
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
                  <Button
                    variant="light"
                    color="indigo"
                    size="md"
                    radius="md"
                    onClick={onResetQuiz}
                    disabled={quizQueueLength === 0}
                    leftSection={<IconRotateClockwise size={18} />}
                  >
                    Restart Quiz
                  </Button>
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
        padding="lg"
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
              {displayedMissedItems.length}
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
            generatingExampleWordIds={generatingExampleWordIds}
            wordFamilies={wordFamilies}
            generatingWordFamilyWordIds={generatingWordFamilyWordIds}
            onRefreshWordFamily={onRefreshWordFamily}
            onDeleteWordFamilyMember={onDeleteWordFamilyMember}
          />
        )}
      </Card>
    </Stack>
  );
}

type SelectLikeProps = {
  data: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string | null) => void;
};

function SelectLike({ data, value, onChange }: SelectLikeProps) {
  return (
    <Select
      data={data}
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
