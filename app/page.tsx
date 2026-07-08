'use client';

import {
  Button,
  Combobox,
  CloseButton,
  Container,
  InputBase,
  Group,
  Modal,
  Pagination,
  Select,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
  ActionIcon,
  Tooltip,
  useMantineColorScheme,
  Grid,
  Flex,
  SimpleGrid,
  Card,
  Badge,
  Divider,
  useCombobox,
} from '@mantine/core';
import {
  IconSearch,
  IconSun,
  IconMoon,
  IconChevronDown,
  IconCloudCheck,
  IconCloudUpload,
  IconWifi,
  IconWifiOff,
  IconBook,
  IconBrain,
  IconHistory,
  IconRotateClockwise,
  IconBookmarkOff,
  IconBookmark,
  IconEdit,
  IconFlame,
  IconTarget,
  IconVolume,
  IconEye,
  IconEyeOff,
  IconTags,
} from '@tabler/icons-react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DefinitionsDisplay } from '@/components/DefinitionsDisplay/DefinitionsDisplay';
import { EditWordModal } from '@/components/EditWordModal/EditWordModal';
import { GroupManager } from '@/components/GroupManager/GroupManager';
import { PwaRegister } from '@/components/PwaRegister/PwaRegister';
import { QuizPanel, type QuizDirection, type QuizItem } from '@/components/QuizPanel/QuizPanel';
import { WordForm } from '@/components/WordForm/WordForm';
import { WordList } from '@/components/WordList/WordList';
import {
  getDatabase,
  buildMissedWordId,
  type AppDatabase,
  type GroupRecord,
  type MissedWordRecord,
  type SrsPracticeRecord,
  type WordDefinition,
  type WordRecord,
} from '@/lib/db';
import { definitionsToMeaning, getWordDefinitions, normalizeDefinitions } from '@/lib/definitions';
import {
  getActiveGroupNames,
  getWordGroups,
  removeGroupFromWordGroups,
  replaceGroupInWordGroups,
  wordHasAnyGroup,
  wordHasGroup,
} from '@/lib/groups';
import { buildSrsId, computeSm2, createInitialSrsRecord, type SrsRating } from '@/lib/srs';
import { buildSrsPracticeId, createInitialSrsPracticeRecord } from '@/lib/srs-practice';
import {
  performFullSync,
  // pullRemoteGroups,
  // pullRemoteMissedWords,
  // pullRemoteWords,
  // pushAllLocalGroups,
  // pushAllLocalMissedWords,
  // pushAllLocalWords,
  pushGroupToRemote,
  pushMissedWordToRemote,
  pushWordToRemote,
  pushSrsRecordToRemote,
  pushSrsPracticeWordToRemote,
  setupOnlineSyncListener,
} from '@/lib/sync';
import { resolveWordTextFromMainTable } from '@/lib/word-display';

const quizRanges = {
  all: 'All Words',
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Last 7 days',
  month: 'Last 30 days',
  year: 'This year',
  custom: 'Custom Range',
} as const;

const quizSources = {
  words: 'Regular',
  missed: 'Missed Words',
  srs: 'SRS Review',
  srsPractice: 'SRS Practice',
} as const;

const practiceDisplayModes = {
  missed: 'Missed Words',
  srs: 'SRS Practice',
} as const;

const quizDirections = {
  wordToMeaning: 'Word → Meaning',
  meaningToWord: 'Meaning → Word',
  spelling: 'Spelling Mode',
} as const;

type QuizRangeKey = keyof typeof quizRanges;

type QuizSourceKey = keyof typeof quizSources;

type QuizDirectionKey = keyof typeof quizDirections;

type PracticeDisplayKey = keyof typeof practiceDisplayModes;

type WordWithDefinitions<T> = T & { definitions?: WordDefinition[] };

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRangeStart(range: QuizRangeKey, customStart?: string | null): Date | null {
  if (range === 'custom') {
    return customStart ? new Date(customStart) : null;
  }
  const now = new Date();
  if (range === 'all') {
    return null;
  }
  if (range === 'year') {
    return new Date(now.getFullYear(), 0, 1);
  }
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (range === 'yesterday') {
    const start = new Date(now);
    start.setDate(now.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  const days = range === 'week' ? 7 : 30;
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return start;
}

function getRangeEnd(range: QuizRangeKey, customEnd?: string | null): Date | null {
  if (range === 'custom') {
    return customEnd ? new Date(customEnd) : null;
  }
  const now = new Date();
  if (range === 'all') {
    return null;
  }
  if (range === 'today') {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end.setHours(23, 59, 59, 999);
    return end;
  }
  if (range === 'yesterday') {
    const end = new Date(now);
    end.setDate(now.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  return now;
}

function formatDateTimeLocal(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getInitialCustomStart(): string {
  const date = new Date();
  date.setDate(date.getDate() - 2);
  date.setHours(0, 0, 0, 0);
  return formatDateTimeLocal(date);
}

function getInitialCustomEnd(): string {
  return formatDateTimeLocal(new Date());
}

function toMutableWordRecord(record: any): WordRecord {
  const definitions = normalizeDefinitions(record.definitions, record.meaning ?? '');
  return {
    ...record,
    meaning: definitionsToMeaning(definitions),
    definitions,
    customGroups: getWordGroups(record),
  } as WordRecord;
}

function capitalizeWord(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

async function requestExamples(word: string, meaning: string): Promise<string[]> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return [];
  }

  const response = await fetch('/api/examples', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, meaning }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn('Examples API error:', response.status, errorText);
    return [];
  }

  const data = await response.json();
  return Array.isArray(data?.examples)
    ? data.examples.map((item: string) => String(item).trim()).filter(Boolean)
    : [];
}

/** Fetches 3-5 AI example sentences for each definition, in parallel, keeping them grouped
 * per-definition (index-aligned with the `definitions` array). */
async function requestExamplesForDefinitions(
  word: string,
  definitions: WordDefinition[]
): Promise<string[][]> {
  return Promise.all(definitions.map((definition) => requestExamples(word, definition.meaning)));
}

function mergeExamplesIntoDefinitions(
  definitions: WordDefinition[],
  examplesPerDefinition: string[][]
): WordDefinition[] {
  return definitions.map((definition, index) => ({
    ...definition,
    examples: examplesPerDefinition[index] ?? definition.examples ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Virtualized missed-word list
// ---------------------------------------------------------------------------

interface MissedWordVirtualListProps {
  words: Array<MissedWordRecord & { definitions?: WordDefinition[] }>;
  hideMissedMeanings: boolean;
  revealedMissedWordIds: Record<string, boolean>;
  onRevealMissedWord: (id: string) => void;
  onRefreshExamples: (id: string) => void;
  onUnmarkMissed: (id: string) => void;
}

function MissedWordVirtualList({
  words,
  hideMissedMeanings,
  revealedMissedWordIds,
  onRevealMissedWord,
  onRefreshExamples,
  onUnmarkMissed,
}: MissedWordVirtualListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    const updateScrollMargin = () => {
      if (listRef.current) {
        setScrollMargin(listRef.current.getBoundingClientRect().top + window.scrollY);
      }
    };
    updateScrollMargin();
    window.addEventListener('resize', updateScrollMargin);
    return () => window.removeEventListener('resize', updateScrollMargin);
  }, []);

  const rowVirtualizer = useWindowVirtualizer({
    count: words.length,
    estimateSize: () => 100,
    getItemKey: useCallback((index: number) => words[index]?.id || index, [words]),
    overscan: 5,
    scrollMargin,
  });

  const speakWord = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div ref={listRef}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const word = words[virtualRow.index];
          const count = word.missedCount;
          const severity =
            count >= 5
              ? {
                color: '#ef4444',
                bg: 'rgba(239,68,68,0.08)',
                border: 'rgba(239,68,68,0.25)',
                badgeColor: 'red' as const,
              }
              : count >= 3
                ? {
                  color: '#f97316',
                  bg: 'rgba(249,115,22,0.07)',
                  border: 'rgba(249,115,22,0.2)',
                  badgeColor: 'orange' as const,
                }
                : {
                  color: '#22c55e',
                  bg: 'rgba(34,197,94,0.06)',
                  border: 'rgba(34,197,94,0.18)',
                  badgeColor: 'teal' as const,
                };

          const isRevealed = !hideMissedMeanings || revealedMissedWordIds[word.id];

          return (
            <div
              key={word.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                paddingBottom: '8px',
              }}
            >
              <div
                style={{
                  borderRadius: '12px',
                  border: `1px solid ${severity.border}`,
                  borderLeft: `4px solid ${severity.color}`,
                  background: severity.bg,
                  padding: '12px 16px',
                  transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                }}
                className="hover-lift"
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <Group gap={8} align="center" wrap="wrap" mb={4}>
                      <Text
                        fw={700}
                        size="md"
                        style={{
                          fontFamily: 'var(--font-title)',
                          color: 'var(--text-primary)',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {word.word}
                      </Text>
                      <Badge
                        color={severity.badgeColor}
                        variant="light"
                        size="xs"
                        radius="sm"
                        style={{ fontWeight: 700, fontSize: '10px' }}
                      >
                        ×{count} missed
                      </Badge>
                    </Group>

                    <Group gap={4} style={{ flexShrink: 0 }}>
                      <Tooltip label="Regenerate examples" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="indigo"
                          size="md"
                          radius="md"
                          onClick={() => onRefreshExamples(word.wordId)}
                          style={{ transition: 'all 0.2s ease' }}
                        >
                          <IconRotateClockwise size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Listen to pronunciation" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="md"
                          radius="md"
                          onClick={() => speakWord(word.word)}
                          style={{ transition: 'all 0.2s ease' }}
                        >
                          <IconVolume size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Remove from missed list" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="md"
                          radius="md"
                          onClick={() => onUnmarkMissed(word.id)}
                          style={{ transition: 'all 0.2s ease' }}
                        >
                          <IconBookmarkOff size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </div>

                  {isRevealed ? (
                    <div style={{ marginTop: 4 }}>
                      <DefinitionsDisplay definitions={word.definitions} fallbackMeaning={word.meaning} />
                    </div>
                  ) : (
                    <Button
                      variant="subtle"
                      color="indigo"
                      size="xs"
                      radius="sm"
                      onClick={() => onRevealMissedWord(word.id)}
                      leftSection={<IconEye size={12} />}
                      style={{
                        fontSize: '11px',
                        height: '22px',
                        paddingLeft: '8px',
                        paddingRight: '8px',
                        display: 'inline-flex',
                        marginTop: '4px',
                      }}
                    >
                      Show Definition
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatPracticeDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    timeStyle: 'medium',
    dateStyle: 'medium',
  });
}

function getDifficultyBadgeColor(difficulty: SrsPracticeRecord['difficulty']): string {
  if (difficulty === 'again') return 'red';
  if (difficulty === 'hard') return 'orange';
  if (difficulty === 'easy') return 'indigo';
  return 'teal';
}

interface SrsPracticeVirtualListProps {
  words: Array<SrsPracticeRecord & { definitions?: WordDefinition[] }>;
  hideMeanings: boolean;
  revealedWordIds: Record<string, boolean>;
  onRevealWord: (id: string) => void;
  onRefreshExamples: (id: string) => void;
  onToggleMissed: (word: SrsPracticeRecord) => void;
  isMissedWord: (wordId: string) => boolean;
  onEditClick?: (id: string) => void;
  onQuizWord: (id: string) => void;
}

function SrsPracticeVirtualList({
  words,
  hideMeanings,
  revealedWordIds,
  onRevealWord,
  onRefreshExamples,
  onToggleMissed,
  isMissedWord,
  onEditClick,
}: SrsPracticeVirtualListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    const updateScrollMargin = () => {
      if (listRef.current) {
        setScrollMargin(listRef.current.getBoundingClientRect().top + window.scrollY);
      }
    };
    updateScrollMargin();
    window.addEventListener('resize', updateScrollMargin);
    return () => window.removeEventListener('resize', updateScrollMargin);
  }, []);

  const rowVirtualizer = useWindowVirtualizer({
    count: words.length,
    estimateSize: () => 120,
    getItemKey: useCallback((index: number) => words[index]?.id || index, [words]),
    overscan: 5,
    scrollMargin,
  });

  const speakWord = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div ref={listRef}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const word = words[virtualRow.index];
          const isRevealed = !hideMeanings || revealedWordIds[word.id];
          const missed = isMissedWord(word.wordId);

          return (
            <div
              key={word.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                paddingBottom: '8px',
              }}
            >
              <div
                style={{
                  borderRadius: '12px',
                  border: '1px solid rgba(139,92,246,0.18)',
                  borderLeft: '4px solid #8b5cf6',
                  background: 'rgba(139,92,246,0.05)',
                  padding: '12px 16px',
                  transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                }}
                className="hover-lift"
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <Group gap={8} align="center" wrap="wrap" mb={4}>
                      <Text
                        fw={700}
                        size="md"
                        style={{
                          fontFamily: 'var(--font-title)',
                          color: 'var(--text-primary)',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {word.word}
                      </Text>
                      <Badge
                        color={getDifficultyBadgeColor(word.difficulty)}
                        variant="light"
                        size="xs"
                        radius="sm"
                        style={{ fontWeight: 700, fontSize: '10px' }}
                      >
                        {word.difficulty}
                      </Badge>
                      {missed && (
                        <Badge
                          color="red"
                          variant="light"
                          size="xs"
                          radius="sm"
                          style={{ fontWeight: 700, fontSize: '10px' }}
                        >
                          missed
                        </Badge>
                      )}
                    </Group>

                    <Group gap={4} style={{ flexShrink: 0 }}>
                      <Tooltip label="Regenerate examples" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="indigo"
                          size="md"
                          radius="md"
                          onClick={() => onRefreshExamples(word.wordId)}
                          style={{ transition: 'all 0.2s ease' }}
                        >
                          <IconRotateClockwise size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Listen to pronunciation" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="md"
                          radius="md"
                          onClick={() => speakWord(word.word)}
                          style={{ transition: 'all 0.2s ease' }}
                        >
                          <IconVolume size={16} />
                        </ActionIcon>
                      </Tooltip>
                      {onEditClick && (
                        <Tooltip label="Edit word" withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="md"
                            radius="md"
                            onClick={() => onEditClick(word.wordId)}
                            style={{ transition: 'all 0.2s ease' }}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      <Tooltip
                        label={missed ? 'Remove from missed list' : 'Add to missed list'}
                        withArrow
                      >
                        <ActionIcon
                          variant="subtle"
                          color={missed ? 'teal' : 'red'}
                          size="md"
                          radius="md"
                          onClick={() => onToggleMissed(word)}
                          style={{ transition: 'all 0.2s ease' }}
                        >
                          {missed ? <IconBookmark size={16} /> : <IconBookmarkOff size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </div>

                  <Text size="xs" c="dimmed" mb={6}>
                    Practiced {formatPracticeDate(word.practicedAt)}
                  </Text>

                  {isRevealed ? (
                    <div style={{ marginTop: 4 }}>
                      <DefinitionsDisplay definitions={word.definitions} fallbackMeaning={word.meaning} />
                    </div>
                  ) : (
                    <Button
                      variant="subtle"
                      color="indigo"
                      size="xs"
                      radius="sm"
                      onClick={() => onRevealWord(word.id)}
                      leftSection={<IconEye size={12} />}
                      style={{
                        fontSize: '11px',
                        height: '22px',
                        paddingLeft: '8px',
                        paddingRight: '8px',
                        display: 'inline-flex',
                        marginTop: '4px',
                      }}
                    >
                      Show Definition
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PracticeDisplayComboboxProps {
  value: PracticeDisplayKey;
  onChange: (value: PracticeDisplayKey) => void;
}

function PracticeDisplayCombobox({ value, onChange }: PracticeDisplayComboboxProps) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(selected) => {
        onChange(selected as PracticeDisplayKey);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          pointer
          rightSection={<IconChevronDown size={14} />}
          onClick={() => combobox.toggleDropdown()}
          styles={{
            input: {
              minWidth: 180,
              fontWeight: 600,
            },
          }}
        >
          {practiceDisplayModes[value]}
        </InputBase>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {Object.entries(practiceDisplayModes).map(([optionValue, label]) => (
            <Combobox.Option key={optionValue} value={optionValue}>
              {label}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export default function HomePage() {
  const [database, setDatabase] = useState<AppDatabase | null>(null);
  const [words, setWords] = useState<WordRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [missedWords, setMissedWords] = useState<MissedWordRecord[]>([]);
  const [srsRecords, setSrsRecords] = useState<import('@/lib/db').SrsRecord[]>([]);
  const [srsPracticeWords, setSrsPracticeWords] = useState<SrsPracticeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<'study' | 'quiz'>('study');
  const [quizRange, setQuizRange] = useState<QuizRangeKey>('all');
  const [quizSource, setQuizSource] = useState<QuizSourceKey>('words');
  const [quizDirection, setQuizDirection] = useState<QuizDirectionKey>('wordToMeaning');
  const [customStart, setCustomStart] = useState<string>(() => getInitialCustomStart());
  const [customEnd, setCustomEnd] = useState<string>(() => getInitialCustomEnd());
  const [quizQueue, setQuizQueue] = useState<QuizItem[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [editingQuizWordId, setEditingQuizWordId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'word' | 'wordAndDefinition'>('word');
  const [page, setPage] = useState(1);

  // Custom Groups states
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [quizGroupFilter, setQuizGroupFilter] = useState<string>('all');
  const [practiceDisplayMode, setPracticeDisplayMode] = useState<PracticeDisplayKey>('missed');
  const [hideSrsPracticeMeanings, setHideSrsPracticeMeanings] = useState(false);
  const [revealedSrsPracticeWordIds, setRevealedSrsPracticeWordIds] = useState<
    Record<string, boolean>
  >({});

  const customGroups = useMemo(() => getActiveGroupNames(groups), [groups]);

  // Custom states for UI Enhancements
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgressRef = useRef(false);

  const withSyncState = useCallback(async (task: () => Promise<void>) => {
    if (syncInProgressRef.current || !navigator.onLine) {
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);
    try {
      await task();
    } catch (error) {
      console.error(error);
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  const pageSize = 15; // Enhanced list density
  const prevQuizRangeRef = useRef<QuizRangeKey>('all');
  const prevQuizSourceRef = useRef<QuizSourceKey>('words');
  const prevQuizDirectionRef = useRef<QuizDirectionKey>('wordToMeaning');
  const prevCustomStartRef = useRef<string>(customStart);
  const prevCustomEndRef = useRef<string>(customEnd);
  const prevQuizGroupFilterRef = useRef<string>('all');

  const ensureGroupExists = useCallback(
    async (groupName: string) => {
      if (!database) {
        return;
      }

      const trimmed = groupName.trim();
      if (!trimmed) {
        return;
      }

      const existing = groups.find((g) => !g.isDeleted && g.name === trimmed);
      if (existing) {
        return;
      }

      const timestamp = new Date().toISOString();
      const record: GroupRecord = {
        id: crypto.randomUUID(),
        name: trimmed,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
        lastSyncedAt: '',
      };

      await database.groups.upsert(record);
      await pushGroupToRemote(database.groups, record);
    },
    [database, groups]
  );

  const handleAddCustomGroup = useCallback(
    (newGroup: string) => {
      void ensureGroupExists(newGroup);
    },
    [ensureGroupExists]
  );

  const handleRenameGroup = useCallback(
    async (id: string, newName: string) => {
      if (!database) {
        return;
      }

      const trimmed = newName.trim();
      if (!trimmed) {
        return;
      }

      const groupDoc = await database.groups.findOne(id).exec();
      if (!groupDoc || groupDoc.isDeleted) {
        return;
      }

      const oldName = groupDoc.name;
      if (oldName === trimmed) {
        return;
      }

      const duplicate = groups.some((g) => !g.isDeleted && g.id !== id && g.name === trimmed);
      if (duplicate) {
        return;
      }

      const timestamp = new Date().toISOString();
      const updatedGroup: GroupRecord = {
        ...groupDoc.toJSON(),
        name: trimmed,
        updatedAt: timestamp,
      };
      await database.groups.upsert(updatedGroup);
      await pushGroupToRemote(database.groups, updatedGroup);

      const allWords = await database.words.find().exec();
      for (const wordDoc of allWords) {
        const record = toMutableWordRecord(wordDoc.toJSON());
        if (!wordHasGroup(record, oldName)) {
          continue;
        }

        const nextRecord = {
          ...record,
          customGroups: replaceGroupInWordGroups(getWordGroups(record), oldName, trimmed),
          updatedAt: timestamp,
        };
        await database.words.upsert(nextRecord);
        await pushWordToRemote(database.words, nextRecord);
      }
    },
    [database, groups]
  );

  const handleDeleteGroup = useCallback(
    async (id: string) => {
      if (!database) {
        return;
      }

      const groupDoc = await database.groups.findOne(id).exec();
      if (!groupDoc || groupDoc.isDeleted) {
        return;
      }

      const groupName = groupDoc.name;
      const timestamp = new Date().toISOString();
      const deletedGroup: GroupRecord = {
        ...groupDoc.toJSON(),
        isDeleted: true,
        updatedAt: timestamp,
      };
      await database.groups.upsert(deletedGroup);
      await pushGroupToRemote(database.groups, deletedGroup);

      const allWords = await database.words.find().exec();
      for (const wordDoc of allWords) {
        const record = toMutableWordRecord(wordDoc.toJSON());
        if (!wordHasGroup(record, groupName)) {
          continue;
        }

        const nextRecord = {
          ...record,
          customGroups: removeGroupFromWordGroups(getWordGroups(record), groupName),
          updatedAt: timestamp,
        };
        await database.words.upsert(nextRecord);
        await pushWordToRemote(database.words, nextRecord);
      }
    },
    [database]
  );

  const handleCreateGroup = useCallback(
    async (name: string) => {
      await ensureGroupExists(name);
    },
    [ensureGroupExists]
  );

  // Track Network Status dynamically
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    setOnlineStatus(navigator.onLine);
    const goOnline = () => setOnlineStatus(true);
    const goOffline = () => setOnlineStatus(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const filteredWords = useMemo(() => {
    let list = words;
    if (groupFilter !== 'all') {
      if (groupFilter === 'none') {
        list = list.filter((w) => !wordHasAnyGroup(w));
      } else {
        list = list.filter((w) => wordHasGroup(w, groupFilter));
      }
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return list;
    }
    return list.filter((word) => {
      if (word.word.toLowerCase().includes(query)) {
        return true;
      }
      if (searchScope === 'wordAndDefinition') {
        return getWordDefinitions(word).some((definition) =>
          definition.meaning.toLowerCase().includes(query)
        );
      }
      return false;
    });
  }, [words, searchQuery, searchScope, groupFilter]);

  const wordsById = useMemo(() => {
    return new Map(words.map((word) => [word.id, word]));
  }, [words]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / pageSize));

  const pagedWords = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredWords.slice(startIndex, startIndex + pageSize);
  }, [filteredWords, page]);

  // Compute Stats dashboard numbers
  const unsyncedCount = useMemo(() => {
    return words.filter((word) => !word.lastSyncedAt || word.lastSyncedAt < word.updatedAt).length;
  }, [words]);

  const todayCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return words.filter((word) => new Date(word.createdAt) >= todayStart).length;
  }, [words]);

  const missedWordsForMode = useMemo(
    () =>
      missedWords
        .filter((word) => word.quizMode === quizDirection)
        .map((word) => resolveWordTextFromMainTable(word, wordsById))
        .filter((word): word is WordWithDefinitions<MissedWordRecord> => word !== null),
    [missedWords, quizDirection, wordsById]
  );

  const missedWordIdSet = useMemo(
    () => new Set(missedWordsForMode.map((word) => word.wordId)),
    [missedWordsForMode]
  );

  // SRS records due for review (nextReviewAt <= now)
  const srsDueRecords = useMemo(() => {
    const now = new Date().toISOString();
    return srsRecords
      .filter((r) => !r.isDeleted && r.quizMode === quizDirection && r.nextReviewAt <= now)
      .map((record) => resolveWordTextFromMainTable(record, wordsById))
      .filter(
        (record): record is WordWithDefinitions<import('@/lib/db').SrsRecord> => record !== null
      )
      .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
  }, [srsRecords, quizDirection, wordsById]);

  const srsDueTodayCount = useMemo(() => srsDueRecords.length, [srsDueRecords]);

  const recentSrsPracticeWords = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return srsPracticeWords
      .filter(
        (record) =>
          !record.isDeleted &&
          record.quizMode === quizDirection &&
          new Date(record.practicedAt).getTime() >= cutoff
      )
      .map((record) => resolveWordTextFromMainTable(record, wordsById))
      .filter((record): record is WordWithDefinitions<SrsPracticeRecord> => record !== null)
      .sort((a, b) => b.practicedAt.localeCompare(a.practicedAt));
  }, [srsPracticeWords, quizDirection, wordsById]);

  const getCandidateWordId = useCallback(
    (word: WordRecord | MissedWordRecord | import('@/lib/db').SrsRecord | SrsPracticeRecord) => {
      if (quizSource === 'missed') return (word as MissedWordRecord).wordId;
      if (quizSource === 'srs' || quizSource === 'srsPractice') {
        return (word as import('@/lib/db').SrsRecord | SrsPracticeRecord).wordId;
      }
      return word.id;
    },
    [quizSource]
  );

  const saveMissedWordRecord = useCallback(
    async (wordId: string, word: string, meaning: string, quizMode: QuizDirectionKey) => {
      if (!database) {
        return;
      }

      const timestamp = new Date().toISOString();
      const missedId = buildMissedWordId(wordId, quizMode);
      const existing = await database.missedWords.findOne(missedId).exec();

      if (existing) {
        const current = existing.toJSON();
        const updated = {
          ...current,
          word,
          meaning,
          missedAt: timestamp,
          missedCount: current.missedCount + 1,
          updatedAt: timestamp,
          isDeleted: false,
        };
        await database.missedWords.upsert(updated);
        await pushMissedWordToRemote(database.missedWords, updated);
        return;
      }

      const record: MissedWordRecord = {
        id: missedId,
        wordId,
        quizMode,
        word,
        meaning,
        missedAt: timestamp,
        missedCount: 1,
        updatedAt: timestamp,
        lastSyncedAt: '',
        isDeleted: false,
      };

      await database.missedWords.upsert(record);
      await pushMissedWordToRemote(database.missedWords, record);
    },
    [database]
  );

  const removeMissedWordRecord = useCallback(
    async (wordId: string, quizMode: QuizDirectionKey) => {
      if (!database) {
        return;
      }

      const missedId = buildMissedWordId(wordId, quizMode);
      const existing = await database.missedWords.findOne(missedId).exec();
      if (!existing) {
        return;
      }

      const timestamp = new Date().toISOString();
      const record = {
        ...existing.toJSON(),
        isDeleted: true,
        updatedAt: timestamp,
      };

      await database.missedWords.upsert(record);
      await pushMissedWordToRemote(database.missedWords, record);
    },
    [database]
  );

  const toggleMissedWordRecord = useCallback(
    async (wordId: string, word: string, meaning: string, quizMode: QuizDirectionKey) => {
      const missedId = buildMissedWordId(wordId, quizMode);
      const existing = await database?.missedWords.findOne(missedId).exec();
      if (existing && !existing.isDeleted) {
        await removeMissedWordRecord(wordId, quizMode);
      } else {
        await saveMissedWordRecord(wordId, word, meaning, quizMode);
      }
    },
    [database, removeMissedWordRecord, saveMissedWordRecord]
  );

  const quizCandidates = useMemo(() => {
    // SRS source ignores date range — scheduling is handled by the algorithm
    if (quizSource === 'srs') {
      let candidates: (WordRecord | MissedWordRecord | import('@/lib/db').SrsRecord)[] =
        srsDueRecords;
      if (quizGroupFilter !== 'all') {
        candidates = candidates.filter((item) => {
          const correspondingWord = words.find(
            (w) => w.id === (item as import('@/lib/db').SrsRecord).wordId
          );
          if (!correspondingWord) return quizGroupFilter === 'none';
          return quizGroupFilter === 'none'
            ? !wordHasAnyGroup(correspondingWord)
            : wordHasGroup(correspondingWord, quizGroupFilter);
        });
      }
      return candidates;
    }

    if (quizSource === 'srsPractice') {
      let candidates: SrsPracticeRecord[] = recentSrsPracticeWords;
      if (quizGroupFilter !== 'all') {
        candidates = candidates.filter((item) => {
          const correspondingWord = words.find((w) => w.id === item.wordId);
          if (!correspondingWord) return quizGroupFilter === 'none';
          return quizGroupFilter === 'none'
            ? !wordHasAnyGroup(correspondingWord)
            : wordHasGroup(correspondingWord, quizGroupFilter);
        });
      }
      return candidates;
    }

    const start = getRangeStart(quizRange, customStart);
    const end = getRangeEnd(quizRange, customEnd);

    if (!start && quizRange !== 'all') {
      return [];
    }

    let candidates: (WordRecord | MissedWordRecord)[]

    if (quizSource === 'missed') {
      candidates = missedWordsForMode.filter((word) => {
        if (quizRange === 'all') {
          return true;
        }
        const createdAt = new Date(word.missedAt);
        if (end) {
          return createdAt >= (start as Date) && createdAt <= end;
        }
        return createdAt >= (start as Date);
      });
    } else {
      candidates = words.filter((word) => {
        if (quizRange === 'all') {
          return true;
        }
        const createdAt = new Date(word.createdAt);
        if (end) {
          return createdAt >= (start as Date) && createdAt <= end;
        }
        return createdAt >= (start as Date);
      });
    }

    // Apply quiz group filter
    if (quizGroupFilter !== 'all') {
      if (quizSource === 'missed') {
        candidates = candidates.filter((item) => {
          const correspondingWord = words.find((w) => w.id === (item as MissedWordRecord).wordId);
          if (!correspondingWord) {
            return quizGroupFilter === 'none';
          }
          return quizGroupFilter === 'none'
            ? !wordHasAnyGroup(correspondingWord)
            : wordHasGroup(correspondingWord, quizGroupFilter);
        });
      } else {
        candidates = candidates.filter((word) => {
          const record = word as WordRecord;
          return quizGroupFilter === 'none'
            ? !wordHasAnyGroup(record)
            : wordHasGroup(record, quizGroupFilter);
        });
      }
    }

    return candidates;
  }, [
    words,
    missedWordsForMode,
    srsDueRecords,
    recentSrsPracticeWords,
    quizRange,
    quizSource,
    customStart,
    customEnd,
    quizGroupFilter,
  ]);

  const resetQuiz = useCallback(() => {
    const queue = shuffle(
      quizCandidates.map((word) => {
        const wordId = getCandidateWordId(word);
        const definitions = normalizeDefinitions((word as { definitions?: WordDefinition[] }).definitions, word.meaning);
        return {
          id: wordId,
          word: word.word,
          meaning: definitionsToMeaning(definitions),
          definitions,
          tags: words.find((w) => w.id === wordId)?.customGroups || [],
        };
      })
    );
    setQuizQueue(queue);
    setQuizIndex(0);
    setRevealed(false);
    setCompleted(queue.length === 0);
  }, [quizCandidates, getCandidateWordId, words]);

  // Initialize quiz when candidates are available, only if quiz is empty
  useEffect(() => {
    if (quizQueue.length === 0 && quizCandidates.length > 0) {
      console.log('Initializing quiz with', quizCandidates.length, 'candidates');
      resetQuiz();
    }
  }, [quizCandidates.length, resetQuiz, quizQueue.length]);

  useEffect(() => {
    if (prevQuizDirectionRef.current === quizDirection) {
      return;
    }
    setRevealed(false);
  }, [quizDirection]);

  // Reset quiz when quiz range/source, custom range dates, group, or quiz mode (for missed source) change
  useEffect(() => {
    const rangeChanged = prevQuizRangeRef.current !== quizRange;
    const sourceChanged = prevQuizSourceRef.current !== quizSource;
    const customStartChanged = prevCustomStartRef.current !== customStart;
    const customEndChanged = prevCustomEndRef.current !== customEnd;
    const directionChanged = prevQuizDirectionRef.current !== quizDirection;
    const groupChanged = prevQuizGroupFilterRef.current !== quizGroupFilter;

    prevQuizRangeRef.current = quizRange;
    prevQuizSourceRef.current = quizSource;
    prevCustomStartRef.current = customStart;
    prevCustomEndRef.current = customEnd;
    prevQuizDirectionRef.current = quizDirection;
    prevQuizGroupFilterRef.current = quizGroupFilter;

    const poolChanged =
      rangeChanged ||
      sourceChanged ||
      customStartChanged ||
      customEndChanged ||
      groupChanged ||
      (directionChanged && (quizSource === 'missed' || quizSource === 'srsPractice'));

    if (!poolChanged || quizQueue.length === 0) {
      return;
    }

    if (quizCandidates.length === 0) {
      console.log('No words in this range');
      setQuizQueue([]);
      setCompleted(true);
      return;
    }

    console.log('Quiz pool changed, resetting quiz with', quizCandidates.length, 'candidates');
    const queue = shuffle(
      quizCandidates.map((word) => {
        const wordId = getCandidateWordId(word);
        const definitions = normalizeDefinitions((word as { definitions?: WordDefinition[] }).definitions, word.meaning);
        return {
          id: wordId,
          word: word.word,
          meaning: definitionsToMeaning(definitions),
          definitions,
          tags: words.find((w) => w.id === wordId)?.customGroups || [],
        };
      })
    );
    setQuizQueue(queue);
    setQuizIndex(0);
    setRevealed(false);
    setCompleted(queue.length === 0);
  }, [
    quizRange,
    quizSource,
    quizCandidates,
    quizQueue.length,
    customStart,
    customEnd,
    getCandidateWordId,
    quizDirection,
    quizGroupFilter,
    words,
  ]);

  useEffect(() => {
    let isMounted = true;
    let wordSubscription: { unsubscribe: () => void } | null = null;
    let groupSubscription: { unsubscribe: () => void } | null = null;
    let missedSubscription: { unsubscribe: () => void } | null = null;
    let srsSubscription: { unsubscribe: () => void } | null = null;
    let srsPracticeSubscription: { unsubscribe: () => void } | null = null;
    let cleanupOnlineListener: (() => void) | null = null;

    const load = async () => {
      const db = await getDatabase();
      if (!isMounted) {
        return;
      }

      setDatabase(db);

      const wordQuery = db.words.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ updatedAt: 'desc' }],
      });

      wordSubscription = wordQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setWords(docs.map((doc) => toMutableWordRecord(doc.toJSON())));
        setPage(1);
      });

      const groupQuery = db.groups.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ name: 'asc' }],
      });

      groupSubscription = groupQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setGroups(docs.map((doc) => doc.toJSON()));
      });

      const missedQuery = db.missedWords.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ updatedAt: 'desc' }],
      });

      missedSubscription = missedQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setMissedWords(docs.map((doc) => doc.toJSON()));
      });

      const srsQuery = db.srsRecords.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ nextReviewAt: 'asc' }],
      });

      srsSubscription = srsQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setSrsRecords(docs.map((doc) => doc.toJSON() as import('@/lib/db').SrsRecord));
      });

      const srsPracticeQuery = db.srsPracticeWords.find({
        selector: { isDeleted: { $ne: true } },
        sort: [{ practicedAt: 'desc' }],
      });

      srsPracticeSubscription = srsPracticeQuery.$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setSrsPracticeWords(docs.map((doc) => doc.toJSON() as SrsPracticeRecord));
      });

      // Mark UI as ready immediately — local DB is available
      if (isMounted) {
        setIsLoading(false);
      }

      // Set up online listener before kicking off background sync
      cleanupOnlineListener = setupOnlineSyncListener(
        db.words,
        db.missedWords,
        db.groups,
        db.srsRecords,
        db.srsPracticeWords,
        () =>
          withSyncState(() =>
            performFullSync(
              db.words,
              db.missedWords,
              db.groups,
              db.srsRecords,
              db.srsPracticeWords
            )
          )
      );

      // Sync in background — does not block UI rendering
      if (navigator.onLine) {
        console.log('App started online: Starting background sync...');
        void withSyncState(() =>
          performFullSync(
            db.words,
            db.missedWords,
            db.groups,
            db.srsRecords,
            db.srsPracticeWords
          )
        );
      } else {
        console.log('App started offline: Using local data. Will sync when online.');
        // Flush outboxes eagerly when offline — they guard against future
        // online reconnects. The online listener will trigger the full sync.
        // Nothing more to do here; local DB is already loaded above.
      }
    };

    load();

    return () => {
      isMounted = false;
      wordSubscription?.unsubscribe();
      groupSubscription?.unsubscribe();
      missedSubscription?.unsubscribe();
      srsSubscription?.unsubscribe();
      srsPracticeSubscription?.unsubscribe();
      cleanupOnlineListener?.();
    };
  }, []);

  const currentQuizItem = quizQueue[quizIndex] ?? null;
  const [isCurrentMarkedMissed, setIsCurrentMarkedMissed] = useState(false);
  const [hideMissedMeanings, setHideMissedMeanings] = useState(false);
  const [revealedMissedWordIds, setRevealedMissedWordIds] = useState<Record<string, boolean>>({});

  const checkCurrentWordMissedStatus = useCallback(async () => {
    if (!database || !currentQuizItem) {
      setIsCurrentMarkedMissed(false);
      return;
    }
    try {
      const missedId = buildMissedWordId(currentQuizItem.id, quizDirection);
      const doc = await database.missedWords.findOne(missedId).exec();
      const isMissed = !!doc && !doc.isDeleted;
      setIsCurrentMarkedMissed(isMissed);
      console.log(`[Check Missed Status] Word "${currentQuizItem.word}" is missed: ${isMissed}`);
    } catch (error) {
      console.error('Error checking missed status in DB:', error);
    }
  }, [database, currentQuizItem, quizDirection]);

  // Run check when word, database, or missedWords list changes
  useEffect(() => {
    checkCurrentWordMissedStatus();
  }, [currentQuizItem, database, missedWords, checkCurrentWordMissedStatus]);

  useEffect(() => {
    if (!database || isLoading) {
      return;
    }

    const migrateGroups = async () => {
      const legacyNames = new Set<string>();

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('self_quiz_custom_groups');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              for (const name of parsed) {
                if (typeof name === 'string' && name.trim()) {
                  legacyNames.add(name.trim());
                }
              }
            }
          } catch (error) {
            console.error('Failed to parse stored groups', error);
          }
        }
      }

      const allWords = await database.words.find().exec();
      for (const wordDoc of allWords) {
        for (const groupName of getWordGroups(toMutableWordRecord(wordDoc.toJSON()))) {
          legacyNames.add(groupName);
        }
      }

      const existingGroups = await database.groups.find().exec();
      const existingNames = new Set(existingGroups.filter((g) => !g.isDeleted).map((g) => g.name));

      for (const name of legacyNames) {
        if (existingNames.has(name)) {
          continue;
        }
        const timestamp = new Date().toISOString();
        const record: GroupRecord = {
          id: crypto.randomUUID(),
          name,
          createdAt: timestamp,
          updatedAt: timestamp,
          isDeleted: false,
          lastSyncedAt: '',
        };
        await database.groups.upsert(record);
        await pushGroupToRemote(database.groups, record);
      }

      if (typeof window !== 'undefined' && legacyNames.size > 0) {
        localStorage.removeItem('self_quiz_custom_groups');
      }
    };

    void migrateGroups();
  }, [database, isLoading]);

  const handleAdd = async (
    word: string,
    meaning: string,
    definitions: WordDefinition[],
    selectedGroups: string[]
  ) => {
    if (!database) {
      return;
    }

    const normalizedGroups = Array.from(
      new Set(selectedGroups.map((g) => g.trim()).filter((g) => g.length > 0))
    );
    for (const groupName of normalizedGroups) {
      await ensureGroupExists(groupName);
    }

    const timestamp = new Date().toISOString();
    const normalizedDefinitions = normalizeDefinitions(definitions, meaning);
    const normalizedMeaning = definitionsToMeaning(normalizedDefinitions);
    const record: WordRecord = {
      id: crypto.randomUUID(),
      word: capitalizeWord(word),
      meaning: normalizedMeaning,
      definitions: normalizedDefinitions,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
      lastSyncedAt: '',
      customGroups: normalizedGroups,
    };

    await database.words.upsert(record);
    await pushWordToRemote(database.words, record);

    // Auto-enqueue word into SRS for all quiz modes
    const quizModes: import('@/lib/db').QuizMode[] = [
      'wordToMeaning',
      // 'meaningToWord',
      // 'spelling'
    ];
    for (const qMode of quizModes) {
      const srsRecord = createInitialSrsRecord(record.id, qMode, capitalizeWord(word), normalizedMeaning);
      await database.srsRecords.upsert(srsRecord);
      void pushSrsRecordToRemote(database.srsRecords, srsRecord);
    }

    if (normalizedDefinitions.length > 0) {
      void (async () => {
        try {
          const examplesPerDefinition = await requestExamplesForDefinitions(
            record.word,
            normalizedDefinitions
          );
          if (examplesPerDefinition.every((examples) => examples.length === 0)) {
            return;
          }

          const doc = await database.words.findOne(record.id).exec();
          if (!doc) {
            return;
          }

          const current = toMutableWordRecord(doc.toJSON());
          const updated = {
            ...current,
            definitions: mergeExamplesIntoDefinitions(current.definitions, examplesPerDefinition),
            updatedAt: new Date().toISOString(),
          };

          await database.words.upsert(updated);
          await pushWordToRemote(database.words, updated);
        } catch (error) {
          console.error('Error fetching examples:', error);
        }
      })();
    }

    if (normalizedDefinitions.length === 0) {
      void (async () => {
        try {
          if (!navigator.onLine) {
            console.warn('Device is offline, skipping definition fetch for:', record.word);
            return;
          }

          const response = await fetch('/api/meaning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: record.word }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.warn(
              'Definition API error for word:',
              record.word,
              'Status:',
              response.status,
              errorText
            );
            return;
          }

          const data = await response.json();
          const aiDefinitions = normalizeDefinitions(data?.definitions, String(data?.meaning ?? ''));
          const aiMeaning = definitionsToMeaning(aiDefinitions);

          if (!aiMeaning) {
            console.warn('No definition returned for word:', record.word);
            return;
          }

          const doc = await database.words.findOne(record.id).exec();
          if (!doc) {
            console.warn('Word document not found after fetch:', record.id);
            return;
          }

          const current = toMutableWordRecord(doc.toJSON());
          if (getWordDefinitions(current).length > 0) {
            console.log('Meaning already exists, skipping update');
            return;
          }

          const updated = {
            ...current,
            meaning: aiMeaning,
            definitions: aiDefinitions,
            updatedAt: new Date().toISOString(),
          };

          await database.words.upsert(updated);
          await pushWordToRemote(database.words, updated);

          const examplesPerDefinition = await requestExamplesForDefinitions(
            updated.word,
            aiDefinitions
          );
          if (examplesPerDefinition.some((examples) => examples.length > 0)) {
            const withExamples = {
              ...updated,
              definitions: mergeExamplesIntoDefinitions(updated.definitions, examplesPerDefinition),
              updatedAt: new Date().toISOString(),
            };
            await database.words.upsert(withExamples);
            await pushWordToRemote(database.words, withExamples);
          }

          console.log('Definition updated for word:', record.word, '-', aiMeaning);
        } catch (error) {
          console.error('Error fetching definition:', error);
        }
      })();
    }
  };

  const handleDelete = async (id: string) => {
    if (!database) {
      return;
    }

    const doc = await database.words.findOne(id).exec();
    if (!doc) {
      return;
    }

    const timestamp = new Date().toISOString();
    const record = {
      ...toMutableWordRecord(doc.toJSON()),
      isDeleted: true,
      updatedAt: timestamp,
    };

    await database.words.upsert(record);
    await pushWordToRemote(database.words, record);
  };

  const handleEdit = async (
    id: string,
    word: string,
    meaning: string,
    definitions: WordDefinition[],
    customGroups: string[]
  ) => {
    if (!database) {
      return;
    }

    const doc = await database.words.findOne(id).exec();
    if (!doc) {
      return;
    }

    const normalizedGroups = Array.from(
      new Set(customGroups.map((g) => g.trim()).filter((g) => g.length > 0))
    );
    for (const groupName of normalizedGroups) {
      await ensureGroupExists(groupName);
    }

    const timestamp = new Date().toISOString();
    const current = toMutableWordRecord(doc.toJSON());
    const normalizedDefinitions = normalizeDefinitions(definitions, meaning);
    const normalizedMeaning = definitionsToMeaning(normalizedDefinitions);
    const record = {
      ...current,
      word,
      meaning: normalizedMeaning,
      definitions: normalizedDefinitions,
      customGroups: normalizedGroups,
      updatedAt: timestamp,
    };

    await database.words.upsert(record);
    await pushWordToRemote(database.words, record);
    setQuizQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              meaning: record.meaning,
              definitions: record.definitions,
            }
          : item
      )
    );
  };

  const handleRefreshExamples = async (id: string) => {
    if (!database) {
      return;
    }

    const doc = await database.words.findOne(id).exec();
    if (!doc) {
      return;
    }

    const record = toMutableWordRecord(doc.toJSON());
    let definitions = getWordDefinitions(record);

    if (definitions.length === 0) {
      if (!navigator.onLine) {
        console.warn('Device is offline, skipping examples fetch for:', record.word);
        return;
      }

      const response = await fetch('/api/meaning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: record.word }),
      });

      if (!response.ok) {
        console.warn('Failed to fetch meaning for examples:', record.word);
        return;
      }

      const data = await response.json();
      definitions = normalizeDefinitions(data?.definitions, String(data?.meaning ?? ''));
      const meaning = definitionsToMeaning(definitions);

      if (meaning) {
        const updated = {
          ...record,
          meaning,
          definitions,
          updatedAt: new Date().toISOString(),
        };
        await database.words.upsert(updated);
        await pushWordToRemote(database.words, updated);
      }
    }

    if (definitions.length === 0) {
      return;
    }

    const examplesPerDefinition = await requestExamplesForDefinitions(record.word, definitions);
    if (examplesPerDefinition.every((examples) => examples.length === 0)) {
      return;
    }

    const updatedDefinitions = mergeExamplesIntoDefinitions(definitions, examplesPerDefinition);
    const updated = {
      ...record,
      meaning: definitionsToMeaning(updatedDefinitions),
      definitions: updatedDefinitions,
      updatedAt: new Date().toISOString(),
    };

    await database.words.upsert(updated);
    await pushWordToRemote(database.words, updated);
    setQuizQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, definitions: updatedDefinitions } : item))
    );
  };

  const handleReveal = () => {
    setRevealed(true);
  };
  const handleUnmarkMissed = async (id: string) => {
    if (!database) {
      return;
    }
    const existing = await database.missedWords.findOne(id).exec();
    if (!existing) {
      return;
    }
    await removeMissedWordRecord(existing.wordId, existing.quizMode);
  };

  const [confirmClearAllOpen, setConfirmClearAllOpen] = useState(false);

  const handleUnmarkAllMissed = async () => {
    if (!database || missedWordsForMode.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString();
    for (const item of missedWordsForMode) {
      const record = {
        ...item,
        isDeleted: true,
        updatedAt: timestamp,
      };
      await database.missedWords.upsert(record);
      await pushMissedWordToRemote(database.missedWords, record);
    }
  };

  const handleConfirmClearAll = async () => {
    setConfirmClearAllOpen(false);
    await handleUnmarkAllMissed();
  };

  const handleToggleMissed = async () => {
    if (!currentQuizItem) {
      return;
    }
    await toggleMissedWordRecord(
      currentQuizItem.id,
      currentQuizItem.word,
      currentQuizItem.meaning,
      quizDirection
    );
    await checkCurrentWordMissedStatus();
  };

  const handleNext = useCallback(() => {
    const nextIndex = quizIndex + 1;
    if (nextIndex >= quizQueue.length) {
      setCompleted(true);
      setRevealed(false);
      return;
    }

    setQuizIndex(nextIndex);
    setRevealed(false);
  }, [quizIndex, quizQueue.length]);

  const handlePrevious = useCallback(() => {
    const prevIndex = Math.max(quizIndex - 1, 0);
    setQuizIndex(prevIndex);
    setRevealed(false);
  }, [quizIndex]);

  const runFullSync = useCallback(async () => {
    if (!database) {
      return;
    }
    await withSyncState(async () => {
      await performFullSync(
        database.words,
        database.missedWords,
        database.groups,
        database.srsRecords,
        database.srsPracticeWords
      );
      await checkCurrentWordMissedStatus();
    });
  }, [database, withSyncState, checkCurrentWordMissedStatus]);

  const handleManualSync = async () => {
    if (!database) {
      return;
    }
    console.log('User triggered manual sync...');
    await runFullSync();
  };

  useEffect(() => {
    if (!database || !onlineStatus) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void runFullSync();
    }, 10 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [database, onlineStatus, runFullSync]);

  // Automatically refresh the page after 10 minutes of inactivity
  useEffect(() => {
    let timerId = window.setTimeout(() => {
      window.location.reload();
    }, 10 * 60 * 1000);

    const resetTimer = () => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        window.location.reload();
      }, 10 * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      window.clearTimeout(timerId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  const toggleTheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

  const handleSrsRate = useCallback(
    async (rating: SrsRating) => {
      if (!database || !currentQuizItem) return;

      const srsId = buildSrsId(currentQuizItem.id, quizDirection);
      const existingDoc = await database.srsRecords.findOne(srsId).exec();

      const timestamp = new Date().toISOString();
      const now = new Date();

      let currentState = existingDoc
        ? (existingDoc.toJSON() as import('@/lib/db').SrsRecord)
        : createInitialSrsRecord(
          currentQuizItem.id,
          quizDirection as import('@/lib/db').QuizMode,
          currentQuizItem.word,
          currentQuizItem.meaning
        );

      const { easeFactor, interval, repetitions, nextReviewAt } = computeSm2(
        currentState,
        rating,
        now
      );

      const updated: import('@/lib/db').SrsRecord = {
        ...currentState,
        word: currentQuizItem.word,
        meaning: currentQuizItem.meaning,
        easeFactor,
        interval,
        repetitions,
        nextReviewAt,
        lastReviewedAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
      };

      await database.srsRecords.upsert(updated);
      void pushSrsRecordToRemote(database.srsRecords, updated);

      const practiceId = buildSrsPracticeId(
        currentQuizItem.id,
        quizDirection as import('@/lib/db').QuizMode
      );
      const shouldAddToPractice = rating === 'again' || rating === 'hard';

      if (shouldAddToPractice) {
        const practiceRecord = {
          ...createInitialSrsPracticeRecord(
            currentQuizItem.id,
            quizDirection as import('@/lib/db').QuizMode,
            currentQuizItem.word,
            currentQuizItem.meaning,
            rating,
            timestamp
          ),
          updatedAt: timestamp,
          isDeleted: false,
        };

        await database.srsPracticeWords.upsert(practiceRecord);
        void pushSrsPracticeWordToRemote(database.srsPracticeWords, practiceRecord);
      } else {
        // if later rated good/easy, remove it from SRS Practice
        const existing = await database.srsPracticeWords.findOne(practiceId).exec();
        if (existing) {
          const deletedRecord = {
            ...(existing.toJSON() as SrsPracticeRecord),
            difficulty: rating,
            practicedAt: timestamp,
            updatedAt: timestamp,
            isDeleted: true,
          };
          await database.srsPracticeWords.upsert(deletedRecord);
          void pushSrsPracticeWordToRemote(database.srsPracticeWords, deletedRecord);
        }
      }

      // const practiceRecord = {
      //   ...createInitialSrsPracticeRecord(
      //     currentQuizItem.id,
      //     quizDirection as import('@/lib/db').QuizMode,
      //     currentQuizItem.word,
      //     currentQuizItem.meaning,
      //     rating,
      //     timestamp
      //   ),
      //   updatedAt: timestamp,
      // };
      //
      // await database.srsPracticeWords.upsert(practiceRecord);
      // void pushSrsPracticeWordToRemote(database.srsPracticeWords, practiceRecord);

      // Advance to next card automatically
      handleNext();
    },
    [database, currentQuizItem, quizDirection, handleNext]
  );

  return (
    <Container size="md" py="xl">
      <PwaRegister />

      {/* Confirmation dialog for clearing all missed words */}
      <Modal
        opened={confirmClearAllOpen}
        onClose={() => setConfirmClearAllOpen(false)}
        title={
          <Text fw={700} size="md" style={{ fontFamily: 'var(--font-title)' }}>
            Clear All Missed Words?
          </Text>
        }
        centered
        radius="lg"
        size="sm"
        overlayProps={{ backgroundOpacity: 0.45, blur: 4 }}
      >
        <Stack gap="lg">
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
            This will permanently remove{' '}
            <Text component="span" fw={700} c="red">
              {missedWordsForMode.length} missed word{missedWordsForMode.length !== 1 ? 's' : ''}
            </Text>{' '}
            from the <strong>{quizDirections[quizDirection]}</strong> mode list. This action cannot
            be undone.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              color="gray"
              radius="md"
              onClick={() => setConfirmClearAllOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              radius="md"
              leftSection={<IconBookmarkOff size={16} />}
              onClick={handleConfirmClearAll}
            >
              Clear All
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Stack gap="xl">
        {/* --- Gorgeous Glassmorphic Header Panel --- */}
        <Card className="glass-panel header-panel" padding="xl" radius="lg">
          <Group className="header-inner" justify="space-between" align="flex-start" wrap="wrap">
            <Stack className="header-left" gap="xs" style={{ flex: 1 }}>
              <Title
                order={1}
                style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span className="text-gradient">English Word Memorizer</span>
              </Title>
              <Text c="dimmed" size="sm" style={{ lineHeight: 1.5, maxWidth: '480px' }}>
                A modern local-first vocabulary companion. Learn new definitions, sync with Supabase
                Cloud, and practice dynamically offline.
              </Text>
            </Stack>

            {/* Quick Status Pill Bar & Theme Toggler */}
            <Group className="header-right" gap="xs" style={{ flexShrink: 0 }}>
              <Tooltip label={onlineStatus ? 'Online' : 'Offline'}>
                <Badge
                  color={onlineStatus ? 'teal' : 'red'}
                  variant="light"
                  size="md"
                  radius="md"
                  leftSection={onlineStatus ? <IconWifi size={14} /> : <IconWifiOff size={14} />}
                >
                  {onlineStatus ? 'Online' : 'Offline'}
                </Badge>
              </Tooltip>

              <Tooltip label="Toggle Theme">
                <ActionIcon
                  variant="subtle"
                  color="indigo"
                  size="lg"
                  radius="md"
                  onClick={toggleTheme}
                  style={{ transition: 'transform 0.3s ease' }}
                >
                  {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </Card>

        {/* --- Interactive Statistics Dashboard Row --- */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" verticalSpacing="xs" autoFlow="auto-fit">
          {/* Card 1: Total Words */}
          <Card
            className="glass-panel"
            radius="lg"
            padding="md"
            style={{ borderLeft: '4px solid #6366f1', cursor: 'pointer' }}
            onClick={() => {
              setMode('quiz');
              setQuizSource('words');
              setQuizRange('all');
              setQuizGroupFilter('all');
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                  TOTAL WORDS
                </Text>
                <Text
                  size="xl"
                  fw={800}
                  style={{ fontFamily: 'var(--font-title)', marginTop: '4px' }}
                >
                  {words.length}
                </Text>
              </div>
              <IconBook size={28} style={{ opacity: 0.25, color: '#6366f1' }} />
            </Group>
          </Card>

          {/* Card 2: Today's Additions */}
          <Card
            className="glass-panel"
            radius="lg"
            padding="md"
            style={{ borderLeft: '4px solid #a855f7', cursor: 'pointer' }}
            onClick={() => {
              setMode('quiz');
              setQuizSource('words');
              setQuizRange('today');
              setQuizGroupFilter('all');
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                  ADDED TODAY
                </Text>
                <Text
                  size="xl"
                  fw={800}
                  style={{ fontFamily: 'var(--font-title)', marginTop: '4px' }}
                >
                  {todayCount}
                </Text>
              </div>
              <IconHistory size={28} style={{ opacity: 0.25, color: '#a855f7' }} />
            </Group>
          </Card>

          {/* Card 3: SRS Due Today */}
          <Card
            className="glass-panel"
            radius="lg"
            padding="md"
            style={{ borderLeft: '4px solid #8b5cf6', cursor: 'pointer' }}
            onClick={() => {
              setMode('quiz');
              setQuizSource('srs');
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                  SRS DUE TODAY
                </Text>
                <Text
                  size="xl"
                  fw={800}
                  style={{
                    fontFamily: 'var(--font-title)',
                    marginTop: '4px',
                    color: srsDueTodayCount > 0 ? '#8b5cf6' : undefined,
                  }}
                >
                  {srsDueTodayCount}
                </Text>
              </div>
              <IconBrain size={28} style={{ opacity: 0.25, color: '#8b5cf6' }} />
            </Group>
          </Card>

          {/* Card 4: Cloud Synchronization Status */}
          <Card
            className="glass-panel"
            radius="lg"
            padding="md"
            style={{ borderLeft: '4px solid #10b981' }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                  CLOUD SYNC
                </Text>
                <Flex
                  // gap="xs"
                  justify="flex-start"
                  align="center"
                  direction="row"
                  wrap="wrap"
                >
                  <Text size="lg" fw={700} c={unsyncedCount === 0 ? 'teal' : 'orange'} mt={4}>
                    {unsyncedCount === 0 ? 'Fully Synced' : `${unsyncedCount} Sync Pending`}
                  </Text>
                  {onlineStatus && (
                    <Tooltip label={isSyncing ? 'Syncing…' : 'Sync now'} withArrow>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="teal"
                        mt={4}
                        disabled={isSyncing}
                        onClick={handleManualSync}
                        aria-label="Sync now"
                      >
                        <IconRotateClockwise
                          size={16}
                          className={isSyncing ? 'sync-spin-icon' : undefined}
                        />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Flex>
              </div>
              {unsyncedCount === 0 ? (
                <IconCloudCheck size={28} style={{ opacity: 0.35, color: '#10b981' }} />
              ) : (
                <IconCloudUpload size={28} style={{ opacity: 0.35, color: '#f59e0b' }} />
              )}
            </Group>
          </Card>
        </SimpleGrid>

        {/* Mode Selector Panel */}
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as 'study' | 'quiz')}
          data={[
            { label: 'Study Library', value: 'study' },
            { label: 'Quiz Session', value: 'quiz' },
          ]}
          fullWidth
          size="md"
          radius="lg"
          className="glass-panel"
          style={{ padding: '4px' }}
        />

        {/* --- STUDY MODE --- */}
        {mode === 'study' && (
          <Stack gap="lg">
            <WordForm
              onSubmit={handleAdd}
              disabled={isLoading}
              customGroups={customGroups}
              onAddCustomGroup={handleAddCustomGroup}
              existingWords={words}
              onEditExisting={handleEdit}
            />

            {/* Redesigned Glassmorphic Workspace Control Center */}
            <Card
              className="glass-panel"
              radius="lg"
              padding="lg"
              style={{
                borderLeft: '4px solid #a855f7',
                overflow: 'hidden',
              }}
            >
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <IconBook size={22} style={{ color: '#a855f7' }} />
                    <Title
                      order={3}
                      style={{
                        fontFamily: 'var(--font-title)',
                        fontSize: '1.25rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      Your Workspace
                    </Title>
                  </Group>
                  <Group gap="xs">
                    <Button
                      variant="light"
                      color="grape"
                      size="xs"
                      radius="md"
                      leftSection={<IconTags size={16} />}
                      onClick={() => setGroupManagerOpen(true)}
                    >
                      Manage Groups
                    </Button>
                    <Badge
                      variant="gradient"
                      gradient={{ from: 'indigo', to: 'purple' }}
                      size="md"
                      radius="md"
                      style={{ fontWeight: 700 }}
                    >
                      {filteredWords.length} word{filteredWords.length !== 1 ? 's' : ''}
                    </Badge>
                  </Group>
                </Group>

                <Grid gap="sm">
                  <Grid.Col span={{ base: 12, sm: 8 }}>
                    <Stack gap="xs">
                      <TextInput
                        placeholder={
                          searchScope === 'wordAndDefinition'
                            ? 'Search words or definitions...'
                            : 'Search vocabulary by keyword...'
                        }
                        leftSection={
                          <IconSearch size={18} style={{ opacity: 0.55, color: '#a855f7' }} />
                        }
                        rightSection={
                          searchQuery ? (
                            <CloseButton
                              size="sm"
                              aria-label="Clear search"
                              onClick={() => {
                                setSearchQuery('');
                                setPage(1);
                              }}
                            />
                          ) : null
                        }
                        value={searchQuery}
                        size="md"
                        radius="md"
                        onChange={(event) => {
                          setSearchQuery(event.currentTarget.value);
                          setPage(1);
                        }}
                      />
                      <SegmentedControl
                        value={searchScope}
                        onChange={(value) => {
                          setSearchScope(value as 'word' | 'wordAndDefinition');
                          setPage(1);
                        }}
                        data={[
                          { label: 'Word only', value: 'word' },
                          { label: 'Word + Definition', value: 'wordAndDefinition' },
                        ]}
                        size="xs"
                        radius="md"
                        fullWidth
                      />
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 4 }}>
                    <Select
                      placeholder="Filter by Group"
                      value={groupFilter}
                      onChange={(value) => {
                        setGroupFilter(value ?? 'all');
                        setPage(1);
                      }}
                      data={[
                        { value: 'all', label: 'All Groups' },
                        { value: 'none', label: 'No Group' },
                        ...customGroups.map((g) => ({ value: g, label: g })),
                      ]}
                      size="md"
                      radius="md"
                      allowDeselect={false}
                    />
                  </Grid.Col>
                </Grid>
              </Stack>
            </Card>

            <WordList
              words={pagedWords}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onRefreshExamples={handleRefreshExamples}
              customGroups={customGroups}
              onAddCustomGroup={handleAddCustomGroup}
            />

            <GroupManager
              opened={groupManagerOpen}
              onClose={() => setGroupManagerOpen(false)}
              groups={groups}
              onRename={handleRenameGroup}
              onDelete={handleDeleteGroup}
              onAdd={handleCreateGroup}
            />

            {totalPages > 1 && (
              <Group justify="center" mt="sm">
                <div className="desktop-only">
                  <Pagination
                    value={page}
                    onChange={setPage}
                    total={totalPages}
                    radius="md"
                    color="indigo"
                    size="sm"
                    siblings={1}
                    boundaries={1}
                    withEdges
                  />
                </div>
                <div className="mobile-only">
                  <Group gap="sm" align="center">
                    <Button
                      variant="subtle"
                      color="indigo"
                      size="xs"
                      radius="md"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <Text
                      size="xs"
                      fw={700}
                      c="dimmed"
                      style={{ minWidth: 60, textAlign: 'center' }}
                    >
                      {page} / {totalPages}
                    </Text>
                    <Button
                      variant="subtle"
                      color="indigo"
                      size="xs"
                      radius="md"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </Group>
                </div>
              </Group>
            )}
          </Stack>
        )}

        {/* --- QUIZ MODE --- */}
        {mode === 'quiz' && (
          <Stack gap="lg" style={{ minHeight: '100vh' }}>
            <Card
              className="glass-panel"
              radius="lg"
              padding="lg"
              style={{ borderLeft: '4px solid #6366f1' }}
            >
              <Stack gap="md">
                <Grid align="flex-end" gap="md">
                  <Grid.Col span={{ base: 12, sm: 3 }}>
                    <Select
                      label={
                        <Text size="xs" fw={700} c="dimmed">
                          QUIZ POOL RANGE
                        </Text>
                      }
                      data={Object.entries(quizRanges).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      value={quizRange}
                      size="md"
                      radius="md"
                      onChange={(value) => setQuizRange((value as QuizRangeKey) ?? 'all')}
                      allowDeselect={false}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 3 }}>
                    <Select
                      label={
                        <Text size="xs" fw={700} c="dimmed">
                          QUIZ SOURCE
                        </Text>
                      }
                      data={Object.entries(quizSources).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      value={quizSource}
                      size="md"
                      radius="md"
                      onChange={(value) => setQuizSource((value as QuizSourceKey) ?? 'words')}
                      allowDeselect={false}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 3 }}>
                    <Select
                      label={
                        <Text size="xs" fw={700} c="dimmed">
                          QUIZ MODE
                        </Text>
                      }
                      data={Object.entries(quizDirections).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      value={quizDirection}
                      size="md"
                      radius="md"
                      onChange={(value) =>
                        setQuizDirection((value as QuizDirectionKey) ?? 'wordToMeaning')
                      }
                      allowDeselect={false}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 3 }}>
                    <Select
                      label={
                        <Text size="xs" fw={700} c="dimmed">
                          QUIZ GROUP
                        </Text>
                      }
                      data={[
                        { value: 'all', label: 'All Groups' },
                        { value: 'none', label: 'No Group' },
                        ...customGroups.map((g) => ({ value: g, label: g })),
                      ]}
                      value={quizGroupFilter}
                      size="md"
                      radius="md"
                      onChange={(value) => setQuizGroupFilter(value ?? 'all')}
                      allowDeselect={false}
                    />
                  </Grid.Col>
                </Grid>

                {/* Custom Date Range pickers */}
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
                            onChange={(e) => setCustomStart(e.currentTarget.value)}
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
                            onChange={(e) => setCustomEnd(e.currentTarget.value)}
                            size="md"
                            radius="md"
                            min={customStart}
                          />
                        </Grid.Col>
                      </Grid>
                    </Stack>
                  </div>
                )}

                {/* Restart Quiz and Candidates count info row */}
                <Group justify="space-between" align="center" mt="xs">
                  <Text size="xs" c="dimmed">
                    {quizCandidates.length} word{quizCandidates.length !== 1 ? 's' : ''} in this
                    selection
                  </Text>
                  <Button
                    variant="light"
                    color="indigo"
                    size="md"
                    radius="md"
                    onClick={resetQuiz}
                    disabled={quizQueue.length === 0}
                    leftSection={<IconRotateClockwise size={18} />}
                  >
                    Restart Quiz
                  </Button>
                </Group>
              </Stack>
            </Card>

            <QuizPanel
              item={currentQuizItem}
              quizDirection={quizDirection as QuizDirection}
              revealed={revealed}
              onReveal={handleReveal}
              onMarkMissed={handleToggleMissed}
              isMarkedMissed={isCurrentMarkedMissed}
              onNext={handleNext}
              onPrevious={handlePrevious}
              completed={completed}
              hasPrevious={quizIndex > 0}
              currentIndex={quizIndex}
              totalCount={quizQueue.length}
              onRestart={resetQuiz}
              onRefreshExamples={handleRefreshExamples}
              srsMode={quizSource === 'srs'}
              onSrsRate={
                quizSource === 'srs' ? handleSrsRate : undefined
              }
              onEditClick={(id) => setEditingQuizWordId(id)}
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
                    gradient={
                      practiceDisplayMode === 'missed'
                        ? { from: 'red', to: 'orange' }
                        : { from: 'violet', to: 'indigo' }
                    }
                    size="md"
                    radius="md"
                    style={{ fontWeight: 800 }}
                  >
                    {practiceDisplayMode === 'missed'
                      ? missedWordsForMode.length
                      : recentSrsPracticeWords.length}
                  </Badge>
                </Group>

                <Group gap="xs" wrap="wrap">
                  <PracticeDisplayCombobox
                    value={practiceDisplayMode}
                    onChange={setPracticeDisplayMode}
                  />
                  {practiceDisplayMode === 'missed' ? (
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
                          setHideMissedMeanings(nextVal);
                          if (nextVal) {
                            setRevealedMissedWordIds({});
                          }
                        }}
                      >
                        {hideMissedMeanings ? <IconEyeOff size={24} /> : <IconEye size={24} />}
                      </ActionIcon>
                    </Tooltip>
                  ) : (
                    <>
                      <Tooltip
                        label={hideSrsPracticeMeanings ? 'Show all meanings' : 'Hide all meanings'}
                        withArrow
                      >
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="md"
                          radius="md"
                          onClick={() => {
                            const nextVal = !hideSrsPracticeMeanings;
                            setHideSrsPracticeMeanings(nextVal);
                            if (nextVal) {
                              setRevealedSrsPracticeWordIds({});
                            }
                          }}
                        >
                          {hideSrsPracticeMeanings ? (
                            <IconEyeOff size={24} />
                          ) : (
                            <IconEye size={24} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                      <Button
                        variant="light"
                        color="indigo"
                        size="xs"
                        radius="md"
                        leftSection={<IconBrain size={14} />}
                        onClick={() => {
                          setMode('quiz');
                          setQuizSource('srsPractice');
                          setQuizRange('all');
                          setQuizGroupFilter('all');
                        }}
                      >
                        Quiz
                      </Button>
                    </>
                  )}
                  {practiceDisplayMode === 'missed' && missedWordsForMode.length > 0 && (
                    <Button
                      variant="subtle"
                      color="red"
                      size="xs"
                      radius="md"
                      leftSection={<IconBookmarkOff size={14} />}
                      onClick={() => setConfirmClearAllOpen(true)}
                      style={{ opacity: 0.8 }}
                    >
                      Clear All
                    </Button>
                  )}
                </Group>
              </Group>

              <Divider
                style={{
                  borderColor:
                    practiceDisplayMode === 'missed'
                      ? 'rgba(239,68,68,0.15)'
                      : 'rgba(139,92,246,0.15)',
                  marginBottom: '16px',
                }}
              />

              {practiceDisplayMode === 'missed' ? (
                missedWordsForMode.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '36px 24px',
                      borderRadius: '12px',
                      border: '1.5px dashed rgba(239,68,68,0.2)',
                      background: 'rgba(239,68,68,0.03)',
                    }}
                  >
                    <Stack gap="sm" align="center">
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'rgba(239,68,68,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconTarget size={24} style={{ color: '#ef4444', opacity: 0.5 }} />
                      </div>
                      <Text fw={600} size="sm" style={{ color: 'var(--text-secondary)' }}>
                        No missed words yet
                      </Text>
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{ lineHeight: 1.5, maxWidth: 280, margin: '0 auto' }}
                      >
                        When you bookmark a word as missed during a quiz in{' '}
                        {quizDirections[quizDirection]}, it will appear here for targeted practice.
                      </Text>
                    </Stack>
                  </div>
                ) : (
                  <MissedWordVirtualList
                    words={missedWordsForMode}
                    hideMissedMeanings={hideMissedMeanings}
                    revealedMissedWordIds={revealedMissedWordIds}
                    onRevealMissedWord={(id) =>
                      setRevealedMissedWordIds((prev) => ({ ...prev, [id]: true }))
                    }
                    onRefreshExamples={handleRefreshExamples}
                    onUnmarkMissed={handleUnmarkMissed}
                  />
                )
              ) : recentSrsPracticeWords.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '36px 24px',
                    borderRadius: '12px',
                    border: '1.5px dashed rgba(139,92,246,0.2)',
                    background: 'rgba(139,92,246,0.03)',
                  }}
                >
                  <Stack gap="sm" align="center">
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'rgba(139,92,246,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconBrain size={24} style={{ color: '#8b5cf6', opacity: 0.5 }} />
                    </div>
                    <Text fw={600} size="sm" style={{ color: 'var(--text-secondary)' }}>
                      No SRS practice words in the last 24 hours
                    </Text>
                    <Text
                      size="xs"
                      c="dimmed"
                      style={{ lineHeight: 1.5, maxWidth: 320, margin: '0 auto' }}
                    >
                      Rated SRS words will show up here for 24 hours so you can review them again.
                    </Text>
                  </Stack>
                </div>
              ) : (
                <SrsPracticeVirtualList
                  words={recentSrsPracticeWords}
                  hideMeanings={hideSrsPracticeMeanings}
                  revealedWordIds={revealedSrsPracticeWordIds}
                  onRevealWord={(id) =>
                    setRevealedSrsPracticeWordIds((prev) => ({ ...prev, [id]: true }))
                  }
                  onRefreshExamples={handleRefreshExamples}
                  onToggleMissed={(word) =>
                    void toggleMissedWordRecord(word.wordId, word.word, word.meaning, word.quizMode)
                  }
                  isMissedWord={(wordId) => missedWordIdSet.has(wordId)}
                  onEditClick={(id) => setEditingQuizWordId(id)}
                  onQuizWord={() => {
                    setMode('quiz');
                    setQuizSource('srsPractice');
                    setQuizRange('all');
                    setQuizGroupFilter('all');
                  }}
                />
              )}
            </Card>
          </Stack>
        )}
      </Stack>

      <EditWordModal
        opened={editingQuizWordId !== null}
        onClose={() => setEditingQuizWordId(null)}
        wordRecord={
          editingQuizWordId ? words.find((w) => w.id === editingQuizWordId) || null : null
        }
        customGroups={customGroups}
        onSave={async (id, word, meaning, definitions, groups) => {
          await handleEdit(id, word, meaning, definitions, groups);
          setQuizQueue((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    word,
                    meaning,
                    definitions,
                    tags: groups,
                  }
                : item
            )
          );
        }}
        onAddCustomGroup={handleAddCustomGroup}
      />
    </Container>
  );
}
