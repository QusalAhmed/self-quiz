'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  FileInput,
  Group,
  Paper,
  Progress,
  Radio,
  RollingNumber,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconCloudDownload,
  IconCloudUpload,
  IconDatabase,
  IconDeviceFloppy,
  IconDownload,
  IconFileSpreadsheet,
  IconRefresh,
  IconServer,
  IconUpload,
  IconWifiOff,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useState } from 'react';
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
import {
  exportRemoteDatabase,
  getRemoteTableCounts,
  importRemoteDatabase,
  type RemoteBackup,
  type RemoteExportProgress,
  type RemoteImportProgress,
  type RemoteImportResult,
  type RemoteTableCount,
} from '@/lib/remote-db-operations';

export interface SettingsDataTabProps {
  words: WordRecord[];
  groups: GroupRecord[];
  missedWords: MissedWordRecord[];
  wordFamilies: Record<string, WordFamilyMemberRecord[]>;
  fsrsCount: number;
  reviewLogsCount: number;
  onRefreshData?: () => void;
  onlineStatus?: boolean;
}

export function SettingsDataTab({
  words,
  groups,
  missedWords,
  wordFamilies,
  fsrsCount,
  reviewLogsCount,
  onRefreshData,
  onlineStatus = true,
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

  // Remote DB Export state
  const [isRemoteExporting, setIsRemoteExporting] = useState(false);
  const [remoteExportProgress, setRemoteExportProgress] = useState<RemoteExportProgress | null>(
    null
  );

  // Remote DB Import state
  const [remoteImportFile, setRemoteImportFile] = useState<File | null>(null);
  const [remoteImportMode, setRemoteImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [isRemoteImporting, setIsRemoteImporting] = useState(false);
  const [remoteImportProgress, setRemoteImportProgress] = useState<RemoteImportProgress | null>(
    null
  );
  const [remoteImportResult, setRemoteImportResult] = useState<RemoteImportResult | null>(null);

  // Remote table counts
  const [remoteTableCounts, setRemoteTableCounts] = useState<RemoteTableCount[]>([]);
  const [isLoadingRemoteCounts, setIsLoadingRemoteCounts] = useState(false);

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

  // Fetch remote table counts on mount and when online status changes
  const loadRemoteCounts = useCallback(async () => {
    if (!onlineStatus) {
      return;
    }
    setIsLoadingRemoteCounts(true);
    try {
      const counts = await getRemoteTableCounts();
      setRemoteTableCounts(counts);
    } catch (err) {
      console.error('Failed to load remote table counts:', err);
    } finally {
      setIsLoadingRemoteCounts(false);
    }
  }, [onlineStatus]);

  useEffect(() => {
    void loadRemoteCounts();
  }, [loadRemoteCounts]);

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

  // Remote Database Export
  const handleRemoteExport = async () => {
    setIsRemoteExporting(true);
    setRemoteExportProgress(null);
    try {
      const backup = await exportRemoteDatabase((progress) => {
        setRemoteExportProgress(progress);
      });

      const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute(
        'download',
        `self-quiz-remote-backup-${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Failed to export remote database:', err);
    } finally {
      setIsRemoteExporting(false);
      setRemoteExportProgress(null);
    }
  };

  // Remote Database Import
  const handleRemoteImport = async () => {
    if (!remoteImportFile) {
      return;
    }
    setIsRemoteImporting(true);
    setRemoteImportResult(null);
    setRemoteImportProgress(null);

    try {
      const text = await remoteImportFile.text();
      const parsed = JSON.parse(text);

      // Validate backup format
      if (!parsed.data || typeof parsed.data !== 'object') {
        throw new Error(
          'Invalid backup format: missing data object. Expected a remote or full backup JSON file.'
        );
      }

      const backup: RemoteBackup = {
        version: parsed.version || 2,
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        source: 'supabase_remote',
        appName: parsed.appName || '',
        data: parsed.data,
      };

      const result = await importRemoteDatabase(backup, remoteImportMode, (progress) => {
        setRemoteImportProgress(progress);
      });

      setRemoteImportResult(result);
      setRemoteImportFile(null);
      // Refresh remote counts after import
      void loadRemoteCounts();
    } catch (err: any) {
      setRemoteImportResult({
        success: false,
        message: `Remote import failed: ${err?.message || 'Invalid JSON file format'}`,
        tableCounts: {},
        errors: [err?.message || 'Unknown error'],
      });
    } finally {
      setIsRemoteImporting(false);
      setRemoteImportProgress(null);
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
            <RollingNumber value={Number(storageEstimate.usageMb)} decimalScale={1} /> MB Used /{' '}
            <RollingNumber value={Number(storageEstimate.quotaMb)} decimalScale={1} /> MB Quota
          </Badge>
        </Group>

        <Progress
          value={Math.max(2, storageEstimate.percent)}
          color="indigo"
          size="sm"
          radius="xl"
          mb="md"
        />

        <SimpleGrid cols={{ base: 2, xs: 3, md: 6 }} spacing="xs">
          <Paper withBorder p="xs" radius="md">
            <Text size="xs" c="dimmed">
              Words
            </Text>
            <Text component="div" size="md" fw={700} c="indigo">
              <RollingNumber value={words.length} thousandSeparator />
            </Text>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Text size="xs" c="dimmed">
              Groups
            </Text>
            <Text component="div" size="md" fw={700} c="violet">
              <RollingNumber value={groups.length} thousandSeparator />
            </Text>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Text size="xs" c="dimmed">
              Missed Words
            </Text>
            <Text component="div" size="md" fw={700} c="orange">
              <RollingNumber value={missedWords.length} thousandSeparator />
            </Text>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Text size="xs" c="dimmed">
              FSRS Cards
            </Text>
            <Text component="div" size="md" fw={700} c="teal">
              <RollingNumber value={fsrsCount} thousandSeparator />
            </Text>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Text size="xs" c="dimmed">
              Word Families
            </Text>
            <Text component="div" size="md" fw={700} c="cyan">
              <RollingNumber
                value={Object.values(wordFamilies).reduce((acc, l) => acc + l.length, 0)}
                thousandSeparator
              />
            </Text>
          </Paper>

          <Paper withBorder p="xs" radius="md">
            <Text size="xs" c="dimmed">
              Review Logs
            </Text>
            <Text component="div" size="md" fw={700} c="blue">
              <RollingNumber value={reviewLogsCount} thousandSeparator />
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

      {/* Remote Database (Supabase) Export & Import */}
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
        <Group justify="space-between" align="center" mb="md" wrap="wrap">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" color="grape" variant="light">
              <IconServer size={20} />
            </ThemeIcon>
            <div>
              <Group gap="xs" align="center">
                <Text fw={700} size="md">
                  Remote Database (Supabase)
                </Text>
                <Badge size="sm" variant="dot" color={onlineStatus ? 'teal' : 'red'}>
                  {onlineStatus ? 'Online' : 'Offline'}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                Export from or import to the remote PostgreSQL database directly
              </Text>
            </div>
          </Group>

          <Tooltip label="Refresh remote table counts">
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              loading={isLoadingRemoteCounts}
              disabled={!onlineStatus}
              onClick={() => void loadRemoteCounts()}
              leftSection={<IconRefresh size={14} />}
            >
              Refresh Counts
            </Button>
          </Tooltip>
        </Group>

        {/* Remote Table Counts */}
        {remoteTableCounts.length > 0 && (
          <SimpleGrid cols={{ base: 2, xs: 3, md: 4 }} spacing="xs" mb="md">
            {remoteTableCounts.map((tc) => (
              <Paper withBorder p="xs" radius="md" key={tc.table}>
                <Text size="xs" c="dimmed">
                  {tc.label}
                </Text>
                <Text component="div" size="md" fw={700} c="grape">
                  <RollingNumber value={tc.count} thousandSeparator />
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        )}

        {!onlineStatus && (
          <Alert icon={<IconWifiOff size={16} />} color="red" variant="light" radius="md" mb="md">
            You are currently offline. Remote database operations require an active internet
            connection.
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {/* Remote Export */}
          <Paper
            withBorder
            p="md"
            radius="md"
            style={{
              background: 'rgba(190, 75, 219, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <Text size="sm" fw={700}>
                Export Remote Database
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Download all data directly from the Supabase cloud database as a complete JSON
                backup file.
              </Text>
            </div>

            {remoteExportProgress && (
              <Stack gap={4} mt="sm">
                <Text size="xs" c="dimmed">
                  Fetching {remoteExportProgress.currentTable}... (
                  {remoteExportProgress.completedTables}/{remoteExportProgress.totalTables})
                </Text>
                <Progress
                  value={
                    (remoteExportProgress.completedTables / remoteExportProgress.totalTables) * 100
                  }
                  color="grape"
                  size="sm"
                  radius="xl"
                  animated
                />
              </Stack>
            )}

            <Button
              color="grape"
              size="xs"
              radius="md"
              mt="md"
              loading={isRemoteExporting}
              disabled={!onlineStatus}
              onClick={handleRemoteExport}
              leftSection={<IconCloudDownload size={14} />}
            >
              Export Remote Backup (.JSON)
            </Button>
          </Paper>

          {/* Remote Import */}
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
                Import to Remote Database
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Upload a JSON backup file directly into the Supabase cloud database.
              </Text>
            </div>

            <Stack gap="sm" mt="sm">
              <FileInput
                placeholder="Choose .json backup file"
                accept=".json"
                value={remoteImportFile}
                onChange={setRemoteImportFile}
                size="xs"
                radius="md"
              />

              <Radio.Group
                value={remoteImportMode}
                onChange={(v) => setRemoteImportMode(v as 'merge' | 'overwrite')}
                label="Import Strategy"
              >
                <Group mt={4} wrap="wrap" gap="xs">
                  <Radio value="merge" label="Merge (Keep existing)" color="grape" size="xs" />
                  <Radio
                    value="overwrite"
                    label="Overwrite (Replace all)"
                    color="orange"
                    size="xs"
                  />
                </Group>
              </Radio.Group>

              {remoteImportProgress && (
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    Importing {remoteImportProgress.currentTable}... (
                    {remoteImportProgress.completedTables}/{remoteImportProgress.totalTables}{' '}
                    tables, {remoteImportProgress.currentTableRows}/
                    {remoteImportProgress.currentTableTotal} rows)
                  </Text>
                  <Progress
                    value={
                      remoteImportProgress.totalTables > 0
                        ? ((remoteImportProgress.completedTables +
                            (remoteImportProgress.currentTableTotal > 0
                              ? remoteImportProgress.currentTableRows /
                                remoteImportProgress.currentTableTotal
                              : 0)) /
                            remoteImportProgress.totalTables) *
                          100
                        : 0
                    }
                    color="grape"
                    size="sm"
                    radius="xl"
                    animated
                  />
                </Stack>
              )}

              <Button
                color="grape"
                size="xs"
                radius="md"
                disabled={!remoteImportFile || !onlineStatus}
                loading={isRemoteImporting}
                onClick={handleRemoteImport}
                leftSection={<IconCloudUpload size={14} />}
              >
                Import to Remote
              </Button>
            </Stack>

            {remoteImportResult && (
              <Alert
                icon={
                  remoteImportResult.success ? (
                    <IconCheck size={16} />
                  ) : (
                    <IconAlertTriangle size={16} />
                  )
                }
                color={remoteImportResult.success ? 'teal' : 'red'}
                title={
                  remoteImportResult.success ? 'Remote Import Complete' : 'Remote Import Error'
                }
                radius="md"
                mt="sm"
              >
                <Text size="xs">{remoteImportResult.message}</Text>
                {Object.keys(remoteImportResult.tableCounts).length > 0 && (
                  <Text size="xs" mt={4} c="dimmed">
                    {Object.entries(remoteImportResult.tableCounts)
                      .filter(([, count]) => count > 0)
                      .map(([table, count]) => `${table}: ${count}`)
                      .join(' · ')}
                  </Text>
                )}
                {remoteImportResult.errors.length > 0 && (
                  <Text size="xs" mt={4} c="red">
                    {remoteImportResult.errors.join('; ')}
                  </Text>
                )}
              </Alert>
            )}
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
              <Group mt="xs" wrap="wrap" gap="xs">
                <Radio value="merge" label="Merge (Keep existing)" color="violet" />
                <Radio value="overwrite" label="Overwrite (Replace duplicates)" color="orange" />
              </Group>
            </Radio.Group>

            <Button
              color="violet"
              size="xs"
              radius="md"
              disabled={!importFile}
              loading={isImporting}
              onClick={handleImportBackup}
              leftSection={<IconUpload size={14} />}
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
    </Stack>
  );
}
