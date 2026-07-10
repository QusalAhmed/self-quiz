import type { CSSProperties, ReactNode } from 'react';
import { ActionIcon, type ActionIconProps, Tooltip } from '@mantine/core';

type WordActionIconProps = {
  label: string;
  ariaLabel?: string;
  children: ReactNode;
  onClick?: () => void;
  color?: ActionIconProps['color'];
  variant?: ActionIconProps['variant'];
  gradient?: ActionIconProps['gradient'];
  size?: ActionIconProps['size'];
  radius?: ActionIconProps['radius'];
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: CSSProperties;
  withArrow?: boolean;
};

export function WordActionIcon({
  label,
  ariaLabel,
  children,
  onClick,
  color = 'gray',
  variant = 'subtle',
  gradient,
  size = 'md',
  radius = 'md',
  disabled,
  loading,
  type = 'button',
  style,
  withArrow = true,
}: WordActionIconProps) {
  return (
    <Tooltip label={label} withArrow={withArrow}>
      <ActionIcon
        aria-label={ariaLabel ?? label}
        variant={variant}
        color={color}
        gradient={gradient}
        size={size}
        radius={radius}
        onClick={onClick}
        disabled={disabled}
        loading={loading}
        type={type}
        style={{ transition: 'all 0.2s ease', ...style }}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  );
}
