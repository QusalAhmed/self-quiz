import { replicateRxCollection, type RxReplicationState } from 'rxdb/plugins/replication';
import { Subject } from 'rxjs';
import type { RxCollection, WithDeleted } from 'rxdb';
import type {
  AppDatabase,
  DailyUsageRecord,
  FsrsRecord,
  GroupRecord,
  MissedWordRecord,
  QuizMode,
  SrsPracticeRecord,
  WordRecord,
} from './db';
import { definitionsToMeaning, mergeLegacyFlatExamples, normalizeDefinitions } from './definitions';
import { normalizeAiExampleCount } from './examples';
import { supabase } from './supabase';

export type SupabaseCheckpoint = {
  id: string;
  updated_at: string;
};

export type SyncCollectionKey =
  | 'words'
  | 'groups'
  | 'missedWords'
  | 'fsrsRecords'
  | 'srsPracticeWords'
  | 'dailyUsage';

export type SingleCollectionSyncState = {
  key: SyncCollectionKey;
  label: string;
  tableName: string;
  isActive: boolean;
  isPaused: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  sentCount: number;
  receivedCount: number;
  pendingCount: number;
};

export type SyncActivityType =
  | 'sent'
  | 'received'
  | 'error'
  | 'resync'
  | 'paused'
  | 'resumed'
  | 'in_sync';

export type SyncActivityEvent = {
  id: string;
  timestamp: string;
  type: SyncActivityType;
  collection?: SyncCollectionKey;
  message: string;
  count?: number;
  error?: string;
};

export type GlobalSyncStatus = 'in_sync' | 'syncing' | 'paused' | 'error' | 'offline';

export type UnifiedSyncState = {
  status: GlobalSyncStatus;
  isActive: boolean;
  isPaused: boolean;
  isInitialSyncComplete: boolean;
  totalSent: number;
  totalReceived: number;
  pendingCount: number;
  lastSyncedAt: string | null;
  collections: Record<SyncCollectionKey, SingleCollectionSyncState>;
  activities: SyncActivityEvent[];
  error: string | null;
};

export type ReplicationsHolder = {
  words: RxReplicationState<WordRecord, SupabaseCheckpoint>;
  groups: RxReplicationState<GroupRecord, SupabaseCheckpoint>;
  missedWords: RxReplicationState<MissedWordRecord, SupabaseCheckpoint>;
  fsrsRecords: RxReplicationState<FsrsRecord, SupabaseCheckpoint>;
  srsPracticeWords: RxReplicationState<SrsPracticeRecord, SupabaseCheckpoint>;
  dailyUsage: RxReplicationState<DailyUsageRecord, SupabaseCheckpoint>;
  cancelAll: () => Promise<void>;
  reSyncAll: () => Promise<void>;
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  isPaused: () => boolean;
  awaitInitialReplication: () => Promise<void>;
  awaitInSync: () => Promise<boolean>;
  reSyncCollection: (collection: SyncCollectionKey) => void;
  pauseCollection: (collection: SyncCollectionKey) => Promise<void>;
  resumeCollection: (collection: SyncCollectionKey) => Promise<void>;
  getSyncState: () => UnifiedSyncState;
  subscribeSyncState: (listener: (state: UnifiedSyncState) => void) => () => void;
  clearActivities: () => void;
};

// ---------------------------------------------------------------------------
// Word Modifiers
// ---------------------------------------------------------------------------
export function pullWordModifier(row: any): WithDeleted<WordRecord> {
  const fromArray = Array.isArray(row.custom_groups)
    ? row.custom_groups.filter((g: unknown) => typeof g === 'string' && g.trim().length > 0)
    : [];
  const legacyGroup = typeof row.custom_group === 'string' ? row.custom_group.trim() : '';
  const customGroups = fromArray.length > 0 ? fromArray : legacyGroup ? [legacyGroup] : [];
  const definitions = mergeLegacyFlatExamples(
    normalizeDefinitions(row.definitions, row.meaning ?? ''),
    row.examples,
    row.user_examples
  );
  const isDeleted = typeof row.deleted === 'boolean' ? row.deleted : (row._deleted ?? false);

  return {
    id: row.id,
    word: row.word,
    meaning: definitionsToMeaning(definitions),
    definitions,
    aiExampleCount: normalizeAiExampleCount(row.ai_example_count ?? row.aiExampleCount),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    isDeleted,
    _deleted: isDeleted,
    lastSyncedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    customGroups: Array.from(new Set(customGroups)),
    notes: row.notes || '',
  };
}

export function pushWordModifier(doc: WordRecord): any {
  return {
    id: doc.id,
    word: doc.word,
    meaning: doc.meaning,
    definitions: doc.definitions,
    ai_example_count: doc.aiExampleCount,
    notes: doc.notes || '',
    custom_groups: doc.customGroups || [],
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
    deleted: doc.isDeleted,
  };
}

// ---------------------------------------------------------------------------
// Group Modifiers
// ---------------------------------------------------------------------------
export function pullGroupModifier(row: any): WithDeleted<GroupRecord> {
  const isDeleted = typeof row.deleted === 'boolean' ? row.deleted : (row._deleted ?? false);
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    isDeleted,
    _deleted: isDeleted,
    lastSyncedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function pushGroupModifier(doc: GroupRecord): any {
  return {
    id: doc.id,
    name: doc.name,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
    deleted: doc.isDeleted,
  };
}

// ---------------------------------------------------------------------------
// Missed Word Modifiers
// ---------------------------------------------------------------------------
export function pullMissedWordModifier(row: any): WithDeleted<MissedWordRecord> {
  const quizMode = (row.quiz_mode || row.quizMode || 'wordToMeaning') as QuizMode;
  const wordId = row.word_id || row.wordId;
  const id = String(row.id).includes(':') ? row.id : `${wordId}:${quizMode}`;
  const isDeleted = typeof row.deleted === 'boolean' ? row.deleted : (row._deleted ?? false);
  return {
    id,
    wordId,
    quizMode,
    word: row.word,
    meaning: row.meaning ?? '',
    missedAt: row.missed_at || row.missedAt || new Date().toISOString(),
    missedCount: row.missed_count ?? row.missedCount ?? 1,
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    lastSyncedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    isDeleted,
    _deleted: isDeleted,
  };
}

export function pushMissedWordModifier(doc: MissedWordRecord): any {
  return {
    id: doc.id,
    word_id: doc.wordId,
    quiz_mode: doc.quizMode,
    word: doc.word,
    meaning: doc.meaning,
    missed_at: doc.missedAt,
    missed_count: doc.missedCount,
    updated_at: doc.updatedAt,
    deleted: doc.isDeleted,
  };
}

// ---------------------------------------------------------------------------
// FSRS Modifiers
// ---------------------------------------------------------------------------
export function pullFsrsModifier(row: any): WithDeleted<FsrsRecord> {
  const isDeleted = typeof row.deleted === 'boolean' ? row.deleted : (row._deleted ?? false);
  return {
    id: row.id,
    wordId: row.word_id || row.wordId,
    quizMode: (row.quiz_mode || row.quizMode || 'wordToMeaning') as QuizMode,
    word: row.word,
    meaning: row.meaning ?? '',
    dueAt: row.due_at || row.dueAt || new Date().toISOString(),
    stability: row.stability ?? 0,
    difficulty: row.difficulty ?? 0,
    elapsedDays: row.elapsed_days ?? row.elapsedDays ?? 0,
    scheduledDays: row.scheduled_days ?? row.scheduledDays ?? 0,
    learningSteps: row.learning_steps ?? row.learningSteps ?? 0,
    reps: row.reps ?? 0,
    lapses: row.lapses ?? 0,
    state: row.state ?? 'New',
    lastReviewedAt: row.last_reviewed_at || row.lastReviewedAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    lastSyncedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    isDeleted,
    _deleted: isDeleted,
    lastRating: row.last_rating ?? row.lastRating ?? '',
  };
}

export function pushFsrsModifier(doc: FsrsRecord): any {
  return {
    id: doc.id,
    word_id: doc.wordId,
    quiz_mode: doc.quizMode,
    word: doc.word,
    meaning: doc.meaning || '',
    due_at: doc.dueAt,
    stability: doc.stability,
    difficulty: doc.difficulty,
    elapsed_days: doc.elapsedDays,
    scheduled_days: doc.scheduledDays,
    learning_steps: doc.learningSteps,
    reps: doc.reps,
    lapses: doc.lapses,
    state: doc.state,
    last_reviewed_at: doc.lastReviewedAt,
    updated_at: doc.updatedAt,
    deleted: doc.isDeleted,
    last_rating: doc.lastRating || '',
  };
}

// ---------------------------------------------------------------------------
// SRS Practice Modifiers
// ---------------------------------------------------------------------------
export function pullSrsPracticeModifier(row: any): WithDeleted<SrsPracticeRecord> {
  const isDeleted = typeof row.deleted === 'boolean' ? row.deleted : (row._deleted ?? false);
  return {
    id: row.id,
    wordId: row.word_id || row.wordId,
    quizMode: (row.quiz_mode || row.quizMode || 'wordToMeaning') as QuizMode,
    word: row.word,
    meaning: row.meaning ?? '',
    difficulty: row.difficulty ?? 'good',
    practicedAt: row.practiced_at || row.practicedAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    lastSyncedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    isDeleted,
    _deleted: isDeleted,
  };
}

export function pushSrsPracticeModifier(doc: SrsPracticeRecord): any {
  return {
    id: doc.id,
    word_id: doc.wordId,
    quiz_mode: doc.quizMode,
    word: doc.word,
    meaning: doc.meaning || '',
    difficulty: doc.difficulty,
    practiced_at: doc.practicedAt,
    updated_at: doc.updatedAt,
    deleted: doc.isDeleted,
  };
}

// ---------------------------------------------------------------------------
// Daily Usage Modifiers
// ---------------------------------------------------------------------------
export function pullDailyUsageModifier(row: any): WithDeleted<DailyUsageRecord> {
  const isDeleted = typeof row.deleted === 'boolean' ? row.deleted : (row._deleted ?? false);
  return {
    id: row.id,
    date: row.date,
    deviceId: row.device_id || row.deviceId,
    seconds: row.seconds ?? 0,
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    lastSyncedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    isDeleted,
    _deleted: isDeleted,
  };
}

export function pushDailyUsageModifier(doc: DailyUsageRecord): any {
  return {
    id: doc.id,
    date: doc.date,
    device_id: doc.deviceId,
    seconds: doc.seconds,
    updated_at: doc.updatedAt,
    deleted: doc.isDeleted,
  };
}

// ---------------------------------------------------------------------------
// Replicate Collection Helper
// ---------------------------------------------------------------------------
export function createSupabaseCollectionReplication<T>({
  collection,
  tableName,
  replicationIdentifier,
  pullModifier,
  pushModifier,
}: {
  collection: RxCollection<T>;
  tableName: string;
  replicationIdentifier: string;
  pullModifier: (row: any) => WithDeleted<T>;
  pushModifier: (doc: T) => any;
}): RxReplicationState<T, SupabaseCheckpoint> {
  const pullStream$ = new Subject<{
    documents: WithDeleted<T>[];
    checkpoint: SupabaseCheckpoint;
  }>();

  // Listen to Supabase Realtime events for live sync
  if (typeof window !== 'undefined') {
    supabase
      .channel(`rxdb-${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          const row = (
            payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old
          ) as any;
          if (row && row.id && row.updated_at) {
            pullStream$.next({
              documents: [pullModifier(row)],
              checkpoint: { id: row.id, updated_at: row.updated_at },
            });
          }
        }
      )
      .subscribe();
  }

  return replicateRxCollection<T, SupabaseCheckpoint>({
    replicationIdentifier,
    collection,
    deletedField: '_deleted',
    live: true,
    retryTime: 5000,
    autoStart: true,
    waitForLeadership: false,
    pull: {
      batchSize: 50,
      stream$: pullStream$.asObservable(),
      async handler(lastCheckpoint, batchSize) {
        let query = supabase.from(tableName).select('*');
        if (lastCheckpoint) {
          query = query.or(
            `updated_at.gt.${lastCheckpoint.updated_at},and(updated_at.eq.${lastCheckpoint.updated_at},id.gt.${lastCheckpoint.id})`
          );
        }
        query = query
          .order('updated_at', { ascending: true })
          .order('id', { ascending: true })
          .limit(batchSize);

        const { data, error } = await query;
        if (error) {
          throw error;
        }

        const rows = (data as any[]) || [];
        const documents = rows.map((row) => pullModifier(row));
        const lastRow = rows.length > 0 ? rows[rows.length - 1] : undefined;
        const checkpoint = lastRow
          ? { id: lastRow.id, updated_at: lastRow.updated_at }
          : lastCheckpoint;

        return {
          documents,
          checkpoint,
        };
      },
    },
    push: {
      batchSize: 50,
      async handler(rows) {
        if (!rows || rows.length === 0) {
          return [];
        }
        const payloads = rows.map((row) => pushModifier(row.newDocumentState));
        const { error } = await supabase.from(tableName).upsert(payloads, { onConflict: 'id' });
        if (error) {
          throw error;
        }
        return [];
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Main Setup Function
// ---------------------------------------------------------------------------
export function setupSupabaseReplication(db: AppDatabase): ReplicationsHolder {
  const words = createSupabaseCollectionReplication<WordRecord>({
    replicationIdentifier: 'supabase-sync-words',
    collection: db.words,
    tableName: 'words',
    pullModifier: pullWordModifier,
    pushModifier: pushWordModifier,
  });

  const groups = createSupabaseCollectionReplication<GroupRecord>({
    replicationIdentifier: 'supabase-sync-groups',
    collection: db.groups,
    tableName: 'groups',
    pullModifier: pullGroupModifier,
    pushModifier: pushGroupModifier,
  });

  const missedWords = createSupabaseCollectionReplication<MissedWordRecord>({
    replicationIdentifier: 'supabase-sync-missed-words',
    collection: db.missedWords,
    tableName: 'missed_words',
    pullModifier: pullMissedWordModifier,
    pushModifier: pushMissedWordModifier,
  });

  const fsrsRecords = createSupabaseCollectionReplication<FsrsRecord>({
    replicationIdentifier: 'supabase-sync-fsrs-records',
    collection: db.fsrsRecords,
    tableName: 'fsrs_records',
    pullModifier: pullFsrsModifier,
    pushModifier: pushFsrsModifier,
  });

  const srsPracticeWords = createSupabaseCollectionReplication<SrsPracticeRecord>({
    replicationIdentifier: 'supabase-sync-srs-practice-words',
    collection: db.srsPracticeWords,
    tableName: 'srs_practice_words',
    pullModifier: pullSrsPracticeModifier,
    pushModifier: pushSrsPracticeModifier,
  });

  const dailyUsage = createSupabaseCollectionReplication<DailyUsageRecord>({
    replicationIdentifier: 'supabase-sync-daily-usage',
    collection: db.dailyUsage,
    tableName: 'daily_usage',
    pullModifier: pullDailyUsageModifier,
    pushModifier: pushDailyUsageModifier,
  });

  const replicationMap: Record<SyncCollectionKey, RxReplicationState<any, SupabaseCheckpoint>> = {
    words,
    groups,
    missedWords,
    fsrsRecords,
    srsPracticeWords,
    dailyUsage,
  };

  const collectionLabels: Record<SyncCollectionKey, { label: string; tableName: string }> = {
    words: { label: 'Words', tableName: 'words' },
    groups: { label: 'Groups', tableName: 'groups' },
    missedWords: { label: 'Missed Words', tableName: 'missed_words' },
    fsrsRecords: { label: 'FSRS Records', tableName: 'fsrs_records' },
    srsPracticeWords: { label: 'SRS Practice', tableName: 'srs_practice_words' },
    dailyUsage: { label: 'Daily Usage', tableName: 'daily_usage' },
  };

  const allReplications = Object.values(replicationMap);

  const collectionObjects: Record<SyncCollectionKey, RxCollection<any>> = {
    words: db.words,
    groups: db.groups,
    missedWords: db.missedWords,
    fsrsRecords: db.fsrsRecords,
    srsPracticeWords: db.srsPracticeWords,
    dailyUsage: db.dailyUsage,
  };

  // Initialize unified state
  const syncState: UnifiedSyncState = {
    status: 'in_sync',
    isActive: false,
    isPaused: false,
    isInitialSyncComplete: false,
    totalSent: 0,
    totalReceived: 0,
    pendingCount: 0,
    lastSyncedAt: null,
    error: null,
    collections: {
      words: {
        key: 'words',
        label: 'Words',
        tableName: 'words',
        isActive: false,
        isPaused: false,
        error: null,
        lastSyncedAt: null,
        sentCount: 0,
        receivedCount: 0,
        pendingCount: 0,
      },
      groups: {
        key: 'groups',
        label: 'Groups',
        tableName: 'groups',
        isActive: false,
        isPaused: false,
        error: null,
        lastSyncedAt: null,
        sentCount: 0,
        receivedCount: 0,
        pendingCount: 0,
      },
      missedWords: {
        key: 'missedWords',
        label: 'Missed Words',
        tableName: 'missed_words',
        isActive: false,
        isPaused: false,
        error: null,
        lastSyncedAt: null,
        sentCount: 0,
        receivedCount: 0,
        pendingCount: 0,
      },
      fsrsRecords: {
        key: 'fsrsRecords',
        label: 'FSRS Records',
        tableName: 'fsrs_records',
        isActive: false,
        isPaused: false,
        error: null,
        lastSyncedAt: null,
        sentCount: 0,
        receivedCount: 0,
        pendingCount: 0,
      },
      srsPracticeWords: {
        key: 'srsPracticeWords',
        label: 'SRS Practice',
        tableName: 'srs_practice_words',
        isActive: false,
        isPaused: false,
        error: null,
        lastSyncedAt: null,
        sentCount: 0,
        receivedCount: 0,
        pendingCount: 0,
      },
      dailyUsage: {
        key: 'dailyUsage',
        label: 'Daily Usage',
        tableName: 'daily_usage',
        isActive: false,
        isPaused: false,
        error: null,
        lastSyncedAt: null,
        sentCount: 0,
        receivedCount: 0,
        pendingCount: 0,
      },
    },
    activities: [],
  };

  const listeners = new Set<(state: UnifiedSyncState) => void>();

  const recalculatePendingCount = () => {
    syncState.pendingCount = (Object.keys(syncState.collections) as SyncCollectionKey[]).reduce(
      (acc, k) => acc + (syncState.collections[k].pendingCount || 0),
      0
    );
  };

  const notify = () => {
    recalculatePendingCount();

    // Determine overall status
    const isAnyActive = (Object.keys(syncState.collections) as SyncCollectionKey[]).some(
      (k) => syncState.collections[k].isActive
    );
    const isAnyError = (Object.keys(syncState.collections) as SyncCollectionKey[]).some(
      (k) => syncState.collections[k].error !== null
    );
    const isAllPaused = (Object.keys(syncState.collections) as SyncCollectionKey[]).every(
      (k) => syncState.collections[k].isPaused
    );

    syncState.isActive = isAnyActive;
    syncState.isPaused = isAllPaused;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      syncState.status = 'offline';
    } else if (isAnyError) {
      syncState.status = 'error';
    } else if (isAllPaused) {
      syncState.status = 'paused';
    } else if (isAnyActive) {
      syncState.status = 'syncing';
    } else {
      syncState.status = 'in_sync';
    }

    const stateSnapshot = JSON.parse(JSON.stringify(syncState));
    listeners.forEach((listener) => {
      try {
        listener(stateSnapshot);
      } catch (err) {
        console.error('Error in sync state listener:', err);
      }
    });
  };

  const addActivity = (
    type: SyncActivityType,
    message: string,
    collection?: SyncCollectionKey,
    error?: string,
    count?: number
  ) => {
    const event: SyncActivityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      collection,
      message,
      error,
      count,
    };
    // Keep max 50 recent activities
    syncState.activities = [event, ...syncState.activities.slice(0, 49)];
    notify();
  };

  // Subscriptions management
  const subscriptions: Array<{ unsubscribe: () => void }> = [];

  (Object.keys(replicationMap) as SyncCollectionKey[]).forEach((key) => {
    const rep = replicationMap[key];
    const col = collectionObjects[key];
    const { label } = collectionLabels[key];

    // Local collection change events to track pending unpushed mutations
    const changeSub = col.$.subscribe((event: any) => {
      if (event?.isLocal) {
        syncState.collections[key].pendingCount += 1;
        notify();
      }
    });
    subscriptions.push(changeSub);

    // active$ observable
    const activeSub = rep.active$.subscribe((isActive) => {
      syncState.collections[key].isActive = isActive;
      if (
        !isActive &&
        !syncState.collections[key].error &&
        (typeof navigator === 'undefined' || navigator.onLine) &&
        !syncState.collections[key].isPaused
      ) {
        syncState.collections[key].pendingCount = 0;
      }
      notify();
    });
    subscriptions.push(activeSub);

    // sent$ observable
    const sentSub = rep.sent$.subscribe(() => {
      const now = new Date().toISOString();
      syncState.collections[key].sentCount += 1;
      syncState.collections[key].pendingCount = Math.max(
        0,
        syncState.collections[key].pendingCount - 1
      );
      syncState.collections[key].lastSyncedAt = now;
      syncState.totalSent += 1;
      syncState.lastSyncedAt = now;
      addActivity('sent', `Pushed ${label} update to cloud`, key, undefined, 1);
    });
    subscriptions.push(sentSub);

    // received$ observable
    const receivedSub = rep.received$.subscribe(() => {
      const now = new Date().toISOString();
      syncState.collections[key].receivedCount += 1;
      syncState.collections[key].lastSyncedAt = now;
      syncState.totalReceived += 1;
      syncState.lastSyncedAt = now;
      addActivity('received', `Received ${label} update from cloud`, key, undefined, 1);
    });
    subscriptions.push(receivedSub);

    // error$ observable
    const errorSub = rep.error$.subscribe((err: any) => {
      const errorMsg = err?.message || String(err) || 'Replication error';
      syncState.collections[key].error = errorMsg;
      syncState.error = errorMsg;
      addActivity('error', `${label} sync error: ${errorMsg}`, key, errorMsg);
    });
    subscriptions.push(errorSub);
  });

  const cancelAll = async () => {
    subscriptions.forEach((sub) => sub.unsubscribe());
    await Promise.all(allReplications.map((rep) => rep.cancel()));
  };

  const reSyncAll = async () => {
    (Object.keys(syncState.collections) as SyncCollectionKey[]).forEach((key) => {
      syncState.collections[key].error = null;
    });
    syncState.error = null;
    addActivity('resync', 'Triggered full synchronization across all collections');
    allReplications.forEach((rep) => rep.reSync());
  };

  const pauseAll = async () => {
    await Promise.all(allReplications.map((rep) => rep.pause()));
    (Object.keys(syncState.collections) as SyncCollectionKey[]).forEach((key) => {
      syncState.collections[key].isPaused = true;
    });
    syncState.isPaused = true;
    addActivity('paused', 'Live cloud synchronization paused');
  };

  const resumeAll = async () => {
    await Promise.all(allReplications.map((rep) => rep.start()));
    (Object.keys(syncState.collections) as SyncCollectionKey[]).forEach((key) => {
      syncState.collections[key].isPaused = false;
    });
    syncState.isPaused = false;
    addActivity('resumed', 'Live cloud synchronization resumed');
    allReplications.forEach((rep) => rep.reSync());
  };

  const isPaused = () => {
    return allReplications.every((rep) => rep.isPaused());
  };

  const awaitInitialReplication = async () => {
    await Promise.all(allReplications.map((rep) => rep.awaitInitialReplication()));
    syncState.isInitialSyncComplete = true;
    const now = new Date().toISOString();
    syncState.lastSyncedAt = now;
    (Object.keys(syncState.collections) as SyncCollectionKey[]).forEach((key) => {
      syncState.collections[key].pendingCount = 0;
    });
    syncState.pendingCount = 0;
    notify();
  };

  const awaitInSync = async (): Promise<boolean> => {
    try {
      addActivity('in_sync', 'Verifying full cloud convergence (awaitInSync)...');
      await Promise.all(allReplications.map((rep) => rep.awaitInSync()));
      const now = new Date().toISOString();
      syncState.lastSyncedAt = now;
      (Object.keys(syncState.collections) as SyncCollectionKey[]).forEach((key) => {
        syncState.collections[key].lastSyncedAt = now;
        syncState.collections[key].error = null;
        syncState.collections[key].pendingCount = 0;
      });
      syncState.pendingCount = 0;
      syncState.error = null;
      addActivity('in_sync', 'All 6 collections confirmed 100% in-sync with Cloud');
      notify();
      return true;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      syncState.error = errorMsg;
      addActivity('error', `Convergence verification failed: ${errorMsg}`, undefined, errorMsg);
      return false;
    }
  };

  const reSyncCollection = (key: SyncCollectionKey) => {
    const rep = replicationMap[key];
    if (rep) {
      syncState.collections[key].error = null;
      addActivity('resync', `Manual sync triggered for ${collectionLabels[key].label}`, key);
      rep.reSync();
    }
  };

  const pauseCollection = async (key: SyncCollectionKey) => {
    const rep = replicationMap[key];
    if (rep) {
      await rep.pause();
      syncState.collections[key].isPaused = true;
      addActivity('paused', `Paused sync for ${collectionLabels[key].label}`, key);
    }
  };

  const resumeCollection = async (key: SyncCollectionKey) => {
    const rep = replicationMap[key];
    if (rep) {
      await rep.start();
      syncState.collections[key].isPaused = false;
      addActivity('resumed', `Resumed sync for ${collectionLabels[key].label}`, key);
      rep.reSync();
    }
  };

  const getSyncState = () => {
    return JSON.parse(JSON.stringify(syncState));
  };

  const subscribeSyncState = (listener: (state: UnifiedSyncState) => void) => {
    listeners.add(listener);
    listener(getSyncState());
    return () => {
      listeners.delete(listener);
    };
  };

  const clearActivities = () => {
    syncState.activities = [];
    notify();
  };

  return {
    words,
    groups,
    missedWords,
    fsrsRecords,
    srsPracticeWords,
    dailyUsage,
    cancelAll,
    reSyncAll,
    pauseAll,
    resumeAll,
    isPaused,
    awaitInitialReplication,
    awaitInSync,
    reSyncCollection,
    pauseCollection,
    resumeCollection,
    getSyncState,
    subscribeSyncState,
    clearActivities,
  };
}
