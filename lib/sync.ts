import {
  buildMissedWordId,
  type GroupCollection,
  type GroupRecord,
  type FsrsCollection,
  type FsrsRecord,
  type MissedWordCollection,
  type MissedWordRecord,
  type QuizMode,
  type SrsPracticeCollection,
  type SrsPracticeRecord,
  type SrsCollection,
  type WordCollection,
  type WordRecord,
  type DailyUsageCollection,
  type DailyUsageRecord,
} from './db';
import { definitionsToMeaning, mergeLegacyFlatExamples, normalizeDefinitions } from './definitions';
import { normalizeAiExampleCount } from './examples';
import { buildFsrsId } from './fsrs';
import { getWordGroups } from './groups';
import { buildSrsId, type SrsRecord } from './srs';
import { buildSrsPracticeId } from './srs-practice';

async function handleSyncResponseError(response: Response, actionLabel: string): Promise<void> {
  let errorMessage = response.statusText;
  try {
    const errorData = await response.json();
    if (errorData?.error) {
      errorMessage = errorData.error;
    }
  } catch (e) {}

  const isNetworkFailure =
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('NetworkError') ||
    errorMessage.includes('network') ||
    response.status === 502 ||
    response.status === 503 ||
    response.status === 504;

  const isSchemaMismatch =
    errorMessage.includes('schema cache') ||
    errorMessage.includes('does not exist') ||
    errorMessage.includes('column') ||
    errorMessage.includes('relation');

  if (isNetworkFailure) {
    console.warn(
      `Sync notice: Remote endpoint temporarily unreachable during ${actionLabel} (${errorMessage}). Record queued to local outbox for automatic sync.`
    );
  } else if (isSchemaMismatch) {
    console.warn(
      `Supabase sync warning: Remote database schema is not updated. ` +
        `Please run the SQL statements from 'scripts/setup-supabase.sql' or the relevant migrate script in your Supabase SQL Editor. ` +
        `Detail: ${errorMessage}`
    );
  } else {
    console.error(`Failed to ${actionLabel}:`, errorMessage);
  }
}

function toWritableWord(record: any): WordRecord {
  const definitions = mergeLegacyFlatExamples(
    normalizeDefinitions(record.definitions, record.meaning ?? ''),
    record.examples,
    record.userExamples
  );
  return {
    ...record,
    meaning: definitionsToMeaning(definitions),
    definitions,
    customGroups: getWordGroups(record),
    aiExampleCount: normalizeAiExampleCount(record.aiExampleCount ?? record.ai_example_count),
  };
}

export type RemoteWordRow = {
  id: string;
  word: string;
  meaning: string;
  definitions?: unknown[] | null;
  examples?: string[] | null;
  user_examples?: string[] | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  custom_group?: string | null;
  custom_groups?: string[] | null;
  ai_example_count?: number | null;
  notes?: string | null;
};

export type RemoteGroupRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
};

export type RemoteMissedWordRow = {
  id: string;
  word_id: string;
  quiz_mode?: string | null;
  word: string;
  meaning: string;
  missed_at: string;
  missed_count: number;
  updated_at: string;
  deleted: boolean;
};

function mapRowToRecord(row: RemoteWordRow): WordRecord {
  const fromArray = Array.isArray(row.custom_groups)
    ? row.custom_groups.filter((g) => typeof g === 'string' && g.trim().length > 0)
    : [];
  const legacyGroup = row.custom_group?.trim() || '';
  const customGroups = fromArray.length > 0 ? fromArray : legacyGroup ? [legacyGroup] : [];
  const definitions = mergeLegacyFlatExamples(
    normalizeDefinitions(row.definitions, row.meaning ?? ''),
    row.examples,
    row.user_examples
  );

  return {
    id: row.id,
    word: row.word,
    meaning: definitionsToMeaning(definitions),
    definitions,
    aiExampleCount: normalizeAiExampleCount(row.ai_example_count),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDeleted: row.deleted,
    lastSyncedAt: row.updated_at,
    customGroups: Array.from(new Set(customGroups)),
    notes: row.notes || '',
  };
}

function mapGroupRowToRecord(row: RemoteGroupRow): GroupRecord {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDeleted: row.deleted,
    lastSyncedAt: row.updated_at,
  };
}

function mapMissedRowToRecord(row: RemoteMissedWordRow): MissedWordRecord {
  const quizMode = (row.quiz_mode || 'wordToMeaning') as QuizMode;
  const wordId = row.word_id;
  const id = row.id.includes(':') ? row.id : buildMissedWordId(wordId, quizMode);
  return {
    id,
    wordId,
    quizMode,
    word: row.word,
    meaning: row.meaning,
    missedAt: row.missed_at,
    missedCount: row.missed_count,
    updatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    isDeleted: row.deleted,
  };
}

/**
 * Check if device is currently online
 */
function isOnline(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

function hasPendingLocalSync(record: { lastSyncedAt: string; updatedAt: string }): boolean {
  return !record.lastSyncedAt || record.lastSyncedAt < record.updatedAt;
}

// ---------------------------------------------------------------------------
// Missed Word outbox (localStorage)
// ---------------------------------------------------------------------------

const MISSED_WORD_OUTBOX_KEY = 'self_quiz_missed_word_outbox';

type MissedWordSyncPayload = {
  id: string;
  word_id: string;
  quiz_mode: string;
  word: string;
  meaning: string;
  missed_at: string;
  missed_count: number;
  updated_at: string;
  deleted: boolean;
};

function missedRecordToPayload(record: MissedWordRecord): MissedWordSyncPayload {
  return {
    id: record.id,
    word_id: record.wordId,
    quiz_mode: record.quizMode,
    word: record.word,
    meaning: record.meaning,
    missed_at: record.missedAt,
    missed_count: record.missedCount,
    updated_at: record.updatedAt,
    deleted: record.isDeleted,
  };
}

function readMissedWordOutbox(): MissedWordSyncPayload[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(MISSED_WORD_OUTBOX_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMissedWordOutbox(items: MissedWordSyncPayload[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(MISSED_WORD_OUTBOX_KEY, JSON.stringify(items));
}

function enqueueMissedWordOutbox(record: MissedWordRecord): void {
  const payload = missedRecordToPayload(record);
  const outbox = readMissedWordOutbox().filter((item) => item.id !== payload.id);
  outbox.push(payload);
  writeMissedWordOutbox(outbox);
}

function removeFromMissedWordOutbox(id: string): void {
  writeMissedWordOutbox(readMissedWordOutbox().filter((item) => item.id !== id));
}

// ---------------------------------------------------------------------------
// SRS practice outbox (localStorage)
// ---------------------------------------------------------------------------

const SRS_PRACTICE_OUTBOX_KEY = 'self_quiz_srs_practice_outbox';

type SrsPracticeSyncPayload = {
  id: string;
  word_id: string;
  quiz_mode: string;
  word: string;
  meaning: string;
  difficulty: string;
  practiced_at: string;
  updated_at: string;
  deleted: boolean;
};

function srsPracticeRecordToPayload(record: SrsPracticeRecord): SrsPracticeSyncPayload {
  return {
    id: record.id,
    word_id: record.wordId,
    quiz_mode: record.quizMode,
    word: record.word,
    meaning: record.meaning,
    difficulty: record.difficulty,
    practiced_at: record.practicedAt,
    updated_at: record.updatedAt,
    deleted: record.isDeleted,
  };
}

function readSrsPracticeOutbox(): SrsPracticeSyncPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SRS_PRACTICE_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSrsPracticeOutbox(items: SrsPracticeSyncPayload[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SRS_PRACTICE_OUTBOX_KEY, JSON.stringify(items));
}

function enqueueSrsPracticeOutbox(record: SrsPracticeRecord): void {
  const payload = srsPracticeRecordToPayload(record);
  const outbox = readSrsPracticeOutbox().filter((item) => item.id !== payload.id);
  outbox.push(payload);
  writeSrsPracticeOutbox(outbox);
}

function removeFromSrsPracticeOutbox(id: string): void {
  writeSrsPracticeOutbox(readSrsPracticeOutbox().filter((item) => item.id !== id));
}

export async function flushSrsPracticeOutbox(collection: SrsPracticeCollection): Promise<void> {
  if (!isOnline()) return;

  const outbox = readSrsPracticeOutbox();
  if (outbox.length === 0) return;

  console.log(`Flushing ${outbox.length} SRS practice record(s) from outbox...`);
  const failed: SrsPracticeSyncPayload[] = [];

  for (const payload of outbox) {
    try {
      const response = await fetch('/api/srs-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        failed.push(payload);
        continue;
      }

      removeFromSrsPracticeOutbox(payload.id);
      const existing = await collection.findOne(payload.id).exec();
      if (existing) {
        await collection.upsert({
          ...existing.toJSON(),
          lastSyncedAt: payload.updated_at,
        });
      }
    } catch {
      failed.push(payload);
    }
  }

  if (failed.length > 0) {
    writeSrsPracticeOutbox(failed);
    console.warn(`${failed.length} SRS practice record(s) remain in outbox after flush`);
  }
}

// ---------------------------------------------------------------------------
// FSRS outbox (localStorage)
// ---------------------------------------------------------------------------

const FSRS_OUTBOX_KEY = 'self_quiz_fsrs_outbox';

type FsrsSyncPayload = {
  id: string;
  word_id: string;
  quiz_mode: string;
  word: string;
  meaning: string;
  due_at: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: string;
  last_reviewed_at: string;
  updated_at: string;
  deleted: boolean;
};

function fsrsRecordToPayload(record: FsrsRecord): FsrsSyncPayload {
  const lastReviewedAt =
    record.lastReviewedAt || record.dueAt || record.updatedAt || new Date().toISOString();
  return {
    id: record.id,
    word_id: record.wordId,
    quiz_mode: record.quizMode,
    word: record.word,
    meaning: record.meaning,
    due_at: record.dueAt,
    stability: record.stability,
    difficulty: record.difficulty,
    elapsed_days: record.elapsedDays,
    scheduled_days: record.scheduledDays,
    learning_steps: record.learningSteps,
    reps: record.reps,
    lapses: record.lapses,
    state: record.state,
    last_reviewed_at: lastReviewedAt,
    updated_at: record.updatedAt,
    deleted: record.isDeleted,
  };
}

function readFsrsOutbox(): FsrsSyncPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FSRS_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFsrsOutbox(items: FsrsSyncPayload[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FSRS_OUTBOX_KEY, JSON.stringify(items));
}

function enqueueFsrsOutbox(record: FsrsRecord): void {
  const payload = fsrsRecordToPayload(record);
  const outbox = readFsrsOutbox().filter((item) => item.id !== payload.id);
  outbox.push(payload);
  writeFsrsOutbox(outbox);
}

function removeFromFsrsOutbox(id: string): void {
  writeFsrsOutbox(readFsrsOutbox().filter((item) => item.id !== id));
}

export async function flushFsrsOutbox(collection: FsrsCollection): Promise<void> {
  if (!isOnline()) return;

  const outbox = readFsrsOutbox();
  if (outbox.length === 0) return;

  console.log(`Flushing ${outbox.length} FSRS record(s) from outbox...`);
  const failed: FsrsSyncPayload[] = [];

  for (const payload of outbox) {
    try {
      const response = await fetch('/api/fsrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        failed.push(payload);
        continue;
      }

      removeFromFsrsOutbox(payload.id);
      const existing = await collection.findOne(payload.id).exec();
      if (existing) {
        await collection.upsert({
          ...existing.toJSON(),
          lastSyncedAt: payload.updated_at,
        });
      }
    } catch {
      failed.push(payload);
    }
  }

  if (failed.length > 0) {
    writeFsrsOutbox(failed);
    console.warn(`${failed.length} FSRS record(s) remain in outbox after flush`);
  }
}

export async function flushMissedWordOutbox(collection: MissedWordCollection): Promise<void> {
  if (!isOnline()) {
    return;
  }

  const outbox = readMissedWordOutbox();
  if (outbox.length === 0) {
    return;
  }

  console.log(`Flushing ${outbox.length} missed word(s) from outbox...`);
  const failed: MissedWordSyncPayload[] = [];
  for (const payload of outbox) {
    try {
      const response = await fetch('/api/missed-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        failed.push(payload);
        continue;
      }

      removeFromMissedWordOutbox(payload.id);
      const existing = await collection.findOne(payload.id).exec();
      if (existing) {
        await collection.upsert({
          ...existing.toJSON(),
          lastSyncedAt: payload.updated_at,
        });
      }
    } catch {
      failed.push(payload);
    }
  }

  if (failed.length > 0) {
    writeMissedWordOutbox(failed);
    console.warn(`${failed.length} missed word(s) remain in outbox after flush`);
  }
}

// ---------------------------------------------------------------------------
// Word outbox (localStorage)
// ---------------------------------------------------------------------------

const WORD_OUTBOX_KEY = 'self_quiz_word_outbox';

type WordSyncPayload = {
  id: string;
  word: string;
  meaning: string;
  definitions: unknown[];
  examples: string[];
  user_examples: string[];
  created_at: string;
  updated_at: string;
  deleted: boolean;
  custom_groups: string[];
  custom_group: string;
  ai_example_count: number;
  notes?: string;
};

function wordRecordToPayload(record: WordRecord): WordSyncPayload {
  const groups = getWordGroups(record);
  const definitions = normalizeDefinitions(record.definitions, record.meaning);
  return {
    id: record.id,
    word: record.word,
    meaning: definitionsToMeaning(definitions),
    definitions,
    // Example sentences now live inside each definition; these flat columns are kept
    // empty for backward compatibility with the remote schema.
    examples: [],
    user_examples: [],
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    deleted: record.isDeleted,
    custom_groups: groups,
    custom_group: groups[0] || '',
    ai_example_count: normalizeAiExampleCount(record.aiExampleCount),
    notes: record.notes || '',
  };
}

function readWordOutbox(): WordSyncPayload[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(WORD_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWordOutbox(items: WordSyncPayload[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WORD_OUTBOX_KEY, JSON.stringify(items));
}

function enqueueWordOutbox(record: WordRecord): void {
  const payload = wordRecordToPayload(record);
  const outbox = readWordOutbox().filter((item) => item.id !== payload.id);
  outbox.push(payload);
  writeWordOutbox(outbox);
}

function removeFromWordOutbox(id: string): void {
  writeWordOutbox(readWordOutbox().filter((item) => item.id !== id));
}

export async function flushWordOutbox(collection: WordCollection): Promise<void> {
  if (!isOnline()) return;

  const outbox = readWordOutbox();
  if (outbox.length === 0) return;

  console.log(`Flushing ${outbox.length} word(s) from outbox...`);
  const failed: WordSyncPayload[] = [];

  for (const payload of outbox) {
    try {
      const response = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        await handleSyncResponseError(response, 'flush word outbox');
        failed.push(payload);
        continue;
      }

      removeFromWordOutbox(payload.id);
      const existing = await collection.findOne(payload.id).exec();
      if (existing) {
        await collection.upsert({
          ...toWritableWord(existing.toJSON()),
          lastSyncedAt: payload.updated_at,
        });
      }
    } catch {
      failed.push(payload);
    }
  }

  if (failed.length > 0) {
    writeWordOutbox(failed);
    console.warn(`${failed.length} word(s) remain in word outbox after flush`);
  }
}

// ---------------------------------------------------------------------------
// Group outbox (localStorage)
// ---------------------------------------------------------------------------

const GROUP_OUTBOX_KEY = 'self_quiz_group_outbox';

type GroupSyncPayload = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
};

function groupRecordToPayload(record: GroupRecord): GroupSyncPayload {
  return {
    id: record.id,
    name: record.name,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    deleted: record.isDeleted,
  };
}

function readGroupOutbox(): GroupSyncPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GROUP_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGroupOutbox(items: GroupSyncPayload[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GROUP_OUTBOX_KEY, JSON.stringify(items));
}

function enqueueGroupOutbox(record: GroupRecord): void {
  const payload = groupRecordToPayload(record);
  const outbox = readGroupOutbox().filter((item) => item.id !== payload.id);
  outbox.push(payload);
  writeGroupOutbox(outbox);
}

function removeFromGroupOutbox(id: string): void {
  writeGroupOutbox(readGroupOutbox().filter((item) => item.id !== id));
}

export async function flushGroupOutbox(collection: GroupCollection): Promise<void> {
  if (!isOnline()) return;

  const outbox = readGroupOutbox();
  if (outbox.length === 0) return;

  console.log(`Flushing ${outbox.length} group(s) from outbox...`);
  const failed: GroupSyncPayload[] = [];

  for (const payload of outbox) {
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        await handleSyncResponseError(response, 'flush group outbox');
        failed.push(payload);
        continue;
      }

      removeFromGroupOutbox(payload.id);
      const existing = await collection.findOne(payload.id).exec();
      if (existing) {
        await collection.upsert({
          ...existing.toJSON(),
          lastSyncedAt: payload.updated_at,
        });
      }
    } catch {
      failed.push(payload);
    }
  }

  if (failed.length > 0) {
    writeGroupOutbox(failed);
    console.warn(`${failed.length} group(s) remain in group outbox after flush`);
  }
}

// ---------------------------------------------------------------------------
// Daily Usage outbox (localStorage)
// ---------------------------------------------------------------------------

const DAILY_USAGE_OUTBOX_KEY = 'self_quiz_daily_usage_outbox';

type DailyUsageSyncPayload = {
  id: string;
  date: string;
  device_id: string;
  seconds: number;
  updated_at: string;
  deleted: boolean;
};

function dailyUsageRecordToPayload(record: DailyUsageRecord): DailyUsageSyncPayload {
  return {
    id: record.id,
    date: record.date,
    device_id: record.deviceId,
    seconds: record.seconds,
    updated_at: record.updatedAt,
    deleted: record.isDeleted,
  };
}

function readDailyUsageOutbox(): DailyUsageSyncPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DAILY_USAGE_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDailyUsageOutbox(items: DailyUsageSyncPayload[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DAILY_USAGE_OUTBOX_KEY, JSON.stringify(items));
}

function enqueueDailyUsageOutbox(record: DailyUsageRecord): void {
  const payload = dailyUsageRecordToPayload(record);
  const outbox = readDailyUsageOutbox().filter((item) => item.id !== payload.id);
  outbox.push(payload);
  writeDailyUsageOutbox(outbox);
}

function removeFromDailyUsageOutbox(id: string): void {
  writeDailyUsageOutbox(readDailyUsageOutbox().filter((item) => item.id !== id));
}

export async function flushDailyUsageOutbox(collection: DailyUsageCollection): Promise<void> {
  if (!isOnline()) return;

  const outbox = readDailyUsageOutbox();
  if (outbox.length === 0) return;

  console.log(`Flushing ${outbox.length} daily usage record(s) from outbox...`);
  const failed: DailyUsageSyncPayload[] = [];

  for (const payload of outbox) {
    try {
      const response = await fetch('/api/daily-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        await handleSyncResponseError(response, 'flush daily usage outbox');
        failed.push(payload);
        continue;
      }

      removeFromDailyUsageOutbox(payload.id);
      const existing = await collection.findOne(payload.id).exec();
      if (existing) {
        await collection.upsert({
          ...existing.toJSON(),
          lastSyncedAt: payload.updated_at,
        });
      }
    } catch {
      failed.push(payload);
    }
  }

  if (failed.length > 0) {
    writeDailyUsageOutbox(failed);
    console.warn(`${failed.length} daily usage record(s) remain in outbox after flush`);
  }
}

export type RemoteDailyUsageRow = {
  id: string;
  date: string;
  device_id: string;
  seconds: number;
  updated_at: string;
  deleted: boolean;
};

function mapDailyUsageRowToRecord(row: RemoteDailyUsageRow): DailyUsageRecord {
  return {
    id: row.id,
    date: row.date,
    deviceId: row.device_id,
    seconds: row.seconds,
    updatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    isDeleted: row.deleted,
  };
}

export async function pullRemoteDailyUsage(collection: DailyUsageCollection): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, skipping daily usage pull from remote');
    return;
  }

  try {
    console.log('Pulling daily usage from Supabase...');
    const response = await fetch(`/api/daily-usage?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    if (!response.ok) {
      await handleSyncResponseError(response, 'pull remote daily usage');
      return;
    }

    const { data } = await response.json();
    if (!data || !Array.isArray(data)) {
      console.log('No daily usage records to pull');
      return;
    }

    console.log('Successfully pulled', data.length, 'daily usage record(s) from remote');
    for (const row of data as RemoteDailyUsageRow[]) {
      const mapped = mapDailyUsageRowToRecord(row);
      const local = await collection.findOne(mapped.id).exec();
      if (local) {
        const localRecord = local.toJSON();

        if (mapped.isDeleted && !localRecord.isDeleted) {
          await collection.upsert(mapped);
          continue;
        }

        // For daily usage, take the MAX seconds between local and remote
        // to avoid losing study time from any device
        if (localRecord.updatedAt >= mapped.updatedAt) {
          // Local is same version or newer — keep local but merge if remote has more seconds
          if (!mapped.isDeleted && mapped.seconds > localRecord.seconds) {
            await collection.upsert({
              ...localRecord,
              seconds: mapped.seconds,
              updatedAt: mapped.updatedAt,
              lastSyncedAt: mapped.updatedAt,
            });
          }
          continue;
        }

        // Remote is strictly newer
        await collection.upsert(mapped);
      } else {
        await collection.upsert(mapped);
      }
    }
  } catch (error) {
    console.error('Error pulling daily usage:', error);
  }
}

export async function pushDailyUsageToRemote(
  collection: DailyUsageCollection,
  record: DailyUsageRecord
): Promise<void> {
  if (!isOnline()) {
    enqueueDailyUsageOutbox(record);
    console.log('Device is offline, daily usage queued to outbox. Will sync when online.');
    return;
  }

  try {
    const payload = dailyUsageRecordToPayload(record);

    const response = await fetch('/api/daily-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      enqueueDailyUsageOutbox(record);
      await handleSyncResponseError(response, 'push daily usage to remote');
      return;
    }

    removeFromDailyUsageOutbox(record.id);
    await collection.upsert({
      ...record,
      lastSyncedAt: record.updatedAt,
    });
    console.log('Successfully synced daily usage to remote:', record.id);
  } catch (error) {
    enqueueDailyUsageOutbox(record);
    console.warn('Network notice: Error pushing daily usage to remote (record queued to outbox):', error);
  }
}

export async function pushAllLocalDailyUsage(collection: DailyUsageCollection): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, skipping daily usage push. Will sync when online.');
    return;
  }

  try {
    await flushDailyUsageOutbox(collection);

    const localRecords = await collection.find().exec();
    let syncedCount = 0;

    for (const doc of localRecords) {
      const record = doc.toJSON();
      if (hasPendingLocalSync(record)) {
        await pushDailyUsageToRemote(collection, record as DailyUsageRecord);
        syncedCount++;
      }
    }

    if (syncedCount > 0) {
      console.log('Synced', syncedCount, 'daily usage record(s) to remote');
    }
  } catch (error) {
    console.error('Error pushing all local daily usage:', error);
  }
}

export async function pullRemoteWords(collection: WordCollection): Promise<void> {
  // Skip if offline
  if (!isOnline()) {
    console.log('Device is offline, skipping pull from remote');
    return;
  }

  try {
    console.log('Pulling remote words from Supabase...');
    const response = await fetch(`/api/words?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    if (!response.ok) {
      await handleSyncResponseError(response, 'pull remote words');
      return;
    }

    const { data } = await response.json();
    if (!data || !Array.isArray(data)) {
      console.log('No remote words to pull');
      return;
    }

    console.log('Successfully pulled', data.length, 'words from remote');
    const localDocs = await collection.find().exec();
    const localMap = new Map(localDocs.map((doc) => [doc.id, doc.toJSON()]));
    const toUpsertMap = new Map<string, WordRecord>();

    for (const row of data as RemoteWordRow[]) {
      const mapped = mapRowToRecord(row);
      const localRecord = localMap.get(mapped.id);

      if (localRecord) {
        if (mapped.isDeleted && !localRecord.isDeleted) {
          toUpsertMap.set(mapped.id, mapped);
          continue;
        }
        if (hasPendingLocalSync(localRecord) && localRecord.updatedAt > mapped.updatedAt) {
          continue;
        }
        if (localRecord.updatedAt >= mapped.updatedAt) {
          continue;
        }
      }
      toUpsertMap.set(mapped.id, mapped);
    }

    const toUpsert = Array.from(toUpsertMap.values());
    if (toUpsert.length > 0) {
      await collection.bulkUpsert(toUpsert);
      console.log(`Bulk synced ${toUpsert.length} words from remote`);
    }
  } catch (error) {
    console.error('Error pulling remote words:', error);
  }
}

export async function pullRemoteMissedWords(collection: MissedWordCollection): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, skipping missed words pull from remote');
    return;
  }

  try {
    console.log('Pulling missed words from Supabase...');
    const response = await fetch(`/api/missed-words?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    if (!response.ok) {
      await handleSyncResponseError(response, 'pull missed words');
      return;
    }

    const { data } = await response.json();
    if (!data || !Array.isArray(data)) {
      console.log('No missed words to pull');
      return;
    }

    console.log('Successfully pulled', data.length, 'missed words from remote');
    const localDocs = await collection.find().exec();
    const localMap = new Map(localDocs.map((doc) => [doc.id, doc.toJSON()]));
    const toUpsertMap = new Map<string, MissedWordRecord>();

    for (const row of data as RemoteMissedWordRow[]) {
      const mapped = mapMissedRowToRecord(row);
      const localRecord = localMap.get(mapped.id);

      if (localRecord) {
        if (mapped.isDeleted && !localRecord.isDeleted) {
          toUpsertMap.set(mapped.id, mapped);
          continue;
        }
        if (hasPendingLocalSync(localRecord) && localRecord.updatedAt > mapped.updatedAt) {
          continue;
        }
        if (localRecord.updatedAt >= mapped.updatedAt) {
          continue;
        }
      }
      toUpsertMap.set(mapped.id, mapped);
    }

    const toUpsert = Array.from(toUpsertMap.values());
    if (toUpsert.length > 0) {
      await collection.bulkUpsert(toUpsert);
      console.log(`Bulk synced ${toUpsert.length} missed words from remote`);
    }
  } catch (error) {
    console.error('Error pulling missed words:', error);
  }
}

export async function pullRemoteGroups(collection: GroupCollection): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, skipping groups pull from remote');
    return;
  }

  try {
    console.log('Pulling groups from Supabase...');
    const response = await fetch(`/api/groups?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    if (!response.ok) {
      await handleSyncResponseError(response, 'pull remote groups');
      return;
    }

    const { data } = await response.json();
    if (!data || !Array.isArray(data)) {
      console.log('No remote groups to pull');
      return;
    }

    console.log('Successfully pulled', data.length, 'groups from remote');
    const localDocs = await collection.find().exec();
    const localMap = new Map(localDocs.map((doc) => [doc.id, doc.toJSON()]));
    const toUpsertMap = new Map<string, GroupRecord>();

    for (const row of data as RemoteGroupRow[]) {
      const mapped = mapGroupRowToRecord(row);
      const localRecord = localMap.get(mapped.id);

      if (localRecord) {
        if (mapped.isDeleted && !localRecord.isDeleted) {
          toUpsertMap.set(mapped.id, mapped);
          continue;
        }
        if (hasPendingLocalSync(localRecord) && localRecord.updatedAt > mapped.updatedAt) {
          continue;
        }
        if (localRecord.updatedAt >= mapped.updatedAt) {
          continue;
        }
      }
      toUpsertMap.set(mapped.id, mapped);
    }

    const toUpsert = Array.from(toUpsertMap.values());
    if (toUpsert.length > 0) {
      await collection.bulkUpsert(toUpsert);
      console.log(`Bulk synced ${toUpsert.length} groups from remote`);
    }
  } catch (error) {
    console.error('Error pulling remote groups:', error);
  }
}

// ---------------------------------------------------------------------------
// Push to remote (single record)
// ---------------------------------------------------------------------------

export async function pushWordToRemote(
  collection: WordCollection,
  record: WordRecord
): Promise<void> {
  // Offline: save to outbox, will be flushed when online
  if (!isOnline()) {
    enqueueWordOutbox(record);
    console.log('Device is offline, word queued to outbox. Will sync when online:', record.word);
    return;
  }

  try {
    const payload = wordRecordToPayload(record);

    console.log('Pushing word to remote:', record.word);
    const response = await fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // On failure, enqueue so it can be retried later
      enqueueWordOutbox(record);
      await handleSyncResponseError(response, 'push word to remote');
      return;
    }

    // Remove from outbox if it was queued previously
    removeFromWordOutbox(record.id);
    await collection.upsert({
      ...record,
      lastSyncedAt: new Date().toISOString(),
    });
    console.log('Successfully synced word to remote:', record.word);
  } catch (error) {
    enqueueWordOutbox(record);
    console.error('Error pushing word to remote:', error);
  }
}

export async function pushMissedWordToRemote(
  collection: MissedWordCollection,
  record: MissedWordRecord
): Promise<void> {
  if (!isOnline()) {
    enqueueMissedWordOutbox(record);
    console.log(
      'Device is offline, missed word queued to outbox. Will sync when online:',
      record.word
    );
    return;
  }

  try {
    const payload = missedRecordToPayload(record);

    console.log('Pushing missed word to remote:', record.word);
    const response = await fetch('/api/missed-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      enqueueMissedWordOutbox(record);
      await handleSyncResponseError(response, 'push missed word to remote');
      return;
    }

    removeFromMissedWordOutbox(record.id);
    await collection.upsert({
      ...record,
      lastSyncedAt: record.updatedAt,
    });
  } catch (error) {
    enqueueMissedWordOutbox(record);
    console.error('Error pushing missed word to remote:', error);
  }
}

export async function pushGroupToRemote(
  collection: GroupCollection,
  record: GroupRecord
): Promise<void> {
  if (!isOnline()) {
    enqueueGroupOutbox(record);
    console.log('Device is offline, group queued to outbox. Will sync when online:', record.name);
    return;
  }

  try {
    const payload = groupRecordToPayload(record);

    console.log('Pushing group to remote:', record.name);
    const response = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      enqueueGroupOutbox(record);
      await handleSyncResponseError(response, 'push group to remote');
      return;
    }

    removeFromGroupOutbox(record.id);
    await collection.upsert({
      ...record,
      lastSyncedAt: new Date().toISOString(),
    });
    console.log('Successfully synced group to remote:', record.name);
  } catch (error) {
    enqueueGroupOutbox(record);
    console.error('Error pushing group to remote:', error);
  }
}

// ---------------------------------------------------------------------------
// Push all pending local records to remote
// ---------------------------------------------------------------------------

export async function pushAllLocalGroups(collection: GroupCollection): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, skipping groups push to remote. Will sync when online.');
    return;
  }

  try {
    console.log('Pushing all local groups to remote...');
    const localGroups = await collection.find().exec();
    let syncedCount = 0;

    for (const group of localGroups) {
      const record = group.toJSON();
      if (hasPendingLocalSync(record)) {
        await pushGroupToRemote(collection, record);
        syncedCount++;
      }
    }

    console.log('Synced', syncedCount, 'groups to remote');
  } catch (error) {
    console.error('Error pushing all local groups:', error);
  }
}

export async function pushAllLocalWords(collection: WordCollection): Promise<void> {
  // Skip if offline
  if (!isOnline()) {
    console.log('Device is offline, skipping push to remote. Will sync when online.');
    return;
  }

  try {
    console.log('Pushing all local words to remote...');
    const localWords = await collection.find().exec();
    let syncedCount = 0;

    for (const word of localWords) {
      const record = toWritableWord(word.toJSON());
      if (hasPendingLocalSync(record)) {
        await pushWordToRemote(collection, record);
        syncedCount++;
      }
    }

    console.log('Synced', syncedCount, 'words to remote');
  } catch (error) {
    console.error('Error pushing all local words:', error);
  }
}

export async function pushAllLocalMissedWords(collection: MissedWordCollection): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, skipping missed words push to remote. Will sync when online.');
    return;
  }

  try {
    await flushMissedWordOutbox(collection);

    console.log('Pushing all missed words to remote...');
    const localWords = await collection.find().exec();
    let syncedCount = 0;

    for (const word of localWords) {
      const record = word.toJSON();
      if (hasPendingLocalSync(record)) {
        await pushMissedWordToRemote(collection, record);
        syncedCount++;
      }
    }

    console.log('Synced', syncedCount, 'missed words to remote');
  } catch (error) {
    console.error('Error pushing all missed words:', error);
  }
}

// ---------------------------------------------------------------------------
// SRS outbox (localStorage)
// ---------------------------------------------------------------------------

const SRS_OUTBOX_KEY = 'self_quiz_srs_outbox';

type SrsSyncPayload = {
  id: string;
  word_id: string;
  quiz_mode: string;
  word: string;
  meaning: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_at: string;
  last_reviewed_at: string;
  updated_at: string;
  deleted: boolean;
};

function srsRecordToPayload(record: SrsRecord): SrsSyncPayload {
  return {
    id: record.id,
    word_id: record.wordId,
    quiz_mode: record.quizMode,
    word: record.word,
    meaning: record.meaning,
    ease_factor: record.easeFactor,
    interval: record.interval,
    repetitions: record.repetitions,
    next_review_at: record.nextReviewAt,
    last_reviewed_at: record.lastReviewedAt,
    updated_at: record.updatedAt,
    deleted: record.isDeleted,
  };
}

function readSrsOutbox(): SrsSyncPayload[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SRS_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSrsOutbox(items: SrsSyncPayload[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SRS_OUTBOX_KEY, JSON.stringify(items));
}

function enqueueSrsOutbox(record: SrsRecord): void {
  const payload = srsRecordToPayload(record);
  const outbox = readSrsOutbox().filter((item) => item.id !== payload.id);
  outbox.push(payload);
  writeSrsOutbox(outbox);
}

function removeFromSrsOutbox(id: string): void {
  writeSrsOutbox(readSrsOutbox().filter((item) => item.id !== id));
}

export async function flushSrsOutbox(collection: SrsCollection): Promise<void> {
  if (!isOnline()) return;

  const outbox = readSrsOutbox();
  if (outbox.length === 0) return;

  console.log(`Flushing ${outbox.length} SRS record(s) from outbox...`);
  const failed: SrsSyncPayload[] = [];

  for (const payload of outbox) {
    try {
      const response = await fetch('/api/srs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        failed.push(payload);
        continue;
      }

      removeFromSrsOutbox(payload.id);
      const existing = await collection.findOne(payload.id).exec();
      if (existing) {
        await collection.upsert({
          ...existing.toJSON(),
          lastSyncedAt: payload.updated_at,
        });
      }
    } catch {
      failed.push(payload);
    }
  }

  if (failed.length > 0) {
    writeSrsOutbox(failed);
    console.warn(`${failed.length} SRS record(s) remain in outbox after flush`);
  }
}

/**
 * Fetch missing meanings for words that don't have them yet
 */
export async function fetchMissingMeanings(collection: WordCollection): Promise<void> {
  // Skip if offline
  if (!isOnline()) {
    console.log('Device is offline, skipping meaning fetch');
    return;
  }

  try {
    console.log('Fetching missing meanings for words...');
    const allWords = await collection.find().exec();
    let fetchedCount = 0;

    for (const doc of allWords) {
      const record = toWritableWord(doc.toJSON());
      // Skip if word has definitions or is deleted
      if (normalizeDefinitions(record.definitions, record.meaning).length > 0) {
        continue;
      }
      if (record.isDeleted) {
        continue;
      }

      try {
        const response = await fetch('/api/meaning', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: record.word }),
        });

        if (!response.ok) {
          console.warn('Failed to fetch meaning for:', record.word);
          continue;
        }

        const data = await response.json();
        const definitions = normalizeDefinitions(data?.definitions, String(data?.meaning ?? ''));
        const meaning = definitionsToMeaning(definitions);

        if (!meaning) {
          console.warn('No meaning returned for:', record.word);
          continue;
        }

        // Update word with the fetched meaning
        const updated = {
          ...record,
          meaning,
          definitions,
          updatedAt: new Date().toISOString(),
        };

        await collection.upsert(updated);
        await pushWordToRemote(collection, updated);
        fetchedCount++;
        console.log('Fetched meaning for:', record.word);
      } catch (error) {
        console.error('Error fetching meaning for word:', record.word, error);
      }
    }

    console.log('Completed fetching', fetchedCount, 'missing meanings');
  } catch (error) {
    console.error('Error fetching missing meanings:', error);
  }
}

// ---------------------------------------------------------------------------
// SRS push / pull
// ---------------------------------------------------------------------------

export type RemoteSrsRow = {
  id: string;
  word_id: string;
  quiz_mode: string;
  word: string;
  meaning: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_at: string;
  last_reviewed_at: string;
  updated_at: string;
  deleted: boolean;
};

export type RemoteSrsPracticeRow = {
  id: string;
  word_id: string;
  quiz_mode: string;
  word: string;
  meaning: string;
  difficulty: string;
  practiced_at: string;
  updated_at: string;
  deleted: boolean;
};

function mapSrsRowToRecord(row: RemoteSrsRow): SrsRecord {
  const quizMode = (row.quiz_mode || 'wordToMeaning') as SrsRecord['quizMode'];
  const wordId = row.word_id;
  const id = row.id.includes(':srs:') ? row.id : buildSrsId(wordId, quizMode);
  return {
    id,
    wordId,
    quizMode,
    word: row.word,
    meaning: row.meaning ?? '',
    easeFactor: row.ease_factor ?? 2.5,
    interval: row.interval ?? 0,
    repetitions: row.repetitions ?? 0,
    nextReviewAt: row.next_review_at,
    lastReviewedAt: row.last_reviewed_at,
    updatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    isDeleted: row.deleted,
  };
}

function mapSrsPracticeRowToRecord(row: RemoteSrsPracticeRow): SrsPracticeRecord {
  const quizMode = (row.quiz_mode || 'wordToMeaning') as QuizMode;
  const wordId = row.word_id;
  const id = row.id.includes(':srs-practice:') ? row.id : buildSrsPracticeId(wordId, quizMode);
  return {
    id,
    wordId,
    quizMode,
    word: row.word,
    meaning: row.meaning ?? '',
    difficulty: (row.difficulty || 'good') as SrsPracticeRecord['difficulty'],
    practicedAt: row.practiced_at,
    updatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    isDeleted: row.deleted,
  };
}

export type RemoteFsrsRow = {
  id: string;
  word_id: string;
  quiz_mode: string;
  word: string;
  meaning: string;
  due_at: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: string;
  last_reviewed_at: string;
  updated_at: string;
  deleted: boolean;
};

function mapFsrsRowToRecord(row: RemoteFsrsRow): FsrsRecord {
  const quizMode = (row.quiz_mode || 'wordToMeaning') as QuizMode;
  const wordId = row.word_id;
  const id = row.id.includes(':fsrs:') ? row.id : buildFsrsId(wordId, quizMode);
  return {
    id,
    wordId,
    quizMode,
    word: row.word,
    meaning: row.meaning ?? '',
    dueAt: row.due_at || new Date().toISOString(),
    stability: row.stability ?? 0,
    difficulty: row.difficulty ?? 0,
    elapsedDays: row.elapsed_days ?? 0,
    scheduledDays: row.scheduled_days ?? 0,
    learningSteps: row.learning_steps ?? 0,
    reps: row.reps ?? 0,
    lapses: row.lapses ?? 0,
    state: (row.state || 'New') as FsrsRecord['state'],
    lastReviewedAt: row.last_reviewed_at || '',
    updatedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    isDeleted: row.deleted,
  };
}

export async function pullRemoteSrsRecords(collection: SrsCollection): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, skipping SRS records pull from remote');
    return;
  }

  try {
    console.log('Pulling SRS records from Supabase...');
    const response = await fetch(`/api/srs?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    if (!response.ok) {
      await handleSyncResponseError(response, 'pull SRS records');
      return;
    }

    const { data } = await response.json();
    if (!data || !Array.isArray(data)) {
      console.log('No SRS records to pull');
      return;
    }

    console.log('Successfully pulled', data.length, 'SRS records from remote');
    const localDocs = await collection.find().exec();
    const localMap = new Map(localDocs.map((doc) => [doc.id, doc.toJSON()]));
    const toUpsertMap = new Map<string, SrsRecord>();

    for (const row of data as RemoteSrsRow[]) {
      const mapped = mapSrsRowToRecord(row);
      const localRecord = localMap.get(mapped.id);

      if (localRecord) {
        if (mapped.isDeleted && !localRecord.isDeleted) {
          toUpsertMap.set(mapped.id, mapped);
          continue;
        }
        if (hasPendingLocalSync(localRecord) && localRecord.updatedAt > mapped.updatedAt) {
          continue;
        }
        if (localRecord.updatedAt >= mapped.updatedAt) {
          continue;
        }
      }
      toUpsertMap.set(mapped.id, mapped);
    }

    const toUpsert = Array.from(toUpsertMap.values());
    if (toUpsert.length > 0) {
      await collection.bulkUpsert(toUpsert);
      console.log(`Bulk synced ${toUpsert.length} SRS records from remote`);
    }
  } catch (error) {
    console.error('Error pulling SRS records:', error);
  }
}

export async function pullRemoteSrsPracticeWords(collection: SrsPracticeCollection): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, skipping SRS practice pull from remote');
    return;
  }

  try {
    console.log('Pulling SRS practice words from Supabase...');
    const response = await fetch(`/api/srs-practice?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    if (!response.ok) {
      await handleSyncResponseError(response, 'pull SRS practice words');
      return;
    }

    const { data } = await response.json();
    if (!data || !Array.isArray(data)) {
      console.log('No SRS practice words to pull');
      return;
    }

    console.log('Successfully pulled', data.length, 'SRS practice word(s) from remote');
    const localDocs = await collection.find().exec();
    const localMap = new Map(localDocs.map((doc) => [doc.id, doc.toJSON()]));
    const toUpsertMap = new Map<string, SrsPracticeRecord>();

    for (const row of data as RemoteSrsPracticeRow[]) {
      const mapped = mapSrsPracticeRowToRecord(row);
      const localRecord = localMap.get(mapped.id);

      if (localRecord) {
        if (mapped.isDeleted && !localRecord.isDeleted) {
          toUpsertMap.set(mapped.id, mapped);
          continue;
        }
        if (hasPendingLocalSync(localRecord) && localRecord.updatedAt > mapped.updatedAt) {
          continue;
        }
        if (localRecord.updatedAt >= mapped.updatedAt) {
          continue;
        }
      }
      toUpsertMap.set(mapped.id, mapped);
    }

    const toUpsert = Array.from(toUpsertMap.values());
    if (toUpsert.length > 0) {
      await collection.bulkUpsert(toUpsert);
      console.log(`Bulk synced ${toUpsert.length} SRS practice words from remote`);
    }
  } catch (error) {
    console.error('Error pulling SRS practice words:', error);
  }
}

export async function pullRemoteFsrsRecords(collection: FsrsCollection): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, skipping FSRS records pull from remote');
    return;
  }

  try {
    console.log('Pulling FSRS records from Supabase...');
    const response = await fetch(`/api/fsrs?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    if (!response.ok) {
      await handleSyncResponseError(response, 'pull FSRS records');
      return;
    }

    const { data } = await response.json();
    if (!data || !Array.isArray(data)) {
      console.log('No FSRS records to pull');
      return;
    }

    console.log('Successfully pulled', data.length, 'FSRS records from remote');
    const localDocs = await collection.find().exec();
    const localMap = new Map(localDocs.map((doc) => [doc.id, doc.toJSON()]));
    const toUpsertMap = new Map<string, FsrsRecord>();

    for (const row of data as RemoteFsrsRow[]) {
      const mapped = mapFsrsRowToRecord(row);
      const localRecord = localMap.get(mapped.id);

      if (localRecord) {
        if (mapped.isDeleted && !localRecord.isDeleted) {
          toUpsertMap.set(mapped.id, mapped);
          continue;
        }
        if (hasPendingLocalSync(localRecord) && localRecord.updatedAt > mapped.updatedAt) {
          continue;
        }
        if (localRecord.updatedAt >= mapped.updatedAt) {
          continue;
        }
      }
      toUpsertMap.set(mapped.id, mapped);
    }

    const toUpsert = Array.from(toUpsertMap.values());
    if (toUpsert.length > 0) {
      await collection.bulkUpsert(toUpsert);
      console.log(`Bulk synced ${toUpsert.length} FSRS records from remote`);
    }
  } catch (error) {
    console.error('Error pulling FSRS records:', error);
  }
}

export async function pushSrsRecordToRemote(
  collection: SrsCollection,
  record: SrsRecord
): Promise<void> {
  if (!isOnline()) {
    enqueueSrsOutbox(record);
    console.log(
      'Device is offline, SRS record queued to outbox. Will sync when online:',
      record.word
    );
    return;
  }

  try {
    const payload = srsRecordToPayload(record);

    console.log('Pushing SRS record to remote:', record.word, record.quizMode);
    const response = await fetch('/api/srs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      enqueueSrsOutbox(record);
      await handleSyncResponseError(response, 'push SRS record to remote');
      return;
    }

    removeFromSrsOutbox(record.id);
    await collection.upsert({
      ...record,
      lastSyncedAt: record.updatedAt,
    });
    console.log('Successfully synced SRS record to remote:', record.word);
  } catch (error) {
    enqueueSrsOutbox(record);
    console.error('Error pushing SRS record to remote:', error);
  }
}

export async function pushSrsPracticeWordToRemote(
  collection: SrsPracticeCollection,
  record: SrsPracticeRecord
): Promise<void> {
  if (!isOnline()) {
    enqueueSrsPracticeOutbox(record);
    console.log(
      'Device is offline, SRS practice record queued to outbox. Will sync when online:',
      record.word
    );
    return;
  }

  try {
    const payload = srsPracticeRecordToPayload(record);

    console.log('Pushing SRS practice record to remote:', record.word, record.quizMode);
    const response = await fetch('/api/srs-practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      enqueueSrsPracticeOutbox(record);
      await handleSyncResponseError(response, 'push SRS practice record to remote');
      return;
    }

    removeFromSrsPracticeOutbox(record.id);
    await collection.upsert({
      ...record,
      lastSyncedAt: record.updatedAt,
    });
    console.log('Successfully synced SRS practice record to remote:', record.word);
  } catch (error) {
    enqueueSrsPracticeOutbox(record);
    console.error('Error pushing SRS practice record to remote:', error);
  }
}

export async function pushFsrsRecordToRemote(
  collection: FsrsCollection,
  record: FsrsRecord
): Promise<void> {
  if (!isOnline()) {
    enqueueFsrsOutbox(record);
    console.log(
      'Device is offline, FSRS record queued to outbox. Will sync when online:',
      record.word
    );
    return;
  }

  try {
    const payload = fsrsRecordToPayload(record);

    console.log('Pushing FSRS record to remote:', record.word, record.quizMode);
    const response = await fetch('/api/fsrs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      enqueueFsrsOutbox(record);
      await handleSyncResponseError(response, 'push FSRS record to remote');
      return;
    }

    removeFromFsrsOutbox(record.id);
    await collection.upsert({
      ...record,
      lastSyncedAt: record.updatedAt,
    });
    console.log('Successfully synced FSRS record to remote:', record.word);
  } catch (error) {
    enqueueFsrsOutbox(record);
    console.error('Error pushing FSRS record to remote:', error);
  }
}

export async function pushAllLocalSrsRecords(collection: SrsCollection): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, skipping SRS push. Will sync when online.');
    return;
  }

  try {
    await flushSrsOutbox(collection);

    console.log('Pushing all local SRS records to remote...');
    const localRecords = await collection.find().exec();
    let syncedCount = 0;

    for (const doc of localRecords) {
      const record = doc.toJSON();
      if (hasPendingLocalSync(record)) {
        await pushSrsRecordToRemote(collection, record as SrsRecord);
        syncedCount++;
      }
    }

    console.log('Synced', syncedCount, 'SRS records to remote');
  } catch (error) {
    console.error('Error pushing all local SRS records:', error);
  }
}

export async function pushAllLocalSrsPracticeWords(
  collection: SrsPracticeCollection
): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, skipping SRS practice push. Will sync when online.');
    return;
  }

  try {
    await flushSrsPracticeOutbox(collection);

    console.log('Pushing all local SRS practice words to remote...');
    const localRecords = await collection.find().exec();
    let syncedCount = 0;

    for (const doc of localRecords) {
      const record = doc.toJSON();
      if (hasPendingLocalSync(record)) {
        await pushSrsPracticeWordToRemote(collection, record as SrsPracticeRecord);
        syncedCount++;
      }
    }

    console.log('Synced', syncedCount, 'SRS practice record(s) to remote');
  } catch (error) {
    console.error('Error pushing all local SRS practice records:', error);
  }
}

export async function pushAllLocalFsrsRecords(collection: FsrsCollection): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, skipping FSRS push. Will sync when online.');
    return;
  }

  try {
    await flushFsrsOutbox(collection);

    console.log('Pushing all local FSRS records to remote...');
    const localRecords = await collection.find().exec();
    let syncedCount = 0;

    for (const doc of localRecords) {
      const record = doc.toJSON();
      if (hasPendingLocalSync(record)) {
        await pushFsrsRecordToRemote(collection, record as FsrsRecord);
        syncedCount++;
      }
    }

    console.log('Synced', syncedCount, 'FSRS record(s) to remote');
  } catch (error) {
    console.error('Error pushing all local FSRS records:', error);
  }
}

/**
 * Perform a full bidirectional sync:
 *   1. Flush all outboxes (pending offline writes)
 *   2. Pull from remote (server wins for records not modified locally)
 *   3. Push remaining local pending records to remote
 *   4. Fetch any missing meanings
 */
export async function performFullSync(
  wordsCollection: WordCollection,
  missedCollection: MissedWordCollection,
  groupsCollection: GroupCollection,
  srsCollection?: SrsCollection,
  srsPracticeCollection?: SrsPracticeCollection,
  fsrsCollection?: FsrsCollection,
  dailyUsageCollection?: DailyUsageCollection
): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, skipping full sync');
    return;
  }

  console.log('Starting full bidirectional sync...');

  // Step 1: Flush outboxes first — send any locally queued writes before pulling
  await flushWordOutbox(wordsCollection);
  await flushGroupOutbox(groupsCollection);
  await flushMissedWordOutbox(missedCollection);
  if (srsCollection) {
    await flushSrsOutbox(srsCollection);
  }
  if (srsPracticeCollection) {
    await flushSrsPracticeOutbox(srsPracticeCollection);
  }
  if (fsrsCollection) {
    await flushFsrsOutbox(fsrsCollection);
  }
  if (dailyUsageCollection) {
    await flushDailyUsageOutbox(dailyUsageCollection);
  }

  // Step 2: Pull remote — brings in changes from other devices
  await pullRemoteGroups(groupsCollection);
  await pullRemoteWords(wordsCollection);
  await pullRemoteMissedWords(missedCollection);
  if (srsCollection) {
    await pullRemoteSrsRecords(srsCollection);
  }
  if (srsPracticeCollection) {
    await pullRemoteSrsPracticeWords(srsPracticeCollection);
  }
  if (fsrsCollection) {
    await pullRemoteFsrsRecords(fsrsCollection);
  }
  if (dailyUsageCollection) {
    await pullRemoteDailyUsage(dailyUsageCollection);
  }

  // Step 3: Push any remaining locally pending records
  await pushAllLocalGroups(groupsCollection);
  await pushAllLocalWords(wordsCollection);
  await pushAllLocalMissedWords(missedCollection);
  if (srsCollection) {
    await pushAllLocalSrsRecords(srsCollection);
  }
  if (srsPracticeCollection) {
    await pushAllLocalSrsPracticeWords(srsPracticeCollection);
  }
  if (fsrsCollection) {
    await pushAllLocalFsrsRecords(fsrsCollection);
  }
  if (dailyUsageCollection) {
    await pushAllLocalDailyUsage(dailyUsageCollection);
  }

  // Step 4: Fetch meanings for words that are still missing them
  await fetchMissingMeanings(wordsCollection);

  console.log('Full sync completed');
}

/**
 * Set up online/offline event listeners for automatic sync
 */
export function setupOnlineSyncListener(
  wordsCollection: WordCollection,
  missedCollection: MissedWordCollection,
  groupsCollection: GroupCollection,
  srsCollection?: SrsCollection,
  srsPracticeCollection?: SrsPracticeCollection,
  fsrsCollection?: FsrsCollection,
  performSync?: () => Promise<void>,
  dailyUsageCollection?: DailyUsageCollection
): () => void {
  const handleOnline = async () => {
    console.log('Device is back online! Starting full sync...');
    if (performSync) {
      await performSync();
      return;
    }
    await performFullSync(
      wordsCollection,
      missedCollection,
      groupsCollection,
      srsCollection,
      srsPracticeCollection,
      fsrsCollection,
      dailyUsageCollection
    );
  };

  const handleOffline = () => {
    console.log('Device went offline. Changes will be queued and synced when back online.');
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  return () => {};
}
