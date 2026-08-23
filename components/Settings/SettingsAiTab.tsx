'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Paper,
  PasswordInput,
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
import { IconBrain, IconCheck, IconCpu, IconKey, IconTestPipe, IconX } from '@tabler/icons-react';
import React, { useState } from 'react';
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
    key: 'groq',
    label: 'Groq Cloud AI',
    desc: 'LPU inference engine with sub-second generation (Llama 3.3 70B, Qwen 3.6, DeepSeek)',
    badge: 'Fastest & Recommended',
    color: 'indigo',
  },
  {
    key: 'cloudflare',
    label: 'Cloudflare Workers AI',
    desc: 'Edge-distributed Meta Llama 3.3 70B Instruct with global low latency',
    badge: 'Edge Powered',
    color: 'orange',
  },
  {
    key: 'gemini',
    label: 'Google Gemini AI',
    desc: 'Google Gemini 2.5 Flash with deep semantic nuance and broad world knowledge',
    badge: 'Rich Semantics',
    color: 'teal',
  },
];

const POPULAR_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'qwen/qwen3.6-27b',
  'deepseek-r1-distill-llama-70b',
  'openai/gpt-oss-120b',
  'gemma2-9b-it',
];

export function SettingsAiTab({ settings, onChange }: SettingsAiTabProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    model?: string;
    latencyMs?: number;
  } | null>(null);

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
                onChange={(val) => onChange({ groqModel: val || 'llama-3.3-70b-versatile' })}
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
