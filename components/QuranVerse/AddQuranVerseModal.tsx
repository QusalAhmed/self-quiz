'use client';

import {
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconCheck,
  IconChevronRight,
  IconDeviceFloppy,
  IconListDetails,
  IconPlus,
  IconSparkles,
  IconTypography,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import { appNotifications } from '@/lib/notifications';
import {
  CURATED_INSPIRATIONAL_VERSES,
  getChapterMetadata,
  parseVerseInput,
  QURAN_CHAPTERS,
} from '@/lib/quran-api';
import { addBatchQuranVerses, addQuranVerseRecord } from '@/lib/quran-service';

export interface AddQuranVerseModalProps {
  opened: boolean;
  onClose: () => void;
  onVersesAdded?: () => void;
  existingVerseIds?: string[];
}

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
];

export function AddQuranVerseModal({
  opened,
  onClose,
  onVersesAdded,
  existingVerseIds = [],
}: AddQuranVerseModalProps) {
  const [activeTab, setActiveTab] = useState<string>('dropdown');

  // Option 1: Dropdown State
  const [selectedChapter, setSelectedChapter] = useState<string>('2');
  const [verseNumber, setVerseNumber] = useState<number>(255);
  const [category, setCategory] = useState<string>('Inspirational');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Option 2: Text Input State
  const [textInput, setTextInput] = useState<string>('94:5-6');
  const [textCategory, setTextCategory] = useState<string>('Hope & Relief');
  const [textNotes, setTextNotes] = useState<string>('');

  // Option 3: Range Batch State
  const [batchChapter, setBatchChapter] = useState<string>('94');
  const [fromVerse, setFromVerse] = useState<number>(1);
  const [toVerse, setToVerse] = useState<number>(8);
  const [batchCategory, setBatchCategory] = useState<string>('Ease & Relief');

  // Chapter options for Select
  const chapterSelectData = useMemo(() => {
    return QURAN_CHAPTERS.map((c) => ({
      value: String(c.id),
      label: `${c.id}. ${c.nameSimple} (${c.nameArabic}) - ${c.translatedName} (${c.versesCount} Ayahs)`,
    }));
  }, []);

  // Selected Chapter Metadata
  const currentChapterMeta = useMemo(() => {
    return getChapterMetadata(parseInt(selectedChapter, 10)) || QURAN_CHAPTERS[1];
  }, [selectedChapter]);

  const batchChapterMeta = useMemo(() => {
    return getChapterMetadata(parseInt(batchChapter, 10)) || QURAN_CHAPTERS[93];
  }, [batchChapter]);

  // Parsed Verses for Text Input Mode
  const parsedFromText = useMemo(() => {
    return parseVerseInput(textInput);
  }, [textInput]);

  // Handle Option 1: Add from Dropdown
  const handleAddSingle = async () => {
    const ch = parseInt(selectedChapter, 10);
    if (isNaN(ch) || isNaN(verseNumber)) {
      appNotifications.error({
        title: 'Invalid Input',
        message: 'Please select a valid chapter and verse.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addQuranVerseRecord({
        chapter: ch,
        verse: verseNumber,
        category: category || 'Inspirational',
        notes,
      });

      appNotifications.success({
        title: 'Verse Added',
        message: `Surah ${currentChapterMeta.nameSimple} (${ch}:${verseNumber}) added to database.`,
      });

      onVersesAdded?.();
      onClose();
    } catch (err: any) {
      appNotifications.error({
        title: 'Error Adding Verse',
        message: err?.message || 'Could not add verse',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Option 2: Add from Text Input
  const handleAddFromText = async () => {
    if (parsedFromText.length === 0) {
      appNotifications.error({
        title: 'No Valid Verses Found',
        message: 'Could not parse any valid chapter:verse keys from input.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const items = parsedFromText.map((p) => ({
        chapter: p.chapter,
        verse: p.verse,
        verseEnd: p.verseEnd,
        category: textCategory || 'Inspirational',
        notes: textNotes,
      }));

      await addBatchQuranVerses(items);

      appNotifications.success({
        title: 'Verses Added',
        message: `Successfully added ${items.length} verse(s) to database.`,
      });

      onVersesAdded?.();
      onClose();
    } catch (err: any) {
      appNotifications.error({
        title: 'Error Adding Verses',
        message: err?.message || 'Failed to add batch',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Option 3: Add from Range (stored and displayed as range)
  const handleAddRange = async () => {
    const ch = parseInt(batchChapter, 10);
    const meta = getChapterMetadata(ch);
    if (!meta) {
      return;
    }

    const start = Math.max(1, Math.min(fromVerse, toVerse));
    const end = Math.min(meta.versesCount, Math.max(fromVerse, toVerse));

    const item =
      start === end
        ? {
            chapter: ch,
            verse: start,
            category: batchCategory || 'Inspirational',
            notes: `Surah ${meta.nameSimple} ${ch}:${start}`,
          }
        : {
            chapter: ch,
            verse: start,
            verseEnd: end,
            category: batchCategory || 'Inspirational',
            notes: `Surah ${meta.nameSimple} ${ch}:${start}-${end}`,
          };

    setIsSubmitting(true);
    try {
      await addBatchQuranVerses([item]);

      appNotifications.success({
        title: 'Range Added',
        message: `Added Surah ${meta.nameSimple} (${start === end ? `${ch}:${start}` : `${ch}:${start}-${end}`}) as range.`,
      });

      onVersesAdded?.();
      onClose();
    } catch (err: any) {
      appNotifications.error({
        title: 'Error Adding Range',
        message: err?.message || 'Failed to add range',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Option 4: Add Curated Preset
  const handleAddPreset = async (preset: (typeof CURATED_INSPIRATIONAL_VERSES)[0]) => {
    setIsSubmitting(true);
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
        message: `${preset.title} (${preset.key}) added to your collection.`,
      });

      onVersesAdded?.();
    } catch (err: any) {
      appNotifications.error({
        title: 'Error Adding Preset',
        message: err?.message || 'Failed to add preset',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add all curated presets at once
  const handleAddAllPresets = async () => {
    setIsSubmitting(true);
    try {
      const items = CURATED_INSPIRATIONAL_VERSES.map((p) => ({
        chapter: p.chapter,
        verse: p.verse,
        category: p.theme,
        notes: `${p.title}: ${p.description}`,
      }));

      await addBatchQuranVerses(items);

      appNotifications.success({
        title: 'All Presets Added',
        message: `Added ${items.length} curated inspirational verses to database.`,
      });

      onVersesAdded?.();
      onClose();
    } catch (err: any) {
      appNotifications.error({
        title: 'Error Adding Presets',
        message: err?.message || 'Failed to add presets',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      radius="lg"
      title={
        <Group gap="xs">
          <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
            <IconPlus size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={4} style={{ fontWeight: 700 }}>
              Add Quran Verses
            </Title>
            <Text size="xs" c="dimmed">
              Choose from 4 flexible methods to add Surah and Ayah to database
            </Text>
          </Stack>
        </Group>
      }
      styles={{
        header: {
          borderBottom: '1px solid var(--card-border)',
          paddingBottom: 12,
        },
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(v) => v && setActiveTab(v)}
        color="indigo"
        variant="pills"
        radius="md"
        mt="sm"
      >
        <Tabs.List mb="md" grow>
          <Tabs.Tab value="dropdown" leftSection={<IconListDetails size={16} />}>
            1. Select Surah & Ayah
          </Tabs.Tab>
          <Tabs.Tab value="text" leftSection={<IconTypography size={16} />}>
            2. Direct Text
          </Tabs.Tab>
          <Tabs.Tab value="range" leftSection={<IconChevronRight size={16} />}>
            3. Batch Range
          </Tabs.Tab>
          <Tabs.Tab value="presets" leftSection={<IconSparkles size={16} />}>
            4. Curated Presets
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Interactive Dropdowns */}
        <Tabs.Panel value="dropdown">
          <Stack gap="md">
            <Select
              label="Select Surah (Chapter)"
              description="114 chapters available"
              placeholder="Search or pick Surah..."
              data={chapterSelectData}
              value={selectedChapter}
              onChange={(val) => {
                if (val) {
                  setSelectedChapter(val);
                  const meta = getChapterMetadata(parseInt(val, 10));
                  if (meta && verseNumber > meta.versesCount) {
                    setVerseNumber(1);
                  }
                }
              }}
              searchable
              nothingFoundMessage="No Surah matches search"
              maxDropdownHeight={260}
            />

            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="Ayah (Verse) Number"
                  description={`Range: 1 to ${currentChapterMeta.versesCount}`}
                  value={verseNumber}
                  onChange={(val) => setVerseNumber(typeof val === 'number' ? val : 1)}
                  min={1}
                  max={currentChapterMeta.versesCount}
                />
              </Grid.Col>

              <Grid.Col span={6}>
                <Select
                  label="Inspirational Category"
                  placeholder="Select theme"
                  data={CATEGORY_OPTIONS}
                  value={category}
                  onChange={(val) => setCategory(val || 'Inspirational')}
                  searchable
                />
              </Grid.Col>
            </Grid>

            <TextInput
              label="Reflection Note (Optional)"
              placeholder="e.g., Ayatul Kursi - powerful verse for daily protection"
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
            />

            {/* Live Preview Card */}
            <Card p="sm" radius="md" withBorder style={{ background: 'rgba(99, 102, 241, 0.03)' }}>
              <Group justify="space-between">
                <Text size="xs" fw={700} c="indigo">
                  Target Verse Key:
                </Text>
                <Badge color="indigo" size="md">
                  {selectedChapter}:{verseNumber}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>
                Surah {currentChapterMeta.nameSimple} ({currentChapterMeta.nameArabic}) •{' '}
                {currentChapterMeta.translatedName}
              </Text>
            </Card>

            <Button
              color="indigo"
              size="md"
              fullWidth
              leftSection={<IconDeviceFloppy size={18} />}
              onClick={handleAddSingle}
              loading={isSubmitting}
            >
              Add Verse ({selectedChapter}:{verseNumber})
            </Button>
          </Stack>
        </Tabs.Panel>

        {/* Tab 2: Flexible Text Input */}
        <Tabs.Panel value="text">
          <Stack gap="md">
            <Text size="xs" c="dimmed">
              Type verses in flexible formats such as <code>2:255</code>, <code>94:5-8</code>,{' '}
              <code>Surah 3:139</code>, or comma-separated lists <code>2:255, 3:139, 94:5</code>.
            </Text>

            <TextInput
              label="Verse Reference(s)"
              placeholder="e.g. 2:255, 94:5-6, 65:2-3, 39:53"
              value={textInput}
              onChange={(e) => setTextInput(e.currentTarget.value)}
            />

            <Grid>
              <Grid.Col span={6}>
                <Select
                  label="Category"
                  data={CATEGORY_OPTIONS}
                  value={textCategory}
                  onChange={(val) => setTextCategory(val || 'Inspirational')}
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Notes (Optional)"
                  placeholder="e.g., Daily motivation"
                  value={textNotes}
                  onChange={(e) => setTextNotes(e.currentTarget.value)}
                />
              </Grid.Col>
            </Grid>

            {/* Parsed Verses Preview Box */}
            <Paper
              p="xs"
              radius="md"
              withBorder
              style={{ minHeight: 60, background: 'var(--card-bg)' }}
            >
              <Text size="xs" fw={700} c="dimmed" mb={4}>
                Parsed Verses ({parsedFromText.length} detected):
              </Text>
              {parsedFromText.length > 0 ? (
                <Group gap={6}>
                  {parsedFromText.map((p) => {
                    const m = getChapterMetadata(p.chapter);
                    return (
                      <Badge key={p.key} variant="light" color="indigo" size="sm">
                        {m ? m.nameSimple : `Surah ${p.chapter}`} ({p.key})
                      </Badge>
                    );
                  })}
                </Group>
              ) : (
                <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
                  No valid verse keys detected yet. Example: 2:255
                </Text>
              )}
            </Paper>

            <Button
              color="indigo"
              size="md"
              fullWidth
              disabled={parsedFromText.length === 0}
              onClick={handleAddFromText}
              loading={isSubmitting}
            >
              Add {parsedFromText.length} Verse(s)
            </Button>
          </Stack>
        </Tabs.Panel>

        {/* Tab 3: Batch Range Input */}
        <Tabs.Panel value="range">
          <Stack gap="md">
            <Select
              label="Select Surah"
              data={chapterSelectData}
              value={batchChapter}
              onChange={(val) => val && setBatchChapter(val)}
              searchable
            />

            <Grid>
              <Grid.Col span={6}>
                <NumberInput
                  label="From Ayah"
                  value={fromVerse}
                  onChange={(v) => setFromVerse(typeof v === 'number' ? v : 1)}
                  min={1}
                  max={batchChapterMeta.versesCount}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="To Ayah"
                  value={toVerse}
                  onChange={(v) => setToVerse(typeof v === 'number' ? v : 1)}
                  min={1}
                  max={batchChapterMeta.versesCount}
                />
              </Grid.Col>
            </Grid>

            <Select
              label="Category"
              data={CATEGORY_OPTIONS}
              value={batchCategory}
              onChange={(v) => setBatchCategory(v || 'Inspirational')}
              searchable
            />

            <Paper p="xs" radius="md" withBorder>
              <Text size="xs" fw={600} c="indigo">
                Adding Range: Surah {batchChapterMeta.nameSimple} (Ayahs {fromVerse} to {toVerse})
              </Text>
              <Text size="xs" c="dimmed">
                Total {Math.max(0, Math.abs(toVerse - fromVerse) + 1)} verses will be stored in
                database.
              </Text>
            </Paper>

            <Button
              color="indigo"
              size="md"
              fullWidth
              onClick={handleAddRange}
              loading={isSubmitting}
            >
              Add Range ({batchChapter}:{fromVerse}-{toVerse})
            </Button>
          </Stack>
        </Tabs.Panel>

        {/* Tab 4: Curated Presets Grid */}
        <Tabs.Panel value="presets">
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="xs" c="dimmed">
                Quick 1-click addition of renowned motivational and inspirational verses:
              </Text>
              <Button
                variant="light"
                size="compact-xs"
                color="teal"
                onClick={handleAddAllPresets}
                loading={isSubmitting}
              >
                + Add All ({CURATED_INSPIRATIONAL_VERSES.length})
              </Button>
            </Group>

            <ScrollArea.Autosize mah={380} type="auto">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                {CURATED_INSPIRATIONAL_VERSES.map((preset) => {
                  const isAdded = existingVerseIds.includes(preset.key);
                  return (
                    <Card
                      key={preset.key}
                      p="xs"
                      radius="md"
                      withBorder
                      style={{ background: 'var(--card-bg)' }}
                    >
                      <Group justify="space-between" align="flex-start" wrap="nowrap" mb={4}>
                        <Stack gap={1} style={{ minWidth: 0 }}>
                          <Text size="xs" fw={700} truncate>
                            {preset.title}
                          </Text>
                          <Group gap={4}>
                            <Badge size="xs" variant="filled" color="indigo">
                              {preset.key}
                            </Badge>
                            <Badge size="xs" variant="light" color="teal">
                              {preset.theme}
                            </Badge>
                          </Group>
                        </Stack>

                        <Button
                          size="compact-xs"
                          variant={isAdded ? 'subtle' : 'filled'}
                          color={isAdded ? 'gray' : 'indigo'}
                          disabled={isAdded}
                          leftSection={isAdded ? <IconCheck size={12} /> : <IconPlus size={12} />}
                          onClick={() => handleAddPreset(preset)}
                          loading={isSubmitting}
                        >
                          {isAdded ? 'Added' : 'Add'}
                        </Button>
                      </Group>
                      <Text size="xs" c="dimmed" lineClamp={2} style={{ fontStyle: 'italic' }}>
                        "{preset.description}"
                      </Text>
                    </Card>
                  );
                })}
              </SimpleGrid>
            </ScrollArea.Autosize>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
}
