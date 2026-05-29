import type { WordCollection, WordRecord } from './db';
import { supabase } from './supabase';

export type RemoteWordRow = {
  id: string;
  word: string;
  meaning: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
};

const TABLE_NAME = 'words';

function mapRowToRecord(row: RemoteWordRow): WordRecord {
  return {
    id: row.id,
    word: row.word,
    meaning: row.meaning,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDeleted: row.deleted,
    lastSyncedAt: row.updated_at,
  };
}

export async function pullRemoteWords(collection: WordCollection): Promise<void> {
  const { data, error } = await supabase.from(TABLE_NAME).select('*');
  if (error || !data) {
    return;
  }

  for (const row of data as RemoteWordRow[]) {
    const mapped = mapRowToRecord(row);
    await collection.upsert(mapped);
  }
}

export async function pushWordToRemote(
  collection: WordCollection,
  record: WordRecord
): Promise<void> {
  const payload = {
    id: record.id,
    word: record.word,
    meaning: record.meaning,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    deleted: record.isDeleted,
  };

  const { error } = await supabase.from(TABLE_NAME).upsert(payload, { onConflict: 'id' });
  if (error) {
    return;
  }

  await collection.upsert({
    ...record,
    lastSyncedAt: new Date().toISOString(),
  });
}

export async function pushAllLocalWords(collection: WordCollection): Promise<void> {
  const localWords = await collection.find().exec();
  for (const word of localWords) {
    const record = word.toJSON();
    const shouldSync = !record.lastSyncedAt || record.lastSyncedAt < record.updatedAt;
    if (shouldSync) {
      await pushWordToRemote(collection, record);
    }
  }
}
