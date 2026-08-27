'use client';

import {
  ActionIcon,
  type ActionIconProps,
  CopyButton,
  Menu,
  type MenuProps,
  Tooltip,
} from '@mantine/core';
import {
  IconBookmark,
  IconBookmarkOff,
  IconCheck,
  IconCopy,
  IconEdit,
  IconTrash,
  IconVolume,
} from '@tabler/icons-react';
import React, { memo } from 'react';

export type WordActionMenuProps = {
  word: string;
  audioUrl?: string;
  phonetic?: string;
  isPlayingAudio?: boolean;
  onSpeak?: () => void;
  onEdit?: () => void;
  isMissed?: boolean;
  onToggleMissed?: () => void;
  missedLabel?: { mark?: string; unmark?: string };
  onDeleteFsrs?: () => void;
  size?: ActionIconProps['size'];
  variant?: ActionIconProps['variant'];
  color?: ActionIconProps['color'];
  radius?: ActionIconProps['radius'];
  position?: MenuProps['position'];
  withinPortal?: boolean;
  style?: React.CSSProperties;
  ariaLabel?: string;
};

export const WordActionMenu = memo(function WordActionMenu({
  word,
  audioUrl,
  isPlayingAudio = false,
  onSpeak,
  onEdit,
  isMissed = false,
  onToggleMissed,
  missedLabel,
  onDeleteFsrs,
  size = 'md',
  variant = 'subtle',
  color = 'gray',
  radius = 'md',
  position = 'bottom-end',
  withinPortal = true,
  style,
  ariaLabel,
}: WordActionMenuProps) {
  const markText = missedLabel?.mark ?? 'Mark as Missed';
  const unmarkText = missedLabel?.unmark ?? 'Remove from Missed';

  const hasSpeak = Boolean(onSpeak);
  const hasEdit = Boolean(onEdit);
  const hasMissed = Boolean(onToggleMissed);
  const hasDeleteFsrs = Boolean(onDeleteFsrs);

  const iconDimension = size === 'lg' ? 22 : size === 'sm' ? 16 : size === 'xs' ? 14 : 18;

  return (
    <Menu
      position={position}
      shadow="md"
      radius="md"
      width={220}
      withinPortal={withinPortal}
      withArrow
      trigger="click-hover"
      openDelay={0}
      closeDelay={150}
    >
      <Menu.Target>
        <Tooltip label="Word actions" withArrow>
          <ActionIcon
            aria-label={ariaLabel ?? `Actions for ${word}`}
            variant={variant}
            color={color}
            size={size}
            radius={radius}
            style={{
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              flexShrink: 0,
              ...style,
            }}
          >
            <img
              src="/icon/action.png"
              alt=""
              width={iconDimension}
              height={iconDimension}
              style={{
                width: iconDimension,
                height: iconDimension,
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Word Actions</Menu.Label>

        {hasSpeak && (
          <Menu.Item
            leftSection={
              <IconVolume
                size={16}
                color={isPlayingAudio ? 'var(--mantine-color-indigo-6)' : undefined}
              />
            }
            onClick={(e) => {
              e.stopPropagation();
              onSpeak?.();
            }}
          >
            {audioUrl ? 'Play Audio (MW)' : 'Speak Pronunciation'}
          </Menu.Item>
        )}

        <CopyButton value={word} timeout={2000}>
          {({ copied, copy }) => (
            <Menu.Item
              leftSection={
                copied ? (
                  <IconCheck size={16} color="var(--mantine-color-teal-6)" />
                ) : (
                  <IconCopy size={16} />
                )
              }
              color={copied ? 'teal' : undefined}
              onClick={(e) => {
                e.stopPropagation();
                copy();
              }}
              closeMenuOnClick={false}
            >
              {copied ? 'Copied word!' : 'Copy word'}
            </Menu.Item>
          )}
        </CopyButton>

        {hasEdit && (
          <Menu.Item
            leftSection={<IconEdit size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
          >
            Edit Word
          </Menu.Item>
        )}

        {hasMissed && (
          <Menu.Item
            leftSection={
              isMissed ? (
                <IconBookmark
                  size={16}
                  style={{ fill: 'currentColor', color: 'var(--mantine-color-red-6)' }}
                />
              ) : (
                <IconBookmarkOff size={16} />
              )
            }
            color={isMissed ? 'red' : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMissed?.();
            }}
          >
            {isMissed ? unmarkText : markText}
          </Menu.Item>
        )}

        {hasDeleteFsrs && (
          <>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFsrs?.();
              }}
            >
              Delete FSRS Record
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
});
