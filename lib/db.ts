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
  userExamples: string[];
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  lastSyncedAt: string;
};

export type QuizMode = 'wordToMeaning' | 'meaningToWord' | 'spelling';

export type MissedWordRecord = {
  id: string;
  wordId: string;
  quizMode: QuizMode;
  word: string;
  meaning: string;
  missedAt: string;
  missedCount: number;
  updatedAt: string;
  lastSyncedAt: string;
  isDeleted: boolean;
};

export function buildMissedWordId(wordId: string, quizMode: QuizMode): string {
  return `${wordId}:${quizMode}`;
}

export type WordCollection = RxCollection<WordRecord>;
export type MissedWordCollection = RxCollection<MissedWordRecord>;
export type AppDatabase = RxDatabase<{ words: WordCollection; missedWords: MissedWordCollection }>;

const wordSchema: RxJsonSchema<WordRecord> = {
  title: 'word schema',
  version: 3,
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
    userExamples: {
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
    'userExamples',
    'createdAt',
    'updatedAt',
    'isDeleted',
    'lastSyncedAt',
  ],
  indexes: ['word', 'updatedAt', 'isDeleted'],
};

const missedWordSchema: RxJsonSchema<MissedWordRecord> = {
  title: 'missed words schema',
  version: 1,
  description: 'Words the user could not answer in quiz sessions',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 96 },
    wordId: { type: 'string', maxLength: 64 },
    quizMode: { type: 'string', maxLength: 16 },
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
    'quizMode',
    'word',
    'meaning',
    'missedAt',
    'missedCount',
    'updatedAt',
    'lastSyncedAt',
    'isDeleted',
  ],
  indexes: ['word', 'wordId', 'quizMode', 'missedAt', 'updatedAt', 'isDeleted'],
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
        3: (oldDoc) => ({
          ...oldDoc,
          userExamples: Array.isArray(oldDoc.userExamples) ? oldDoc.userExamples : [],
        }),
      },
    },
    missedWords: {
      schema: missedWordSchema,
      migrationStrategies: {
        1: (oldDoc) => {
          const wordId = oldDoc.wordId || oldDoc.id;
          const quizMode = oldDoc.quizMode || 'wordToMeaning';
          const id = String(oldDoc.id).includes(':')
            ? oldDoc.id
            : buildMissedWordId(wordId, quizMode);
          return {
            ...oldDoc,
            id,
            wordId,
            quizMode,
          };
        },
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
