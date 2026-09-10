'use client';

import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  PasswordInput,
  Progress,
  Radio,
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
  IconBook,
  IconBrain,
  IconChartBar,
  IconCheck,
  IconCpu,
  IconKey,
  IconPlayerStop,
  IconRefresh,
  IconSparkles,
  IconTestPipe,
  IconX,
} from '@tabler/icons-react';
import React, { useRef, useState } from 'react';
import { getDatabase, safePatchDoc, type WordRecord } from '@/lib/db';
import { formatGroqModelDetails } from '@/lib/groq';
import type { AiProviderKey, AppAiSettings } from '@/lib/settings';

export interface SettingsAiTabProps {
  settings: AppAiSettings;
  onChange: (values: Partial<AppAiSettings>) => void;
}

const PROVIDERS: Array<{
  key: AiProviderKey;
  label: string;
  desc: string;
  badge: string;
  color: string;
}> = [
  {
    key: 'gemini',
    label: 'Google Gemma AI',
    desc: 'Google Gemma 4 26B A4B MoE with fast reasoning and rich multilingual knowledge',
    badge: 'Primary & Recommended',
    color: 'teal',
  },
  {
    key: 'cloudflare',
    label: 'Cloudflare Workers AI',
    desc: 'Edge-distributed Google Gemma 4 26B A4B Instruct with global low latency',
    badge: 'Edge Powered',
    color: 'orange',
  },
  {
    key: 'groq',
    label: 'Groq Cloud AI',
    desc: 'LPU inference engine with sub-second generation (Qwen 3.6 27B, GPT-OSS 120B, groq/compound)',
    badge: 'High Speed',
    color: 'indigo',
  },
];

const POPULAR_GROQ_MODELS = ['qwen/qwen3.6-27b', 'openai/gpt-oss-120b', 'groq/compound'];

export function SettingsAiTab({ settings, onChange }: SettingsAiTabProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    model?: string;
    latencyMs?: number;
  } | null>(null);

  const [isTestingWordsApi, setIsTestingWordsApi] = useState(false);
  const [wordsApiTestResult, setWordsApiTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const [testFrequencyWord, setTestFrequencyWord] = useState('serendipity');
  const [isTestingFrequency, setIsTestingFrequency] = useState(false);
  const [frequencyTestResult, setFrequencyTestResult] = useState<{
    success: boolean;
    message: string;
    tier?: string;
    provider?: string;
    metrics?: string;
    latencyMs?: number;
  } | null>(null);

  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{
    current: number;
    total: number;
    currentWord?: string;
    updated: number;
    failed: number;
  } | null>(null);
  const [backfillSummary, setBackfillSummary] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const cancelBackfillRef = useRef(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const start = Date.now();

    try {
      const response = await fetch('/api/examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'Eloquent',
          meaning: 'Fluent or persuasive in speaking or writing',
          targetCount: 1,
          partOfSpeech: 'adjective',
          referenceExamples: [],
        }),
      });

      const latency = Date.now() - start;
      if (response.ok) {
        const data = await response.json();
        setTestResult({
          success: true,
          message: `Generated example successfully in ${latency}ms!`,
          model: data?.aiDetails || settings.groqModel,
          latencyMs: latency,
        });
      } else {
        const errText = await response.text();
        setTestResult({
          success: false,
          message: `API returned status ${response.status}: ${errText.slice(0, 100)}`,
          latencyMs: latency,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection failed: ${err?.message || 'Network error'}`,
        latencyMs: Date.now() - start,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestWordsApi = async () => {
    setIsTestingWordsApi(true);
    setWordsApiTestResult(null);
    const start = Date.now();

    try {
      const response = await fetch('/api/verify-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'soliloquy',
          definitions: [
            {
              meaning: 'speech you make to yourself',
              partOfSpeech: 'noun',
            },
          ],
          provider: 'wordsapi',
        }),
      });

      const latency = Date.now() - start;
      if (response.ok) {
        const data = await response.json();
        setWordsApiTestResult({
          success: true,
          message: `WordsAPI verified "soliloquy" in ${latency}ms! Status: "${data.overallStatus}". Provider: ${data.generatorAiDetails}.`,
          latencyMs: latency,
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        setWordsApiTestResult({
          success: false,
          message: `WordsAPI error (HTTP ${response.status}): ${errData.error || 'Verification failed'}`,
          latencyMs: latency,
        });
      }
    } catch (err: any) {
      setWordsApiTestResult({
        success: false,
        message: `WordsAPI connection failed: ${err?.message || 'Network error'}`,
        latencyMs: Date.now() - start,
      });
    } finally {
      setIsTestingWordsApi(false);
    }
  };

  const handleTestFrequency = async () => {
    if (!testFrequencyWord.trim()) {
      return;
    }
    setIsTestingFrequency(true);
    setFrequencyTestResult(null);
    const start = Date.now();

    try {
      const response = await fetch('/api/word-frequency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: testFrequencyWord.trim(),
          provider: settings.frequencyProvider || 'auto',
        }),
      });

      const latency = Date.now() - start;
      if (response.ok) {
        const data = await response.json();
        const freq = data.frequency;
        const details = freq?.details;
        let metricsStr = '';
        if (details?.zipf) {
          metricsStr = `Zipf: ${details.zipf}${details.perMillion ? `, ${details.perMillion}/million` : ''}`;
        } else if (details?.rationale) {
          metricsStr = details.rationale;
        }

        setFrequencyTestResult({
          success: true,
          message: `Detected frequency tier "${freq?.usageFrequency || 'Unknown'}" in ${latency}ms`,
          tier: freq?.usageFrequency,
          provider: freq?.generatorAiDetails || freq?.provider,
          metrics: metricsStr,
          latencyMs: latency,
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        setFrequencyTestResult({
          success: false,
          message: `Failed to fetch frequency (HTTP ${response.status}): ${errData.error || 'Request failed'}`,
          latencyMs: latency,
        });
      }
    } catch (err: any) {
      setFrequencyTestResult({
        success: false,
        message: `Connection error: ${err?.message || 'Network error'}`,
        latencyMs: Date.now() - start,
      });
    } finally {
      setIsTestingFrequency(false);
    }
  };

  const handleCancelBackfill = () => {
    cancelBackfillRef.current = true;
  };

  const handleBackfillFrequencies = async () => {
    setIsBackfilling(true);
    setBackfillSummary(null);
    cancelBackfillRef.current = false;

    try {
      const db = await getDatabase();
      const wordDocs = await db.words.find({ selector: { isDeleted: { $ne: true } } }).exec();
      const missingDocs = wordDocs.filter((d) => {
        const data = d.toJSON() as WordRecord;
        return !data.usageFrequency || data.usageFrequency.trim() === '';
      });

      if (missingDocs.length === 0) {
        setBackfillSummary({
          type: 'info',
          message: 'All words in your local database already have usage frequency assigned!',
        });
        setIsBackfilling(false);
        return;
      }

      let updated = 0;
      let failed = 0;

      for (let i = 0; i < missingDocs.length; i++) {
        if (cancelBackfillRef.current) {
          setBackfillSummary({
            type: 'info',
            message: `Backfill stopped. Updated ${updated} words, skipped ${missingDocs.length - i} remaining.`,
          });
          break;
        }

        const doc = missingDocs[i];
        const data = doc.toJSON() as WordRecord;
        setBackfillProgress({
          current: i + 1,
          total: missingDocs.length,
          currentWord: data.word,
          updated,
          failed,
        });

        try {
          const res = await fetch('/api/word-frequency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              word: data.word,
              meaning: data.meaning || data.definitions?.[0]?.meaning,
              provider: settings.frequencyProvider || 'auto',
              wordId: data.id,
              storeInDb: true,
            }),
          });

          if (res.ok) {
            const result = await res.json();
            if (result.frequency?.usageFrequency) {
              await safePatchDoc(doc, {
                usageFrequency: result.frequency.usageFrequency,
                generatorAiDetails: result.frequency.generatorAiDetails || undefined,
                updatedAt: new Date().toISOString(),
              });
              updated++;
            } else {
              failed++;
            }
          } else {
            failed++;
          }
        } catch (err) {
          console.error(`Error backfilling word "${data.word}":`, err);
          failed++;
        }

        if (i < missingDocs.length - 1 && !cancelBackfillRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      if (!cancelBackfillRef.current) {
        setBackfillSummary({
          type: 'success',
          message: `Backfill complete! Successfully populated frequency for ${updated} word${updated === 1 ? '' : 's'}.${failed > 0 ? ` (${failed} skipped/failed)` : ''}`,
        });
      }
    } catch (err: any) {
      setBackfillSummary({
        type: 'error',
        message: `Backfill encountered an error: ${err?.message || 'Database error'}`,
      });
    } finally {
      setIsBackfilling(false);
      setBackfillProgress(null);
    }
  };

  return (
    <Stack gap="lg">
      {/* Primary AI Provider Selection */}
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
            <IconCpu size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              AI Generation Engine
            </Text>
            <Text size="xs" c="dimmed">
              Choose the default LLM provider for contextual examples, definitions, and word
              families
            </Text>
          </div>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          {PROVIDERS.map((p) => {
            const isSelected = settings.preferredProvider === p.key;
            return (
              <Paper
                key={p.key}
                withBorder
                p="md"
                radius="md"
                style={{
                  cursor: 'pointer',
                  border: isSelected
                    ? `2px solid var(--mantine-color-${p.color}-5)`
                    : '1px solid var(--card-border)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--card-bg)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
                onClick={() => onChange({ preferredProvider: p.key })}
              >
                <div>
                  <Group justify="space-between" align="center" mb="xs">
                    <Radio
                      checked={isSelected}
                      onChange={() => onChange({ preferredProvider: p.key })}
                      color={p.color}
                      label={
                        <Text fw={700} size="sm">
                          {p.label}
                        </Text>
                      }
                    />
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>
                    {p.desc}
                  </Text>
                </div>
                <Badge
                  size="xs"
                  variant="light"
                  color={p.color}
                  mt="md"
                  style={{ alignSelf: 'flex-start' }}
                >
                  {p.badge}
                </Badge>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Card>

      {/* Groq Model Selector & Generation Settings */}
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
          <ThemeIcon size="lg" radius="md" color="violet" variant="light">
            <IconBrain size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Model Selection & Example Batching
            </Text>
            <Text size="xs" c="dimmed">
              Configure target parameters for rich contextual sentences and morphology trees
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          {/* Groq Model Dropdown */}
          {settings.preferredProvider === 'groq' && (
            <div>
              <Text size="sm" fw={600} mb={4}>
                Groq LLM Architecture
              </Text>
              <Select
                value={settings.groqModel}
                onChange={(val) => onChange({ groqModel: val || 'qwen/qwen3.6-27b' })}
                data={POPULAR_GROQ_MODELS.map((m) => ({
                  value: m,
                  label: formatGroqModelDetails(m),
                }))}
                size="sm"
                radius="md"
              />
              <Text size="xs" c="dimmed" mt={4}>
                Automatic fallback: If a selected model is decommissioned, the system seamlessly
                cascades to the next best available model.
              </Text>
            </div>
          )}

          <Divider />

          {/* Example Count Slider */}
          <div>
            <Group justify="space-between" align="center" mb={6}>
              <div>
                <Text size="sm" fw={600}>
                  Target Examples Per Definition ({settings.exampleCount})
                </Text>
                <Text size="xs" c="dimmed">
                  Number of unique sentences to generate per word definition
                </Text>
              </div>
              <Badge size="sm" variant="light" color="violet">
                {settings.exampleCount} Example{settings.exampleCount > 1 ? 's' : ''}
              </Badge>
            </Group>
            <Slider
              value={settings.exampleCount}
              onChange={(val) => onChange({ exampleCount: val })}
              min={1}
              max={5}
              step={1}
              color="violet"
              size="sm"
              marks={[
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3 (Optimal)' },
                { value: 4, label: '4' },
                { value: 5, label: '5' },
              ]}
            />
          </div>

          <Divider />

          {/* Auto-verify Word & Definitions Switch */}
          <div>
            <Group
              justify="space-between"
              align="center"
              mb={settings.autoVerifyWords ? 'xs' : undefined}
            >
              <div>
                <Text size="sm" fw={600}>
                  Auto-verify Word & Definitions
                </Text>
                <Text size="xs" c="dimmed">
                  Automatically verify spelling, definition accuracy, and part of speech as you type
                  or change words
                </Text>
              </div>
              <Switch
                checked={settings.autoVerifyWords}
                onChange={(e) => onChange({ autoVerifyWords: e.currentTarget.checked })}
                color="indigo"
                size="sm"
                aria-label="Auto-verify Word & Definitions"
              />
            </Group>

            {settings.autoVerifyWords && (
              <Stack gap="xs" mt="xs">
                <Group justify="space-between" align="center">
                  <div>
                    <Text size="xs" fw={600}>
                      Preferred Verification Engine
                    </Text>
                    <Text size="xs" c="dimmed">
                      Choose WordsAPI (wordsapi.com) for official dictionary verification or LLMs
                    </Text>
                  </div>
                  <Badge size="sm" variant="light" color="cyan">
                    {settings.verificationProvider === 'wordsapi'
                      ? 'WordsAPI (Authoritative)'
                      : settings.verificationProvider === 'auto'
                        ? 'Auto (Cascade)'
                        : settings.verificationProvider?.toUpperCase() || 'WordsAPI'}
                  </Badge>
                </Group>
                <Select
                  data={[
                    {
                      value: 'wordsapi',
                      label: 'WordsAPI (https://www.wordsapi.com/ - Authoritative Dictionary)',
                    },
                    {
                      value: 'auto',
                      label: 'Auto Cascade (WordsAPI → Gemma → Cloudflare → Groq)',
                    },
                    { value: 'gemini', label: 'Google Gemma (Verification)' },
                    { value: 'cloudflare', label: 'Cloudflare Workers (Verification)' },
                    { value: 'groq', label: 'Groq Cloud (Verification)' },
                  ]}
                  value={settings.verificationProvider || 'wordsapi'}
                  onChange={(val) =>
                    onChange({
                      verificationProvider: (val as any) || 'wordsapi',
                    })
                  }
                  size="xs"
                  radius="md"
                />
              </Stack>
            )}
          </div>
        </Stack>
      </Card>

      {/* Word Usage Frequency Configuration */}
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
        <Group justify="space-between" align="center" wrap="wrap" gap="sm" mb="md">
          <Group gap="sm" style={{ flex: '1 1 200px' }}>
            <ThemeIcon size="lg" radius="md" color="teal" variant="light">
              <IconChartBar size={20} />
            </ThemeIcon>
            <div>
              <Group gap="xs" align="center">
                <Text fw={700} size="md">
                  Word Usage Frequency
                </Text>
                <Badge size="xs" color="teal" variant="light">
                  WordsAPI & Multi-AI
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                Configure frequency tier detection (Top 500 – Rare) via WordsAPI and AI models
              </Text>
            </div>
          </Group>
        </Group>

        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Frequency Provider"
              description="Engine used to retrieve corpus usage frequency"
              data={[
                { value: 'auto', label: 'Auto (WordsAPI first, fallback to AI)' },
                { value: 'wordsapi', label: 'WordsAPI (RapidAPI Zipf scale)' },
                { value: 'ai', label: 'AI Provider (Current active AI)' },
                { value: 'gemini', label: 'Google Gemini (Frequency)' },
                { value: 'groq', label: 'Groq Cloud (Frequency)' },
                { value: 'cloudflare', label: 'Cloudflare Workers (Frequency)' },
              ]}
              value={settings.frequencyProvider || 'auto'}
              onChange={(val) => onChange({ frequencyProvider: (val as any) || 'auto' })}
              size="xs"
              radius="md"
            />

            <Paper
              withBorder
              p="sm"
              radius="md"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--mantine-color-body)',
              }}
            >
              <div>
                <Text size="xs" fw={600}>
                  Auto-fetch on Word Add
                </Text>
                <Text size="xs" c="dimmed">
                  Fetch frequency tier automatically when adding a word
                </Text>
              </div>
              <Switch
                checked={settings.autoFetchUsageFrequencyOnAdd ?? true}
                onChange={(e) =>
                  onChange({ autoFetchUsageFrequencyOnAdd: e.currentTarget.checked })
                }
                color="teal"
                size="sm"
              />
            </Paper>
          </SimpleGrid>

          <Divider label="Test Frequency Retrieval" labelPosition="left" />

          {/* Quick Frequency Tester */}
          <Group align="flex-end" gap="xs">
            <TextInput
              label="Test Word"
              placeholder="e.g. serendipity, ubiquitous"
              value={testFrequencyWord}
              onChange={(e) => setTestFrequencyWord(e.currentTarget.value)}
              size="xs"
              radius="md"
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleTestFrequency();
                }
              }}
            />
            <Button
              variant="light"
              color="teal"
              size="xs"
              radius="md"
              loading={isTestingFrequency}
              onClick={handleTestFrequency}
              leftSection={<IconSparkles size={14} />}
            >
              Test Frequency
            </Button>
          </Group>

          {frequencyTestResult && (
            <Alert
              icon={frequencyTestResult.success ? <IconCheck size={16} /> : <IconX size={16} />}
              color={frequencyTestResult.success ? 'teal' : 'red'}
              title={
                frequencyTestResult.success ? 'Frequency Retrieved' : 'Frequency Retrieval Failed'
              }
              radius="md"
            >
              <Group gap="xs" align="center" mb={4}>
                <Text size="xs" fw={600}>
                  {frequencyTestResult.message}
                </Text>
                {frequencyTestResult.tier && (
                  <Badge size="xs" color="teal" variant="filled">
                    {frequencyTestResult.tier}
                  </Badge>
                )}
              </Group>
              {frequencyTestResult.provider && (
                <Text size="xs" c="dimmed">
                  Provider: {frequencyTestResult.provider}
                  {frequencyTestResult.metrics ? ` • ${frequencyTestResult.metrics}` : ''}
                </Text>
              )}
            </Alert>
          )}

          <Divider label="Database Frequency Backfill" labelPosition="left" />

          {/* Backfill Existing Words */}
          <Paper withBorder p="sm" radius="md" style={{ background: 'var(--mantine-color-body)' }}>
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" fw={600}>
                    Backfill Missing Word Frequencies
                  </Text>
                  <Text size="xs" c="dimmed">
                    Scan your local library and fetch frequency tiers for words that don&apos;t have
                    one
                  </Text>
                </div>
                <Group gap="xs">
                  {isBackfilling ? (
                    <Button
                      size="xs"
                      color="red"
                      variant="light"
                      radius="md"
                      onClick={handleCancelBackfill}
                      leftSection={<IconPlayerStop size={14} />}
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      color="indigo"
                      variant="light"
                      radius="md"
                      onClick={handleBackfillFrequencies}
                      leftSection={<IconRefresh size={14} />}
                    >
                      Start Backfill
                    </Button>
                  )}
                </Group>
              </Group>

              {isBackfilling && backfillProgress && (
                <Stack gap={4} mt="xs">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      Processing: <strong>{backfillProgress.currentWord}</strong> (
                      {backfillProgress.current} of {backfillProgress.total})
                    </Text>
                    <Text size="xs" c="teal" fw={600}>
                      {Math.round((backfillProgress.current / backfillProgress.total) * 100)}%
                    </Text>
                  </Group>
                  <Progress
                    value={(backfillProgress.current / backfillProgress.total) * 100}
                    color="teal"
                    size="sm"
                    radius="xl"
                    animated
                  />
                  <Text size="xs" c="dimmed">
                    Updated: {backfillProgress.updated} • Failed/Skipped: {backfillProgress.failed}
                  </Text>
                </Stack>
              )}

              {backfillSummary && (
                <Alert
                  color={
                    backfillSummary.type === 'success'
                      ? 'teal'
                      : backfillSummary.type === 'error'
                        ? 'red'
                        : 'blue'
                  }
                  title={
                    backfillSummary.type === 'success'
                      ? 'Backfill Complete'
                      : backfillSummary.type === 'error'
                        ? 'Backfill Error'
                        : 'Backfill Notice'
                  }
                  radius="md"
                  mt="xs"
                >
                  <Text size="xs">{backfillSummary.message}</Text>
                </Alert>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Card>

      {/* Custom API Keys & Connectivity Testing */}
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
        <Group justify="space-between" align="center" wrap="wrap" gap="sm" mb="md">
          <Group gap="sm" style={{ flex: '1 1 200px' }}>
            <ThemeIcon size="lg" radius="md" color="teal" variant="light">
              <IconKey size={20} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="md">
                Custom API Keys & Connectivity
              </Text>
              <Text size="xs" c="dimmed">
                Override system environment keys with your personal API accounts
              </Text>
            </div>
          </Group>

          <Group gap="xs" wrap="wrap">
            <Button
              variant="light"
              color="cyan"
              size="xs"
              radius="md"
              loading={isTestingWordsApi}
              onClick={handleTestWordsApi}
              leftSection={<IconBook size={14} />}
            >
              Test WordsAPI
            </Button>
            <Button
              variant="light"
              color="teal"
              size="xs"
              radius="md"
              loading={isTesting}
              onClick={handleTestConnection}
              leftSection={<IconTestPipe size={14} />}
            >
              Test AI Connection
            </Button>
          </Group>
        </Group>

        <Stack gap="md">
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <div style={{ flex: '1 1 200px' }}>
              <Text size="sm" fw={600}>
                Enable Custom API Key Overrides
              </Text>
              <Text size="xs" c="dimmed">
                Keys are stored strictly in your local browser sandbox and never shared
              </Text>
            </div>
            <Switch
              checked={settings.useCustomApiKeys}
              onChange={(e) => onChange({ useCustomApiKeys: e.currentTarget.checked })}
              color="teal"
            />
          </Group>

          {settings.useCustomApiKeys && (
            <Stack gap="sm" mt="xs">
              <PasswordInput
                label="Custom WordsAPI / RapidAPI Key"
                description={
                  <Text size="xs" c="dimmed">
                    From{' '}
                    <Anchor
                      href="https://www.wordsapi.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="xs"
                    >
                      wordsapi.com
                    </Anchor>{' '}
                    or{' '}
                    <Anchor
                      href="https://rapidapi.com/dpventures/api/wordsapi"
                      target="_blank"
                      rel="noopener noreferrer"
                      size="xs"
                    >
                      RapidAPI WordsAPI
                    </Anchor>{' '}
                    (Free tier includes 2,500 requests/day)
                  </Text>
                }
                placeholder="e.g. 5a1b2c3d4e..."
                value={settings.customWordsApiKey || ''}
                onChange={(e) => onChange({ customWordsApiKey: e.currentTarget.value })}
                size="xs"
                radius="md"
              />

              <PasswordInput
                label="Custom Groq API Key"
                placeholder="gsk_..."
                value={settings.customGroqApiKey || ''}
                onChange={(e) => onChange({ customGroqApiKey: e.currentTarget.value })}
                size="xs"
                radius="md"
              />

              <PasswordInput
                label="Custom Google Gemini API Key"
                placeholder="AIzaSy..."
                value={settings.customGeminiApiKey || ''}
                onChange={(e) => onChange({ customGeminiApiKey: e.currentTarget.value })}
                size="xs"
                radius="md"
              />

              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <PasswordInput
                  label="Cloudflare API Token"
                  placeholder="cfut_..."
                  value={settings.customCloudflareApiToken || ''}
                  onChange={(e) => onChange({ customCloudflareApiToken: e.currentTarget.value })}
                  size="xs"
                  radius="md"
                />

                <TextInput
                  label="Cloudflare Account ID"
                  placeholder="e.g. 5494b793..."
                  value={settings.customCloudflareAccountId || ''}
                  onChange={(e) => onChange({ customCloudflareAccountId: e.currentTarget.value })}
                  size="xs"
                  radius="md"
                />
              </SimpleGrid>
            </Stack>
          )}

          {wordsApiTestResult && (
            <Alert
              icon={wordsApiTestResult.success ? <IconCheck size={16} /> : <IconX size={16} />}
              color={wordsApiTestResult.success ? 'cyan' : 'red'}
              title={
                wordsApiTestResult.success ? 'WordsAPI Test Successful' : 'WordsAPI Test Failed'
              }
              radius="md"
            >
              <Text size="xs">{wordsApiTestResult.message}</Text>
              {wordsApiTestResult.latencyMs && (
                <Text size="xs" c="dimmed" mt={2}>
                  Latency: {wordsApiTestResult.latencyMs}ms
                </Text>
              )}
            </Alert>
          )}

          {testResult && (
            <Alert
              icon={testResult.success ? <IconCheck size={16} /> : <IconX size={16} />}
              color={testResult.success ? 'teal' : 'red'}
              title={testResult.success ? 'Connection Successful' : 'Connection Failed'}
              radius="md"
            >
              <Text size="xs">{testResult.message}</Text>
              {testResult.model && (
                <Text size="xs" c="dimmed" mt={2}>
                  Model: {testResult.model} • Latency: {testResult.latencyMs}ms
                </Text>
              )}
            </Alert>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
