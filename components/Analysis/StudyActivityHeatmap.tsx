'use client';

import {
  Badge,
  Box,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconFlame } from '@tabler/icons-react';
import React, { useMemo } from 'react';
import type { ActivitySummary, HeatmapDay, SectionStatusInfo } from '@/lib/analysis/types';
import { SectionStatusBadge } from './SectionStatusBadge';

type StudyActivityHeatmapProps = {
  activity: ActivitySummary;
  statusInfo?: SectionStatusInfo;
};

export function StudyActivityHeatmap({ activity, statusInfo }: StudyActivityHeatmapProps) {
  const {
    daysStudied,
    totalCalendarDays,
    currentStreak,
    longestStreak,
    mostActiveDayOfWeek,
    avgReviewsOnActiveDays,
    heatmapDays,
    weekdayReviews,
    weekendReviews,
  } = activity;

  // Group heatmap days into 53 columns (weeks) of 7 days (Sunday to Saturday)
  const calendarWeeks = useMemo(() => {
    const weeks: HeatmapDay[][] = [];
    if (!heatmapDays || heatmapDays.length === 0) {
      return weeks;
    }

    let currentWeek: HeatmapDay[] = [];
    // Align first day by padding empty days if start is not Sunday
    const firstDayDate = new Date(heatmapDays[0].date);
    const dayOfWeek = firstDayDate.getDay(); // 0 is Sun

    for (let i = 0; i < dayOfWeek; i++) {
      currentWeek.push({
        date: '',
        count: 0,
        studySeconds: 0,
        level: 0,
      });
    }

    for (const day of heatmapDays) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({
          date: '',
          count: 0,
          studySeconds: 0,
          level: 0,
        });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [heatmapDays]);

  const levelColors: Record<number, string> = {
    0: 'rgba(156, 163, 175, 0.15)',
    1: '#a5b4fc',
    2: '#818cf8',
    3: '#6366f1',
    4: '#4338ca',
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Card className="glass-panel" radius="xl" padding="lg">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Study Consistency & Habit Heatmap
              </Title>
              <SectionStatusBadge statusInfo={statusInfo} />
              <Badge variant="light" color="indigo" size="sm">
                Past 1 Year
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              Visual log of active study days, streaks, and weekly rhythm patterns.
            </Text>
          </div>

          <Group gap="xs">
            <Badge
              variant="gradient"
              gradient={{ from: 'orange', to: 'red', deg: 45 }}
              size="md"
              leftSection={<IconFlame size={14} />}
            >
              {currentStreak} Day Streak
            </Badge>
          </Group>
        </Group>

        {/* Activity Summary Badges Grid */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          <Paper
            p="xs"
            radius="md"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Text size="xs" c="dimmed" fw={600}>
              ACTIVE DAYS
            </Text>
            <Text size="md" fw={800} style={{ fontFamily: 'var(--font-title)' }}>
              {daysStudied}{' '}
              <Text component="span" size="xs" c="dimmed">
                / {totalCalendarDays}d
              </Text>
            </Text>
          </Paper>

          <Paper
            p="xs"
            radius="md"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Text size="xs" c="dimmed" fw={600}>
              LONGEST STREAK
            </Text>
            <Text size="md" fw={800} c="orange.6" style={{ fontFamily: 'var(--font-title)' }}>
              {longestStreak} days
            </Text>
          </Paper>

          <Paper
            p="xs"
            radius="md"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Text size="xs" c="dimmed" fw={600}>
              MOST ACTIVE DAY
            </Text>
            <Text size="md" fw={800} c="indigo.6" style={{ fontFamily: 'var(--font-title)' }}>
              {mostActiveDayOfWeek}
            </Text>
          </Paper>

          <Paper
            p="xs"
            radius="md"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <Text size="xs" c="dimmed" fw={600}>
              AVG REVIEWS / DAY
            </Text>
            <Text size="md" fw={800} style={{ fontFamily: 'var(--font-title)' }}>
              {avgReviewsOnActiveDays}
            </Text>
          </Paper>
        </SimpleGrid>

        {/* Heatmap Grid Visualizer */}
        <Paper
          p="md"
          radius="lg"
          style={{
            background: 'rgba(99, 102, 241, 0.03)',
            border: '1px solid var(--card-border)',
            overflowX: 'auto',
          }}
        >
          <Box style={{ minWidth: 700 }}>
            <Group gap={4} align="flex-start" wrap="nowrap">
              {/* Day of week labels */}
              <Stack gap={3} mt={1}>
                {dayLabels.map((lbl, idx) => (
                  <Text
                    key={lbl}
                    size="xs"
                    c="dimmed"
                    style={{
                      height: 12,
                      lineHeight: '12px',
                      fontSize: '0.62rem',
                      visibility: idx % 2 === 1 ? 'visible' : 'hidden',
                    }}
                  >
                    {lbl}
                  </Text>
                ))}
              </Stack>

              {/* Weeks Columns */}
              <Group gap={3} wrap="nowrap" style={{ flex: 1 }}>
                {calendarWeeks.map((week, wIdx) => (
                  <Stack key={wIdx} gap={3}>
                    {week.map((day, dIdx) => {
                      if (!day.date) {
                        return (
                          <Box
                            key={dIdx}
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 2,
                              opacity: 0,
                            }}
                          />
                        );
                      }

                      const dateObj = new Date(day.date);
                      const dateFormatted = dateObj.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                      const tooltipText = `${dateFormatted}: ${day.count} reviews (${Math.round(day.studySeconds / 60)} min)`;

                      return (
                        <Tooltip
                          key={day.date}
                          label={tooltipText}
                          position="top"
                          withArrow
                          openDelay={100}
                        >
                          <Box
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 2,
                              backgroundColor: levelColors[day.level],
                              transition: 'transform 0.15s ease',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.transform = 'scale(1.35)';
                              (e.currentTarget as HTMLElement).style.zIndex = '5';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                              (e.currentTarget as HTMLElement).style.zIndex = '1';
                            }}
                          />
                        </Tooltip>
                      );
                    })}
                  </Stack>
                ))}
              </Group>
            </Group>

            {/* Heatmap Legend */}
            <Group justify="space-between" align="center" mt="md">
              <Group gap="xs">
                <Text size="xs" c="dimmed" style={{ fontSize: '0.72rem' }}>
                  Weekday:{' '}
                  <Text component="span" fw={700}>
                    {weekdayReviews}
                  </Text>{' '}
                  reviews • Weekend:{' '}
                  <Text component="span" fw={700}>
                    {weekendReviews}
                  </Text>{' '}
                  reviews
                </Text>
              </Group>

              <Group gap={4} align="center">
                <Text size="xs" c="dimmed" style={{ fontSize: '0.68rem', marginRight: 4 }}>
                  Less
                </Text>
                {[0, 1, 2, 3, 4].map((lvl) => (
                  <Box
                    key={lvl}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      backgroundColor: levelColors[lvl],
                    }}
                  />
                ))}
                <Text size="xs" c="dimmed" style={{ fontSize: '0.68rem', marginLeft: 4 }}>
                  More
                </Text>
              </Group>
            </Group>
          </Box>
        </Paper>
      </Stack>
    </Card>
  );
}
