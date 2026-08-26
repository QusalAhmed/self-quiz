import {
  addRxPlugin,
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxJsonSchema,
} from 'rxdb';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import type { FsrsCardState, FsrsRating, FsrsRecord } from './fsrs';
import { normalizeMerriamWebsterAudioUrl } from './pronounce';
import type {
  AppAiSettings,
  AppAppearanceSettings,
  AppAudioSettings,
  AppDataSettings,
  AppFsrsSettings,
  AppStudyQuizSettings,
} from './settings';
import type { SrsRecord } from './srs';
import type { SrsPracticeRecord } from './srs-practice';
import type { NotificationSettings } from './system-notifications';

export type SettingsRecord = {
  id: string;
  appearance: AppAppearanceSettings;
  studyQuiz: AppStudyQuizSettings;
  audio: AppAudioSettings;
  fsrs: AppFsrsSettings;
  ai: AppAiSettings;
  notifications: NotificationSettings;
  data: AppDataSettings;
  quranVerse?: import('./settings').AppQuranVerseSettings;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  lastSyncedAt: string;
};

export type WordRecord = {
  id: string;
  word: string;
  meaning: string;
  definitions: WordDefinition[];
  aiExampleCount: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  lastSyncedAt: string;
  customGroups: string[];
  notes?: string;
  usageFrequency?: string;
  generatorAiDetails?: string;
  audioUrl?: string;
  phonetic?: string;
  audioSource?: string;
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
export type { FsrsRecord };
export type { SrsPracticeRecord };

export type ReviewLogRecord = {
  id: string;
  wordId: string;
  cardId: string;
  quizMode: QuizMode;
  word: string;
  meaning: string;
  rating: FsrsRating;
  stateBefore: FsrsCardState;
  stateAfter: FsrsCardState;
  reviewedAt: string;
  durationMs: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  dueAt: string;
  previousDueAt?: string;
  lapses: number;
  reps: number;
  retrievability?: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  lastSyncedAt: string;
};

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

export type DailyUsageRecord = {
  id: string; // "YYYY-MM-DD:deviceId"
  date: string; // "YYYY-MM-DD"
  deviceId: string;
  seconds: number;
  updatedAt: string;
  lastSyncedAt: string;
  isDeleted: boolean;
};

export function buildMissedWordId(wordId: string, quizMode: QuizMode): string {
  return `${wordId}:${quizMode}`;
}

export type WordFamilyMemberRecord = {
  id: string;
  wordId: string;
  word: string;
  partOfSpeech: string;
  banglaDefinition: string;
  englishDefinition: string;
  examples: string[];
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  lastSyncedAt: string;
  usageFrequency?: string;
  generatorAiDetails?: string;
};

export type StoryWordReference = {
  wordId: string;
  word: string;
  meaning: string;
  partOfSpeech?: string;
};

export type StoryDifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type StoryRecord = {
  id: string;
  title: string;
  content: string;
  banglaTranslation?: string;
  genre: string;
  difficulty?: StoryDifficultyLevel;
  targetWords: StoryWordReference[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  lastSyncedAt: string;
};

export type QuranVerseRecord = {
  id: string; // "chapter:verse" or "chapter:start-end" e.g. "2:255" or "94:5-6"
  chapter: number;
  verse: number;
  verseEnd?: number; // End verse for ranges (e.g. 6 in 94:5-6)
  category?: string;
  notes?: string;
  status: 'active' | 'paused' | 'error' | 'success';
  viewCount: number;
  lastViewedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  lastSyncedAt: string;
};

export type WordCollection = RxCollection<WordRecord>;
export type MissedWordCollection = RxCollection<MissedWordRecord>;
export type GroupCollection = RxCollection<GroupRecord>;
export type WordFamilyCollection = RxCollection<WordFamilyMemberRecord>;
export type SrsCollection = RxCollection<SrsRecord>;
export type FsrsCollection = RxCollection<FsrsRecord>;
export type SrsPracticeCollection = RxCollection<SrsPracticeRecord>;
export type DailyUsageCollection = RxCollection<DailyUsageRecord>;
export type ReviewLogCollection = RxCollection<ReviewLogRecord>;
export type SettingsCollection = RxCollection<SettingsRecord>;
export type StoryCollection = RxCollection<StoryRecord>;
export type QuranVerseCollection = RxCollection<QuranVerseRecord>;
export type AppDatabase = RxDatabase<{
  words: WordCollection;
  missedWords: MissedWordCollection;
  groups: GroupCollection;
  wordFamilies: WordFamilyCollection;
  srsRecords: SrsCollection;
  fsrsRecords: FsrsCollection;
  srsPracticeWords: SrsPracticeCollection;
  dailyUsage: DailyUsageCollection;
  reviewLogs: ReviewLogCollection;
  settings: SettingsCollection;
  stories: StoryCollection;
  quranVerses: QuranVerseCollection;
}>;

const wordSchema: RxJsonSchema<WordRecord> = {
  title: 'word schema',
  version: 11,
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
    aiExampleCount: { type: 'number', minimum: 1, maximum: 10, default: 5 },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string', maxLength: 32 },
    isDeleted: { type: 'boolean', default: false },
    lastSyncedAt: { type: 'string', default: '' },
    customGroups: {
      type: 'array',
      items: { type: 'string' },
      default: [],
    },
    notes: { type: 'string', default: '' },
    usageFrequency: { type: 'string', default: '' },
    generatorAiDetails: { type: 'string', default: '' },
    audioUrl: { type: 'string', default: '' },
    phonetic: { type: 'string', default: '' },
    audioSource: { type: 'string', default: '' },
  },
  required: [
    'id',
    'word',
    'meaning',
    'definitions',
    'aiExampleCount',
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

const fsrsSchema: RxJsonSchema<FsrsRecord> = {
  title: 'fsrs records schema',
  version: 2,
  description: 'FSRS scheduling data per word per quiz mode',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 128 },
    wordId: { type: 'string', maxLength: 64 },
    quizMode: { type: 'string', maxLength: 16 },
    word: { type: 'string', maxLength: 128 },
    meaning: { type: 'string' },
    dueAt: { type: 'string', maxLength: 32 },
    stability: { type: 'number', minimum: 0 },
    difficulty: { type: 'number', minimum: 0 },
    elapsedDays: { type: 'number', minimum: 0 },
    scheduledDays: { type: 'number', minimum: 0 },
    learningSteps: { type: 'number', minimum: 0 },
    reps: { type: 'number', minimum: 0 },
    lapses: { type: 'number', minimum: 0 },
    state: {
      type: 'string',
      enum: ['New', 'Learning', 'Review', 'Relearning'],
    },
    lastReviewedAt: { type: 'string', maxLength: 32 },
    updatedAt: { type: 'string', maxLength: 32 },
    lastSyncedAt: { type: 'string', default: '' },
    isDeleted: { type: 'boolean', default: false },
    lastRating: { type: 'string', maxLength: 16 },
  },
  required: [
    'id',
    'wordId',
    'quizMode',
    'word',
    'meaning',
    'dueAt',
    'stability',
    'difficulty',
    'elapsedDays',
    'scheduledDays',
    'learningSteps',
    'reps',
    'lapses',
    'state',
    'lastReviewedAt',
    'updatedAt',
    'lastSyncedAt',
    'isDeleted',
  ],
  indexes: ['wordId', 'quizMode', 'dueAt', 'updatedAt', 'isDeleted'],
};

const wordFamilySchema: RxJsonSchema<WordFamilyMemberRecord> = {
  title: 'word family schema',
  version: 2,
  description: 'Word family members derived from a root/added vocabulary word',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 128 },
    wordId: { type: 'string', maxLength: 64 },
    word: { type: 'string', maxLength: 128 },
    partOfSpeech: { type: 'string', maxLength: 64 },
    banglaDefinition: { type: 'string' },
    englishDefinition: { type: 'string' },
    examples: {
      type: 'array',
      items: { type: 'string' },
      default: [],
    },
    usageFrequency: { type: 'string', default: '' },
    generatorAiDetails: { type: 'string', default: '' },
    createdAt: { type: 'string', maxLength: 32 },
    updatedAt: { type: 'string', maxLength: 32 },
    isDeleted: { type: 'boolean', default: false },
    lastSyncedAt: { type: 'string', default: '' },
  },
  required: [
    'id',
    'wordId',
    'word',
    'partOfSpeech',
    'banglaDefinition',
    'englishDefinition',
    'examples',
    'createdAt',
    'updatedAt',
    'isDeleted',
    'lastSyncedAt',
  ],
  indexes: ['wordId', 'word', 'updatedAt', 'isDeleted'],
};

const dailyUsageSchema: RxJsonSchema<DailyUsageRecord> = {
  title: 'daily usage schema',
  version: 1,
  description: 'Daily usage time per device',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 128 },
    date: { type: 'string', maxLength: 16 },
    deviceId: { type: 'string', maxLength: 64 },
    seconds: { type: 'number', minimum: 0 },
    updatedAt: { type: 'string', maxLength: 32 },
    lastSyncedAt: { type: 'string', default: '' },
    isDeleted: { type: 'boolean', default: false },
  },
  required: ['id', 'date', 'deviceId', 'seconds', 'updatedAt', 'lastSyncedAt', 'isDeleted'],
  indexes: ['date', 'deviceId', 'updatedAt', 'isDeleted'],
};

const reviewLogSchema: RxJsonSchema<ReviewLogRecord> = {
  title: 'review log schema',
  version: 1,
  description: 'Immutable historical review logs for spaced repetition events',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 128 },
    wordId: { type: 'string', maxLength: 64 },
    cardId: { type: 'string', maxLength: 128 },
    quizMode: { type: 'string', maxLength: 16 },
    word: { type: 'string', maxLength: 128 },
    meaning: { type: 'string' },
    rating: {
      type: 'string',
      maxLength: 16,
      enum: ['again', 'hard', 'good', 'easy'],
    },
    stateBefore: {
      type: 'string',
      maxLength: 16,
      enum: ['New', 'Learning', 'Review', 'Relearning'],
    },
    stateAfter: {
      type: 'string',
      maxLength: 16,
      enum: ['New', 'Learning', 'Review', 'Relearning'],
    },
    reviewedAt: { type: 'string', maxLength: 32 },
    durationMs: { type: 'number', minimum: 0, default: 0 },
    stability: { type: 'number', minimum: 0 },
    difficulty: { type: 'number', minimum: 0 },
    elapsedDays: { type: 'number', minimum: 0 },
    scheduledDays: { type: 'number', minimum: 0 },
    dueAt: { type: 'string', maxLength: 32 },
    previousDueAt: { type: 'string', maxLength: 32 },
    lapses: { type: 'number', minimum: 0 },
    reps: { type: 'number', minimum: 0 },
    retrievability: { type: 'number', minimum: 0 },
    createdAt: { type: 'string', maxLength: 32 },
    updatedAt: { type: 'string', maxLength: 32 },
    isDeleted: { type: 'boolean', default: false },
    lastSyncedAt: { type: 'string', default: '' },
  },
  required: [
    'id',
    'wordId',
    'cardId',
    'quizMode',
    'word',
    'meaning',
    'rating',
    'stateBefore',
    'stateAfter',
    'reviewedAt',
    'durationMs',
    'stability',
    'difficulty',
    'elapsedDays',
    'scheduledDays',
    'dueAt',
    'lapses',
    'reps',
    'createdAt',
    'updatedAt',
    'isDeleted',
    'lastSyncedAt',
  ],
  indexes: ['wordId', 'cardId', 'reviewedAt', 'rating', 'updatedAt', 'isDeleted'],
};

const settingsSchema: RxJsonSchema<SettingsRecord> = {
  title: 'settings schema',
  version: 1,
  description: 'Application preferences and configuration settings',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 64 },
    appearance: { type: 'object' },
    studyQuiz: { type: 'object' },
    audio: { type: 'object' },
    fsrs: { type: 'object' },
    ai: { type: 'object' },
    notifications: { type: 'object' },
    data: { type: 'object' },
    quranVerse: { type: 'object' },
    createdAt: { type: 'string', maxLength: 32 },
    updatedAt: { type: 'string', maxLength: 32 },
    isDeleted: { type: 'boolean', default: false },
    lastSyncedAt: { type: 'string', default: '' },
  },
  required: [
    'id',
    'appearance',
    'studyQuiz',
    'audio',
    'fsrs',
    'ai',
    'notifications',
    'data',
    'createdAt',
    'updatedAt',
    'isDeleted',
    'lastSyncedAt',
  ],
  indexes: ['updatedAt', 'isDeleted'],
};

const storySchema: RxJsonSchema<StoryRecord> = {
  title: 'story schema',
  version: 1,
  description: 'AI-generated vocabulary learning stories',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 64 },
    title: { type: 'string', maxLength: 256 },
    content: { type: 'string' },
    banglaTranslation: { type: 'string', default: '' },
    genre: { type: 'string', maxLength: 64 },
    difficulty: { type: 'string', maxLength: 32, default: 'intermediate' },
    targetWords: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          wordId: { type: 'string' },
          word: { type: 'string' },
          meaning: { type: 'string' },
          partOfSpeech: { type: 'string' },
        },
        required: ['wordId', 'word', 'meaning'],
      },
      default: [],
    },
    isFavorite: { type: 'boolean', default: false },
    createdAt: { type: 'string', maxLength: 32 },
    updatedAt: { type: 'string', maxLength: 32 },
    isDeleted: { type: 'boolean', default: false },
    lastSyncedAt: { type: 'string', default: '' },
  },
  required: [
    'id',
    'title',
    'content',
    'genre',
    'targetWords',
    'isFavorite',
    'createdAt',
    'updatedAt',
    'isDeleted',
    'lastSyncedAt',
  ],
  indexes: ['updatedAt', 'isDeleted'],
};

const quranVerseSchema: RxJsonSchema<QuranVerseRecord> = {
  title: 'quran verse schema',
  version: 1,
  description: 'Quran verses and display tracking for recurring motivational popups',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 32 },
    chapter: { type: 'number', minimum: 1, maximum: 114 },
    verse: { type: 'number', minimum: 1, maximum: 286 },
    verseEnd: { type: 'number', minimum: 1, maximum: 286 },
    category: { type: 'string', default: 'Inspirational' },
    notes: { type: 'string', default: '' },
    status: { type: 'string', maxLength: 32, default: 'active' },
    viewCount: { type: 'number', minimum: 0, default: 0 },
    lastViewedAt: { type: 'string', default: '' },
    lastError: { type: 'string', default: '' },
    createdAt: { type: 'string', maxLength: 32 },
    updatedAt: { type: 'string', maxLength: 32 },
    isDeleted: { type: 'boolean', default: false },
    lastSyncedAt: { type: 'string', default: '' },
  },
  required: [
    'id',
    'chapter',
    'verse',
    'status',
    'viewCount',
    'createdAt',
    'updatedAt',
    'isDeleted',
    'lastSyncedAt',
  ],
  indexes: ['status', 'updatedAt', 'isDeleted'],
};

if (process.env.NODE_ENV !== 'production') {
  addRxPlugin(RxDBDevModePlugin);
}
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

let databasePromise: Promise<AppDatabase> | null = null;

async function createDatabase(): Promise<AppDatabase> {
  const baseStorage = getRxStorageDexie();
  const storage =
    process.env.NODE_ENV !== 'production'
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
        8: (oldDoc) => ({
          ...oldDoc,
          aiExampleCount: 5,
        }),
        9: (oldDoc) => ({
          ...oldDoc,
          notes: oldDoc.notes || '',
        }),
        10: (oldDoc) => ({
          ...oldDoc,
          usageFrequency: oldDoc.usageFrequency || '',
          generatorAiDetails: oldDoc.generatorAiDetails || '',
        }),
        11: (oldDoc) => ({
          ...oldDoc,
          audioUrl: oldDoc.audioUrl || '',
          phonetic: oldDoc.phonetic || '',
          audioSource: oldDoc.audioSource || '',
        }),
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
    fsrsRecords: {
      schema: fsrsSchema,
      migrationStrategies: {
        1: (oldDoc) => ({ ...oldDoc }),
        2: (oldDoc) => ({ ...oldDoc, lastRating: oldDoc.lastRating || '' }),
      },
    },
    srsPracticeWords: {
      schema: srsPracticeSchema,
      migrationStrategies: {
        1: (oldDoc) => ({ ...oldDoc }),
      },
    },
    dailyUsage: {
      schema: dailyUsageSchema,
      migrationStrategies: {
        1: (oldDoc) => ({ ...oldDoc }),
      },
    },
    wordFamilies: {
      schema: wordFamilySchema,
      migrationStrategies: {
        1: (oldDoc) => ({ ...oldDoc }),
        2: (oldDoc) => ({
          ...oldDoc,
          usageFrequency: oldDoc.usageFrequency || '',
          generatorAiDetails: oldDoc.generatorAiDetails || '',
        }),
      },
    },
    reviewLogs: {
      schema: reviewLogSchema,
      migrationStrategies: {
        1: (oldDoc) => ({ ...oldDoc }),
      },
    },
    settings: {
      schema: settingsSchema,
      migrationStrategies: {
        1: (oldDoc) => ({ ...oldDoc }),
      },
    },
    stories: {
      schema: storySchema,
      migrationStrategies: {
        1: (oldDoc) => ({ ...oldDoc }),
      },
    },
    quranVerses: {
      schema: quranVerseSchema,
      migrationStrategies: {
        1: (oldDoc) => ({ ...oldDoc }),
      },
    },
  });

  // Asynchronously self-heal any legacy malformed audio URLs
  void repairLegacyWordAudioUrls(database);

  return database;
}

async function repairLegacyWordAudioUrls(database: AppDatabase): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const wordDocs = await database.words
      .find({
        selector: {
          audioUrl: { $ne: '' },
        },
      })
      .exec();

    for (const doc of wordDocs) {
      const currentUrl = doc.audioUrl;
      const normalized = normalizeMerriamWebsterAudioUrl(currentUrl);
      if (normalized && normalized !== currentUrl) {
        await doc.patch({
          audioUrl: normalized,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch {
    // Non-blocking background repair
  }
}

export function getDatabase(): Promise<AppDatabase> {
  if (!databasePromise) {
    databasePromise = createDatabase();
  }

  return databasePromise;
}
