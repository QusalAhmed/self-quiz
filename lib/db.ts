import { addRxPlugin, createRxDatabase } from 'rxdb';
import type { RxCollection, RxDatabase, RxJsonSchema } from 'rxdb';
import { RxDBDevModePlugin, disableWarnings } from 'rxdb/plugins/dev-mode';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

export type WordRecord = {
  id: string;
  word: string;
  meaning: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  lastSyncedAt: string;
};

export type WordCollection = RxCollection<WordRecord>;
export type AppDatabase = RxDatabase<{ words: WordCollection }>;

const wordSchema: RxJsonSchema<WordRecord> = {
  title: 'word schema',
  version: 1,
  description: 'English word memorization entries',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 64 },
    word: { type: 'string', maxLength: 128 },
    meaning: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string', maxLength: 32 },
    isDeleted: { type: 'boolean', default: false },
    lastSyncedAt: { type: 'string', default: '' },
  },
  required: ['id', 'word', 'meaning', 'createdAt', 'updatedAt', 'isDeleted', 'lastSyncedAt'],
  indexes: ['word', 'updatedAt', 'isDeleted'],
};

if (process.env.NODE_ENV === 'development') {
  addRxPlugin(RxDBDevModePlugin);
  disableWarnings();
}
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

let databasePromise: Promise<AppDatabase> | null = null;

async function createDatabase(): Promise<AppDatabase> {
  const baseStorage = getRxStorageDexie();
  const storage =
    process.env.NODE_ENV === 'development'
      ? wrappedValidateAjvStorage({ storage: baseStorage })
      : baseStorage;

  const database = await createRxDatabase<AppDatabase>({
    name: 'self_quiz',
    storage,
    closeDuplicates: true,
  });

  await database.addCollections({
    words: {
      schema: wordSchema,
      migrationStrategies: {
        1: (oldDoc) => ({ ...oldDoc }),
      },
    },
  });

  return database;
}

export function getDatabase(): Promise<AppDatabase> {
  if (!databasePromise) {
    databasePromise = createDatabase();
  }

  return databasePromise;
}
