import { Badge, Button, Group, Text } from '@mantine/core';
import { IconBookmarkOff, IconEye, IconRotateClockwise, IconVolume } from '@tabler/icons-react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DefinitionsDisplay } from '@/components/DefinitionsDisplay/DefinitionsDisplay';
import { WordActionIcon } from '@/components/WordActions/WordActionIcon';
import type { MissedWordRecord, WordDefinition } from '@/lib/db';

type MissedWordVirtualListProps = {
  words: Array<MissedWordRecord & { definitions?: WordDefinition[] }>;
  hideMissedMeanings: boolean;
  revealedMissedWordIds: Record<string, boolean>;
  onRevealMissedWord: (id: string) => void;
  onRefreshExamples: (id: string) => void;
  onUnmarkMissed: (id: string) => void;
  generatingExampleWordIds?: Record<string, boolean>;
};

export function MissedWordVirtualList({
  words,
  hideMissedMeanings,
  revealedMissedWordIds,
  onRevealMissedWord,
  onRefreshExamples,
  onUnmarkMissed,
  generatingExampleWordIds = {},
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
                      <WordActionIcon
                        label="Remove from missed list"
                        color="red"
                        onClick={() => onUnmarkMissed(word.id)}
                      >
                        <IconBookmarkOff size={16} />
                      </WordActionIcon>
                    </Group>
                  </div>

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
