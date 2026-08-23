'use client';

import { ActionIcon, type ActionIconProps, Tooltip } from '@mantine/core';
import { IconVolume } from '@tabler/icons-react';
import React, { useState } from 'react';

export type PronounceButtonProps = {
  word: string;
  size?: ActionIconProps['size'];
  variant?: ActionIconProps['variant'];
  color?: ActionIconProps['color'];
  radius?: ActionIconProps['radius'];
  iconSize?: number;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
  rate?: number;
  pitch?: number;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
};

export function PronounceButton({
  word,
  size = 'sm',
  variant,
  color = 'indigo',
  radius = 'md',
  iconSize,
  tooltipPosition = 'top',
  className,
  style,
  rate = 0.88,
  pitch = 1.0,
  lang = 'en-US',
  onStart,
  onEnd,
}: PronounceButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !word.trim()) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.trim());
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      setIsSpeaking(true);
      onStart?.();
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  };

  const calculatedIconSize =
    iconSize ?? (size === 'xs' ? 13 : size === 'sm' ? 15 : size === 'lg' ? 20 : 16);

  const activeVariant = variant ?? (isSpeaking ? 'filled' : 'subtle');

  return (
    <Tooltip label={`Pronounce "${word}"`} withArrow position={tooltipPosition}>
      <ActionIcon
        size={size}
        variant={activeVariant}
        color={color}
        radius={radius}
        className={className}
        style={{
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isSpeaking ? 'scale(1.1)' : undefined,
          flexShrink: 0,
          ...style,
        }}
        onClick={handleSpeak}
        aria-label={`Pronounce ${word}`}
      >
        <IconVolume size={calculatedIconSize} />
      </ActionIcon>
    </Tooltip>
  );
}
