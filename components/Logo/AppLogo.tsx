'use client';

import { Group, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import React from 'react';
import { AppIcon } from '@/components/Logo/AppIcon';

export type AppLogoProps = {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  subtitleText?: string;
  href?: string | null;
  onClick?: () => void;
  withGlow?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

const SIZES = {
  xs: { iconSize: 24, iconRadius: 7, titleSize: '0.85rem', subtitleSize: '0.62rem', gap: 'xs' },
  sm: { iconSize: 30, iconRadius: 8, titleSize: '0.92rem', subtitleSize: '0.66rem', gap: 'xs' },
  md: { iconSize: 36, iconRadius: 10, titleSize: '1.02rem', subtitleSize: '0.70rem', gap: 'sm' },
  lg: { iconSize: 44, iconRadius: 12, titleSize: '1.20rem', subtitleSize: '0.78rem', gap: 'sm' },
  xl: { iconSize: 56, iconRadius: 16, titleSize: '1.45rem', subtitleSize: '0.86rem', gap: 'md' },
} as const;

export function AppLogo({
  size = 'md',
  showSubtitle = true,
  subtitleText = 'Vocabulary Companion',
  href = '/',
  onClick,
  withGlow = true,
  className,
  style,
}: AppLogoProps) {
  const config = SIZES[size] || SIZES.md;

  const content = (
    <Group
      justify="flex-start"
      align="center"
      gap={config.gap}
      wrap="nowrap"
      className={className}
      style={style}
    >
      <AppIcon size={config.iconSize} radius={config.iconRadius} withGlow={withGlow} />
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Title
          order={4}
          style={{
            fontSize: config.titleSize,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-title)',
          }}
        >
          <span className="text-gradient">Word Memorizer</span>
        </Title>
        {showSubtitle && (
          <Text
            size="xs"
            c="dimmed"
            style={{
              fontSize: config.subtitleSize,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
            }}
          >
            {subtitleText}
          </Text>
        )}
      </Stack>
    </Group>
  );

  if (href) {
    return (
      <Link
        href={href}
        style={{
          cursor: 'pointer',
          textDecoration: 'none',
          color: 'inherit',
          display: 'inline-block',
        }}
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        style={{ cursor: 'pointer', display: 'inline-block' }}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}
