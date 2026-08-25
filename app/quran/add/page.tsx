'use client';

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Grid,
  Group,
  Loader,
  NumberInput,
  Paper,
  Progress,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconArrowLeft,
  IconArrowsSplit,
  IconBook,
  IconCategory,
  IconCheck,
  IconDeviceFloppy,
  IconDownload,
  IconFileImport,
  IconInfoCircle,
  IconListDetails,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import Link from 'next/link';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useQuranVerse } from '@/components/QuranVerse';
import { appNotifications } from '@/lib/notifications';
import {
  CURATED_INSPIRATIONAL_VERSES,
  getChapterMetadata,
  parseVerseBatchDetailed,
  type ParsedVerseBatchItem,
  QURAN_CHAPTERS,
} from '@/lib/quran-api';
import { addBatchQuranVerses, addQuranVerseRecord } from '@/lib/quran-service';

const CATEGORY_OPTIONS = [
  'Inspirational',
  'Hope & Relief',
  'Patience & Perseverance',
  'Gratitude & Praise',
  'Trust in Allah (Tawakkul)',
  'Mercy & Forgiveness',
  'Protection & Majesty',
  'Peace of Heart',
  'Guidance & Wisdom',
  'Supplication (Dua)',
  'Daily Reflection',
];

const SAMPLE_BATCH_PRESETS = [
  {
    label: '✨ Hope & Relief Essentials',
    text: `94:1-8\n65:2-3\n39:53\n2:286`,
  },
  {
    label: '🛡️ Daily Protection & Majesty',
    text: `2:255\n59:22-24\n112:1-4\n113:1-5\n114:1-6`,
  },
  {
    label: '🌿 Faith & Guidance Classics',
    text: `1:1-7\n2:152-153\n3:139\n2:186\n13:28`,
  },
  {
    label: '💎 Wisdom & Good Character',
    text: `17:23-24\n25:63\n41:34\n49:10-13`,
  },
];

function AddVersePageContent() {
  const { verses, refreshVerses, showNextVerseNow } = useQuranVerse();

  const [activeTab, setActiveTab] = useState<string>('batch');

  // Trigger refresh on mount to ensure existing verses from RxDB / Supabase are loaded
  useEffect(() => {
    void refreshVerses();
  }, [refreshVerses]);

  // Existing verse IDs in DB for duplicate checking (handles both 'chapter:verse' string and number types)
  const existingVerseIdsSet = useMemo(() => {
    const set = new Set<string>();
    for (const v of verses) {
      if (!v.isDeleted) {
        if (v.id) {
          set.add(String(v.id).trim());
        }
        if (typeof v.chapter === 'number' && typeof v.verse === 'number') {
          set.add(`${v.chapter}:${v.verse}`);
        }
      }
    }
    return set;
  }, [verses]);

  // =========================================================================
  // Tab 1: Batch / Bulk Import State
  // =========================================================================
  const [batchInputText, setBatchInputText] = useState<string>(
    '2:255, 94:5-6\n65:2-3\n39:53\n13:28'
  );
  const [batchCategory, setBatchCategory] = useState<string>('Inspirational');
  const [batchNotes, setBatchNotes] = useState<string>('');
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);
  const [isImportingBatch, setIsImportingBatch] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [lastBatchResult, setLastBatchResult] = useState<{
    added: number;
    skipped: number;
    total: number;
  } | null>(null);

  // Live Parsing of Batch Input
  const batchReport = useMemo(() => {
    return parseVerseBatchDetailed(batchInputText);
  }, [batchInputText]);

  // Split into new vs duplicate verses
  const { newVersesToImport, existingDuplicates } = useMemo(() => {
    const newItems: ParsedVerseBatchItem[] = [];
    const duplicates: ParsedVerseBatchItem[] = [];

    for (const item of batchReport.validVerses) {
      if (existingVerseIdsSet.has(item.key)) {
        duplicates.push(item);
      } else {
        newItems.push(item);
      }
    }

    return {
      newVersesToImport: newItems,
      existingDuplicates: duplicates,
    };
  }, [batchReport.validVerses, existingVerseIdsSet]);

  const targetVersesForImport = skipDuplicates ? newVersesToImport : batchReport.validVerses;

  // Handle Batch Import Execution
  const handleExecuteBatchImport = async () => {
    if (targetVersesForImport.length === 0) {
      appNotifications.error({
        title: 'No Verses to Import',
        message:
          skipDuplicates && existingDuplicates.length > 0
            ? 'All parsed verses are already in your database. Uncheck "Skip existing verses" if you wish to overwrite them.'
            : 'Please enter valid chapter:verse pairs to import.',
      });
      return;
    }

    setIsImportingBatch(true);
    setImportProgress(20);

    try {
      const itemsToSave = targetVersesForImport.map((v) => ({
        chapter: v.chapter,
        verse: v.verse,
        verseEnd: v.verseEnd,
        category: batchCategory || 'Inspirational',
        notes: batchNotes || `Surah ${v.surahName} (${v.key})`,
      }));

      setImportProgress(60);
      const inserted = await addBatchQuranVerses(itemsToSave);
      setImportProgress(100);

      const skippedCount = skipDuplicates ? existingDuplicates.length : 0;
      setLastBatchResult({
        added: inserted.length,
        skipped: skippedCount,
        total: batchReport.validVerses.length,
      });

      appNotifications.success({
        title: 'Batch Import Completed',
        message: `Successfully imported ${inserted.length} verse(s) into database.${
          skippedCount > 0 ? ` (${skippedCount} existing verses skipped)` : ''
        }`,
      });

      await refreshVerses();
    } catch (err: any) {
      appNotifications.error({
        title: 'Batch Import Failed',
        message: err?.message || 'Could not import verses into database.',
      });
    } finally {
      setIsImportingBatch(false);
    }
  };

  // =========================================================================
  // Tab 2: Single Verse Builder State
  // =========================================================================
  const [singleChapter, setSingleChapter] = useState<string>('2');
  const [singleVerse, setSingleVerse] = useState<number>(255);
  const [singleCategory, setSingleCategory] = useState<string>('Inspirational');
  const [singleNotes, setSingleNotes] = useState<string>('');
  const [isAddingSingle, setIsAddingSingle] = useState<boolean>(false);

  const singleChapterMeta = useMemo(() => {
    return getChapterMetadata(parseInt(singleChapter, 10)) || QURAN_CHAPTERS[1];
  }, [singleChapter]);

  const chapterSelectData = useMemo(() => {
    return QURAN_CHAPTERS.map((c) => ({
      value: String(c.id),
      label: `${c.id}. ${c.nameSimple} (${c.nameArabic}) - ${c.translatedName} (${c.versesCount} Ayahs)`,
    }));
  }, []);

  const handleAddSingleVerse = async () => {
    const ch = parseInt(singleChapter, 10);
    if (isNaN(ch) || isNaN(singleVerse)) {
      appNotifications.error({
        title: 'Invalid Input',
        message: 'Please select a valid chapter and verse number.',
      });
      return;
    }

    setIsAddingSingle(true);
    try {
      await addQuranVerseRecord({
        chapter: ch,
        verse: singleVerse,
        category: singleCategory || 'Inspirational',
        notes: singleNotes || `Surah ${singleChapterMeta.nameSimple} (${ch}:${singleVerse})`,
      });

      appNotifications.success({
        title: 'Verse Added',
        message: `Surah ${singleChapterMeta.nameSimple} (${ch}:${singleVerse}) added to database.`,
      });

      await refreshVerses();
      setSingleNotes('');
    } catch (err: any) {
      appNotifications.error({
        title: 'Failed to Add Verse',
        message: err?.message || 'Could not add verse to database.',
      });
    } finally {
      setIsAddingSingle(false);
    }
  };

  // =========================================================================
  // Tab 3: Chapter Range Builder State
  // =========================================================================
  const [rangeChapter, setRangeChapter] = useState<string>('94');
  const [rangeFrom, setRangeFrom] = useState<number>(1);
  const [rangeTo, setRangeTo] = useState<number>(8);
  const [rangeCategory, setRangeCategory] = useState<string>('Hope & Relief');
  const [isAddingRange, setIsAddingRange] = useState<boolean>(false);

  const rangeChapterMeta = useMemo(() => {
    return getChapterMetadata(parseInt(rangeChapter, 10)) || QURAN_CHAPTERS[93];
  }, [rangeChapter]);

  const handleAddRangeVerses = async () => {
    const ch = parseInt(rangeChapter, 10);
    const meta = getChapterMetadata(ch);
    if (!meta) {
      return;
    }

    const start = Math.max(1, Math.min(rangeFrom, rangeTo));
    const end = Math.min(meta.versesCount, Math.max(rangeFrom, rangeTo));

    const item =
      start === end
        ? {
            chapter: ch,
            verse: start,
            category: rangeCategory || 'Inspirational',
            notes: `Surah ${meta.nameSimple} ${ch}:${start}`,
          }
        : {
            chapter: ch,
            verse: start,
            verseEnd: end,
            category: rangeCategory || 'Inspirational',
            notes: `Surah ${meta.nameSimple} ${ch}:${start}-${end}`,
          };

    setIsAddingRange(true);
    try {
      await addBatchQuranVerses([item]);

      appNotifications.success({
        title: 'Range Imported',
        message: `Added Surah ${meta.nameSimple} (${
          start === end ? `${ch}:${start}` : `${ch}:${start}-${end}`
        }) as range record into database.`,
      });

      await refreshVerses();
    } catch (err: any) {
      appNotifications.error({
        title: 'Failed to Add Range',
        message: err?.message || 'Could not add range to database.',
      });
    } finally {
      setIsAddingRange(false);
    }
  };

  // =========================================================================
  // Tab 4: Curated Presets Handler
  // =========================================================================
  const [isAddingPresets, setIsAddingPresets] = useState<boolean>(false);

  const handleAddPresetItem = async (preset: (typeof CURATED_INSPIRATIONAL_VERSES)[0]) => {
    try {
      await addQuranVerseRecord({
        chapter: preset.chapter,
        verse: preset.verse,
        verseEnd: preset.verseEnd,
        category: preset.theme,
        notes: `${preset.title}: ${preset.description}`,
      });

      appNotifications.success({
        title: 'Preset Added',
        message: `${preset.title} (${preset.key}) added to database.`,
      });

      await refreshVerses();
    } catch (err: any) {
      appNotifications.error({
        title: 'Error Adding Preset',
        message: err?.message || 'Could not add preset.',
      });
    }
  };

  const handleAddAllCuratedPresets = async () => {
    setIsAddingPresets(true);
    try {
      const items = CURATED_INSPIRATIONAL_VERSES.map((p) => ({
        chapter: p.chapter,
        verse: p.verse,
        verseEnd: p.verseEnd,
        category: p.theme,
        notes: `${p.title}: ${p.description}`,
      }));

      const inserted = await addBatchQuranVerses(items);

      appNotifications.success({
        title: 'All Presets Imported',
        message: `Imported ${inserted.length} curated inspirational verses into database.`,
      });

      await refreshVerses();
    } catch (err: any) {
      appNotifications.error({
        title: 'Failed to Import Presets',
        message: err?.message || 'Could not import all presets.',
      });
    } finally {
      setIsAddingPresets(false);
    }
  };

  return (
    <Container size="lg" px={{ base: 'xs', sm: 'md', md: 'lg' }} py={{ base: 'sm', sm: 'xl' }}>
      <Stack gap="xl">
        {/* Navigation & Header Breadcrumb */}
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Button
            component={Link}
            href="/quran"
            variant="subtle"
            color="indigo"
            size="sm"
            leftSection={<IconArrowLeft size={18} />}
          >
            Back to Quran Library
          </Button>

          <Group gap="xs">
            <Button
              variant="light"
              color="teal"
              size="sm"
              leftSection={<IconPlayerPlay size={16} />}
              onClick={() => void showNextVerseNow({ force: true })}
            >
              Test Popup Now
            </Button>
            <Button
              component={Link}
              href="/settings?tab=quran"
              variant="default"
              size="sm"
              leftSection={<IconRefresh size={16} />}
            >
              Configure Interval
            </Button>
          </Group>
        </Group>

        {/* Hero Header Banner */}
        <Paper
          p={{ base: 'md', sm: 'xl' }}
          radius="lg"
          style={{
            background:
              'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(16, 185, 129, 0.12) 50%, rgba(245, 158, 11, 0.1) 100%)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap" gap="md">
            <Group gap="md">
              <ThemeIcon
                size={52}
                radius="xl"
                variant="gradient"
                gradient={{ from: 'indigo', to: 'teal', deg: 45 }}
                style={{ boxShadow: '0 8px 18px rgba(99, 102, 241, 0.25)' }}
              >
                <IconFileImport size={28} />
              </ThemeIcon>

              <Stack gap={2}>
                <Group gap="xs" align="center">
                  <Title order={2} style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                    <span className="text-gradient">Add & Batch Import Verses</span>
                  </Title>
                  <Badge variant="filled" color="indigo" size="md">
                    {verses.filter((v) => !v.isDeleted).length} in Library
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">
                  Import batch verses using comma-separated or newline-separated references,
                  interactive selectors, ranges, or curated presets.
                </Text>
              </Stack>
            </Group>
          </Group>
        </Paper>

        {/* Main Tabs Panel */}
        <Card
          p={{ base: 'md', sm: 'xl' }}
          radius="lg"
          withBorder
          style={{ background: 'var(--card-bg)' }}
        >
          <Tabs
            value={activeTab}
            onChange={(v) => v && setActiveTab(v)}
            color="indigo"
            variant="pills"
            radius="md"
          >
            <Tabs.List mb="xl" grow>
              <Tabs.Tab
                value="batch"
                leftSection={<IconFileImport size={18} />}
                style={{ fontWeight: 600 }}
              >
                1. Batch / Bulk Import
              </Tabs.Tab>
              <Tabs.Tab
                value="single"
                leftSection={<IconListDetails size={18} />}
                style={{ fontWeight: 600 }}
              >
                2. Single Verse Form
              </Tabs.Tab>
              <Tabs.Tab
                value="range"
                leftSection={<IconArrowsSplit size={18} />}
                style={{ fontWeight: 600 }}
              >
                3. Chapter Range
              </Tabs.Tab>
              <Tabs.Tab
                value="presets"
                leftSection={<IconSparkles size={18} />}
                style={{ fontWeight: 600 }}
              >
                4. Curated Presets
              </Tabs.Tab>
            </Tabs.List>

            {/* ============================================================= */}
            {/* TAB 1: BATCH / BULK IMPORT                                    */}
            {/* ============================================================= */}
            <Tabs.Panel value="batch">
              <Stack gap="lg">
                {/* Instruction Banner */}
                <Alert
                  icon={<IconInfoCircle size={20} />}
                  title="Batch Import Formatting"
                  color="indigo"
                  radius="md"
                  variant="light"
                >
                  <Text size="xs">
                    Input chapter:verse references separated by <strong>commas</strong> or{' '}
                    <strong>newlines</strong>. Ranges like <code>94:1-8</code> and named references
                    like <code>Surah Baqarah 255</code> are fully supported!
                  </Text>
                </Alert>

                {/* Sample Presets Loader */}
                <Stack gap="xs">
                  <Text size="xs" fw={700} c="dimmed">
                    Quick Sample Presets:
                  </Text>
                  <Group gap="xs" wrap="wrap">
                    {SAMPLE_BATCH_PRESETS.map((p, idx) => (
                      <Button
                        key={idx}
                        variant="subtle"
                        size="xs"
                        color="indigo"
                        radius="xl"
                        style={{ border: '1px solid rgba(99, 102, 241, 0.25)' }}
                        onClick={() => setBatchInputText(p.text)}
                      >
                        {p.label}
                      </Button>
                    ))}
                    <Button
                      variant="subtle"
                      size="xs"
                      color="gray"
                      radius="xl"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => setBatchInputText('')}
                    >
                      Clear
                    </Button>
                  </Group>
                </Stack>

                {/* Large Text Area */}
                <Textarea
                  label="Enter Chapter & Verse References"
                  description="Supported formats: 2:255, 94:5-6, 65:2-3, 3:102, Surah Baqarah 286 (comma or line separated)"
                  placeholder="e.g.&#10;2:255&#10;94:1-8&#10;65:2-3&#10;39:53&#10;112:1-4"
                  minRows={6}
                  maxRows={12}
                  autosize
                  value={batchInputText}
                  onChange={(e) => setBatchInputText(e.currentTarget.value)}
                  styles={{
                    input: {
                      fontFamily: 'monospace',
                      fontSize: '0.95rem',
                      lineHeight: 1.6,
                    },
                  }}
                />

                {/* Batch Category & Notes Configuration */}
                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Assign Category / Theme"
                      description="Category tag for all verses in this batch"
                      data={CATEGORY_OPTIONS}
                      value={batchCategory}
                      onChange={(val) => setBatchCategory(val || 'Inspirational')}
                      searchable
                      leftSection={<IconCategory size={16} />}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <TextInput
                      label="Batch Reflection Note (Optional)"
                      description="Default note added to each verse"
                      placeholder="e.g. Daily motivational reminder"
                      value={batchNotes}
                      onChange={(e) => setBatchNotes(e.currentTarget.value)}
                    />
                  </Grid.Col>
                </Grid>

                {/* Skip Duplicates Checkbox */}
                <Group justify="space-between" align="center">
                  <Checkbox
                    label="Skip existing verses already in your library"
                    description="Prevents duplicate records from being added twice"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.currentTarget.checked)}
                    color="indigo"
                  />

                  <Badge variant="light" color="indigo" size="lg">
                    {batchReport.validVerses.length} Total Valid Ayahs Detected
                  </Badge>
                </Group>

                {/* Live Parsing Breakdown & Statistics */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <Paper
                    p="sm"
                    radius="md"
                    withBorder
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      borderColor: 'rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    <Group justify="space-between">
                      <Text size="xs" fw={700} c="teal">
                        Ready to Import
                      </Text>
                      <Badge color="teal" variant="filled" size="sm">
                        {targetVersesForImport.length}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={4}>
                      {skipDuplicates
                        ? `${newVersesToImport.length} new verses to add`
                        : `${batchReport.validVerses.length} verses to add / update`}
                    </Text>
                  </Paper>

                  <Paper
                    p="sm"
                    radius="md"
                    withBorder
                    style={{
                      background: 'rgba(245, 158, 11, 0.08)',
                      borderColor: 'rgba(245, 158, 11, 0.25)',
                    }}
                  >
                    <Group justify="space-between">
                      <Text size="xs" fw={700} c="amber">
                        Already in Library
                      </Text>
                      <Badge color="amber" variant="filled" size="sm">
                        {existingDuplicates.length}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={4}>
                      {existingDuplicates.length === 1
                        ? '1 verse already in DB'
                        : `${existingDuplicates.length} verses already in DB`}
                      {skipDuplicates ? ' (will skip)' : ' (will update)'}
                    </Text>
                  </Paper>

                  <Paper
                    p="sm"
                    radius="md"
                    withBorder
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      borderColor: 'rgba(239, 68, 68, 0.25)',
                    }}
                  >
                    <Group justify="space-between">
                      <Text size="xs" fw={700} c="red">
                        Invalid Tokens
                      </Text>
                      <Badge color="red" variant="filled" size="sm">
                        {batchReport.invalidTokens.length}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed" mt={4}>
                      {batchReport.invalidTokens.length === 0
                        ? 'All references valid'
                        : `${batchReport.invalidTokens.length} unrecognized format`}
                    </Text>
                  </Paper>
                </SimpleGrid>

                {/* Invalid Tokens Alert if Any */}
                {batchReport.invalidTokens.length > 0 && (
                  <Paper
                    p="sm"
                    radius="md"
                    withBorder
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <Group gap="xs" mb={4}>
                      <IconAlertCircle size={16} color="var(--mantine-color-red-6)" />
                      <Text size="xs" fw={700} c="red">
                        The following references could not be parsed:
                      </Text>
                    </Group>
                    <Stack gap={4} pl="md">
                      {batchReport.invalidTokens.map((inv, idx) => (
                        <Text key={idx} size="xs" c="dimmed">
                          • <code>{inv.token}</code>: {inv.reason}
                        </Text>
                      ))}
                    </Stack>
                  </Paper>
                )}

                {/* Parsed Verses Preview Scroll Area with Synchronized Color Palette */}
                {batchReport.validVerses.length > 0 && (
                  <Paper p="md" radius="md" withBorder style={{ background: 'var(--card-bg)' }}>
                    <Group justify="space-between" mb="sm" wrap="wrap" gap="xs">
                      <Text size="xs" fw={700} c="indigo">
                        Parsed Ayahs Preview ({batchReport.validVerses.length} total):
                      </Text>
                      <Group gap={6}>
                        <Badge color="teal" variant="light" size="xs">
                          {newVersesToImport.length} Ready to Import
                        </Badge>
                        <Badge color="amber" variant="light" size="xs">
                          {existingDuplicates.length} Already in Library
                        </Badge>
                        {batchReport.invalidTokens.length > 0 && (
                          <Badge color="red" variant="light" size="xs">
                            {batchReport.invalidTokens.length} Invalid Tokens
                          </Badge>
                        )}
                      </Group>
                    </Group>

                    <ScrollArea.Autosize mah={260} type="auto">
                      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xs">
                        {batchReport.validVerses.map((item) => {
                          const isDup = existingVerseIdsSet.has(item.key);
                          return (
                            <Paper
                              key={item.key}
                              p="xs"
                              radius="sm"
                              withBorder
                              style={{
                                background: isDup
                                  ? 'rgba(245, 158, 11, 0.08)'
                                  : 'rgba(16, 185, 129, 0.08)',
                                borderColor: isDup
                                  ? 'rgba(245, 158, 11, 0.25)'
                                  : 'rgba(16, 185, 129, 0.25)',
                                borderLeft: `4px solid ${
                                  isDup
                                    ? 'var(--mantine-color-amber-6)'
                                    : 'var(--mantine-color-teal-6)'
                                }`,
                              }}
                            >
                              <Group justify="space-between" wrap="nowrap" align="center">
                                <Stack gap={1} style={{ minWidth: 0 }}>
                                  <Text size="xs" fw={700} c={isDup ? 'amber' : 'teal'} truncate>
                                    Surah {item.surahName} ({item.nameArabic})
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {item.verseEnd && item.verseEnd > item.verse
                                      ? `Ayahs ${item.verse}-${item.verseEnd}`
                                      : `Ayah ${item.verse}`}{' '}
                                    of {item.totalVersesInSurah} • {isDup ? 'In Library' : 'Ready'}
                                  </Text>
                                </Stack>
                                <Badge size="sm" color={isDup ? 'amber' : 'teal'} variant="filled">
                                  {item.key}
                                </Badge>
                              </Group>
                            </Paper>
                          );
                        })}
                      </SimpleGrid>
                    </ScrollArea.Autosize>
                  </Paper>
                )}

                {/* Progress Bar during Import */}
                {isImportingBatch && (
                  <Progress value={importProgress} color="indigo" animated radius="xl" size="md" />
                )}

                {/* Success Summary Result Card */}
                {lastBatchResult && (
                  <Alert
                    icon={<IconCheck size={20} />}
                    title="Import Succeeded!"
                    color="teal"
                    radius="md"
                    variant="light"
                  >
                    <Group justify="space-between" align="center" wrap="wrap">
                      <Text size="sm">
                        Added <strong>{lastBatchResult.added}</strong> new verse(s) into database
                        {lastBatchResult.skipped > 0
                          ? ` (skipped ${lastBatchResult.skipped} existing)`
                          : ''}
                        .
                      </Text>
                      <Group gap="xs">
                        <Button
                          component={Link}
                          href="/quran"
                          size="xs"
                          color="teal"
                          variant="filled"
                        >
                          View Quran Library
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          color="indigo"
                          onClick={() => setLastBatchResult(null)}
                        >
                          Dismiss
                        </Button>
                      </Group>
                    </Group>
                  </Alert>
                )}

                {/* Execute Import Action Button */}
                <Button
                  color="indigo"
                  size="lg"
                  fullWidth
                  leftSection={<IconDownload size={20} />}
                  disabled={targetVersesForImport.length === 0}
                  loading={isImportingBatch}
                  onClick={handleExecuteBatchImport}
                >
                  Import {targetVersesForImport.length} Verse
                  {targetVersesForImport.length === 1 ? '' : 's'} into Database
                </Button>
              </Stack>
            </Tabs.Panel>

            {/* ============================================================= */}
            {/* TAB 2: SINGLE VERSE FORM                                      */}
            {/* ============================================================= */}
            <Tabs.Panel value="single">
              <Stack gap="lg">
                <Alert
                  icon={<IconBook size={20} />}
                  title="Interactive Single Ayah Selector"
                  color="indigo"
                  radius="md"
                  variant="light"
                >
                  <Text size="xs">
                    Choose from all 114 Surahs of the Holy Quran. Ayah range is automatically
                    validated against chapter limits.
                  </Text>
                </Alert>

                <Select
                  label="Select Surah (Chapter)"
                  description="Search by number or name (e.g. 2, Al-Baqarah, Yasin, Al-Mulk)"
                  placeholder="Search Surah..."
                  data={chapterSelectData}
                  value={singleChapter}
                  onChange={(val) => {
                    if (val) {
                      setSingleChapter(val);
                      const meta = getChapterMetadata(parseInt(val, 10));
                      if (meta && singleVerse > meta.versesCount) {
                        setSingleVerse(1);
                      }
                    }
                  }}
                  searchable
                  maxDropdownHeight={280}
                  leftSection={<IconBook size={16} />}
                />

                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <NumberInput
                      label="Ayah (Verse) Number"
                      description={`Range: 1 to ${singleChapterMeta.versesCount} Ayahs`}
                      value={singleVerse}
                      onChange={(val) => setSingleVerse(typeof val === 'number' ? val : 1)}
                      min={1}
                      max={singleChapterMeta.versesCount}
                      clampBehavior="strict"
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Select
                      label="Inspirational Category"
                      description="Theme tag for motivational popups"
                      data={CATEGORY_OPTIONS}
                      value={singleCategory}
                      onChange={(val) => setSingleCategory(val || 'Inspirational')}
                      searchable
                      leftSection={<IconCategory size={16} />}
                    />
                  </Grid.Col>
                </Grid>

                <TextInput
                  label="Personal Reflection / Note (Optional)"
                  placeholder="e.g. Ayatul Kursi - most powerful protection verse"
                  value={singleNotes}
                  onChange={(e) => setSingleNotes(e.currentTarget.value)}
                />

                {/* Live Card Preview */}
                <Paper
                  p="md"
                  radius="md"
                  withBorder
                  style={{ background: 'rgba(99, 102, 241, 0.03)' }}
                >
                  <Group justify="space-between" align="center">
                    <Stack gap={2}>
                      <Text size="sm" fw={700} c="indigo">
                        Target Verse: {singleChapter}:{singleVerse}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Surah {singleChapterMeta.nameSimple} ({singleChapterMeta.nameArabic}) •{' '}
                        {singleChapterMeta.translatedName} (
                        {singleChapterMeta.revelationPlace.toUpperCase()})
                      </Text>
                    </Stack>
                    <Badge color="indigo" size="lg">
                      {existingVerseIdsSet.has(`${singleChapter}:${singleVerse}`)
                        ? 'Already in DB'
                        : 'New Verse'}
                    </Badge>
                  </Group>
                </Paper>

                <Button
                  color="indigo"
                  size="md"
                  fullWidth
                  leftSection={<IconDeviceFloppy size={18} />}
                  onClick={handleAddSingleVerse}
                  loading={isAddingSingle}
                >
                  Save Verse ({singleChapter}:{singleVerse})
                </Button>
              </Stack>
            </Tabs.Panel>

            {/* ============================================================= */}
            {/* TAB 3: CHAPTER RANGE BUILDER                                  */}
            {/* ============================================================= */}
            <Tabs.Panel value="range">
              <Stack gap="lg">
                <Alert
                  icon={<IconArrowsSplit size={20} />}
                  title="Sequential Ayah Range Adder"
                  color="indigo"
                  radius="md"
                  variant="light"
                >
                  <Text size="xs">
                    Add a continuous sequence of Ayahs from any Surah (e.g. Surah Ash-Sharh 94:1-8
                    or Surah Al-Mulk 67:1-5).
                  </Text>
                </Alert>

                <Select
                  label="Select Surah (Chapter)"
                  data={chapterSelectData}
                  value={rangeChapter}
                  onChange={(val) => val && setRangeChapter(val)}
                  searchable
                  maxDropdownHeight={280}
                  leftSection={<IconBook size={16} />}
                />

                <Grid>
                  <Grid.Col span={{ base: 6, sm: 6 }}>
                    <NumberInput
                      label="From Ayah"
                      value={rangeFrom}
                      onChange={(v) => setRangeFrom(typeof v === 'number' ? v : 1)}
                      min={1}
                      max={rangeChapterMeta.versesCount}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 6, sm: 6 }}>
                    <NumberInput
                      label="To Ayah"
                      value={rangeTo}
                      onChange={(v) => setRangeTo(typeof v === 'number' ? v : 1)}
                      min={1}
                      max={rangeChapterMeta.versesCount}
                    />
                  </Grid.Col>
                </Grid>

                <Select
                  label="Category / Theme"
                  data={CATEGORY_OPTIONS}
                  value={rangeCategory}
                  onChange={(v) => setRangeCategory(v || 'Inspirational')}
                  searchable
                  leftSection={<IconCategory size={16} />}
                />

                <Paper
                  p="md"
                  radius="md"
                  withBorder
                  style={{ background: 'rgba(99, 102, 241, 0.03)' }}
                >
                  <Text size="sm" fw={700} c="indigo">
                    Range Summary: Surah {rangeChapterMeta.nameSimple} ({rangeChapter}:
                    {Math.min(rangeFrom, rangeTo)} to {rangeChapter}:{Math.max(rangeFrom, rangeTo)})
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    Total {Math.max(0, Math.abs(rangeTo - rangeFrom) + 1)} verses will be created in
                    your database.
                  </Text>
                </Paper>

                <Button
                  color="indigo"
                  size="md"
                  fullWidth
                  leftSection={<IconDownload size={18} />}
                  onClick={handleAddRangeVerses}
                  loading={isAddingRange}
                >
                  Add Range ({rangeChapter}:{rangeFrom}-{rangeTo})
                </Button>
              </Stack>
            </Tabs.Panel>

            {/* ============================================================= */}
            {/* TAB 4: CURATED PRESETS                                        */}
            {/* ============================================================= */}
            <Tabs.Panel value="presets">
              <Stack gap="md">
                <Group justify="space-between" align="center" wrap="wrap">
                  <Text size="xs" c="dimmed">
                    Curated collection of globally renowned inspirational, motivational & protection
                    verses:
                  </Text>

                  <Button
                    variant="light"
                    size="sm"
                    color="teal"
                    leftSection={<IconSparkles size={16} />}
                    onClick={handleAddAllCuratedPresets}
                    loading={isAddingPresets}
                  >
                    Import All Presets ({CURATED_INSPIRATIONAL_VERSES.length})
                  </Button>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {CURATED_INSPIRATIONAL_VERSES.map((preset) => {
                    const isAdded = existingVerseIdsSet.has(preset.key);
                    return (
                      <Card
                        key={preset.key}
                        p="md"
                        radius="md"
                        withBorder
                        style={{
                          background: 'var(--card-bg)',
                          borderLeft: `4px solid ${isAdded ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-indigo-6)'}`,
                        }}
                      >
                        <Group justify="space-between" align="flex-start" wrap="nowrap" mb={6}>
                          <Stack gap={2} style={{ minWidth: 0 }}>
                            <Text size="sm" fw={700} truncate>
                              {preset.title}
                            </Text>
                            <Group gap={6}>
                              <Badge size="xs" variant="filled" color="indigo">
                                {preset.key}
                              </Badge>
                              <Badge size="xs" variant="light" color="teal">
                                {preset.theme}
                              </Badge>
                            </Group>
                          </Stack>

                          <Button
                            size="xs"
                            variant={isAdded ? 'subtle' : 'filled'}
                            color={isAdded ? 'gray' : 'indigo'}
                            disabled={isAdded}
                            leftSection={isAdded ? <IconCheck size={14} /> : <IconPlus size={14} />}
                            onClick={() => handleAddPresetItem(preset)}
                          >
                            {isAdded ? 'Added' : 'Add Verse'}
                          </Button>
                        </Group>

                        <Text
                          size="xs"
                          c="dimmed"
                          lineClamp={3}
                          style={{ fontStyle: 'italic', lineHeight: 1.5 }}
                        >
                          "{preset.description}"
                        </Text>
                      </Card>
                    );
                  })}
                </SimpleGrid>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Card>
      </Stack>
    </Container>
  );
}

export default function AddVersePage() {
  return (
    <Suspense
      fallback={
        <Box
          style={{
            display: 'flex',
            minHeight: '80vh',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Stack align="center" gap="sm">
            <Loader color="indigo" size="md" />
            <Text size="sm" c="dimmed">
              Loading Verse Import Studio...
            </Text>
          </Stack>
        </Box>
      }
    >
      <AddVersePageContent />
    </Suspense>
  );
}
