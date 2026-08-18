'use client';

import { Badge, Card, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconBulb, IconInfoCircle, IconSparkles } from '@tabler/icons-react';
import React from 'react';
import type { LearningInsight, LearningRecommendation } from '@/lib/analysis/types';

type InsightsAndRecommendationsProps = {
  insights: LearningInsight[];
  recommendations: LearningRecommendation[];
};

export function InsightsAndRecommendations({
  insights,
  recommendations,
}: InsightsAndRecommendationsProps) {
  const getInsightIcon = (type: LearningInsight['type']) => {
    switch (type) {
      case 'success':
        return <IconSparkles size={18} style={{ color: '#10b981' }} />;
      case 'warning':
        return <IconAlertTriangle size={18} style={{ color: '#ef4444' }} />;
      case 'tip':
        return <IconBulb size={18} style={{ color: '#f59e0b' }} />;
      default:
        return <IconInfoCircle size={18} style={{ color: '#6366f1' }} />;
    }
  };

  const getInsightColor = (type: LearningInsight['type']) => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#ef4444';
      case 'tip':
        return '#f59e0b';
      default:
        return '#6366f1';
    }
  };

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      {/* Left Column: Data-Driven Insights */}
      <Card className="glass-panel" radius="xl" padding="lg" style={{ height: '100%' }}>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Patterns & Learning Insights
              </Title>
              <Badge variant="light" color="indigo" size="sm">
                {insights.length} detected
              </Badge>
            </Group>
          </Group>
          <Text size="xs" c="dimmed" mt={-6}>
            Data-driven patterns extracted directly from your review history and FSRS metrics.
          </Text>

          <Stack gap="xs">
            {insights.map((insight) => (
              <Paper
                key={insight.id}
                p="sm"
                radius="md"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderLeft: `4px solid ${getInsightColor(insight.type)}`,
                }}
              >
                <Group justify="space-between" align="flex-start" mb={4} wrap="nowrap">
                  <Group gap="xs" align="center">
                    {getInsightIcon(insight.type)}
                    <Text size="sm" fw={700}>
                      {insight.title}
                    </Text>
                  </Group>
                  {insight.metricHighlight && (
                    <Badge size="xs" variant="light" color="gray">
                      {insight.metricHighlight}
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed" pl={26}>
                  {insight.description}
                </Text>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Card>

      {/* Right Column: Practical Recommendations */}
      <Card className="glass-panel" radius="xl" padding="lg" style={{ height: '100%' }}>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap="xs" align="center">
              <Title order={3} style={{ fontSize: '1.2rem' }}>
                Actionable Recommendations
              </Title>
              <Badge variant="light" color="teal" size="sm">
                Smart Guidance
              </Badge>
            </Group>
          </Group>
          <Text size="xs" c="dimmed" mt={-6}>
            Targeted suggestions to optimize retention, pacing, and daily study habits.
          </Text>

          <Stack gap="xs">
            {recommendations.map((rec) => (
              <Paper
                key={rec.id}
                p="sm"
                radius="md"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderLeft:
                    rec.priority === 'high'
                      ? '4px solid #ef4444'
                      : rec.priority === 'medium'
                        ? '4px solid #f59e0b'
                        : '4px solid #10b981',
                }}
              >
                <Group justify="space-between" align="flex-start" mb={4} wrap="nowrap">
                  <Text size="sm" fw={700}>
                    {rec.title}
                  </Text>
                  <Badge
                    size="xs"
                    variant="filled"
                    color={
                      rec.priority === 'high'
                        ? 'red'
                        : rec.priority === 'medium'
                          ? 'yellow'
                          : 'teal'
                    }
                  >
                    {rec.priority.toUpperCase()}
                  </Badge>
                </Group>
                <Text size="xs" fw={600} c="indigo.6" mb={2}>
                  Action: {rec.action}
                </Text>
                <Text size="xs" c="dimmed">
                  {rec.reason}
                </Text>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Card>
    </SimpleGrid>
  );
}
