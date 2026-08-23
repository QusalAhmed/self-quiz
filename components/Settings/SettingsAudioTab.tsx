'use client';

import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { IconMicrophone, IconPlayerPlay, IconSparkles, IconVolume } from '@tabler/icons-react';
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
          <Group justify="space-between" align="center">
            <div>
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

          <Group justify="space-between" align="center">
            <div>
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
                <Text size="xs" fw={600}>
                  Speed Rate: {settings.ttsRate.toFixed(1)}x
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
                <Text size="xs" fw={600}>
                  Pitch: {settings.ttsPitch.toFixed(1)}
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
            <Group align="flex-end" gap="sm">
              <TextInput
                label="Sample Sentence / Word"
                value={testPhrase}
                onChange={(e) => setTestPhrase(e.currentTarget.value)}
                style={{ flex: 1 }}
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
              >
                Speak Sample
              </Button>
            </Group>
          </Paper>
        </Stack>
      </Card>
    </Stack>
  );
}
