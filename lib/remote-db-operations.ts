import { supabase } from '@/lib/supabase';
import { fetchAllSupabaseRows } from '@/lib/supabase-pagination';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RemoteTableName =
  | 'words'
  | 'groups'
  | 'missed_words'
  | 'fsrs_records'
  | 'word_families'
  | 'daily_usage'
  | 'review_logs'
  | 'app_settings'
  | 'quran_verses'
  | 'word_similarities';

export type RemoteBackup = {
  version: 2;
  exportedAt: string;
  source: 'supabase_remote';
  appName: string;
  data: Record<string, unknown[]>;
};

export type RemoteImportMode = 'merge' | 'overwrite';

export type RemoteImportResult = {
  success: boolean;
  message: string;
  tableCounts: Record<string, number>;
  errors: string[];
};

export type RemoteTableCount = {
  table: RemoteTableName;
  label: string;
  count: number;
};

export type RemoteExportProgress = {
  currentTable: string;
  completedTables: number;
  totalTables: number;
};

export type RemoteImportProgress = {
  currentTable: string;
  completedTables: number;
  totalTables: number;
  currentTableRows: number;
  currentTableTotal: number;
};

// ---------------------------------------------------------------------------
// Table Metadata
// ---------------------------------------------------------------------------

const REMOTE_TABLES: Array<{ name: RemoteTableName; label: string }> = [
  { name: 'words', label: 'Dictionary Words' },
  { name: 'groups', label: 'Custom Groups' },
  { name: 'missed_words', label: 'Missed Words' },
  { name: 'fsrs_records', label: 'FSRS Cards' },
  { name: 'word_families', label: 'Word Families' },
  { name: 'daily_usage', label: 'Daily Usage' },
  { name: 'review_logs', label: 'Review Logs' },
  { name: 'app_settings', label: 'App Settings' },
  { name: 'quran_verses', label: 'Quran Verses' },
  { name: 'word_similarities', label: 'Word Similarities' },
];

// ---------------------------------------------------------------------------
// Export from Remote
// ---------------------------------------------------------------------------

/**
 * Fetches ALL data from every Supabase table and returns a complete backup object.
 * Uses pagination to bypass Supabase's 1000-row limit.
 */
export async function exportRemoteDatabase(
  onProgress?: (progress: RemoteExportProgress) => void
): Promise<RemoteBackup> {
  const data: Record<string, unknown[]> = {};

  for (let i = 0; i < REMOTE_TABLES.length; i++) {
    const { name } = REMOTE_TABLES[i];
    onProgress?.({
      currentTable: name,
      completedTables: i,
      totalTables: REMOTE_TABLES.length,
    });

    try {
      const rows = await fetchAllSupabaseRows(name);
      data[name] = rows;
    } catch (err: any) {
      // Table may not exist, have a schema mismatch, or return an empty error object — skip gracefully
      console.warn(
        `[Remote Export] Skipping table '${name}': ${err?.message || err?.code || 'unknown error'}`,
        err
      );
      data[name] = [];
    }
  }

  onProgress?.({
    currentTable: '',
    completedTables: REMOTE_TABLES.length,
    totalTables: REMOTE_TABLES.length,
  });

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    source: 'supabase_remote',
    appName: 'Self Quiz / English Word Memorizer',
    data,
  };
}

// ---------------------------------------------------------------------------
// Import to Remote
// ---------------------------------------------------------------------------

const UPSERT_BATCH_SIZE = 500;

/**
 * Soft-deletes all non-deleted rows in a Supabase table by setting `deleted = true`.
 */
async function softDeleteAllRows(tableName: string): Promise<void> {
  const { error } = await supabase
    .from(tableName)
    .update({ deleted: true, updated_at: new Date().toISOString() })
    .eq('deleted', false);

  if (error) {
    const isTableMissing =
      error.code === 'PGRST205' ||
      error.code === '42P01' ||
      (typeof error.message === 'string' && error.message.includes('Could not find'));
    if (!isTableMissing) {
      throw error;
    }
  }
}

/**
 * Upserts rows into a Supabase table in batches.
 * Returns the number of rows successfully upserted.
 */
async function batchUpsert(
  tableName: string,
  rows: unknown[],
  onBatchComplete?: (completed: number, total: number) => void
): Promise<number> {
  if (!rows || rows.length === 0) {
    return 0;
  }

  let upserted = 0;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
    const { error } = await supabase.from(tableName).upsert(batch as any[], { onConflict: 'id' });

    if (error) {
      const isTableMissing =
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        (typeof error.message === 'string' && error.message.includes('Could not find'));
      if (isTableMissing) {
        return 0;
      }
      throw error;
    }

    upserted += batch.length;
    onBatchComplete?.(upserted, rows.length);
  }

  return upserted;
}

/**
 * Imports a backup JSON object into the remote Supabase database.
 * Supports merge (upsert alongside existing) and overwrite (soft-delete first) modes.
 */
export async function importRemoteDatabase(
  backup: RemoteBackup,
  mode: RemoteImportMode,
  onProgress?: (progress: RemoteImportProgress) => void
): Promise<RemoteImportResult> {
  const tableCounts: Record<string, number> = {};
  const errors: string[] = [];

  // Determine which tables have data in the backup
  const tablesWithData = REMOTE_TABLES.filter(
    (t) =>
      backup.data[t.name] && Array.isArray(backup.data[t.name]) && backup.data[t.name].length > 0
  );

  for (let i = 0; i < tablesWithData.length; i++) {
    const { name } = tablesWithData[i];
    const rows = backup.data[name];

    onProgress?.({
      currentTable: name,
      completedTables: i,
      totalTables: tablesWithData.length,
      currentTableRows: 0,
      currentTableTotal: rows.length,
    });

    try {
      // In overwrite mode, soft-delete all existing rows first
      if (mode === 'overwrite') {
        await softDeleteAllRows(name);
      }

      // Ensure all imported rows are marked as not deleted
      const processedRows = rows.map((row: any) => ({
        ...row,
        deleted: false,
        updated_at: row.updated_at || new Date().toISOString(),
      }));

      const count = await batchUpsert(name, processedRows, (completed, total) => {
        onProgress?.({
          currentTable: name,
          completedTables: i,
          totalTables: tablesWithData.length,
          currentTableRows: completed,
          currentTableTotal: total,
        });
      });

      tableCounts[name] = count;
    } catch (err: any) {
      const msg = `Failed to import ${name}: ${err?.message || 'Unknown error'}`;
      errors.push(msg);
      tableCounts[name] = 0;
    }
  }

  onProgress?.({
    currentTable: '',
    completedTables: tablesWithData.length,
    totalTables: tablesWithData.length,
    currentTableRows: 0,
    currentTableTotal: 0,
  });

  const totalImported = Object.values(tableCounts).reduce((a, b) => a + b, 0);

  return {
    success: errors.length === 0,
    message:
      errors.length === 0
        ? `Successfully imported ${totalImported} records across ${tablesWithData.length} tables.`
        : `Import completed with ${errors.length} error(s). ${totalImported} records imported.`,
    tableCounts,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Remote Table Counts
// ---------------------------------------------------------------------------

/**
 * Fetches approximate row counts for each remote Supabase table.
 * Uses HEAD-style count queries for efficiency.
 */
export async function getRemoteTableCounts(): Promise<RemoteTableCount[]> {
  const results: RemoteTableCount[] = [];

  for (const { name, label } of REMOTE_TABLES) {
    try {
      const { count, error } = await supabase
        .from(name)
        .select('*', { count: 'exact', head: true })
        .eq('deleted', false);

      if (error) {
        results.push({ table: name, label, count: 0 });
        continue;
      }

      results.push({ table: name, label, count: count ?? 0 });
    } catch {
      results.push({ table: name, label, count: 0 });
    }
  }

  return results;
}
