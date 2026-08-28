'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  Loader,
  Modal,
  Paper,
  Slider,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBook,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconCopy,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconSparkles,
  IconVolume,
  IconVolumeOff,
  IconX,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type QuranVerseRecord } from '@/lib/db';
import { appNotifications } from '@/lib/notifications';
import { type FetchedVersePayload } from '@/lib/quran-api';

export interface QuranVerseModalProps {
  opened: boolean;
  onClose: () => void;
  verseData: FetchedVersePayload | null;
  verseRecord?: QuranVerseRecord | null;
  isLoading?: boolean;
  onNextRandom?: () => void;
  onSnooze?: () => void;
  autoPlayAudio?: boolean;
}

export function QuranVerseModal({
  opened,
  onClose,
  verseData,
  verseRecord,
  isLoading = false,
  onNextRandom,
  onSnooze,
  autoPlayAudio = false,
}: QuranVerseModalProps) {
  const [activeTab, setActiveTab] = useState<string>('english');
  const [tafsirOpen, setTafsirOpen] = useState(false);
  const [tafsirTab, setTafsirTab] = useState<'english' | 'bangla'>('bangla');
  const [copied, setCopied] = useState(false);

  // Audio Playback State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeAudioIndex, setActiveAudioIndex] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const audioList = useMemo(() => {
    if (verseData?.audio?.audioUrls && verseData.audio.audioUrls.length > 0) {
      return verseData.audio.audioUrls;
    }
    return verseData?.audio?.audioUrl ? [verseData.audio.audioUrl] : [];
  }, [verseData?.audio]);

  const currentAudioUrl = audioList[activeAudioIndex] || verseData?.audio?.audioUrl || '';

  // Reset audio when verse changes
  useEffect(() => {
    setActiveAudioIndex(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setAudioCurrentTime(0);
      setAudioDuration(0);
    }

    if (opened && verseData?.audio?.audioUrl && autoPlayAudio) {
      const timer = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [verseData?.key, verseData?.audio?.audioUrl, opened, autoPlayAudio]);

  // Audio Event Handlers
  const handleTogglePlay = () => {
    if (!audioRef.current || !currentAudioUrl) {
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.warn('Audio play error:', err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration || 0);
    }
  };

  const handleAudioEnded = () => {
    if (activeAudioIndex < audioList.length - 1) {
      const nextIdx = activeAudioIndex + 1;
      setActiveAudioIndex(nextIdx);
      setAudioCurrentTime(0);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch((err) => console.warn('Next audio play error:', err));
        }
      }, 150);
    } else {
      setIsPlaying(false);
      setAudioCurrentTime(0);
      setActiveAudioIndex(0);
    }
  };

  const handleSeek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setAudioCurrentTime(value);
    }
  };

  const handleToggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (val: number) => {
    setAudioVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const handleTogglePlaybackSpeed = () => {
    const speeds = [1, 1.25, 0.8];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) {
      return '0:00';
    }
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Copy Verses & Translations to Clipboard
  const handleCopy = useCallback(() => {
    if (!verseData) {
      return;
    }
    const text =
      `📖 Surah ${verseData.chapterInfo.nameSimple} (${verseData.chapterInfo.nameArabic}) [${verseData.key}]\n\n` +
      `۞ ${verseData.arabicText}\n\n` +
      `🇬🇧 English (${verseData.englishTranslation.translatorName}):\n"${verseData.englishTranslation.text}"\n\n` +
      `🇧🇩 বাংলা (${verseData.banglaTranslation.translatorName}):\n"${verseData.banglaTranslation.text}"\n\n` +
      `— Quran.com`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      appNotifications.success({
        title: 'Copied to Clipboard',
        message: `Ayah ${verseData.key} and translations copied.`,
      });
      setTimeout(() => setCopied(false), 2000);
    });
  }, [verseData]);

  if (!verseData && !isLoading) {
    return null;
  }

  const category = verseRecord?.category || 'Inspirational';
  const notes = verseRecord?.notes || '';
  const isRange = Boolean(verseData?.verseEnd && verseData.verseEnd > verseData.verse);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      radius="lg"
      padding={0}
      withCloseButton={false}
      centered
      overlayProps={{
        backgroundOpacity: 0.65,
        blur: 4,
      }}
      styles={{
        root: {
          maxWidth: '100vw',
          overflow: 'hidden',
        },
        inner: {
          padding: 'clamp(4px, 2vw, 16px)',
          maxWidth: '100vw',
          overflow: 'hidden',
        },
        content: {
          maxWidth: '100%',
          width: '100%',
          maxHeight: 'calc(100dvh - 16px)',
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          margin: '0 auto',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
        },
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          maxWidth: '100%',
          overflow: 'hidden',
        },
      }}
    >
      {/* Hidden Audio Element */}
      {currentAudioUrl && (
        <audio
          ref={audioRef}
          src={currentAudioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
          preload="auto"
          aria-label={`Recitation of Surah ${verseData?.chapterInfo.nameSimple} ayah ${verseData?.key}`}
        >
          <track kind="captions" />
        </audio>
      )}

      {/* Modal Top Header with Islamic Motif Gradient */}
      <Box
        p={{ base: 'xs', sm: 'md' }}
        style={{
          background:
            'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(99, 102, 241, 0.18) 50%, rgba(217, 119, 6, 0.12) 100%)',
          borderBottom: '1px solid var(--card-border)',
          width: '100%',
          maxWidth: '100%',
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
          <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <ThemeIcon
              size="md"
              radius="md"
              variant="gradient"
              gradient={{ from: 'teal', to: 'indigo', deg: 45 }}
              style={{ flexShrink: 0 }}
            >
              <IconBook size={16} />
            </ThemeIcon>
            <Stack gap={1} style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <Group
                gap={4}
                align="center"
                wrap="nowrap"
                style={{ overflow: 'hidden', maxWidth: '100%' }}
              >
                <Title
                  order={4}
                  style={{
                    fontWeight: 700,
                    fontSize: 'clamp(0.85rem, 2.5vw, 1.05rem)',
                    flexShrink: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {verseData ? `Surah ${verseData.chapterInfo.nameSimple}` : 'Quran Verse'}
                </Title>
                {verseData && (
                  <Badge variant="filled" color="indigo" size="xs" style={{ flexShrink: 0 }}>
                    {isRange ? `Ayahs ${verseData.key}` : `Ayah ${verseData.key}`}
                  </Badge>
                )}
                {category && (
                  <Badge
                    variant="light"
                    color="teal"
                    size="xs"
                    display={{ base: 'none', xs: 'inline-flex' }}
                    style={{ flexShrink: 0 }}
                  >
                    ✨ {category}
                  </Badge>
                )}
              </Group>
              <Text
                size="xs"
                c="dimmed"
                truncate="end"
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}
              >
                {verseData
                  ? `${verseData.chapterInfo.translatedName} • ${
                      verseData.chapterInfo.revelationPlace === 'makkah' ? 'Meccan' : 'Medinan'
                    } • ${
                      isRange
                        ? `Ayahs ${verseData.verse}-${verseData.verseEnd}`
                        : `Ayah ${verseData.verse}`
                    } of ${verseData.chapterInfo.versesCount}`
                  : 'Motivational Reflection'}
              </Text>
            </Stack>
          </Group>

          <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
            <Tooltip label="Copy Ayah & Translations">
              <ActionIcon
                variant="subtle"
                color={copied ? 'teal' : 'gray'}
                size="sm"
                radius="md"
                onClick={handleCopy}
                disabled={!verseData}
                aria-label="Copy Ayah & Translations"
              >
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>

            {onSnooze && (
              <Tooltip label="Snooze verse & reset next timer cycle">
                <ActionIcon
                  variant="light"
                  color="amber"
                  size="sm"
                  radius="md"
                  onClick={() => onSnooze()}
                  aria-label="Snooze verse"
                >
                  <IconClock size={14} />
                </ActionIcon>
              </Tooltip>
            )}

            {onNextRandom && (
              <Tooltip label="Next Random Verse">
                <ActionIcon
                  variant="light"
                  color="indigo"
                  size="sm"
                  radius="md"
                  onClick={() => onNextRandom()}
                  loading={isLoading}
                  aria-label="Next Random Verse"
                >
                  <IconRefresh size={14} />
                </ActionIcon>
              </Tooltip>
            )}

            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              radius="md"
              onClick={() => onClose()}
              aria-label="Close modal"
            >
              <IconX size={14} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>

      {/* Main Body */}
      {isLoading ? (
        <Box
          py={{ base: 40, sm: 60 }}
          px="md"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            flex: 1,
          }}
        >
          <Loader size="lg" color="indigo" type="dots" />
          <Text size="sm" c="dimmed" mt="md" style={{ wordBreak: 'break-word' }}>
            Fetching inspirational Quran verse from Quran.com API...
          </Text>
        </Box>
      ) : verseData ? (
        <Box
          style={{
            flex: 1,
            minHeight: 0,
            maxHeight: 'calc(88dvh - 120px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            width: '100%',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Stack
            gap="md"
            p={{ base: 'xs', sm: 'md' }}
            style={{
              maxWidth: '100%',
              width: '100%',
              boxSizing: 'border-box',
              overflowX: 'hidden',
            }}
          >
            {/* Arabic Calligraphy Display Card */}
            <Card
              radius="lg"
              p="md"
              style={{
                background:
                  'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.08) 0%, rgba(15, 23, 42, 0.3) 100%)',
                border: '1px solid var(--card-border)',
                boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
                textAlign: 'right',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <Group justify="space-between" align="center" mb="xs" wrap="wrap" gap="xs">
                <Badge variant="outline" color="amber" size="xs">
                  {verseData.chapterInfo.nameArabic} ({verseData.key})
                </Badge>
                <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                  Arabic Uthmani Script
                </Text>
              </Group>

              <Text
                dir="rtl"
                style={{
                  fontFamily:
                    "var(--font-arabic, 'Amiri', 'Scheherazade New', 'Traditional Arabic', serif)",
                  fontSize: 'clamp(1.15rem, 3.8vw, 1.65rem)',
                  lineHeight: '2.2',
                  color: 'var(--mantine-color-text)',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  maxWidth: '100%',
                  display: 'block',
                }}
              >
                {verseData.arabicText}
              </Text>
            </Card>

            {/* Recitation Audio Player Strip */}
            {verseData.audio && (
              <Paper
                p="xs"
                radius="md"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <Stack gap={6} style={{ width: '100%', minWidth: 0 }}>
                  <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                    <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                      <ActionIcon
                        variant="filled"
                        color="indigo"
                        size="md"
                        radius="xl"
                        onClick={handleTogglePlay}
                        style={{ flexShrink: 0 }}
                        aria-label={isPlaying ? 'Pause audio recitation' : 'Play audio recitation'}
                      >
                        {isPlaying ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
                      </ActionIcon>

                      <Text size="xs" fw={600} truncate="end" style={{ flex: 1, minWidth: 0 }}>
                        🎙️ {verseData.audio.reciterName}
                        {audioList.length > 1 && (
                          <Text component="span" size="xs" c="indigo" ml={6} fw={700}>
                            (Ayah {verseData.verse + activeAudioIndex})
                          </Text>
                        )}
                      </Text>
                    </Group>

                    <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                      <Button
                        variant="subtle"
                        size="compact-xs"
                        color="gray"
                        onClick={handleTogglePlaybackSpeed}
                        style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 6px' }}
                      >
                        {playbackSpeed}x
                      </Button>

                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={handleToggleMute}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted || audioVolume === 0 ? (
                          <IconVolumeOff size={16} />
                        ) : (
                          <IconVolume size={16} />
                        )}
                      </ActionIcon>

                      <Box w={50} display={{ base: 'none', sm: 'block' }}>
                        <Slider
                          value={isMuted ? 0 : audioVolume}
                          min={0}
                          max={1}
                          step={0.05}
                          size="xs"
                          color="indigo"
                          onChange={handleVolumeChange}
                        />
                      </Box>
                    </Group>
                  </Group>

                  <Group
                    gap="xs"
                    wrap="nowrap"
                    align="center"
                    style={{ width: '100%', minWidth: 0 }}
                  >
                    <Slider
                      value={audioCurrentTime}
                      max={audioDuration || 100}
                      onChange={handleSeek}
                      size="xs"
                      color="indigo"
                      label={null}
                      style={{ flex: 1, minWidth: 0 }}
                      styles={{
                        track: { cursor: 'pointer' },
                        thumb: { borderWidth: 1 },
                      }}
                    />
                    <Text
                      size="xs"
                      c="dimmed"
                      style={{
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        fontSize: '0.7rem',
                      }}
                    >
                      {formatSeconds(audioCurrentTime)} / {formatSeconds(audioDuration)}
                    </Text>
                  </Group>
                </Stack>
              </Paper>
            )}

            {/* Translation Tabs (English & Bengali) */}
            <Box style={{ maxWidth: '100%', width: '100%', overflow: 'hidden' }}>
              <Tabs
                value={activeTab}
                onChange={(val) => val && setActiveTab(val)}
                color="indigo"
                variant="pills"
                radius="md"
              >
                <Tabs.List mb="xs" style={{ flexWrap: 'wrap', gap: 6 }}>
                  <Tabs.Tab
                    value="english"
                    style={{
                      fontWeight: 600,
                      fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
                      padding: '4px 10px',
                    }}
                  >
                    🇬🇧 English
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="bangla"
                    style={{
                      fontWeight: 600,
                      fontSize: 'clamp(0.75rem, 2.5vw, 0.85rem)',
                      padding: '4px 10px',
                    }}
                  >
                    🇧🇩 বাংলা অনুবাদ
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="english">
                  <Paper
                    p="sm"
                    radius="md"
                    style={{
                      background: 'rgba(99, 102, 241, 0.04)',
                      border: '1px solid var(--card-border)',
                      width: '100%',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                    }}
                  >
                    <Group justify="space-between" mb={6} wrap="wrap" gap="xs">
                      <Text size="xs" fw={700} c="indigo" style={{ wordBreak: 'break-word' }}>
                        {verseData.englishTranslation?.translatorName || 'Saheeh International'}
                      </Text>
                    </Group>
                    <Text
                      size="md"
                      style={{
                        lineHeight: 1.65,
                        fontWeight: 450,
                        fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    >
                      "{verseData.englishTranslation?.text || ''}"
                    </Text>
                  </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="bangla">
                  <Paper
                    p="sm"
                    radius="md"
                    style={{
                      background: 'rgba(16, 185, 129, 0.04)',
                      border: '1px solid var(--card-border)',
                      width: '100%',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                    }}
                  >
                    <Group justify="space-between" mb={6} wrap="wrap" gap="xs">
                      <Text size="xs" fw={700} c="teal" style={{ wordBreak: 'break-word' }}>
                        {verseData.banglaTranslation?.translatorName || 'Bangla Translation'}
                      </Text>
                      <Badge size="xs" variant="light" color="teal">
                        সহজ বাংলা অনুবাদ
                      </Badge>
                    </Group>
                    <Text
                      size="md"
                      style={{
                        lineHeight: 1.7,
                        fontWeight: 450,
                        fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}
                    >
                      "{verseData.banglaTranslation?.text || ''}"
                    </Text>
                  </Paper>
                </Tabs.Panel>
              </Tabs>
            </Box>

            {/* Optional Reflection / Note from Database */}
            {notes && (
              <Paper
                p="xs"
                radius="md"
                style={{
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                <Group gap="xs" align="flex-start" wrap="nowrap">
                  <IconSparkles
                    size={16}
                    color="var(--mantine-color-amber-6)"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xs" fw={700} c="amber">
                      Reflection Note:
                    </Text>
                    <Text
                      size="xs"
                      c="dimmed"
                      style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                    >
                      {notes}
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            )}

            {/* Tafsir Collapsible Section */}
            {(verseData.tafsir?.bangla || verseData.tafsir?.english) && (
              <Box style={{ maxWidth: '100%', width: '100%', overflow: 'hidden' }}>
                <Button
                  variant="light"
                  color="gray"
                  fullWidth
                  justify="space-between"
                  rightSection={
                    tafsirOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />
                  }
                  onClick={() => setTafsirOpen(!tafsirOpen)}
                  style={{ borderRadius: 8 }}
                >
                  <Group
                    gap="xs"
                    wrap="nowrap"
                    style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}
                  >
                    <IconBook size={16} style={{ flexShrink: 0 }} />
                    <Text size="sm" fw={600} truncate="end">
                      📖 Tafsir & Explanation ({tafsirOpen ? 'Hide' : 'Read Commentary'})
                    </Text>
                  </Group>
                </Button>

                <Collapse expanded={tafsirOpen} style={{ marginTop: 8 }}>
                  <Paper
                    p="sm"
                    radius="md"
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      maxHeight: 280,
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      width: '100%',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <Group justify="space-between" mb="xs" wrap="wrap" gap="xs">
                      <Group gap="xs" wrap="wrap">
                        {verseData.tafsir?.bangla && (
                          <Button
                            size="compact-xs"
                            variant={tafsirTab === 'bangla' ? 'filled' : 'subtle'}
                            color="teal"
                            onClick={() => setTafsirTab('bangla')}
                          >
                            বাংলা তাফসীর
                          </Button>
                        )}
                        {verseData.tafsir?.english && (
                          <Button
                            size="compact-xs"
                            variant={tafsirTab === 'english' ? 'filled' : 'subtle'}
                            color="indigo"
                            onClick={() => setTafsirTab('english')}
                          >
                            English Tafsir
                          </Button>
                        )}
                      </Group>
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{ wordBreak: 'break-word', maxWidth: '100%' }}
                      >
                        {tafsirTab === 'bangla'
                          ? verseData.tafsir?.bangla?.name
                          : verseData.tafsir?.english?.name}
                      </Text>
                    </Group>

                    <Divider mb="xs" />

                    {tafsirTab === 'bangla' && verseData.tafsir?.bangla ? (
                      <Box
                        dangerouslySetInnerHTML={{ __html: verseData.tafsir.bangla.text }}
                        style={{
                          fontSize: 'clamp(0.82rem, 2.5vw, 0.9rem)',
                          lineHeight: '1.7',
                          color: 'var(--mantine-color-text)',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          maxWidth: '100%',
                          overflowX: 'hidden',
                        }}
                      />
                    ) : verseData.tafsir?.english ? (
                      <Box
                        dangerouslySetInnerHTML={{ __html: verseData.tafsir.english.text }}
                        style={{
                          fontSize: 'clamp(0.82rem, 2.5vw, 0.9rem)',
                          lineHeight: '1.65',
                          color: 'var(--mantine-color-text)',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          maxWidth: '100%',
                          overflowX: 'hidden',
                        }}
                      />
                    ) : (
                      <Text size="sm" c="dimmed">
                        Tafsir commentary not available for this verse.
                      </Text>
                    )}
                  </Paper>
                </Collapse>
              </Box>
            )}
          </Stack>
        </Box>
      ) : null}

      {/* Modal Bottom Footer Actions - Always locked at bottom & visible */}
      {(onSnooze || onNextRandom) && (
        <Box
          p={{ base: 'xs', sm: 'sm' }}
          style={{
            borderTop: '1px solid var(--card-border)',
            background: 'var(--mantine-color-body)',
            width: '100%',
            maxWidth: '100%',
            flexShrink: 0,
            boxSizing: 'border-box',
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="xs">
            <Text size="xs" c="dimmed" display={{ base: 'none', sm: 'block' }}>
              Recurring inspirational verse popup
            </Text>

            <Group
              gap={8}
              wrap="nowrap"
              style={{
                flex: 1,
                minWidth: 0,
                justifyContent: 'flex-end',
              }}
            >
              {onSnooze && (
                <Tooltip label="Snooze verse & reset next timer cycle">
                  <Button
                    variant="light"
                    color="amber"
                    size="xs"
                    leftSection={<IconClock size={14} />}
                    onClick={() => onSnooze()}
                    style={{ flexShrink: 1, minWidth: 0, padding: '0 10px', fontSize: '0.8rem' }}
                  >
                    Snooze
                  </Button>
                </Tooltip>
              )}

              {onNextRandom && (
                <Button
                  variant="light"
                  color="indigo"
                  size="xs"
                  leftSection={<IconRefresh size={14} />}
                  onClick={() => onNextRandom()}
                  loading={isLoading}
                  style={{ flexShrink: 1, minWidth: 0, padding: '0 10px', fontSize: '0.8rem' }}
                >
                  Another Verse
                </Button>
              )}
            </Group>
          </Group>
        </Box>
      )}
    </Modal>
  );
}
