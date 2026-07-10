import { Badge, Button, Group, Text } from '@mantine/core';
import {
  IconBookmark,
  IconBookmarkOff,
  IconEdit,
  IconEye,
  IconRotateClockwise,
  IconVolume,
} from '@tabler/icons-react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DefinitionsDisplay } from '@/components/DefinitionsDisplay/DefinitionsDisplay';
import { WordActionIcon } from '@/components/WordActions/WordActionIcon';
import type { SrsPracticeRecord, WordDefinition } from '@/lib/db';

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

type SrsPracticeVirtualListProps = {
  words: Array<SrsPracticeRecord & { definitions?: WordDefinition[] }>;
  hideMeanings: boolean;
  revealedWordIds: Record<string, boolean>;
  onRevealWord: (id: string) => void;
  onRefreshExamples: (id: string) => void;
  onToggleMissed: (word: SrsPracticeRecord) => void;
  isMissedWord: (wordId: string) => boolean;
  onEditClick?: (id: string) => void;
  onQuizWord: (id: string) => void;
  generatingExampleWordIds?: Record<string, boolean>;
};

export function SrsPracticeVirtualList({
  words,
  hideMeanings,
  revealedWordIds,
  onRevealWord,
  onRefreshExamples,
  onToggleMissed,
  isMissedWord,
  onEditClick,
  generatingExampleWordIds = {},
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
          const isGeneratingExamples = Boolean(generatingExampleWordIds[word.wordId]);

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
                      <WordActionIcon
                        label="Regenerate examples"
                        color="indigo"
                        onClick={() => onRefreshExamples(word.wordId)}
                        disabled={isGeneratingExamples}
                        loading={isGeneratingExamples}
                      >
                        <IconRotateClockwise size={16} />
                      </WordActionIcon>
                      <WordActionIcon
                        label="Listen to pronunciation"
                        onClick={() => speakWord(word.word)}
                      >
                        <IconVolume size={16} />
                      </WordActionIcon>
                      {onEditClick && (
                        <WordActionIcon
                          label="Edit word"
                          onClick={() => onEditClick(word.wordId)}
                        >
                          <IconEdit size={16} />
                        </WordActionIcon>
                      )}
                      <WordActionIcon
                        label={missed ? 'Remove from missed list' : 'Add to missed list'}
                        color={missed ? 'teal' : 'red'}
                        onClick={() => onToggleMissed(word)}
                      >
                        {missed ? <IconBookmark size={16} /> : <IconBookmarkOff size={16} />}
                      </WordActionIcon>
                    </Group>
                  </div>

                  <Text size="xs" c="dimmed" mb={6}>
                    Practiced {formatPracticeDate(word.practicedAt)}
                  </Text>

                  {isGeneratingExamples && (
                    <Text size="xs" c="dimmed" mb={4}>
                      Generating examples...
                    </Text>
                  )}

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
