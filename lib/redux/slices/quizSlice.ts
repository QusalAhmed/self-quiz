import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  PracticeDisplayKey,
  QuizDirectionKey,
  QuizRangeKey,
  QuizSourceKey,
} from '@/app/home/constants';
import { getInitialCustomEnd, getInitialCustomStart } from '@/app/home/utils';
import type { FsrsRecord, SrsRecord, WordDefinition } from '@/lib/db';

export interface QuizItem {
  id: string;
  word: string;
  meaning: string;
  definitions?: WordDefinition[];
  tags?: string[];
  notes?: string;
  fsrsRecord?: FsrsRecord;
}

export interface QuizHistoryItem {
  fsrsRecord?: FsrsRecord;
  srsRecord?: SrsRecord;
  previousQueue: QuizItem[];
  previousIndex: number;
  previousRevealed: boolean;
  previousCompleted: boolean;
}

export interface QuizFilterState {
  mode: 'study' | 'quiz';
  quizRange: QuizRangeKey;
  quizSource: QuizSourceKey;
  quizDirection: QuizDirectionKey;
  quizGroupFilter: string;
  customStart: string;
  customEnd: string;
  practiceDisplayMode: PracticeDisplayKey;
  autoPronounceQuizWord: boolean;
  hideMissedMeanings: boolean;
  hideSrsPracticeMeanings: boolean;
}

export interface QuizSliceState extends QuizFilterState {
  queue: QuizItem[];
  currentIndex: number;
  revealed: boolean;
  completed: boolean;
  history: QuizHistoryItem[];
  isInitialized: boolean;
  poolSignature: string;
  revealedMissedWordIds: Record<string, boolean>;
  revealedSrsPracticeWordIds: Record<string, boolean>;
}

export function computePoolSignature(filters: {
  quizRange: QuizRangeKey;
  quizSource: QuizSourceKey;
  quizDirection: QuizDirectionKey;
  quizGroupFilter: string;
  customStart: string;
  customEnd: string;
  practiceDisplayMode?: PracticeDisplayKey;
}): string {
  return [
    filters.quizRange,
    filters.quizSource,
    filters.quizDirection,
    filters.quizGroupFilter,
    filters.quizRange === 'custom' ? `${filters.customStart}_${filters.customEnd}` : '',
    filters.quizSource === 'fsrsForgetting' ? (filters.practiceDisplayMode ?? '') : '',
  ].join('::');
}

const initialCustomStart = getInitialCustomStart();
const initialCustomEnd = getInitialCustomEnd();

const initialState: QuizSliceState = {
  mode: 'study',
  quizRange: 'all',
  quizSource: 'words',
  quizDirection: 'wordToMeaning',
  quizGroupFilter: 'all',
  customStart: initialCustomStart,
  customEnd: initialCustomEnd,
  practiceDisplayMode: 'missed',
  autoPronounceQuizWord: false,
  hideMissedMeanings: false,
  hideSrsPracticeMeanings: false,
  revealedMissedWordIds: {},
  revealedSrsPracticeWordIds: {},
  queue: [],
  currentIndex: 0,
  revealed: false,
  completed: false,
  history: [],
  isInitialized: false,
  poolSignature: '',
};

export const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    setMode: (state, action: PayloadAction<'study' | 'quiz'>) => {
      state.mode = action.payload;
    },

    setQuizRange: (state, action: PayloadAction<QuizRangeKey>) => {
      state.quizRange = action.payload;
    },

    setQuizSource: (state, action: PayloadAction<QuizSourceKey>) => {
      state.quizSource = action.payload;
    },

    setQuizDirection: (state, action: PayloadAction<QuizDirectionKey>) => {
      state.quizDirection = action.payload;
      state.revealed = false;
    },

    setQuizGroupFilter: (state, action: PayloadAction<string>) => {
      state.quizGroupFilter = action.payload;
    },

    setCustomStart: (state, action: PayloadAction<string>) => {
      state.customStart = action.payload;
    },

    setCustomEnd: (state, action: PayloadAction<string>) => {
      state.customEnd = action.payload;
    },

    setPracticeDisplayMode: (state, action: PayloadAction<PracticeDisplayKey>) => {
      state.practiceDisplayMode = action.payload;
    },

    setAutoPronounceQuizWord: (state, action: PayloadAction<boolean>) => {
      state.autoPronounceQuizWord = action.payload;
    },

    setHideMissedMeanings: (state, action: PayloadAction<boolean>) => {
      state.hideMissedMeanings = action.payload;
      if (action.payload) {
        state.revealedMissedWordIds = {};
      }
    },

    setHideSrsPracticeMeanings: (state, action: PayloadAction<boolean>) => {
      state.hideSrsPracticeMeanings = action.payload;
      if (action.payload) {
        state.revealedSrsPracticeWordIds = {};
      }
    },

    setRevealedMissedWordIds: (
      state,
      action: PayloadAction<
        Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)
      >
    ) => {
      if (typeof action.payload === 'function') {
        state.revealedMissedWordIds = action.payload(state.revealedMissedWordIds);
      } else {
        state.revealedMissedWordIds = action.payload;
      }
    },

    setRevealedSrsPracticeWordIds: (
      state,
      action: PayloadAction<
        Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)
      >
    ) => {
      if (typeof action.payload === 'function') {
        state.revealedSrsPracticeWordIds = action.payload(state.revealedSrsPracticeWordIds);
      } else {
        state.revealedSrsPracticeWordIds = action.payload;
      }
    },

    openAllWordsQuiz: (state) => {
      state.mode = 'quiz';
      state.quizSource = 'words';
      state.quizRange = 'all';
      state.quizGroupFilter = 'all';
    },

    openTodayQuiz: (state) => {
      state.mode = 'quiz';
      state.quizSource = 'words';
      state.quizRange = 'today';
      state.quizGroupFilter = 'all';
    },

    openFsrsQuiz: (state) => {
      state.mode = 'quiz';
      state.quizSource = 'fsrs';
    },

    openSrsPracticeQuiz: (state) => {
      state.mode = 'quiz';
      state.quizSource = 'fsrs';
      state.quizRange = 'all';
      state.quizGroupFilter = 'all';
    },

    openForgettingQuiz: (state) => {
      state.mode = 'quiz';
      state.quizSource = 'fsrsForgetting';
    },

    setQuizFilters: (state, action: PayloadAction<Partial<QuizFilterState>>) => {
      Object.assign(state, action.payload);
    },

    setQuizQueue: (
      state,
      action: PayloadAction<{
        queue: QuizItem[];
        poolSignature?: string;
      }>
    ) => {
      state.queue = action.payload.queue;
      state.currentIndex = 0;
      state.revealed = false;
      state.completed = action.payload.queue.length === 0;
      state.history = [];
      state.isInitialized = true;
      if (action.payload.poolSignature !== undefined) {
        state.poolSignature = action.payload.poolSignature;
      }
    },

    nextCard: (state) => {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.queue.length) {
        state.completed = true;
        state.revealed = false;
      } else {
        state.currentIndex = nextIndex;
        state.revealed = false;
      }
    },

    previousCard: (state) => {
      state.currentIndex = Math.max(0, state.currentIndex - 1);
      state.revealed = false;
    },

    setRevealed: (state, action: PayloadAction<boolean>) => {
      state.revealed = action.payload;
    },

    pushQuizHistory: (state, action: PayloadAction<QuizHistoryItem>) => {
      state.history.push(action.payload);
    },

    undoQuizHistory: (state) => {
      const last = state.history.pop();
      if (!last) {
        return;
      }
      state.queue = last.previousQueue;
      state.currentIndex = last.previousIndex;
      state.revealed = true;
      state.completed = last.previousCompleted;
    },

    updateQuizItem: (
      state,
      action: PayloadAction<{
        id: string;
        word?: string;
        meaning?: string;
        definitions?: WordDefinition[];
        tags?: string[];
        notes?: string;
        fsrsRecord?: FsrsRecord;
      }>
    ) => {
      const index = state.queue.findIndex((item) => item.id === action.payload.id);
      if (index !== -1) {
        state.queue[index] = {
          ...state.queue[index],
          ...action.payload,
        };
      }
    },

    syncQueueItems: (state, action: PayloadAction<QuizItem[]>) => {
      state.queue = action.payload;
    },

    removeQuizItem: (state, action: PayloadAction<string>) => {
      const wordId = action.payload;
      state.queue = state.queue.filter((item) => item.id !== wordId);
      if (state.queue.length === 0) {
        state.completed = true;
        state.currentIndex = 0;
      } else if (state.currentIndex >= state.queue.length) {
        state.currentIndex = Math.max(0, state.queue.length - 1);
      }
    },

    resetQuizSession: (state) => {
      state.queue = [];
      state.currentIndex = 0;
      state.revealed = false;
      state.completed = false;
      state.history = [];
      state.isInitialized = false;
      state.poolSignature = '';
    },
  },
});

export const {
  setMode,
  setQuizRange,
  setQuizSource,
  setQuizDirection,
  setQuizGroupFilter,
  setCustomStart,
  setCustomEnd,
  setPracticeDisplayMode,
  setAutoPronounceQuizWord,
  setHideMissedMeanings,
  setHideSrsPracticeMeanings,
  setRevealedMissedWordIds,
  setRevealedSrsPracticeWordIds,
  openAllWordsQuiz,
  openTodayQuiz,
  openFsrsQuiz,
  openSrsPracticeQuiz,
  openForgettingQuiz,
  setQuizFilters,
  setQuizQueue,
  nextCard,
  previousCard,
  setRevealed,
  pushQuizHistory,
  undoQuizHistory,
  updateQuizItem,
  syncQueueItems,
  removeQuizItem,
  resetQuizSession,
} = quizSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectQuizState = (state: { quiz: QuizSliceState }): QuizSliceState => state.quiz;

export const selectQuizFilters = (state: { quiz: QuizSliceState }): QuizFilterState => {
  const {
    mode,
    quizRange,
    quizSource,
    quizDirection,
    quizGroupFilter,
    customStart,
    customEnd,
    practiceDisplayMode,
    autoPronounceQuizWord,
    hideMissedMeanings,
    hideSrsPracticeMeanings,
  } = state.quiz;
  return {
    mode,
    quizRange,
    quizSource,
    quizDirection,
    quizGroupFilter,
    customStart,
    customEnd,
    practiceDisplayMode,
    autoPronounceQuizWord,
    hideMissedMeanings,
    hideSrsPracticeMeanings,
  };
};

export const selectQuizQueue = (state: { quiz: QuizSliceState }): QuizItem[] => state.quiz.queue;

export const selectCurrentQuizIndex = (state: { quiz: QuizSliceState }): number =>
  state.quiz.currentIndex;

export const selectCurrentQuizItem = (state: { quiz: QuizSliceState }): QuizItem | null => {
  const { queue, currentIndex } = state.quiz;
  return queue[currentIndex] ?? null;
};

export const selectQuizRevealed = (state: { quiz: QuizSliceState }): boolean => state.quiz.revealed;

export const selectQuizCompleted = (state: { quiz: QuizSliceState }): boolean =>
  state.quiz.completed;

export const selectQuizHistory = (state: { quiz: QuizSliceState }): QuizHistoryItem[] =>
  state.quiz.history;

export const selectCanUndoQuiz = (state: { quiz: QuizSliceState }): boolean =>
  state.quiz.history.length > 0;

export default quizSlice.reducer;
