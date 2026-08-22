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
  searchQuery?: string;
  generatingExampleWordIds?: Record<string, boolean>;
  generatingWordFamilyWordIds?: Record<string, boolean>;
  onEdit: (word: WordRecord) => void;
  onDelete: (id: string, word: string) => void;
  onRefreshExamples: (id: string) => void;
  onRefreshWordFamily?: (wordId: string, word: string) => void;
  onDeleteWordFamilyMember?: (memberId: string) => void;
  onToggleMissed?: (wordId: string, word: string, meaning: string) => void;
  onGroupClick?: (group: string) => void;
  onResetFilters?: () => void;
  onOpenAddModal?: () => void;
};

export function WordExplorerVirtualList({
  words,
  fsrsRecords = [],
  missedRecords = [],
  wordFamilies = {},
  density = 'detailed',
  searchQuery = '',
  generatingExampleWordIds = {},
  generatingWordFamilyWordIds = {},
  onEdit,
  onDelete,
  onRefreshExamples,
  onRefreshWordFamily,
  onDeleteWordFamilyMember,
  onToggleMissed,
  onGroupClick,
  onResetFilters,
  onOpenAddModal,
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
  }, [density]);

  const fsrsByWordId = useMemo(() => {
    const map = new Map<string, FsrsRecord[]>();
    for (const r of fsrsRecords) {
      if (r.isDeleted) {
        continue;
      }
      const list = map.get(r.wordId) || [];
      list.push(r);
      map.set(r.wordId, list);
    }
    return map;
  }, [fsrsRecords]);

  const missedByWordId = useMemo(() => {
    const map = new Map<string, MissedWordRecord[]>();
    for (const m of missedRecords) {
      if (m.isDeleted) {
        continue;
      }
      const list = map.get(m.wordId) || [];
      list.push(m);
      map.set(m.wordId, list);
    }
    return map;
  }, [missedRecords]);

  const rowVirtualizer = useWindowVirtualizer({
    count: words.length,
    estimateSize: () => (density === 'compact' ? 140 : 260),
    getItemKey: useCallback((index: number) => words[index]?.id || index, [words]),
    overscan: 6,
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
          const familyMembers = wordFamilies[item.id] || [];

          return (
            <div
              key={item.id}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
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
                fsrsRecords={fsrsByWordId.get(item.id) || []}
                missedRecords={missedByWordId.get(item.id) || []}
                wordFamilyMembers={familyMembers}
                density={density}
                searchQuery={searchQuery}
                isGeneratingExamples={isGeneratingExamples}
                isGeneratingWordFamily={isGeneratingFamily}
                onEdit={onEdit}
                onDelete={onDelete}
                onRefreshExamples={onRefreshExamples}
                onRefreshWordFamily={onRefreshWordFamily}
                onDeleteWordFamilyMember={onDeleteWordFamilyMember}
                onToggleMissed={onToggleMissed}
                onGroupClick={onGroupClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
