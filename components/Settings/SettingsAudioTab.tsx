'use client';

import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  RollingNumber,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import {
  IconMicrophone,
  IconPlayerPlay,
  IconRefresh,
  IconSparkles,
  IconVolume,
} from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import type { AppAudioSettings } from '@/lib/settings';
import { playNotificationSound, playReviewSound, type ReviewRating } from '@/lib/sound';

export interface SettingsAudioTabProps {
  settings: AppAudioSettings;
  onChange: (values: Partial<AppAudioSettings>) => void;
}

export function SettingsAudioTab({ settings, onChange }: SettingsAudioTabProps) {
  const [voices, setVoices] = useState<Array<{ value: string; label: string; lang: string }>>([]);
  const [testPhrase, setTestPhrase] = useState('Ephemeral: lasting for a very short time.');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load available speech synthesis voices from browser
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      const englishVoices = available
        .filter((v) => v.lang.startsWith('en') || !v.lang)
        .map((v) => ({
          value: v.voiceURI || v.name,
          label: `${v.name} (${v.lang || 'en'})`,
          lang: v.lang,
        }));

      const allVoices = available.map((v) => ({
        value: v.voiceURI || v.name,
        label: `${v.name} (${v.lang})`,
        lang: v.lang,
      }));

      setVoices(englishVoices.length > 0 ? englishVoices : allVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const handleSpeakTestPhrase = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(testPhrase);
    utterance.rate = settings.ttsRate;
    utterance.pitch = settings.ttsPitch;
    utterance.volume = settings.ttsVolume;

    if (settings.ttsVoiceUri) {
      const allVoices = window.speechSynthesis.getVoices();
      const selected = allVoices.find((v) => (v.voiceURI || v.name) === settings.ttsVoiceUri);
      if (selected) {
        utterance.voice = selected;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleTestReviewSound = (rating: ReviewRating) => {
    playReviewSound(rating);
  };

  const handleTestNotificationSound = () => {
    playNotificationSound();
  };

  return (
    <Stack gap="lg">
      {/* Sound Effects & Feedback */}
      <Card
        withBorder
        radius="md"
        p={{ base: 'md', sm: 'lg' }}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <Group gap="sm" mb="md">
          <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
            <IconVolume size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Audio Feedback & Sound Effects
            </Text>
            <Text size="xs" c="dimmed">
              Auditory cues for spaced practice ratings, card reviews, and system alerts
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Text size="sm" fw={600}>
                Quiz Review Sound FX
              </Text>
              <Text size="xs" c="dimmed">
                Play pleasant acoustic chimes when grading cards (Again, Hard, Good, Easy)
              </Text>
            </div>
            <Switch
              checked={settings.reviewSoundEffectsEnabled}
              onChange={(e) => onChange({ reviewSoundEffectsEnabled: e.currentTarget.checked })}
              color="indigo"
            />
          </Group>

          <Divider />

          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Text size="sm" fw={600}>
                Notification Chimes
              </Text>
              <Text size="xs" c="dimmed">
                Play a subtle chime on due card queue refills, sync updates, and milestone
                achievements
              </Text>
            </div>
            <Switch
              checked={settings.notificationSoundsEnabled}
              onChange={(e) => onChange({ notificationSoundsEnabled: e.currentTarget.checked })}
              color="indigo"
            />
          </Group>

          <Divider />

          {/* Interactive Soundboard Test Bench */}
          <div>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={1} mb="xs">
              Interactive Sound FX Test Bench
            </Text>
            <SimpleGrid cols={{ base: 2, xs: 3, sm: 5 }} spacing="xs">
              <Button
                variant="light"
                color="red"
                size="xs"
                radius="md"
                onClick={() => handleTestReviewSound('again')}
                leftSection={<IconPlayerPlay size={12} />}
              >
                Again
              </Button>

              <Button
                variant="light"
                color="orange"
                size="xs"
                radius="md"
                onClick={() => handleTestReviewSound('hard')}
                leftSection={<IconPlayerPlay size={12} />}
              >
                Hard
              </Button>

              <Button
                variant="light"
                color="blue"
                size="xs"
                radius="md"
                onClick={() => handleTestReviewSound('good')}
                leftSection={<IconPlayerPlay size={12} />}
              >
                Good
              </Button>

              <Button
                variant="light"
                color="teal"
                size="xs"
                radius="md"
                onClick={() => handleTestReviewSound('easy')}
                leftSection={<IconPlayerPlay size={12} />}
              >
                Easy
              </Button>

              <Button
                variant="light"
                color="violet"
                size="xs"
                radius="md"
                onClick={handleTestNotificationSound}
                leftSection={<IconSparkles size={12} />}
              >
                Alert Chime
              </Button>
            </SimpleGrid>
          </div>
        </Stack>
      </Card>

      {/* Voice Synthesis (TTS) & Pronunciation */}
      <Card
        withBorder
        radius="md"
        p={{ base: 'md', sm: 'lg' }}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <Group gap="sm" mb="md">
          <ThemeIcon size="lg" radius="md" color="teal" variant="light">
            <IconMicrophone size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Voice Synthesis & Pronunciation Engine
            </Text>
            <Text size="xs" c="dimmed">
              Configure Web Speech API voices, playback rate, pitch, and vocal tone
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          {/* Voice Selector */}
          <div>
            <Text size="sm" fw={600} mb={4}>
              Speech Synthesis Voice
            </Text>
            <Select
              value={settings.ttsVoiceUri || (voices[0]?.value ?? '')}
              onChange={(val) => onChange({ ttsVoiceUri: val || '' })}
              data={
                voices.length > 0 ? voices : [{ value: '', label: 'Default System English Voice' }]
              }
              placeholder="Select preferred voice"
              searchable
              nothingFoundMessage="No matching voices found"
              size="sm"
              radius="md"
            />
          </div>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {/* Speed Rate */}
            <Paper withBorder p="sm" radius="md">
              <Group justify="space-between" align="center" mb={6}>
                <Text component="div" size="xs" fw={600}>
                  Speed Rate: <RollingNumber value={settings.ttsRate} decimalScale={1} suffix="x" />
                </Text>
                <Badge size="xs" variant="light" color="teal">
                  {settings.ttsRate === 1.0 ? 'Normal' : settings.ttsRate < 1.0 ? 'Slow' : 'Fast'}
                </Badge>
              </Group>
              <Slider
                value={settings.ttsRate}
                onChange={(val) => onChange({ ttsRate: val })}
                min={0.5}
                max={2.0}
                step={0.1}
                color="teal"
                size="sm"
                marks={[
                  { value: 0.5, label: '0.5x' },
                  { value: 1.0, label: '1.0x' },
                  { value: 1.5, label: '1.5x' },
                  { value: 2.0, label: '2.0x' },
                ]}
              />
            </Paper>

            {/* Pitch */}
            <Paper withBorder p="sm" radius="md">
              <Group justify="space-between" align="center" mb={6}>
                <Text component="div" size="xs" fw={600}>
                  Pitch: <RollingNumber value={settings.ttsPitch} decimalScale={1} />
                </Text>
                <Badge size="xs" variant="light" color="indigo">
                  {settings.ttsPitch === 1.0
                    ? 'Natural'
                    : settings.ttsPitch < 1.0
                      ? 'Deep'
                      : 'High'}
                </Badge>
              </Group>
              <Slider
                value={settings.ttsPitch}
                onChange={(val) => onChange({ ttsPitch: val })}
                min={0.5}
                max={1.5}
                step={0.1}
                color="indigo"
                size="sm"
                marks={[
                  { value: 0.5, label: 'Deep' },
                  { value: 1.0, label: '1.0' },
                  { value: 1.5, label: 'High' },
                ]}
              />
            </Paper>

            {/* Volume */}
            <Paper withBorder p="sm" radius="md">
              <Group justify="space-between" align="center" mb={6}>
                <Text size="xs" fw={600}>
                  Voice Volume: {Math.round(settings.ttsVolume * 100)}%
                </Text>
                <Badge size="xs" variant="light" color="blue">
                  {settings.ttsVolume > 0.7 ? 'High' : settings.ttsVolume > 0.3 ? 'Medium' : 'Low'}
                </Badge>
              </Group>
              <Slider
                value={settings.ttsVolume}
                onChange={(val) => onChange({ ttsVolume: val })}
                min={0}
                max={1.0}
                step={0.05}
                color="blue"
                size="sm"
                marks={[
                  { value: 0, label: '0%' },
                  { value: 0.5, label: '50%' },
                  { value: 1.0, label: '100%' },
                ]}
              />
            </Paper>
          </SimpleGrid>

          <Divider />

          {/* Test Speech Input */}
          <Paper
            withBorder
            p="md"
            radius="md"
            style={{ background: 'var(--mantine-color-default-hover)' }}
          >
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={1} mb="xs">
              Live Voice Preview
            </Text>
            <Group align="flex-end" wrap="wrap" gap="sm">
              <TextInput
                label="Sample Sentence / Word"
                value={testPhrase}
                onChange={(e) => setTestPhrase(e.currentTarget.value)}
                style={{ flex: '1 1 200px' }}
                radius="md"
                size="sm"
              />
              <Button
                color="teal"
                radius="md"
                size="sm"
                loading={isSpeaking}
                onClick={handleSpeakTestPhrase}
                leftSection={<IconPlayerPlay size={16} />}
                style={{ flexShrink: 0 }}
              >
                Speak Sample
              </Button>
            </Group>
          </Paper>
        </Stack>
      </Card>

      {/* Merriam-Webster Audio & Pronunciation */}
      <Card
        withBorder
        radius="md"
        p={{ base: 'md', sm: 'lg' }}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" color="blue" variant="light">
              <IconSparkles size={20} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="md">
                Merriam-Webster Pronunciation & Audio
              </Text>
              <Text size="xs" c="dimmed">
                Authentic human-recorded pronunciation audio from Merriam-Webster Dictionary
              </Text>
            </div>
          </Group>
          <Badge color="blue" variant="light" size="sm">
            Official MW CDN
          </Badge>
        </Group>

        <Stack gap="md">
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Text size="sm" fw={600}>
                Auto-fetch Audio on Word Add
              </Text>
              <Text size="xs" c="dimmed">
                Automatically retrieve and save Merriam-Webster audio URL & phonetic transcription
                when adding new vocabulary
              </Text>
            </div>
            <Switch
              checked={settings.autoFetchMwAudioOnAdd !== false}
              onChange={(e) => onChange({ autoFetchMwAudioOnAdd: e.currentTarget.checked })}
              color="blue"
            />
          </Group>

          <Divider />

          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Text size="sm" fw={600}>
                Prefer Recorded Audio Over TTS
              </Text>
              <Text size="xs" c="dimmed">
                Play real Merriam-Webster voice recordings when available, falling back to browser
                speech synthesis
              </Text>
            </div>
            <Switch
              checked={settings.preferMwAudioOverTts !== false}
              onChange={(e) => onChange({ preferMwAudioOverTts: e.currentTarget.checked })}
              color="blue"
            />
          </Group>

          <Divider />

          <div>
            <TextInput
              label="Merriam-Webster Collegiate API Key (Optional)"
              description="Enter your Merriam-Webster Developer key from dictionaryapi.com, or leave empty to use zero-config smart resolution."
              placeholder="e.g. 5a1b2c3d-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={settings.merriamWebsterApiKey || ''}
              onChange={(e) => onChange({ merriamWebsterApiKey: e.currentTarget.value })}
              radius="md"
              size="sm"
            />
          </div>

          <Divider />

          {/* Database Audio Health Check & Repair */}
          <BatchAudioRepairButton />

          <Divider />

          {/* Interactive MW Pronunciation Test Bench */}
          <Paper
            withBorder
            p="md"
            radius="md"
            style={{ background: 'var(--mantine-color-default-hover)' }}
          >
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts={1} mb="xs">
              Test Merriam-Webster Audio Resolution
            </Text>
            <MwAudioTester customApiKey={settings.merriamWebsterApiKey} />
          </Paper>
        </Stack>
      </Card>
    </Stack>
  );
}

function BatchAudioRepairButton() {
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState<string | null>(null);

  const handleRepairAll = async () => {
    setIsRepairing(true);
    setRepairStatus(null);
    try {
      const { getDatabase } = await import('@/lib/db');
      const { normalizeMerriamWebsterAudioUrl } = await import('@/lib/pronounce');
      const db = await getDatabase();
      const docs = await db.words.find({ selector: { isDeleted: { $ne: true } } }).exec();
      let repairedCount = 0;

      for (const doc of docs) {
        if (doc.audioUrl) {
          const normalized = normalizeMerriamWebsterAudioUrl(doc.audioUrl);
          if (normalized && normalized !== doc.audioUrl) {
            await doc.patch({
              audioUrl: normalized,
              updatedAt: new Date().toISOString(),
            });
            repairedCount++;
          }
        }
      }

      setRepairStatus(
        repairedCount > 0
          ? `Successfully repaired ${repairedCount} word audio URL(s)!`
          : `All ${docs.length} word audio URLs are verified and healthy.`
      );
    } catch (err: any) {
      setRepairStatus(`Repair error: ${err?.message || err}`);
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <Group justify="space-between" align="center" wrap="wrap" gap="sm">
      <div style={{ flex: '1 1 200px' }}>
        <Text size="sm" fw={600}>
          Database Audio URL Health Check
        </Text>
        <Text size="xs" c="dimmed">
          Scans stored vocabulary and repairs any legacy or malformed Merriam-Webster audio links
        </Text>
      </div>
      <Button
        variant="light"
        color="indigo"
        size="xs"
        radius="md"
        loading={isRepairing}
        onClick={handleRepairAll}
        leftSection={<IconRefresh size={14} />}
      >
        Scan & Repair Audio URLs
      </Button>
      {repairStatus && (
        <Text size="xs" c="teal" fw={600} style={{ width: '100%' }}>
          {repairStatus}
        </Text>
      )}
    </Group>
  );
}

function MwAudioTester({ customApiKey }: { customApiKey?: string }) {
  const [testWord, setTestWord] = useState('ephemeral');
  const [isLoading, setIsLoading] = useState(false);
  const [audioResult, setAudioResult] = useState<{
    audioUrl?: string;
    phonetic?: string;
    audioSource?: string;
    success?: boolean;
    error?: string;
  } | null>(null);

  const handleTestPronunciation = async () => {
    const trimmed = testWord.trim();
    if (!trimmed) {
      return;
    }
    setIsLoading(true);
    setAudioResult(null);

    try {
      const res = await fetch('/api/pronounce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: trimmed, apiKey: customApiKey }),
      });

      if (!res.ok) {
        setAudioResult({ error: `Request failed with status ${res.status}`, success: false });
        return;
      }

      const data = await res.json();
      setAudioResult(data);

      if (data.audioUrl) {
        const { playWordAudio } = await import('@/lib/sound');
        void playWordAudio(data.audioUrl);
      }
    } catch (err: any) {
      setAudioResult({ error: err?.message || 'Failed to fetch pronunciation', success: false });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack gap="xs">
      <Group align="flex-end" wrap="wrap" gap="sm">
        <TextInput
          label="Test Word"
          placeholder="e.g. serendipity, ephemeral, perspicacious"
          value={testWord}
          onChange={(e) => setTestWord(e.currentTarget.value)}
          style={{ flex: '1 1 200px' }}
          radius="md"
          size="sm"
        />
        <Button
          color="blue"
          radius="md"
          size="sm"
          loading={isLoading}
          onClick={handleTestPronunciation}
          leftSection={<IconPlayerPlay size={16} />}
          style={{ flexShrink: 0 }}
        >
          Fetch & Play MW Audio
        </Button>
      </Group>

      {audioResult && (
        <Paper withBorder p="xs" radius="sm" mt="xs" style={{ background: 'var(--card-bg)' }}>
          {audioResult.success ? (
            <Group justify="space-between" align="center" wrap="wrap" gap="xs">
              <Group gap="xs">
                <Badge color="teal" size="sm" variant="filled">
                  Found: {audioResult.audioSource || 'MW'}
                </Badge>
                {audioResult.phonetic && (
                  <Text size="sm" fw={700} c="indigo">
                    {audioResult.phonetic}
                  </Text>
                )}
              </Group>
              {audioResult.audioUrl && (
                <Button
                  size="compact-xs"
                  variant="light"
                  color="indigo"
                  onClick={async () => {
                    const { playWordAudio } = await import('@/lib/sound');
                    void playWordAudio(audioResult.audioUrl!);
                  }}
                  leftSection={<IconVolume size={13} />}
                >
                  Replay Audio
                </Button>
              )}
            </Group>
          ) : (
            <Text size="xs" c="red">
              {audioResult.error || 'Audio not found for this word.'}
            </Text>
          )}
        </Paper>
      )}
    </Stack>
  );
}
