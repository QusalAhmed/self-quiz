import {
  buildMissedWordId,
  type GroupCollection,
  type GroupRecord,
  type MissedWordCollection,
  type MissedWordRecord,
  type QuizMode,
  type SrsPracticeCollection,
  type SrsPracticeRecord,
  type SrsCollection,
  type WordCollection,
  type WordRecord,
} from './db';
import { definitionsToMeaning, mergeLegacyFlatExamples, normalizeDefinitions } from './definitions';
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

  const isSchemaMismatch =
    errorMessage.includes('schema cache') ||
    errorMessage.includes('does not exist') ||
    errorMessage.includes('column') ||
    errorMessage.includes('relation');

  if (isSchemaMismatch) {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDeleted: row.deleted,
    lastSyncedAt: row.updated_at,
    customGroups: Array.from(new Set(customGroups)),
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
// Pull from remote
// ---------------------------------------------------------------------------

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
    for (const row of data as RemoteWordRow[]) {
      const mapped = mapRowToRecord(row);

      const local = await collection.findOne(mapped.id).exec();
      if (local) {
        const localRecord = local.toJSON();

        // Always apply remote deletions — a delete on another device must
        // propagate even if local has the same updatedAt.
        if (mapped.isDeleted && !localRecord.isDeleted) {
          await collection.upsert(mapped);
          console.log(`Applied remote deletion for word "${mapped.word}"`);
          continue;
        }

        // If local has pending unsynced changes that are strictly newer,
        // keep local and let push propagate them to remote.
        if (hasPendingLocalSync(localRecord) && localRecord.updatedAt > mapped.updatedAt) {
          console.log(`Keeping local pending changes for "${mapped.word}"`);
          continue;
        }

        // Skip if local is already at the same version or newer
        if (localRecord.updatedAt >= mapped.updatedAt) {
          continue;
        }
      }

      await collection.upsert(mapped);
      console.log('Synced from remote:', mapped.word, '- isDeleted:', mapped.isDeleted);
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
    for (const row of data as RemoteMissedWordRow[]) {
      const mapped = mapMissedRowToRecord(row);
      const local = await collection.findOne(mapped.id).exec();
      if (local) {
        const localRecord = local.toJSON();

        // Always apply remote deletions
        if (mapped.isDeleted && !localRecord.isDeleted) {
          await collection.upsert(mapped);
          continue;
        }

        // Protect strictly newer local pending changes
        if (hasPendingLocalSync(localRecord) && localRecord.updatedAt > mapped.updatedAt) {
          continue;
        }

        if (localRecord.updatedAt >= mapped.updatedAt) {
          continue;
        }
      }
      await collection.upsert(mapped);
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
    for (const row of data as RemoteGroupRow[]) {
      const mapped = mapGroupRowToRecord(row);

      const local = await collection.findOne(mapped.id).exec();
      if (local) {
        const localRecord = local.toJSON();

        // Always apply remote deletions
        if (mapped.isDeleted && !localRecord.isDeleted) {
          await collection.upsert(mapped);
          console.log(`Applied remote deletion for group "${mapped.name}"`);
          continue;
        }

        // Protect strictly newer local pending changes
        if (hasPendingLocalSync(localRecord) && localRecord.updatedAt > mapped.updatedAt) {
          console.log(`Keeping local pending changes for group "${mapped.name}"`);
          continue;
        }

        if (localRecord.updatedAt >= mapped.updatedAt) {
          continue;
        }
      }

      await collection.upsert(mapped);
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

        // Add small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 100));
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
    for (const row of data as RemoteSrsRow[]) {
      const mapped = mapSrsRowToRecord(row);
      const local = await collection.findOne(mapped.id).exec();
      if (local) {
        const localRecord = local.toJSON();

        // Always apply remote deletions
        if (mapped.isDeleted && !localRecord.isDeleted) {
          await collection.upsert(mapped);
          continue;
        }

        // Protect strictly newer local pending changes
        if (hasPendingLocalSync(localRecord) && localRecord.updatedAt > mapped.updatedAt) {
          continue;
        }

        if (localRecord.updatedAt >= mapped.updatedAt) {
          continue;
        }
      }
      await collection.upsert(mapped);
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
    for (const row of data as RemoteSrsPracticeRow[]) {
      const mapped = mapSrsPracticeRowToRecord(row);
      const local = await collection.findOne(mapped.id).exec();
      if (local) {
        const localRecord = local.toJSON();

        if (mapped.isDeleted && !localRecord.isDeleted) {
          await collection.upsert(mapped);
          continue;
        }

        if (hasPendingLocalSync(localRecord) && localRecord.updatedAt > mapped.updatedAt) {
          continue;
        }

        if (localRecord.updatedAt >= mapped.updatedAt) {
          continue;
        }
      }
      await collection.upsert(mapped);
    }
  } catch (error) {
    console.error('Error pulling SRS practice words:', error);
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
  srsPracticeCollection?: SrsPracticeCollection
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
  if (srsCollection) await flushSrsOutbox(srsCollection);
  if (srsPracticeCollection) await flushSrsPracticeOutbox(srsPracticeCollection);

  // Step 2: Pull remote — brings in changes from other devices
  await pullRemoteGroups(groupsCollection);
  await pullRemoteWords(wordsCollection);
  await pullRemoteMissedWords(missedCollection);
  if (srsCollection) await pullRemoteSrsRecords(srsCollection);
  if (srsPracticeCollection) await pullRemoteSrsPracticeWords(srsPracticeCollection);

  // Step 3: Push any remaining locally pending records
  await pushAllLocalGroups(groupsCollection);
  await pushAllLocalWords(wordsCollection);
  await pushAllLocalMissedWords(missedCollection);
  if (srsCollection) await pushAllLocalSrsRecords(srsCollection);
  if (srsPracticeCollection) await pushAllLocalSrsPracticeWords(srsPracticeCollection);

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
  performSync?: () => Promise<void>
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
      srsPracticeCollection
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
