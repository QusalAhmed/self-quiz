'use client';

import { Box, Button, Card, Group, RollingNumber, Stack, Text, Title } from '@mantine/core';
import { IconDownload, IconHistory } from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import { ExportWordsModal } from '@/components/Home/ExportWordsModal';
import {
  ReviewDetailModal,
  ReviewLogFilters,
  type ReviewLogFilterState,
  ReviewLogTable,
  ReviewStatsStrip,
} from '@/components/ReviewLog';
import type { SectionStatusInfo } from '@/lib/analysis/types';
import type { ReviewLogRecord, WordRecord } from '@/lib/db';
import { SectionStatusBadge } from './SectionStatusBadge';

export type ReviewLogSectionProps = {
  reviewLogs: ReviewLogRecord[];
  words: WordRecord[];
  customGroups: string[];
  statusInfo?: SectionStatusInfo;
  onSelectWord?: (wordId: string) => void;
};

export function ReviewLogSection({
  reviewLogs,
  words,
  customGroups,
  statusInfo,
  onSelectWord,
}: ReviewLogSectionProps) {
  const [selectedLog, setSelectedLog] = useState<ReviewLogRecord | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const [filters, setFilters] = useState<ReviewLogFilterState>({
    searchQuery: '',
    ratingFilter: 'all',
    stateFilter: 'all',
    modeFilter: 'all',
    datePreset: 'all',
    groupFilter: 'all',
    sortBy: 'newest',
  });

  const wordsById = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);

  const activeLogs = useMemo(() => reviewLogs.filter((l) => !l.isDeleted), [reviewLogs]);

  const filteredLogs = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();
    const hasSearch = q.length > 0;
    const ratingFilter = filters.ratingFilter;
    const stateFilter = filters.stateFilter;
    const modeFilter = filters.modeFilter;
    const groupFilter = filters.groupFilter;
    const datePreset = filters.datePreset;

    let dateCutoffStart: number | null = null;
    let dateCutoffEnd: number | null = null;

    if (datePreset !== 'all') {
      const now = new Date();
      if (datePreset === 'today') {
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        dateCutoffStart = todayStart.getTime();
      } else if (datePreset === '7d') {
        dateCutoffStart = now.getTime() - 7 * 86400 * 1000;
      } else if (datePreset === '30d') {
        dateCutoffStart = now.getTime() - 30 * 86400 * 1000;
      } else if (datePreset === 'custom') {
        if (filters.customStartDate) {
          const start = new Date(filters.customStartDate);
          start.setHours(0, 0, 0, 0);
          dateCutoffStart = start.getTime();
        }
        if (filters.customEndDate) {
          const end = new Date(filters.customEndDate);
          end.setHours(23, 59, 59, 999);
          dateCutoffEnd = end.getTime();
        }
      }
    }

    const filtered = activeLogs.filter((log) => {
      // Search Query Filter
      if (hasSearch) {
        const matchWord = log.word?.toLowerCase().includes(q);
        const matchMeaning = log.meaning?.toLowerCase().includes(q);
        if (!matchWord && !matchMeaning) {
          return false;
        }
      }

      // Rating Filter
      if (ratingFilter !== 'all' && log.rating !== ratingFilter) {
        return false;
      }

      // State Filter
      if (stateFilter !== 'all' && log.stateAfter !== stateFilter) {
        return false;
      }

      // Mode Filter
      if (modeFilter !== 'all' && log.quizMode !== modeFilter) {
        return false;
      }

      // Group Filter
      if (groupFilter !== 'all') {
        const parentWord = wordsById.get(log.wordId);
        if (!parentWord) {
          return false;
        }
        if (groupFilter === 'none') {
          if (parentWord.customGroups && parentWord.customGroups.length > 0) {
            return false;
          }
        } else if (!parentWord.customGroups?.includes(groupFilter)) {
          return false;
        }
      }

      // Date Preset Filter (using precomputed cutoff timestamps)
      if (dateCutoffStart !== null || dateCutoffEnd !== null) {
        const logTime = new Date(log.reviewedAt).getTime();
        if (dateCutoffStart !== null && logTime < dateCutoffStart) {
          return false;
        }
        if (dateCutoffEnd !== null && logTime > dateCutoffEnd) {
          return false;
        }
      }

      return true;
    });

    // Sort with zero allocations for ISO string timestamps
    const sortBy = filters.sortBy;
    if (sortBy === 'newest') {
      return filtered.sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
    }
    if (sortBy === 'oldest') {
      return filtered.sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
    }
    if (sortBy === 'duration') {
      return filtered.sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0));
    }
    if (sortBy === 'difficulty') {
      return filtered.sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0));
    }
    if (sortBy === 'retrievability') {
      return filtered.sort((a, b) => (a.retrievability || 0) - (b.retrievability || 0));
    }
    return filtered;
  }, [activeLogs, filters, wordsById]);

  return (
    <Card id="review-log" className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Section Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="sm" align="center">
            <Box
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <IconHistory size={20} />
            </Box>
            <div>
              <Group gap="xs" align="center">
                <Title order={3} style={{ fontSize: '1.2rem' }}>
                  Historical Review Log & Audit
                </Title>
                {statusInfo && <SectionStatusBadge statusInfo={statusInfo} />}
              </Group>
              <Text size="xs" c="dimmed">
                Immutable event stream for flashcard review events, rating distributions, and FSRS
                algorithm state transitions.
              </Text>
            </div>
          </Group>

          <Button
            variant="light"
            color="indigo"
            size="xs"
            radius="md"
            leftSection={<IconDownload size={14} />}
            onClick={() => setExportOpen(true)}
            disabled={filteredLogs.length === 0}
          >
            Export Logs (<RollingNumber value={filteredLogs.length} />)
          </Button>
        </Group>

        {/* 1. Quick Stats Strip */}
        <ReviewStatsStrip reviewLogs={filteredLogs} />

        {/* 2. Filter Controls */}
        <ReviewLogFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableGroups={customGroups}
          totalLogsCount={activeLogs.length}
          filteredLogsCount={filteredLogs.length}
        />

        {/* 3. Paginated Review Events Table */}
        <ReviewLogTable
          logs={filteredLogs}
          onInspectLog={(log) => setSelectedLog(log)}
          onSelectWord={onSelectWord}
        />

        {/* 4. Diagnostic Inspection Modal */}
        <ReviewDetailModal
          opened={selectedLog !== null}
          onClose={() => setSelectedLog(null)}
          reviewLog={selectedLog}
          wordRecord={selectedLog ? wordsById.get(selectedLog.wordId) : null}
          onEditWord={onSelectWord}
        />

        {/* 5. Export Review Logs Modal */}
        <ExportWordsModal
          opened={exportOpen}
          onClose={() => setExportOpen(false)}
          title="Export Review Logs"
          filenamePrefix="review-logs"
          rawItems={filteredLogs}
          wordsMap={wordsById}
        />
      </Stack>
    </Card>
  );
}
