'use client';

import { Badge, Box, Card, Group, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconBook2,
  IconBrain,
  IconCalendarEvent,
  IconClock,
  IconFlame,
  IconHelpCircle,
  IconMinus,
  IconRotateClockwise,
  IconTargetArrow,
  IconTrophy,
} from '@tabler/icons-react';
import React from 'react';
import type { KpiMetric, KpiOverviewData } from '@/lib/analysis/types';

type KpiOverviewProps = {
  kpis: KpiOverviewData;
};

type KpiCardConfig = {
  title: string;
  metric: KpiMetric;
  icon: React.ComponentType<{ size?: number | string; style?: React.CSSProperties }>;
  iconColor: string;
  borderColor: string;
};

export function KpiOverview({ kpis }: KpiOverviewProps) {
  const cards: KpiCardConfig[] = [
    {
      title: 'WORDS MASTERED',
      metric: kpis.wordsMastered,
      icon: IconTrophy,
      iconColor: '#10b981',
      borderColor: '#10b981',
    },
    {
      title: 'IN PROGRESS',
      metric: kpis.wordsLearning,
      icon: IconBook2,
      iconColor: '#6366f1',
      borderColor: '#6366f1',
    },
    {
      title: 'REVIEW RETENTION',
      metric: kpis.estimatedRetention,
      icon: IconBrain,
      iconColor: '#ec4899',
      borderColor: '#ec4899',
    },
    {
      title: 'REVIEWS COMPLETED',
      metric: kpis.reviewsCompleted,
      icon: IconRotateClockwise,
      iconColor: '#8b5cf6',
      borderColor: '#8b5cf6',
    },
    {
      title: 'STUDY DAYS',
      metric: kpis.activeStudyDays,
      icon: IconCalendarEvent,
      iconColor: '#06b6d4',
      borderColor: '#06b6d4',
    },
    {
      title: 'CURRENT STREAK',
      metric: kpis.currentStreak,
      icon: IconFlame,
      iconColor: '#f59e0b',
      borderColor: '#f59e0b',
    },
    {
      title: 'AVG DAILY REVIEWS',
      metric: kpis.avgDailyReviews,
      icon: IconTargetArrow,
      iconColor: '#3b82f6',
      borderColor: '#3b82f6',
    },
    {
      title: 'TOTAL STUDY TIME',
      metric: kpis.totalStudyTimeSec,
      icon: IconClock,
      iconColor: '#14b8a6',
      borderColor: '#14b8a6',
    },
  ];

  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md" verticalSpacing="md">
      {cards.map((card) => {
        const Icon = card.icon;
        const trend = card.metric.trendDirection;
        const change = card.metric.changePercent;
        const isPositive = card.metric.isPositive;

        return (
          <Card
            key={card.title}
            className="glass-panel hover-lift"
            radius="lg"
            padding="md"
            style={{
              borderLeft: `4px solid ${card.borderColor}`,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Stack gap="xs" justify="space-between" style={{ height: '100%' }}>
              {/* Header: Title & Icon */}
              <Group justify="space-between" align="center">
                <Group gap={4} align="center">
                  <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                    {card.title}
                  </Text>
                  {card.metric.helperTooltip && (
                    <Tooltip label={card.metric.helperTooltip} multiline w={220} withArrow>
                      <Box style={{ display: 'inline-flex', cursor: 'help', opacity: 0.6 }}>
                        <IconHelpCircle size={13} />
                      </Box>
                    </Tooltip>
                  )}
                </Group>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: `${card.iconColor}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: card.iconColor,
                  }}
                >
                  <Icon size={18} />
                </div>
              </Group>

              {/* Main Metric Value */}
              <div>
                <Text
                  size="xl"
                  fw={800}
                  style={{
                    fontFamily: 'var(--font-title)',
                    fontSize: '1.65rem',
                    lineHeight: 1.1,
                  }}
                >
                  {card.metric.formattedValue}
                </Text>
              </div>

              {/* Footer: Trend & Subtitle */}
              <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
                <Text size="xs" c="dimmed" lineClamp={1} style={{ fontSize: '0.75rem' }}>
                  {card.metric.subtitle}
                </Text>

                {trend && change !== undefined && (
                  <Tooltip
                    label={
                      card.metric.formattedPrevious
                        ? `Previous period: ${card.metric.formattedPrevious}`
                        : 'Compared to previous period'
                    }
                  >
                    <Badge
                      size="xs"
                      radius="sm"
                      variant="light"
                      color={isPositive ? 'teal' : 'red'}
                      leftSection={
                        trend === 'up' ? (
                          <IconArrowUpRight size={10} />
                        ) : trend === 'down' ? (
                          <IconArrowDownRight size={10} />
                        ) : (
                          <IconMinus size={10} />
                        )
                      }
                      style={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      {change > 0 ? `+${change}%` : `${change}%`}
                    </Badge>
                  </Tooltip>
                )}
              </Group>
            </Stack>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
