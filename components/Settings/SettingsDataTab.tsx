'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  Modal,
  Paper,
  Progress,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconDatabase,
  IconDeviceFloppy,
  IconDownload,
  IconFileSpreadsheet,
  IconRotateClockwise,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import {
  getDatabase,
  type GroupRecord,
  type MissedWordRecord,
  type WordFamilyMemberRecord,
  type WordRecord,
} from '@/lib/db';
import {
  downloadExportFile,
  formatExportContent,
  normalizeExportableItems,
  type ExportFormat,
} from '@/lib/export-words';

export interface SettingsDataTabProps {
  words: WordRecord[];
  groups: GroupRecord[];
  missedWords: MissedWordRecord[];
  wordFamilies: Record<string, WordFamilyMemberRecord[]>;
  fsrsCount: number;
  reviewLogsCount: number;
  onRefreshData?: () => void;
}

export function SettingsDataTab({
  words,
  groups,
  missedWords,
  wordFamilies,
  fsrsCount,
  reviewLogsCount,
  onRefreshData,
}: SettingsDataTabProps) {
  const [storageEstimate, setStorageEstimate] = useState<{
    usageMb: number;
    quotaMb: number;
    percent: number;
  }>({ usageMb: 0, quotaMb: 0, percent: 0 });

  const [exportingFormat, setExportingFormat] = useState<ExportFormat | 'full_json' | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(
    null
  );

  // Danger Zone Modals
  const [dangerModal, setDangerModal] = useState<
    'clearReviewLogs' | 'clearMissedWords' | 'resetFsrs' | 'factoryReset' | null
  >(null);
  const [isProcessingDanger, setIsProcessingDanger] = useState(false);

  // Calculate browser storage estimate
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'storage' in navigator &&
      'estimate' in navigator.storage
    ) {
      void navigator.storage.estimate().then((estimate) => {
        const usageMb = estimate.usage ? estimate.usage / (1024 * 1024) : 0;
        const quotaMb = estimate.quota ? estimate.quota / (1024 * 1024) : 1000;
        const percent = quotaMb > 0 ? (usageMb / quotaMb) * 100 : 0;
        setStorageEstimate({
          usageMb: Number(usageMb.toFixed(2)),
          quotaMb: Number(quotaMb.toFixed(0)),
          percent: Number(percent.toFixed(1)),
        });
      });
    }
  }, []);

  // 1-Click Full JSON Backup Export
  const handleFullBackupExport = async () => {
    setExportingFormat('full_json');
    try {
      const db = await getDatabase();
      const allWords = await db.words.find().exec();
      const allGroups = await db.groups.find().exec();
      const allMissed = await db.missedWords.find().exec();
      const allFsrs = await db.fsrsRecords.find().exec();
      const allFamilies = await db.wordFamilies.find().exec();
      const allLogs = await db.reviewLogs.find().exec();

      const backupObject = {
        version: 1,
        exportedAt: new Date().toISOString(),
        appName: 'Self Quiz / English Word Memorizer',
        data: {
          words: allWords.map((d) => d.toJSON()),
          groups: allGroups.map((d) => d.toJSON()),
          missedWords: allMissed.map((d) => d.toJSON()),
          fsrsRecords: allFsrs.map((d) => d.toJSON()),
          wordFamilies: allFamilies.map((d) => d.toJSON()),
          reviewLogs: allLogs.map((d) => d.toJSON()),
        },
      };

      const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupObject, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `self-quiz-full-backup-${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Failed to export full backup:', err);
    } finally {
      setExportingFormat(null);
    }
  };

  // Quick format export (JSON / CSV / TXT)
  const handleQuickExport = (format: ExportFormat) => {
    setExportingFormat(format);
    try {
      const exportable = normalizeExportableItems(words);
      const content = formatExportContent(exportable, format);
      downloadExportFile(content, `vocabulary-${format}`, format);
    } finally {
      setExportingFormat(null);
    }
  };

  // Restore from JSON Backup
  const handleImportBackup = async () => {
    if (!importFile) {
      return;
    }
    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await importFile.text();
      const parsed = JSON.parse(text);

      const db = await getDatabase();
      const timestamp = new Date().toISOString();

      if (parsed.data && Array.isArray(parsed.data.words)) {
        // Full Backup schema
        const wordsList: WordRecord[] = parsed.data.words;
        const groupsList: GroupRecord[] = parsed.data.groups || [];
        const missedList: MissedWordRecord[] = parsed.data.missedWords || [];

        if (importMode === 'overwrite') {
          // Soft delete existing
          const currentWords = await db.words.find().exec();
          for (const w of currentWords) {
            const raw = w.toJSON() as unknown as WordRecord;
            await db.words.upsert({ ...raw, isDeleted: true, updatedAt: timestamp });
          }
        }

        for (const w of wordsList) {
          if (w.id && w.word) {
            await db.words.upsert({ ...w, isDeleted: false, updatedAt: timestamp });
          }
        }

        for (const g of groupsList) {
          if (g.id && g.name) {
            await db.groups.upsert({ ...g, isDeleted: false, updatedAt: timestamp });
          }
        }

        for (const m of missedList) {
          if (m.id) {
            await db.missedWords.upsert({ ...m, isDeleted: false, updatedAt: timestamp });
          }
        }

        setImportResult({
          success: true,
          message: `Successfully imported ${wordsList.length} words and ${groupsList.length} groups!`,
        });
      } else if (Array.isArray(parsed)) {
        // Simple Array of Words schema
        for (const item of parsed) {
          if (item.word) {
            await db.words.upsert({
              id: item.id || crypto.randomUUID(),
              word: item.word,
              meaning: item.meaning || '',
              definitions: item.definitions || [],
              customGroups: item.customGroups || item.tags || [],
              notes: item.notes || '',
              usageFrequency: item.usageFrequency || '',
              createdAt: item.createdAt || timestamp,
              updatedAt: timestamp,
              isDeleted: false,
              lastSyncedAt: '',
            });
          }
        }
        setImportResult({
          success: true,
          message: `Successfully imported ${parsed.length} vocabulary words!`,
        });
      } else {
        throw new Error('Unrecognized JSON format.');
      }

      onRefreshData?.();
      setImportFile(null);
    } catch (err: any) {
      setImportResult({
        success: false,
        message: `Import failed: ${err?.message || 'Invalid JSON file format'}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Danger Zone Actions
  const handleExecuteDangerAction = async () => {
    if (!dangerModal) {
      return;
    }
    setIsProcessingDanger(true);

    try {
      const db = await getDatabase();
      const timestamp = new Date().toISOString();

      if (dangerModal === 'clearReviewLogs') {
        const logs = await db.reviewLogs.find().exec();
        for (const log of logs) {
          await db.reviewLogs.upsert({ ...log.toJSON(), isDeleted: true, updatedAt: timestamp });
        }
      } else if (dangerModal === 'clearMissedWords') {
        const missed = await db.missedWords.find().exec();
        for (const m of missed) {
          await db.missedWords.upsert({ ...m.toJSON(), isDeleted: true, updatedAt: timestamp });
        }
      } else if (dangerModal === 'resetFsrs') {
        const fsrs = await db.fsrsRecords.find().exec();
        for (const f of fsrs) {
          await db.fsrsRecords.upsert({
            ...f.toJSON(),
            state: 'New',
            reps: 0,
            lapses: 0,
            stability: 0,
            difficulty: 0,
            scheduledDays: 0,
            dueAt: timestamp,
            updatedAt: timestamp,
          });
        }
      } else if (dangerModal === 'factoryReset') {
        const allWords = await db.words.find().exec();
        for (const w of allWords) {
          const raw = w.toJSON() as unknown as WordRecord;
          await db.words.upsert({ ...raw, isDeleted: true, updatedAt: timestamp });
        }
        const allGroups = await db.groups.find().exec();
        for (const g of allGroups) {
          await db.groups.upsert({ ...g.toJSON(), isDeleted: true, updatedAt: timestamp });
        }
        const allMissed = await db.missedWords.find().exec();
        for (const m of allMissed) {
          await db.missedWords.upsert({ ...m.toJSON(), isDeleted: true, updatedAt: timestamp });
        }
        const allFsrs = await db.fsrsRecords.find().exec();
        for (const f of allFsrs) {
          await db.fsrsRecords.upsert({ ...f.toJSON(), isDeleted: true, updatedAt: timestamp });
        }
      }

      onRefreshData?.();
      setDangerModal(null);
    } catch (err) {
      console.error('Failed to execute danger action:', err);
    } finally {
      setIsProcessingDanger(false);
    }
  };

  return (
    <Stack gap="lg">
      {/* Storage Metrics & Quota */}
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
        <Group justify="space-between" align="center" mb="md">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" color="indigo" variant="light">
              <IconDatabase size={20} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="md">
                Local Storage & Database Metrics
              </Text>
              <Text size="xs" c="dimmed">
                RxDB client-side database storage utilization and document records
              </Text>
            </div>
          </Group>

          <Badge size="md" variant="light" color="indigo">
            {storageEstimate.usageMb} MB Used / {storageEstimate.quotaMb} MB Quota
          </Badge>
        </Group>

        <Progress
          value={Math.max(2, storageEstimate.percent)}
          color="indigo"
          size="sm"
          radius="xl"
          mb="md"
        />

        <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="sm">
          <Paper withBorder p="xs" radius="md">
            <Text size="xs" c="dimmed">
              Words
            </Text>
            <Text size="md" fw={700} c="indigo">
              {words.length}
            </Text>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Text size="xs" c="dimmed">
              Groups
            </Text>
            <Text size="md" fw={700} c="violet">
              {groups.length}
            </Text>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Text size="xs" c="dimmed">
              Missed Words
            </Text>
            <Text size="md" fw={700} c="orange">
              {missedWords.length}
            </Text>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Text size="xs" c="dimmed">
              FSRS Cards
            </Text>
            <Text size="md" fw={700} c="teal">
              {fsrsCount}
            </Text>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Text size="xs" c="dimmed">
              Word Families
            </Text>
            <Text size="md" fw={700} c="cyan">
              {Object.values(wordFamilies).reduce((acc, l) => acc + l.length, 0)}
            </Text>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Text size="xs" c="dimmed">
              Review Logs
            </Text>
            <Text size="md" fw={700} c="blue">
              {reviewLogsCount}
            </Text>
          </Paper>
        </SimpleGrid>
      </Card>

      {/* Export Backups */}
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
            <IconDownload size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Data Export & Offline Backups
            </Text>
            <Text size="xs" c="dimmed">
              Safeguard your vocabulary library, custom groupings, and spaced repetition history
            </Text>
          </div>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Paper
            withBorder
            p="md"
            radius="md"
            style={{
              background: 'rgba(99, 102, 241, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Text size="sm" fw={700}>
                Full Database JSON Backup
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Complete backup including words, definitions, examples, groups, FSRS memory ratings,
                and review logs.
              </Text>
            </div>
            <Button
              color="indigo"
              size="xs"
              radius="md"
              mt="md"
              loading={exportingFormat === 'full_json'}
              onClick={handleFullBackupExport}
              leftSection={<IconDeviceFloppy size={14} />}
            >
              Export Full Backup (.JSON)
            </Button>
          </Paper>

          <Paper
            withBorder
            p="md"
            radius="md"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Text size="sm" fw={700}>
                Spreadsheet & Text Export
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Export clean CSV tables or plain text word lists for Anki, Excel, or Google Sheets.
              </Text>
            </div>
            <Group gap="xs" mt="md">
              <Button
                variant="light"
                color="teal"
                size="xs"
                radius="md"
                onClick={() => handleQuickExport('csv')}
                leftSection={<IconFileSpreadsheet size={14} />}
              >
                CSV Table
              </Button>
              <Button
                variant="light"
                color="blue"
                size="xs"
                radius="md"
                onClick={() => handleQuickExport('txt')}
              >
                Plain Text
              </Button>
            </Group>
          </Paper>
        </SimpleGrid>
      </Card>

      {/* Import & Restore */}
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
            <IconUpload size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md">
              Restore & Import Data
            </Text>
            <Text size="xs" c="dimmed">
              Import words or restore a previously downloaded JSON backup file
            </Text>
          </div>
        </Group>

        <Stack gap="md">
          <FileInput
            label="Select Backup or JSON File"
            placeholder="Choose .json file to restore"
            accept=".json"
            value={importFile}
            onChange={setImportFile}
            size="sm"
            radius="md"
          />

          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Radio.Group
              value={importMode}
              onChange={(v) => setImportMode(v as 'merge' | 'overwrite')}
              label="Import Strategy"
              description="Choose whether to merge with existing data or overwrite"
            >
              <Group mt="xs">
                <Radio value="merge" label="Merge (Keep existing words)" color="violet" />
                <Radio value="overwrite" label="Overwrite (Replace duplicates)" color="orange" />
              </Group>
            </Radio.Group>

            <Button
              color="violet"
              size="sm"
              radius="md"
              disabled={!importFile}
              loading={isImporting}
              onClick={handleImportBackup}
              leftSection={<IconUpload size={16} />}
            >
              Start Import
            </Button>
          </Group>

          {importResult && (
            <Alert
              icon={
                importResult.success ? <IconCheck size={16} /> : <IconAlertTriangle size={16} />
              }
              color={importResult.success ? 'teal' : 'red'}
              title={importResult.success ? 'Import Complete' : 'Import Error'}
              radius="md"
            >
              {importResult.message}
            </Alert>
          )}
        </Stack>
      </Card>

      {/* Danger Zone */}
      <Card
        withBorder
        radius="md"
        p={{ base: 'md', sm: 'lg' }}
        style={{
          background: 'rgba(239, 68, 68, 0.03)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}
      >
        <Group gap="sm" mb="md">
          <ThemeIcon size="lg" radius="md" color="red" variant="light">
            <IconAlertTriangle size={20} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="md" c="red">
              Danger Zone & Data Purging
            </Text>
            <Text size="xs" c="dimmed">
              Irreversible maintenance operations to clean logs or reset learning history
            </Text>
          </div>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Paper withBorder p="sm" radius="md">
            <Text size="xs" fw={700}>
              Clear Historical Review Logs
            </Text>
            <Text size="xs" c="dimmed" mt={2} mb="xs">
              Deletes past quiz timeline entries to free space ({reviewLogsCount} logs). Active
              cards remain intact.
            </Text>
            <Button
              variant="light"
              color="orange"
              size="xs"
              radius="md"
              onClick={() => setDangerModal('clearReviewLogs')}
              leftSection={<IconTrash size={12} />}
            >
              Clear Review Logs
            </Button>
          </Paper>

          <Paper withBorder p="sm" radius="md">
            <Text size="xs" fw={700}>
              Clear Missed Words Pool
            </Text>
            <Text size="xs" c="dimmed" mt={2} mb="xs">
              Removes all {missedWords.length} words currently queued in the Missed Words review
              pool.
            </Text>
            <Button
              variant="light"
              color="orange"
              size="xs"
              radius="md"
              onClick={() => setDangerModal('clearMissedWords')}
              leftSection={<IconTrash size={12} />}
            >
              Clear Missed Pool
            </Button>
          </Paper>

          <Paper withBorder p="sm" radius="md">
            <Text size="xs" fw={700}>
              Reset FSRS Memory Progress
            </Text>
            <Text size="xs" c="dimmed" mt={2} mb="xs">
              Resets stability and difficulty vectors for all {fsrsCount} cards back to 'New'.
            </Text>
            <Button
              variant="light"
              color="red"
              size="xs"
              radius="md"
              onClick={() => setDangerModal('resetFsrs')}
              leftSection={<IconRotateClockwise size={12} />}
            >
              Reset FSRS Progress
            </Button>
          </Paper>

          <Paper withBorder p="sm" radius="md">
            <Text size="xs" fw={700} c="red">
              Factory Reset / Wipe All Data
            </Text>
            <Text size="xs" c="dimmed" mt={2} mb="xs">
              Deletes all words, custom groups, review progress, and local databases.
            </Text>
            <Button
              variant="filled"
              color="red"
              size="xs"
              radius="md"
              onClick={() => setDangerModal('factoryReset')}
              leftSection={<IconTrash size={12} />}
            >
              Factory Reset Database
            </Button>
          </Paper>
        </SimpleGrid>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        opened={dangerModal !== null}
        onClose={() => setDangerModal(null)}
        title={
          <Group gap="xs">
            <ThemeIcon color="red" variant="light" size="md">
              <IconAlertTriangle size={18} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Confirm Action
            </Text>
          </Group>
        }
        centered
        radius="md"
      >
        <Stack gap="md">
          <Text size="sm">
            {dangerModal === 'clearReviewLogs' &&
              'Are you sure you want to delete all historical review logs? Active words and spaced repetition stability will NOT be affected.'}
            {dangerModal === 'clearMissedWords' &&
              'Are you sure you want to clear all words from the Missed Words deck?'}
            {dangerModal === 'resetFsrs' &&
              'Are you sure you want to reset all FSRS card histories? Your words will remain, but memory intervals will return to Day 1.'}
            {dangerModal === 'factoryReset' &&
              'CRITICAL: Are you sure you want to delete ALL vocabulary words, groups, and progress? This cannot be undone unless you have an exported JSON backup.'}
          </Text>

          <Group justify="flex-end" gap="xs">
            <Button variant="default" size="xs" onClick={() => setDangerModal(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              size="xs"
              loading={isProcessingDanger}
              onClick={handleExecuteDangerAction}
            >
              Confirm & Execute
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
