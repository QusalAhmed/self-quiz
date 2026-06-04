import {
  addRxPlugin,
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxJsonSchema,
} from 'rxdb';
import { RxDBDevModePlugin, disableWarnings } from 'rxdb/plugins/dev-mode';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

export type WordRecord = {
  id: string;
  word: string;
  meaning: string;
  examples: string[];
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  lastSyncedAt: string;
};

export type MissedWordRecord = {
  id: string;
  wordId: string;
  word: string;
  meaning: string;
  missedAt: string;
  missedCount: number;
  updatedAt: string;
  lastSyncedAt: string;
  isDeleted: boolean;
};

export type WordCollection = RxCollection<WordRecord>;
export type MissedWordCollection = RxCollection<MissedWordRecord>;
export type AppDatabase = RxDatabase<{ words: WordCollection; missedWords: MissedWordCollection }>;

const wordSchema: RxJsonSchema<WordRecord> = {
  title: 'word schema',
  version: 2,
  description: 'English word memorization entries',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 64 },
    word: { type: 'string', maxLength: 128 },
    meaning: { type: 'string' },
    examples: {
      type: 'array',
      items: { type: 'string' },
      default: [],
    },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string', maxLength: 32 },
    isDeleted: { type: 'boolean', default: false },
    lastSyncedAt: { type: 'string', default: '' },
  },
  required: [
    'id',
    'word',
    'meaning',
    'examples',
    'createdAt',
    'updatedAt',
    'isDeleted',
    'lastSyncedAt',
  ],
  indexes: ['word', 'updatedAt', 'isDeleted'],
};

const missedWordSchema: RxJsonSchema<MissedWordRecord> = {
  title: 'missed words schema',
  version: 0,
  description: 'Words the user could not answer in quiz sessions',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 64 },
    wordId: { type: 'string', maxLength: 64 },
    word: { type: 'string', maxLength: 128 },
    meaning: { type: 'string' },
    missedAt: { type: 'string', maxLength: 32 },
    missedCount: { type: 'number', minimum: 1 },
    updatedAt: { type: 'string', maxLength: 32 },
    lastSyncedAt: { type: 'string', default: '' },
    isDeleted: { type: 'boolean', default: false },
  },
  required: [
    'id',
    'wordId',
    'word',
    'meaning',
    'missedAt',
    'missedCount',
    'updatedAt',
    'lastSyncedAt',
    'isDeleted',
  ],
  indexes: ['word', 'wordId', 'missedAt', 'updatedAt', 'isDeleted'],
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
        2: (oldDoc) => ({
          ...oldDoc,
          examples: Array.isArray(oldDoc.examples) ? oldDoc.examples : [],
        }),
      },
    },
    missedWords: {
      schema: missedWordSchema,
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
