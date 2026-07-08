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
import type { SrsRecord } from './srs';
import type { SrsPracticeRecord } from './srs-practice';

export type WordRecord = {
  id: string;
  word: string;
  meaning: string;
  definitions: WordDefinition[];
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  lastSyncedAt: string;
  customGroups: string[];
};

export type WordDefinition = {
  meaning: string;
  partOfSpeech: string;
  /** AI-generated example sentences for this specific definition. */
  examples: string[];
  /** User-authored example sentences for this specific definition. */
  userExamples: string[];
};

export type GroupRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  lastSyncedAt: string;
};

export type QuizMode = 'wordToMeaning' | 'meaningToWord' | 'spelling';

export type { SrsRecord };
export type { SrsPracticeRecord };

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
export type GroupCollection = RxCollection<GroupRecord>;
export type SrsCollection = RxCollection<SrsRecord>;
export type SrsPracticeCollection = RxCollection<SrsPracticeRecord>;
export type AppDatabase = RxDatabase<{
  words: WordCollection;
  missedWords: MissedWordCollection;
  groups: GroupCollection;
  srsRecords: SrsCollection;
  srsPracticeWords: SrsPracticeCollection;
}>;

const wordSchema: RxJsonSchema<WordRecord> = {
  title: 'word schema',
  version: 7,
  description: 'English word memorization entries',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 64 },
    word: { type: 'string', maxLength: 128 },
    meaning: { type: 'string' },
    definitions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          meaning: { type: 'string' },
          partOfSpeech: { type: 'string' },
          examples: {
            type: 'array',
            items: { type: 'string' },
          },
          userExamples: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['meaning', 'partOfSpeech', 'examples', 'userExamples'],
      },
      default: [],
    },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string', maxLength: 32 },
    isDeleted: { type: 'boolean', default: false },
    lastSyncedAt: { type: 'string', default: '' },
    customGroups: {
      type: 'array',
      items: { type: 'string' },
      default: [],
    },
  },
  required: [
    'id',
    'word',
    'meaning',
    'definitions',
    'createdAt',
    'updatedAt',
    'isDeleted',
    'lastSyncedAt',
    'customGroups',
  ],
  indexes: ['word', 'updatedAt', 'isDeleted'],
};

const groupSchema: RxJsonSchema<GroupRecord> = {
  title: 'group schema',
  version: 1,
  description: 'Vocabulary word groups',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 64 },
    name: { type: 'string', maxLength: 128 },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string', maxLength: 32 },
    isDeleted: { type: 'boolean', default: false },
    lastSyncedAt: { type: 'string', default: '' },
  },
  required: ['id', 'name', 'createdAt', 'updatedAt', 'isDeleted', 'lastSyncedAt'],
  indexes: ['name', 'updatedAt', 'isDeleted'],
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

const srsSchema: RxJsonSchema<SrsRecord> = {
  title: 'srs records schema',
  version: 1,
  description: 'Spaced Repetition System scheduling data per word per quiz mode',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 128 },
    wordId: { type: 'string', maxLength: 64 },
    quizMode: { type: 'string', maxLength: 16 },
    word: { type: 'string', maxLength: 128 },
    meaning: { type: 'string' },
    easeFactor: { type: 'number', minimum: 1.3, default: 2.5 },
    interval: { type: 'number', minimum: 0, default: 0 },
    repetitions: { type: 'number', minimum: 0, default: 0 },
    nextReviewAt: { type: 'string', maxLength: 32 },
    lastReviewedAt: { type: 'string', maxLength: 32 },
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
    'easeFactor',
    'interval',
    'repetitions',
    'nextReviewAt',
    'lastReviewedAt',
    'updatedAt',
    'lastSyncedAt',
    'isDeleted',
  ],
  indexes: ['wordId', 'quizMode', 'nextReviewAt', 'updatedAt', 'isDeleted'],
};

const srsPracticeSchema: RxJsonSchema<SrsPracticeRecord> = {
  title: 'srs practice words schema',
  version: 1,
  description: 'Recently practiced SRS words with the latest rating',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 128 },
    wordId: { type: 'string', maxLength: 64 },
    quizMode: { type: 'string', maxLength: 16 },
    word: { type: 'string', maxLength: 128 },
    meaning: { type: 'string' },
    difficulty: { type: 'string', maxLength: 8 },
    practicedAt: { type: 'string', maxLength: 32 },
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
    'difficulty',
    'practicedAt',
    'updatedAt',
    'lastSyncedAt',
    'isDeleted',
  ],
  indexes: ['wordId', 'quizMode', 'practicedAt', 'updatedAt', 'isDeleted'],
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
        4: (oldDoc) => ({
          ...oldDoc,
          customGroup: oldDoc.customGroup || '',
        }),
        5: (oldDoc) => {
          const legacyGroup =
            typeof oldDoc.customGroup === 'string' ? oldDoc.customGroup.trim() : '';
          const existingGroups = Array.isArray(oldDoc.customGroups)
            ? oldDoc.customGroups.filter(
                (g: unknown) => typeof g === 'string' && g.trim().length > 0
              )
            : legacyGroup
              ? [legacyGroup]
              : [];
          const { customGroup: _removed, ...rest } = oldDoc;
          return {
            ...rest,
            customGroups: Array.from(new Set(existingGroups)),
          };
        },
        6: (oldDoc) => ({
          ...oldDoc,
          definitions: Array.isArray(oldDoc.definitions)
            ? oldDoc.definitions
                .map((definition: unknown) => {
                  if (typeof definition === 'string') {
                    const meaning = definition.trim();
                    return meaning ? { meaning, partOfSpeech: '' } : null;
                  }
                  if (!definition || typeof definition !== 'object') {
                    return null;
                  }
                  const value = definition as {
                    meaning?: unknown;
                    definition?: unknown;
                    partOfSpeech?: unknown;
                  };
                  const meaning =
                    typeof value.meaning === 'string'
                      ? value.meaning.trim()
                      : typeof value.definition === 'string'
                        ? value.definition.trim()
                        : '';
                  const partOfSpeech =
                    typeof value.partOfSpeech === 'string' ? value.partOfSpeech.trim() : '';
                  return meaning ? { meaning, partOfSpeech } : null;
                })
                .filter(Boolean)
            : typeof oldDoc.meaning === 'string' && oldDoc.meaning.trim()
              ? [{ meaning: oldDoc.meaning.trim(), partOfSpeech: '' }]
              : [],
        }),
        7: (oldDoc) => {
          const legacyExamples = Array.isArray(oldDoc.examples)
            ? oldDoc.examples.filter((e: unknown) => typeof e === 'string' && e.trim().length > 0)
            : [];
          const legacyUserExamples = Array.isArray(oldDoc.userExamples)
            ? oldDoc.userExamples.filter(
                (e: unknown) => typeof e === 'string' && e.trim().length > 0
              )
            : [];

          let definitions = (Array.isArray(oldDoc.definitions) ? oldDoc.definitions : []).map(
            (definition: unknown) => {
              const value = (definition && typeof definition === 'object' ? definition : {}) as {
                meaning?: unknown;
                partOfSpeech?: unknown;
              };
              return {
                meaning: typeof value.meaning === 'string' ? value.meaning : '',
                partOfSpeech: typeof value.partOfSpeech === 'string' ? value.partOfSpeech : '',
                examples: [],
                userExamples: [],
              };
            }
          );

          if (
            definitions.length === 0 &&
            (legacyExamples.length > 0 || legacyUserExamples.length > 0)
          ) {
            definitions = [{ meaning: '', partOfSpeech: '', examples: [], userExamples: [] }];
          }

          if (definitions.length > 0) {
            definitions[0] = {
              ...definitions[0],
              examples: legacyExamples,
              userExamples: legacyUserExamples,
            };
          }

          const { examples: _examples, userExamples: _userExamples, ...rest } = oldDoc;
          return {
            ...rest,
            definitions,
          };
        },
      },
    },
    groups: {
      schema: groupSchema,
      migrationStrategies: {
        1: (oldDoc) => ({ ...oldDoc }),
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
    srsRecords: {
      schema: srsSchema,
      migrationStrategies: {
        1: (oldDoc) => ({ ...oldDoc }),
      },
    },
    srsPracticeWords: {
      schema: srsPracticeSchema,
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
