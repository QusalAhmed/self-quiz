import type { WordCollection, WordRecord } from './db';

export type RemoteWordRow = {
  id: string;
  word: string;
  meaning: string;
  created_at: string;
  updated_at: string;
  deleted: boolean;
};

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
  try {
    const response = await fetch('/api/words');
    if (!response.ok) {
      console.error('Failed to pull remote words:', response.statusText);
      return;
    }

    const { data } = await response.json();
    if (!data || !Array.isArray(data)) {
      return;
    }

    for (const row of data as RemoteWordRow[]) {
      const mapped = mapRowToRecord(row);
      await collection.upsert(mapped);
    }
  } catch (error) {
    console.error('Error pulling remote words:', error);
  }
}

export async function pushWordToRemote(
  collection: WordCollection,
  record: WordRecord
): Promise<void> {
  try {
    const payload = {
      id: record.id,
      word: record.word,
      meaning: record.meaning,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
      deleted: record.isDeleted,
    };

    const response = await fetch('/api/words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to push word to remote:', response.statusText);
      return;
    }

    await collection.upsert({
      ...record,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error pushing word to remote:', error);
  }
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
