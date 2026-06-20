import {
  buildMissedWordId,
  type GroupCollection,
  type GroupRecord,
  type MissedWordCollection,
  type MissedWordRecord,
  type QuizMode,
  type WordCollection,
  type WordRecord,
} from './db';
import { getWordGroups } from './groups';

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
        `Please run the SQL statements from 'scripts/setup-supabase.sql' or 'scripts/migrate-group.sql' in your Supabase SQL Editor. ` +
        `Detail: ${errorMessage}`
    );
  } else {
    console.error(`Failed to ${actionLabel}:`, errorMessage);
  }
}

function toWritableWord(record: any): WordRecord {
  return {
    ...record,
    examples: Array.isArray(record.examples) ? [...record.examples] : [],
    userExamples: Array.isArray(record.userExamples) ? [...record.userExamples] : [],
    customGroups: getWordGroups(record),
  };
}

export type RemoteWordRow = {
  id: string;
  word: string;
  meaning: string;
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

  return {
    id: row.id,
    word: row.word,
    meaning: row.meaning,
    examples: Array.isArray(row.examples) ? row.examples : [],
    userExamples: Array.isArray(row.user_examples) ? row.user_examples : [],
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

export async function flushMissedWordOutbox(collection: MissedWordCollection): Promise<void> {
  if (!isOnline()) {
    return;
  }

  const outbox = readMissedWordOutbox();
  if (outbox.length === 0) {
    return;
  }

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
    // Add cache buster to force fresh fetch from server
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
      // Always upsert to ensure we get latest data from remote
      await collection.upsert(mapped);
      console.log('Synced from remote:', mapped.word, '- Meaning:', mapped.meaning);
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
        if (hasPendingLocalSync(localRecord)) {
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

export async function pushWordToRemote(
  collection: WordCollection,
  record: WordRecord
): Promise<void> {
  // Skip if offline
  if (!isOnline()) {
    console.log('Device is offline, word saved locally. Will sync when online:', record.word);
    return;
  }

  try {
    const payload = {
      id: record.id,
      word: record.word,
      meaning: record.meaning,
      examples: record.examples,
      user_examples: record.userExamples,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
      deleted: record.isDeleted,
      custom_groups: getWordGroups(record),
      custom_group: getWordGroups(record)[0] || '',
    };

    console.log('Pushing word to remote:', record.word);
    const response = await fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await handleSyncResponseError(response, 'push word to remote');
      return;
    }

    await collection.upsert({
      ...record,
      lastSyncedAt: new Date().toISOString(),
    });
    console.log('Successfully synced word to remote:', record.word);
  } catch (error) {
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
      'Device is offline, missed word queued locally. Will sync when online:',
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
      await collection.upsert(mapped);
    }
  } catch (error) {
    console.error('Error pulling remote groups:', error);
  }
}

export async function pushGroupToRemote(
  collection: GroupCollection,
  record: GroupRecord
): Promise<void> {
  if (!isOnline()) {
    console.log('Device is offline, group saved locally. Will sync when online:', record.name);
    return;
  }

  try {
    const payload = {
      id: record.id,
      name: record.name,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
      deleted: record.isDeleted,
    };

    console.log('Pushing group to remote:', record.name);
    const response = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await handleSyncResponseError(response, 'push group to remote');
      return;
    }

    await collection.upsert({
      ...record,
      lastSyncedAt: new Date().toISOString(),
    });
    console.log('Successfully synced group to remote:', record.name);
  } catch (error) {
    console.error('Error pushing group to remote:', error);
  }
}

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
      const shouldSync = !record.lastSyncedAt || record.lastSyncedAt < record.updatedAt;
      if (shouldSync) {
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
      const shouldSync = !record.lastSyncedAt || record.lastSyncedAt < record.updatedAt;
      if (shouldSync) {
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
      // Skip if word has meaning or is deleted
      if (record.meaning && record.meaning.trim().length > 0) {
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
        const meaning = String(data?.meaning ?? '').trim();

        if (!meaning) {
          console.warn('No meaning returned for:', record.word);
          continue;
        }

        // Update word with the fetched meaning
        const updated = {
          ...record,
          meaning,
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

/**
 * Set up online/offline event listeners for automatic sync
 */
export function setupOnlineSyncListener(
  wordsCollection: WordCollection,
  missedCollection: MissedWordCollection,
  groupsCollection: GroupCollection
): () => void {
  const handleOnline = async () => {
    console.log('Device is back online! Starting sync...');
    await pushAllLocalMissedWords(missedCollection);
    await pullRemoteMissedWords(missedCollection);
    await pullRemoteGroups(groupsCollection);
    await pullRemoteWords(wordsCollection);
    await pushAllLocalGroups(groupsCollection);
    await pushAllLocalWords(wordsCollection);
    await fetchMissingMeanings(wordsCollection);
    console.log('Sync completed');
  };

  const handleOffline = () => {
    console.log('Device went offline. Will sync when back online.');
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
