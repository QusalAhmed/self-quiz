'use client';

import { Badge, Tooltip } from '@mantine/core';
import React from 'react';
import type { SectionStatusInfo } from '@/lib/analysis/types';

export type SectionStatusBadgeProps = {
  statusInfo?: SectionStatusInfo;
  size?: 'xs' | 'sm' | 'md';
};

export function SectionStatusBadge({ statusInfo, size = 'xs' }: SectionStatusBadgeProps) {
  if (!statusInfo) {
    return null;
  }

  const { status, label, badgeColor, message } = statusInfo;

  return (
    <Tooltip
      label={message}
      multiline
      w={260}
      withArrow
      transitionProps={{ duration: 150, transition: 'fade' }}
    >
      <Badge
        size={size}
        variant={
          status === 'available' ? 'light' : status === 'limited_data' ? 'filled' : 'outline'
        }
        color={badgeColor}
        radius="sm"
        style={{
          cursor: 'help',
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: 0,
        }}
      >
        {label}
      </Badge>
    </Tooltip>
  );
}
