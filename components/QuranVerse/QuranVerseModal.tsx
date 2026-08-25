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
  ScrollArea,
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
  autoPlayAudio?: boolean;
}

export function QuranVerseModal({
  opened,
  onClose,
  verseData,
  verseRecord,
  isLoading = false,
  onNextRandom,
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
        content: {
          overflow: 'hidden',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
        },
        body: {
          padding: 0,
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
        style={{
          background:
            'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(99, 102, 241, 0.18) 50%, rgba(217, 119, 6, 0.12) 100%)',
          borderBottom: '1px solid var(--card-border)',
          padding: '16px 20px',
        }}
      >
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <ThemeIcon
              size="lg"
              radius="md"
              variant="gradient"
              gradient={{ from: 'teal', to: 'indigo', deg: 45 }}
            >
              <IconBook size={20} />
            </ThemeIcon>
            <Stack gap={0}>
              <Group gap="xs" align="center">
                <Title order={4} style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  {verseData ? `Surah ${verseData.chapterInfo.nameSimple}` : 'Quran Verse'}
                </Title>
                {verseData && (
                  <Badge variant="filled" color="indigo" size="sm">
                    {isRange ? `Ayahs ${verseData.key}` : `Ayah ${verseData.key}`}
                  </Badge>
                )}
                {category && (
                  <Badge variant="light" color="teal" size="sm">
                    ✨ {category}
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
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

          <Group gap="xs">
            <Tooltip label="Copy Ayah & Translations">
              <ActionIcon
                variant="subtle"
                color={copied ? 'teal' : 'gray'}
                size="lg"
                radius="md"
                onClick={handleCopy}
                disabled={!verseData}
              >
                {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
              </ActionIcon>
            </Tooltip>

            {onNextRandom && (
              <Tooltip label="Next Random Verse">
                <ActionIcon
                  variant="light"
                  color="indigo"
                  size="lg"
                  radius="md"
                  onClick={onNextRandom}
                  loading={isLoading}
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
            )}

            <ActionIcon variant="subtle" color="gray" size="lg" radius="md" onClick={onClose}>
              <IconX size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>

      {/* Main Body */}
      {isLoading ? (
        <Box
          py={60}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Loader size="lg" color="indigo" type="dots" />
          <Text size="sm" c="dimmed" mt="md">
            Fetching inspirational Quran verse from Quran.com API...
          </Text>
        </Box>
      ) : verseData ? (
        <ScrollArea.Autosize mah="calc(88vh - 120px)" type="auto">
          <Stack gap="md" p={{ base: 'md', sm: 'xl' }}>
            {/* Arabic Calligraphy Display Card */}
            <Card
              radius="lg"
              p={{ base: 'md', sm: 'lg' }}
              style={{
                background:
                  'radial-gradient(ellipse at top, rgba(99, 102, 241, 0.08) 0%, rgba(15, 23, 42, 0.3) 100%)',
                border: '1px solid var(--card-border)',
                boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
                textAlign: 'right',
              }}
            >
              <Group justify="space-between" align="center" mb="xs">
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
                  fontFamily: "'Amiri', 'Scheherazade New', 'Traditional Arabic', serif",
                  fontSize: '1.65rem',
                  lineHeight: '2.5',
                  color: 'var(--mantine-color-text)',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
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
                }}
              >
                <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
                  <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <ActionIcon
                      variant="filled"
                      color="indigo"
                      size="lg"
                      radius="xl"
                      onClick={handleTogglePlay}
                      style={{ flexShrink: 0 }}
                    >
                      {isPlaying ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
                    </ActionIcon>

                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" align="center" gap="xs">
                        <Text size="xs" fw={600} truncate>
                          🎙️ {verseData.audio.reciterName}
                          {audioList.length > 1 && (
                            <Text component="span" size="xs" c="indigo" ml={6} fw={700}>
                              (Playing Ayah {verseData.verse + activeAudioIndex})
                            </Text>
                          )}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatSeconds(audioCurrentTime)} / {formatSeconds(audioDuration)}
                        </Text>
                      </Group>

                      <Slider
                        value={audioCurrentTime}
                        max={audioDuration || 100}
                        onChange={handleSeek}
                        size="xs"
                        color="indigo"
                        label={null}
                        styles={{
                          track: { cursor: 'pointer' },
                          thumb: { borderWidth: 1 },
                        }}
                      />
                    </Stack>
                  </Group>

                  <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      color="gray"
                      onClick={handleTogglePlaybackSpeed}
                      style={{ fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      {playbackSpeed}x
                    </Button>

                    <ActionIcon variant="subtle" color="gray" size="sm" onClick={handleToggleMute}>
                      {isMuted || audioVolume === 0 ? (
                        <IconVolumeOff size={16} />
                      ) : (
                        <IconVolume size={16} />
                      )}
                    </ActionIcon>

                    <Box w={60} display={{ base: 'none', sm: 'block' }}>
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
              </Paper>
            )}

            {/* Translation Tabs (English & Bengali) */}
            <Box>
              <Tabs
                value={activeTab}
                onChange={(val) => val && setActiveTab(val)}
                color="indigo"
                variant="pills"
                radius="md"
              >
                <Tabs.List mb="xs">
                  <Tabs.Tab value="english" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    🇬🇧 English Translation
                  </Tabs.Tab>
                  <Tabs.Tab value="bangla" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                    🇧🇩 বাংলা অনুবাদ
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="english">
                  <Paper
                    p="md"
                    radius="md"
                    style={{
                      background: 'rgba(99, 102, 241, 0.04)',
                      border: '1px solid var(--card-border)',
                    }}
                  >
                    <Group justify="space-between" mb={6}>
                      <Text size="xs" fw={700} c="indigo">
                        {verseData.englishTranslation?.translatorName || 'English Translation'}
                      </Text>
                      <Badge size="xs" variant="light" color="indigo">
                        Sahih / Clear Meaning
                      </Badge>
                    </Group>
                    <Text size="md" style={{ lineHeight: 1.65, fontWeight: 450 }}>
                      "{verseData.englishTranslation?.text || ''}"
                    </Text>
                  </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="bangla">
                  <Paper
                    p="md"
                    radius="md"
                    style={{
                      background: 'rgba(16, 185, 129, 0.04)',
                      border: '1px solid var(--card-border)',
                    }}
                  >
                    <Group justify="space-between" mb={6}>
                      <Text size="xs" fw={700} c="teal">
                        {verseData.banglaTranslation?.translatorName || 'Bangla Translation'}
                      </Text>
                      <Badge size="xs" variant="light" color="teal">
                        সহজ বাংলা অনুবাদ
                      </Badge>
                    </Group>
                    <Text size="md" style={{ lineHeight: 1.7, fontWeight: 450 }}>
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
                }}
              >
                <Group gap="xs" align="flex-start" wrap="nowrap">
                  <IconSparkles
                    size={16}
                    color="var(--mantine-color-amber-6)"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <Stack gap={2}>
                    <Text size="xs" fw={700} c="amber">
                      Reflection Note:
                    </Text>
                    <Text size="xs" c="dimmed">
                      {notes}
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            )}

            {/* Tafsir Collapsible Section */}
            {(verseData.tafsir?.bangla || verseData.tafsir?.english) && (
              <Box>
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
                  <Group gap="xs">
                    <IconBook size={16} />
                    <Text size="sm" fw={600}>
                      📖 Tafsir & Explanation ({tafsirOpen ? 'Hide' : 'Read Commentary'})
                    </Text>
                  </Group>
                </Button>

                <Collapse expanded={tafsirOpen} style={{ marginTop: 8 }}>
                  <Paper
                    p="md"
                    radius="md"
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      maxHeight: 280,
                      overflowY: 'auto',
                    }}
                  >
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
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
                      <Text size="xs" c="dimmed">
                        {tafsirTab === 'bangla'
                          ? verseData.tafsir?.bangla?.name
                          : verseData.tafsir?.english?.name}
                      </Text>
                    </Group>

                    <Divider mb="xs" />

                    {tafsirTab === 'bangla' && verseData.tafsir?.bangla ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: verseData.tafsir.bangla.text }}
                        style={{
                          fontSize: '0.9rem',
                          lineHeight: '1.7',
                          color: 'var(--mantine-color-text)',
                        }}
                      />
                    ) : verseData.tafsir?.english ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: verseData.tafsir.english.text }}
                        style={{
                          fontSize: '0.9rem',
                          lineHeight: '1.65',
                          color: 'var(--mantine-color-text)',
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
        </ScrollArea.Autosize>
      ) : null}

      {/* Modal Bottom Footer Actions */}
      <Box
        p="sm"
        style={{
          borderTop: '1px solid var(--card-border)',
          background: 'rgba(0, 0, 0, 0.05)',
        }}
      >
        <Group justify="space-between" align="center">
          <Text size="xs" c="dimmed">
            Recurring inspirational verse popup
          </Text>

          <Group gap="xs">
            {onNextRandom && (
              <Button
                variant="light"
                color="indigo"
                size="sm"
                leftSection={<IconRefresh size={16} />}
                onClick={onNextRandom}
                loading={isLoading}
              >
                Another Verse
              </Button>
            )}
            <Button variant="default" size="sm" onClick={onClose}>
              Close
            </Button>
          </Group>
        </Group>
      </Box>
    </Modal>
  );
}
