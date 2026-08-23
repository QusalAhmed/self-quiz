'use client';

import {
  Badge,
  Button,
  Checkbox,
  CopyButton,
  Divider,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypeCsv,
  IconFileTypeTxt,
  IconJson,
  IconListCheck,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import type { FsrsRecord, MissedWordRecord, WordRecord } from '@/lib/db';
import {
  DEFAULT_EXPORT_FIELD_OPTIONS,
  downloadExportFile,
  formatExportContent,
  normalizeExportableItems,
  type ExportableWordItem,
  type ExportFieldOptions,
  type ExportFormat,
} from '@/lib/export-words';

export type ExportWordsModalProps = {
  opened: boolean;
  onClose: () => void;
  title?: string;
  filenamePrefix?: string;
  rawItems: Array<
    | WordRecord
    | MissedWordRecord
    | FsrsRecord
    | ExportableWordItem
    | {
        id?: string;
        word: string;
        meaning?: string;
      }
  >;
  wordsMap?: Map<string, WordRecord>;
};

export function ExportWordsModal({
  opened,
  onClose,
  title = 'Export Quiz Words',
  filenamePrefix = 'quiz-words',
  rawItems,
  wordsMap,
}: ExportWordsModalProps) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [fieldOptions, setFieldOptions] = useState<ExportFieldOptions>(
    DEFAULT_EXPORT_FIELD_OPTIONS
  );

  const normalizedItems = useMemo(() => {
    return normalizeExportableItems(rawItems, wordsMap);
  }, [rawItems, wordsMap]);

  const formattedContent = useMemo(() => {
    return formatExportContent(normalizedItems, format, fieldOptions);
  }, [normalizedItems, format, fieldOptions]);

  const handleDownload = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const baseFilename = `${filenamePrefix}-${dateStr}`;
    downloadExportFile(formattedContent, baseFilename, format);
  };

  const setAllFields = (val: boolean) => {
    setFieldOptions({
      includeMeaning: val,
      includePartOfSpeech: val,
      includeExamples: val,
      includeGroups: val,
      includeNotes: val,
      includeFrequency: val,
      includeAiDetails: val,
    });
  };

  const setPresetMinimal = () => {
    setFieldOptions({
      includeMeaning: false,
      includePartOfSpeech: false,
      includeExamples: false,
      includeGroups: false,
      includeNotes: false,
      includeFrequency: false,
      includeAiDetails: false,
    });
  };

  const setPresetWordAndMeaning = () => {
    setFieldOptions({
      includeMeaning: true,
      includePartOfSpeech: true,
      includeExamples: false,
      includeGroups: false,
      includeNotes: false,
      includeFrequency: false,
      includeAiDetails: false,
    });
  };

  const getFormatIcon = () => {
    switch (format) {
      case 'json':
        return <IconJson size={17} style={{ flexShrink: 0 }} />;
      case 'csv':
        return <IconFileTypeCsv size={17} style={{ flexShrink: 0 }} />;
      case 'txt':
        return <IconFileTypeTxt size={17} style={{ flexShrink: 0 }} />;
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group
          gap="xs"
          align="center"
          justify="space-between"
          wrap="nowrap"
          style={{ width: '100%', overflow: 'hidden' }}
        >
          <Group gap="xs" align="center" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
            <ThemeIcon
              size="md"
              variant="light"
              color="indigo"
              radius="md"
              style={{ flexShrink: 0 }}
            >
              <IconDownload size={18} />
            </ThemeIcon>
            <Text
              fw={700}
              size="md"
              style={{
                fontFamily: 'var(--font-title)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </Text>
          </Group>
          <Badge size="sm" variant="filled" color="indigo" radius="sm" style={{ flexShrink: 0 }}>
            {normalizedItems.length} word{normalizedItems.length === 1 ? '' : 's'}
          </Badge>
        </Group>
      }
      size="lg"
      radius="lg"
      padding="md"
      centered
      overlayProps={{ backgroundOpacity: 0.5, blur: 4 }}
      styles={{
        content: {
          maxWidth: '100%',
          overflow: 'hidden',
        },
        header: {
          paddingBottom: '12px',
        },
      }}
    >
      <Stack gap="md">
        {/* Format Selector */}
        <div>
          <Text size="xs" fw={700} c="dimmed" mb={6} style={{ letterSpacing: '0.04em' }}>
            EXPORT FORMAT
          </Text>
          <SegmentedControl
            value={format}
            onChange={(val) => setFormat(val as ExportFormat)}
            data={[
              {
                value: 'csv',
                label: (
                  <Group gap={6} justify="center" wrap="nowrap">
                    <IconFileSpreadsheet size={15} style={{ flexShrink: 0 }} />
                    <Text size="xs" fw={600}>
                      CSV (Excel)
                    </Text>
                  </Group>
                ),
              },
              {
                value: 'json',
                label: (
                  <Group gap={6} justify="center" wrap="nowrap">
                    <IconJson size={15} style={{ flexShrink: 0 }} />
                    <Text size="xs" fw={600}>
                      JSON (Backup)
                    </Text>
                  </Group>
                ),
              },
              {
                value: 'txt',
                label: (
                  <Group gap={6} justify="center" wrap="nowrap">
                    <IconFileTypeTxt size={15} style={{ flexShrink: 0 }} />
                    <Text size="xs" fw={600}>
                      Plain Text
                    </Text>
                  </Group>
                ),
              },
            ]}
            fullWidth
            radius="md"
            size="sm"
          />
        </div>

        {/* Data / Fields Selection */}
        <Paper
          p={{ base: 'xs', sm: 'sm' }}
          radius="md"
          withBorder
          style={{
            background: 'var(--mantine-color-default-hover, rgba(99,102,241,0.03))',
            width: '100%',
          }}
        >
          <Stack gap="xs">
            <Group justify="space-between" align="center" wrap="wrap" gap="xs">
              <Group gap={6} align="center">
                <IconListCheck size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
                <Text size="xs" fw={700} c="indigo" style={{ letterSpacing: '0.04em' }}>
                  CHOOSE DATA TO EXPORT
                </Text>
              </Group>

              <Group gap="xs" wrap="wrap">
                <UnstyledButton onClick={() => setAllFields(true)}>
                  <Text size="xs" c="indigo" fw={600} style={{ cursor: 'pointer' }}>
                    Select All
                  </Text>
                </UnstyledButton>
                <Text size="xs" c="dimmed">
                  •
                </Text>
                <UnstyledButton onClick={setPresetWordAndMeaning}>
                  <Text size="xs" c="dimmed" fw={500} style={{ cursor: 'pointer' }}>
                    Word & Meaning
                  </Text>
                </UnstyledButton>
                <Text size="xs" c="dimmed">
                  •
                </Text>
                <UnstyledButton onClick={setPresetMinimal}>
                  <Text size="xs" c="dimmed" fw={500} style={{ cursor: 'pointer' }}>
                    Words Only
                  </Text>
                </UnstyledButton>
              </Group>
            </Group>

            <Divider my={2} style={{ opacity: 0.5 }} />

            <SimpleGrid
              cols={{ base: 1, xs: 2, sm: 3 }}
              spacing={{ base: 'xs', sm: 'sm' }}
              verticalSpacing="xs"
            >
              <Checkbox
                size="xs"
                label="Meaning / Definitions"
                checked={fieldOptions.includeMeaning}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setFieldOptions((prev) => ({ ...prev, includeMeaning: checked }));
                }}
                styles={{ label: { fontSize: '0.8rem', cursor: 'pointer' } }}
              />
              <Checkbox
                size="xs"
                label="Part of Speech"
                checked={fieldOptions.includePartOfSpeech}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setFieldOptions((prev) => ({ ...prev, includePartOfSpeech: checked }));
                }}
                styles={{ label: { fontSize: '0.8rem', cursor: 'pointer' } }}
              />
              <Checkbox
                size="xs"
                label="Example Sentences"
                checked={fieldOptions.includeExamples}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setFieldOptions((prev) => ({ ...prev, includeExamples: checked }));
                }}
                styles={{ label: { fontSize: '0.8rem', cursor: 'pointer' } }}
              />
              <Checkbox
                size="xs"
                label="Custom Groups / Tags"
                checked={fieldOptions.includeGroups}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setFieldOptions((prev) => ({ ...prev, includeGroups: checked }));
                }}
                styles={{ label: { fontSize: '0.8rem', cursor: 'pointer' } }}
              />
              <Checkbox
                size="xs"
                label="Personal Notes"
                checked={fieldOptions.includeNotes}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setFieldOptions((prev) => ({ ...prev, includeNotes: checked }));
                }}
                styles={{ label: { fontSize: '0.8rem', cursor: 'pointer' } }}
              />
              <Checkbox
                size="xs"
                label="Usage Frequency"
                checked={fieldOptions.includeFrequency}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setFieldOptions((prev) => ({ ...prev, includeFrequency: checked }));
                }}
                styles={{ label: { fontSize: '0.8rem', cursor: 'pointer' } }}
              />
              <Checkbox
                size="xs"
                label="AI Details (Origin/Mnemonic)"
                checked={fieldOptions.includeAiDetails}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setFieldOptions((prev) => ({ ...prev, includeAiDetails: checked }));
                }}
                styles={{ label: { fontSize: '0.8rem', cursor: 'pointer' } }}
              />
            </SimpleGrid>
          </Stack>
        </Paper>

        {/* Live Preview */}
        <div>
          <Group justify="space-between" align="center" mb={4} wrap="wrap" gap="xs">
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.04em' }}>
              PREVIEW
            </Text>
            <Text size="xs" c="dimmed">
              {normalizedItems.length} word{normalizedItems.length === 1 ? '' : 's'} ready
            </Text>
          </Group>

          <Paper
            p="xs"
            radius="md"
            withBorder
            style={{
              background: 'rgba(0, 0, 0, 0.03)',
              borderColor: 'var(--card-border)',
              position: 'relative',
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <ScrollArea.Autosize
              mah={{ base: 140, sm: 200 }}
              offsetScrollbars
              scrollbarSize={6}
              type="auto"
            >
              <pre
                style={{
                  margin: 0,
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: 'var(--text-primary)',
                  lineHeight: 1.45,
                }}
              >
                {formattedContent || '(No fields selected for export)'}
              </pre>
            </ScrollArea.Autosize>
          </Paper>
        </div>

        {/* Action Controls */}
        <Group justify="space-between" align="center" mt="xs" wrap="wrap" gap="sm">
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            radius="md"
            onClick={onClose}
            w={{ base: '100%', xs: 'auto' }}
          >
            Close
          </Button>

          <Group
            gap="xs"
            w={{ base: '100%', xs: 'auto' }}
            style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}
          >
            <CopyButton value={formattedContent} timeout={2000}>
              {({ copied, copy }) => (
                <Button
                  variant="light"
                  color={copied ? 'teal' : 'gray'}
                  size="sm"
                  radius="md"
                  leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  onClick={copy}
                  disabled={normalizedItems.length === 0}
                  style={{ flex: 1, minWidth: '110px' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              )}
            </CopyButton>

            <Button
              variant="gradient"
              gradient={{ from: 'indigo', to: 'violet', deg: 135 }}
              size="sm"
              radius="md"
              leftSection={getFormatIcon()}
              onClick={handleDownload}
              disabled={normalizedItems.length === 0}
              style={{ fontWeight: 700, flex: 1, minWidth: '140px' }}
            >
              Download {format.toUpperCase()}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
