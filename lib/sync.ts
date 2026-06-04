import type { MissedWordCollection, MissedWordRecord, WordCollection, WordRecord } from './db';

export type RemoteWordRow = {
  id: string;
  word: string;
  meaning: string;
  examples?: string[] | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
};

export type RemoteMissedWordRow = {
  id: string;
  word_id: string;
  word: string;
  meaning: string;
  missed_at: string;
  missed_count: number;
  updated_at: string;
  deleted: boolean;
};

function mapRowToRecord(row: RemoteWordRow): WordRecord {
  return {
    id: row.id,
    word: row.word,
    meaning: row.meaning,
    examples: Array.isArray(row.examples) ? row.examples : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDeleted: row.deleted,
    lastSyncedAt: row.updated_at,
  };
}

function mapMissedRowToRecord(row: RemoteMissedWordRow) {
  return {
    id: row.id,
    wordId: row.word_id,
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

export async function pullRemoteWords(collection: WordCollection): Promise<void> {
  // Skip if offline
  if (!isOnline()) {
    console.log('Device is offline, skipping pull from remote');
    return;
  }

  try {
    console.log('Pulling remote words from Supabase...');
    // Add cache buster to force fresh fetch from server
    const response = await fetch('/api/words?t=' + Date.now(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
    });
    if (!response.ok) {
      console.error('Failed to pull remote words:', response.statusText);
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
    const response = await fetch('/api/missed-words?t=' + Date.now(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    if (!response.ok) {
      console.error('Failed to pull missed words:', response.statusText);
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
      created_at: record.createdAt,
      updated_at: record.updatedAt,
      deleted: record.isDeleted,
    };

    console.log('Pushing word to remote:', record.word);
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
    console.log('Device is offline, missed word saved locally. Will sync when online:', record.word);
    return;
  }

  try {
    const payload = {
      id: record.id,
      word_id: record.wordId,
      word: record.word,
      meaning: record.meaning,
      missed_at: record.missedAt,
      missed_count: record.missedCount,
      updated_at: record.updatedAt,
      deleted: record.isDeleted,
    };

    console.log('Pushing missed word to remote:', record.word);
    const response = await fetch('/api/missed-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to push missed word to remote:', response.statusText);
      return;
    }

    await collection.upsert({
      ...record,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error pushing missed word to remote:', error);
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
      const record = word.toJSON();
      const shouldSync = !record.lastSyncedAt || record.lastSyncedAt < record.updatedAt;
      if (shouldSync) {
        // @ts-ignore
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
    console.log('Pushing all missed words to remote...');
    const localWords = await collection.find().exec();
    let syncedCount = 0;

    for (const word of localWords) {
      const record = word.toJSON();
      const shouldSync = !record.lastSyncedAt || record.lastSyncedAt < record.updatedAt;
      if (shouldSync) {
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
      const record = doc.toJSON();
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

        // @ts-ignore
        await collection.upsert(updated);
        // @ts-ignore
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
  missedCollection: MissedWordCollection
): () => void {
  const handleOnline = async () => {
    console.log('Device is back online! Starting sync...');
    await pullRemoteWords(wordsCollection);
    await pullRemoteMissedWords(missedCollection);
    await pushAllLocalWords(wordsCollection);
    await pushAllLocalMissedWords(missedCollection);
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
