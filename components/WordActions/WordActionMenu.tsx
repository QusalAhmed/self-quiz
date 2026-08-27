'use client';

import {
  ActionIcon,
  type ActionIconProps,
  Badge,
  CopyButton,
  Group,
  Loader,
  Menu,
  type MenuProps,
  Tooltip,
} from '@mantine/core';
import {
  IconBookmark,
  IconBookmarkOff,
  IconCheck,
  IconCopy,
  IconDownload,
  IconEdit,
  IconRefresh,
  IconTrash,
  IconVolume,
} from '@tabler/icons-react';
import React, { memo, useEffect, useState } from 'react';
import { appNotifications } from '@/lib/notifications';

export type WordActionMenuProps = {
  word: string;
  wordId?: string;
  audioUrl?: string;
  phonetic?: string;
  isPlayingAudio?: boolean;
  onSpeak?: () => void;
  onEdit?: () => void;
  isMissed?: boolean;
  onToggleMissed?: () => void;
  missedLabel?: { mark?: string; unmark?: string };
  onDeleteFsrs?: () => void;
  onFetchAudio?: (word: string, wordId?: string) => Promise<void> | void;
  onAudioUpdated?: (audioUrl: string, phonetic?: string) => void;
  showFetchAudio?: boolean;
  size?: ActionIconProps['size'];
  variant?: ActionIconProps['variant'];
  color?: ActionIconProps['color'];
  radius?: ActionIconProps['radius'];
  iconSize?: number;
  position?: MenuProps['position'];
  withinPortal?: boolean;
  style?: React.CSSProperties;
  ariaLabel?: string;
};

export const WordActionMenu = memo(function WordActionMenu({
  word,
  wordId,
  audioUrl,
  phonetic,
  isPlayingAudio = false,
  onSpeak,
  onEdit,
  isMissed = false,
  onToggleMissed,
  missedLabel,
  onDeleteFsrs,
  onFetchAudio,
  onAudioUpdated,
  showFetchAudio = true,
  size = 'md',
  variant = 'subtle',
  color = 'gray',
  radius = 'md',
  iconSize,
  position = 'bottom',
  withinPortal = true,
  style,
  ariaLabel,
}: WordActionMenuProps) {
  const [isFetchingAudio, setIsFetchingAudio] = useState(false);
  const [currentPhonetic, setCurrentPhonetic] = useState<string | undefined>(phonetic);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | undefined>(audioUrl);

  useEffect(() => {
    setCurrentPhonetic(phonetic);
  }, [phonetic]);

  useEffect(() => {
    setCurrentAudioUrl(audioUrl);
  }, [audioUrl]);

  const markText = missedLabel?.mark ?? 'Mark as Missed';
  const unmarkText = missedLabel?.unmark ?? 'Remove from Missed';

  const hasSpeak = Boolean(onSpeak);
  const hasEdit = Boolean(onEdit);
  const hasMissed = Boolean(onToggleMissed);
  const hasDeleteFsrs = Boolean(onDeleteFsrs);

  const handleFetchAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFetchingAudio) {
      return;
    }

    if (onFetchAudio) {
      try {
        setIsFetchingAudio(true);
        await onFetchAudio(word, wordId);
      } finally {
        setIsFetchingAudio(false);
      }
      return;
    }

    const cleanWord = word.trim();
    if (!cleanWord) {
      return;
    }

    setIsFetchingAudio(true);
    try {
      const res = await fetch('/api/pronounce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: cleanWord }),
      });

      if (!res.ok) {
        appNotifications.error({
          title: 'Fetch Audio Failed',
          message: `Server returned status ${res.status}`,
        });
        return;
      }

      const data = await res.json();
      if (data?.audioUrl) {
        if (data.phonetic) {
          setCurrentPhonetic(data.phonetic);
        }
        if (data.audioUrl) {
          setCurrentAudioUrl(data.audioUrl);
        }

        // 1. Play audio immediately
        try {
          const { playWordAudio } = await import('@/lib/sound');
          void playWordAudio(data.audioUrl);
        } catch {}

        // 2. Persist to RxDB if wordId or word is available
        try {
          const { getDatabase } = await import('@/lib/db');
          const db = await getDatabase();
          let doc = null;
          if (wordId) {
            const cleanId = wordId.includes(':') ? wordId.split(':')[0] : wordId;
            doc = await db.words.findOne(cleanId).exec();
          }
          if (!doc) {
            doc = await db.words.findOne({ selector: { word: cleanWord.toLowerCase() } }).exec();
          }
          if (doc) {
            await doc.patch({
              audioUrl: data.audioUrl,
              ...(data.phonetic ? { phonetic: data.phonetic } : {}),
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (dbErr) {
          console.warn('Could not persist fetched audio to RxDB:', dbErr);
        }

        onAudioUpdated?.(data.audioUrl, data.phonetic);

        appNotifications.success({
          title: 'Audio Found',
          message: `Merriam-Webster audio for "${cleanWord}" saved!`,
        });
      } else {
        appNotifications.warning({
          title: 'No Audio Found',
          message: `No Merriam-Webster audio available for "${cleanWord}".`,
        });
      }
    } catch (err: any) {
      appNotifications.error({
        title: 'Error',
        message: err?.message || 'Failed to fetch audio pronunciation',
      });
    } finally {
      setIsFetchingAudio(false);
    }
  };

  const iconDimension =
    iconSize ??
    (size === 'xl'
      ? 38
      : size === 'lg'
        ? 30
        : size === 'md'
          ? 24
          : size === 'sm'
            ? 20
            : size === 'xs'
              ? 16
              : 24);

  return (
    <Menu
      position={position}
      shadow="md"
      radius="md"
      width={currentPhonetic ? 240 : 220}
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
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label style={{ padding: '6px 10px 4px' }}>
          <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em' }}>
              WORD ACTIONS
            </span>
            {currentPhonetic && (
              <Badge
                variant="light"
                color="indigo"
                size="xs"
                radius="sm"
                style={{
                  fontFamily: 'monospace',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '11px',
                  letterSpacing: 'normal',
                  maxWidth: 135,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flexShrink: 0,
                }}
                title={currentPhonetic}
              >
                {currentPhonetic}
              </Badge>
            )}
          </Group>
        </Menu.Label>

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
            {currentAudioUrl ? 'Play Audio (MW)' : 'Speak Pronunciation'}
          </Menu.Item>
        )}

        {showFetchAudio && (
          <Menu.Item
            leftSection={
              isFetchingAudio ? (
                <Loader size={14} color="blue" />
              ) : currentAudioUrl ? (
                <IconRefresh size={16} color="var(--mantine-color-blue-6)" />
              ) : (
                <IconDownload size={16} color="var(--mantine-color-blue-6)" />
              )
            }
            disabled={isFetchingAudio}
            closeMenuOnClick={false}
            onClick={handleFetchAudio}
          >
            {isFetchingAudio
              ? 'Fetching audio...'
              : currentAudioUrl
                ? 'Re-fetch MW Audio'
                : 'Fetch MW Audio'}
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
