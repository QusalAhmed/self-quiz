'use client';

import { Button, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconBookOff, IconFilterOff, IconPlus } from '@tabler/icons-react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WordDetailCard, type WordViewDensity } from '@/components/WordExplorer/WordDetailCard';
import type { FsrsRecord, MissedWordRecord, WordFamilyMemberRecord, WordRecord } from '@/lib/db';

export type WordExplorerVirtualListProps = {
  words: WordRecord[];
  fsrsRecords?: FsrsRecord[];
  missedRecords?: MissedWordRecord[];
  wordFamilies?: Record<string, WordFamilyMemberRecord[]>;
  density?: WordViewDensity;
  generatingExampleWordIds?: Record<string, boolean>;
  generatingWordFamilyWordIds?: Record<string, boolean>;
  fetchingAudioWordIds?: Record<string, boolean>;
  onEdit: (word: WordRecord) => void;
  onDelete: (id: string, word: string) => void;
  onRefreshExamples: (id: string) => void;
  onRefreshWordFamily?: (wordId: string, word: string) => void;
  onDeleteWordFamilyMember?: (memberId: string) => void;
  onToggleMissed?: (wordId: string, word: string, meaning: string) => void;
  onGroupClick?: (group: string) => void;
  onFetchAudio?: (wordId: string, word: string) => Promise<void> | void;
  onResetFilters?: () => void;
  onOpenAddModal?: () => void;
  onNavigateWord?: (wordText: string) => void;
};

const EMPTY_MEMBERS: WordFamilyMemberRecord[] = [];

export const WordExplorerVirtualList = React.memo(function WordExplorerVirtualList({
  words,
  fsrsRecords = [],
  missedRecords = [],
  wordFamilies = {},
  density = 'detailed',
  generatingExampleWordIds = {},
  generatingWordFamilyWordIds = {},
  fetchingAudioWordIds = {},
  onEdit,
  onDelete,
  onRefreshExamples,
  onRefreshWordFamily,
  onDeleteWordFamilyMember,
  onToggleMissed,
  onGroupClick,
  onFetchAudio,
  onResetFilters,
  onOpenAddModal,
  onNavigateWord,
}: WordExplorerVirtualListProps) {
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
    window.addEventListener('orientationchange', updateScrollMargin);
    return () => {
      window.removeEventListener('resize', updateScrollMargin);
      window.removeEventListener('orientationchange', updateScrollMargin);
    };
  }, [density, words.length]);

  // Pre-indexed map: wordId -> primary FSRS record
  const primaryFsrsByWordId = useMemo(() => {
    const map = new Map<string, FsrsRecord>();
    for (const r of fsrsRecords) {
      if (r.isDeleted) {
        continue;
      }
      if (r.quizMode === 'wordToMeaning' || !map.has(r.wordId)) {
        map.set(r.wordId, r);
      }
    }
    return map;
  }, [fsrsRecords]);

  // Pre-indexed map: wordId -> missed stats
  const missedStatsByWordId = useMemo(() => {
    const map = new Map<string, { isMissed: boolean; count: number }>();
    for (const m of missedRecords) {
      if (m.isDeleted) {
        continue;
      }
      const existing = map.get(m.wordId);
      if (existing) {
        existing.count += m.missedCount || 1;
      } else {
        map.set(m.wordId, { isMissed: true, count: m.missedCount || 1 });
      }
    }
    return map;
  }, [missedRecords]);

  const estimateItemSize = useCallback(
    (index: number) => {
      const w = words[index];
      if (!w) {
        return density === 'compact' ? 120 : 260;
      }
      if (density === 'compact') {
        return 120;
      }
      if (density === 'card') {
        return 180;
      }
      // Detailed density pre-measurement estimation
      let h = 200;
      if (w.definitions && w.definitions.length > 1) {
        h += (w.definitions.length - 1) * 75;
      }
      if (w.notes && w.notes.trim()) {
        h += 80;
      }
      const fam = wordFamilies[w.id];
      if (fam && fam.length > 0) {
        h += 45;
      }
      return h;
    },
    [words, density, wordFamilies]
  );

  const rowVirtualizer = useWindowVirtualizer({
    count: words.length,
    estimateSize: estimateItemSize,
    getItemKey: useCallback((index: number) => words[index]?.id ?? index, [words]),
    overscan: 8,
    scrollMargin,
  });

  if (words.length === 0) {
    return (
      <Paper
        p="xl"
        radius="lg"
        className="glass-panel"
        style={{
          textAlign: 'center',
          border: '1.5px dashed rgba(99, 102, 241, 0.3)',
          padding: '60px 24px',
        }}
      >
        <Stack align="center" gap="md">
          <ThemeIcon size={56} radius="xl" variant="light" color="indigo">
            <IconBookOff size={32} />
          </ThemeIcon>
          <div>
            <Text
              size="lg"
              fw={700}
              className="text-gradient"
              style={{ fontFamily: 'var(--font-title)' }}
            >
              No Matching Words Found
            </Text>
            <Text size="sm" c="dimmed" mt={4} style={{ maxWidth: 420, margin: '4px auto 0' }}>
              We couldn't find any vocabulary words matching your active filters or search query.
            </Text>
          </div>

          <Group gap="sm" mt="xs">
            {onResetFilters && (
              <Button
                variant="light"
                color="indigo"
                size="sm"
                radius="md"
                leftSection={<IconFilterOff size={16} />}
                onClick={onResetFilters}
              >
                Clear All Filters
              </Button>
            )}
            {onOpenAddModal && (
              <Button
                className="btn-premium"
                size="sm"
                radius="md"
                leftSection={<IconPlus size={16} />}
                onClick={onOpenAddModal}
              >
                Add New Word
              </Button>
            )}
          </Group>
        </Stack>
      </Paper>
    );
  }

  return (
    <div ref={listRef} style={{ width: '100%' }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
          width: '100%',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = words[virtualRow.index];
          if (!item) {
            return null;
          }

          const isGeneratingExamples = Boolean(generatingExampleWordIds[item.id]);
          const isGeneratingFamily = Boolean(generatingWordFamilyWordIds[item.id]);
          const familyMembers = wordFamilies[item.id] || EMPTY_MEMBERS;
          const missedInfo = missedStatsByWordId.get(item.id);

          return (
            <div
              key={item.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className="virtual-list-row"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                paddingBottom: '14px',
              }}
            >
              <WordDetailCard
                word={item}
                primaryFsrsRecord={primaryFsrsByWordId.get(item.id)}
                isWordMissed={missedInfo?.isMissed ?? false}
                missedWordCount={missedInfo?.count ?? 0}
                wordFamilyMembers={familyMembers}
                allWords={words}
                density={density}
                isGeneratingExamples={isGeneratingExamples}
                isGeneratingWordFamily={isGeneratingFamily}
                isFetchingAudio={Boolean(fetchingAudioWordIds[item.id])}
                onEdit={onEdit}
                onDelete={onDelete}
                onRefreshExamples={onRefreshExamples}
                onRefreshWordFamily={onRefreshWordFamily}
                onDeleteWordFamilyMember={onDeleteWordFamilyMember}
                onToggleMissed={onToggleMissed}
                onGroupClick={onGroupClick}
                onFetchAudio={onFetchAudio}
                onNavigateWord={onNavigateWord}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
