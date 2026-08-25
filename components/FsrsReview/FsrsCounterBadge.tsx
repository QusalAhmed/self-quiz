'use client';

import { Badge, Group, RollingNumber, Text } from '@mantine/core';
import React from 'react';

export type FsrsCounterBadgeProps = {
  newCount: number;
  learningCount: number;
  reviewCount: number;
};

export function FsrsCounterBadge({ newCount, learningCount, reviewCount }: FsrsCounterBadgeProps) {
  return (
    <Group gap={6} align="center" justify="center" wrap="wrap">
      {/* Anki Blue Pill for New Cards */}
      <Badge
        variant="light"
        color="blue"
        radius="xl"
        size="md"
        style={{
          fontWeight: 800,
          letterSpacing: '0.02em',
          paddingLeft: 10,
          paddingRight: 10,
          border: '1px solid rgba(59, 130, 246, 0.25)',
        }}
        leftSection={
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              display: 'inline-block',
            }}
          />
        }
      >
        <Text span size="xs" fw={800} c="blue.4">
          <RollingNumber value={newCount} />
        </Text>{' '}
        <Text span size="xs" style={{ opacity: 0.75 }}>
          New
        </Text>
      </Badge>

      {/* Anki Orange Pill for Learning Step Cards */}
      <Badge
        variant="light"
        color="orange"
        radius="xl"
        size="md"
        style={{
          fontWeight: 800,
          letterSpacing: '0.02em',
          paddingLeft: 10,
          paddingRight: 10,
          border: '1px solid rgba(245, 158, 11, 0.25)',
        }}
        leftSection={
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              display: 'inline-block',
            }}
          />
        }
      >
        <Text span size="xs" fw={800} c="orange.4">
          <RollingNumber value={learningCount} />
        </Text>{' '}
        <Text span size="xs" style={{ opacity: 0.75 }}>
          Learn
        </Text>
      </Badge>

      {/* Anki Green Pill for Review Cards */}
      <Badge
        variant="light"
        color="teal"
        radius="xl"
        size="md"
        style={{
          fontWeight: 800,
          letterSpacing: '0.02em',
          paddingLeft: 10,
          paddingRight: 10,
          border: '1px solid rgba(16, 185, 129, 0.25)',
        }}
        leftSection={
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'inline-block',
            }}
          />
        }
      >
        <Text span size="xs" fw={800} c="teal.4">
          <RollingNumber value={reviewCount} />
        </Text>{' '}
        <Text span size="xs" style={{ opacity: 0.75 }}>
          Review
        </Text>
      </Badge>
    </Group>
  );
}
