import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  computeFsrs,
  computeFsrsIntervals,
  createInitialFsrsRecord,
  formatInterval,
  type FsrsCardState,
  type FsrsRating,
  type FsrsRecord,
} from '@/lib/fsrs';

export interface FsrsReviewHistoryItem {
  cardBefore: FsrsRecord;
  cardAfter: FsrsRecord;
  previousQueue: string[];
  previousCurrentCardId: string | null;
  previousIsRevealed: boolean;
}

export interface FsrsSliceState {
  cards: Record<string, FsrsRecord>;
  queue: string[];
  currentCardId: string | null;
  isRevealed: boolean;
  nowIso: string;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncError: string | null;
  reviewLogsCount: number;
  history: FsrsReviewHistoryItem[];
}

const initialState: FsrsSliceState = {
  cards: {},
  queue: [],
  currentCardId: null,
  isRevealed: false,
  nowIso: new Date().toISOString(),
  syncStatus: 'idle',
  lastSyncError: null,
  reviewLogsCount: 0,
  history: [],
};

/**
 * Background Sync Thunk: Asynchronously pushes updated review log to backend API endpoint.
 * Runs in the background without delaying UI updates (0ms latency).
 */
export const syncFsrsReviewLog = createAsyncThunk(
  'fsrs/syncReviewLog',
  async (card: FsrsRecord, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/fsrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: card.id,
          word_id: card.wordId,
          quiz_mode: card.quizMode,
          word: card.word,
          meaning: card.meaning,
          due_at: card.dueAt,
          stability: card.stability,
          difficulty: card.difficulty,
          elapsed_days: card.elapsedDays,
          scheduled_days: card.scheduledDays,
          learning_steps: card.learningSteps,
          reps: card.reps,
          lapses: card.lapses,
          state: card.state,
          last_reviewed_at: card.lastReviewedAt,
          updated_at: card.updatedAt,
          deleted: card.isDeleted,
          last_rating: card.lastRating,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return rejectWithValue(errorData.error || 'Failed to sync FSRS record');
      }

      return await response.json();
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Network error');
    }
  }
);

export const fsrsSlice = createSlice({
  name: 'fsrs',
  initialState,
  reducers: {
    /**
     * Load deck of cards into client-side Redux state.
     */
    loadDeck: (state, action: PayloadAction<FsrsRecord[]>) => {
      const cardMap: Record<string, FsrsRecord> = {};
      action.payload.forEach((card) => {
        cardMap[card.id] = card;
      });
      state.cards = cardMap;
      state.nowIso = new Date().toISOString();

      // Build active due queue
      const dueQueue = action.payload
        .filter((card) => !card.isDeleted && card.dueAt <= state.nowIso)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
        .map((card) => card.id);

      state.queue = dueQueue;
      state.currentCardId = dueQueue.length > 0 ? dueQueue[0] : null;
      state.isRevealed = false;
      state.history = [];
    },

    /**
     * Real-time timer ticker: Runs periodically on client (e.g. every second).
     * Checks if any cards became due (dueAt <= current time) and dynamically
     * adds them to the queue without requiring page refresh!
     */
    tickTimer: (state, action: PayloadAction<string | undefined>) => {
      const nowIso = action.payload || new Date().toISOString();
      state.nowIso = nowIso;

      const newlyDueIds = Object.values(state.cards)
        .filter((card) => !card.isDeleted && card.dueAt <= nowIso && !state.queue.includes(card.id))
        .map((card) => card.id);

      if (newlyDueIds.length > 0) {
        state.queue = [...state.queue, ...newlyDueIds];
        if (!state.currentCardId) {
          state.currentCardId = state.queue[0] || null;
        }
      }
    },

    /**
     * Flip card to reveal answer.
     */
    revealAnswer: (state) => {
      state.isRevealed = true;
    },

    /**
     * Hide answer.
     */
    hideAnswer: (state) => {
      state.isRevealed = false;
    },

    /**
     * Answer Card (Optimistic Local Update):
     * Runs ts-fsrs locally to immediately update due timestamp and stability/difficulty.
     * Updates local Redux UI state instantly with 0ms latency.
     */
    answerCard: (
      state,
      action: PayloadAction<{ cardId: string; rating: FsrsRating; nowIso?: string }>
    ) => {
      const { cardId, rating, nowIso } = action.payload;
      const currentCard = state.cards[cardId];
      if (!currentCard) return;

      const now = nowIso ? new Date(nowIso) : new Date();
      const updatedCard = computeFsrs(currentCard, rating, now);

      // Record historical state before applying rating action
      state.history.push({
        cardBefore: { ...currentCard },
        cardAfter: { ...updatedCard },
        previousQueue: [...state.queue],
        previousCurrentCardId: state.currentCardId,
        previousIsRevealed: state.isRevealed,
      });

      state.cards[cardId] = updatedCard;
      state.isRevealed = false;
      state.reviewLogsCount += 1;

      // Update active queue (remove answered card from current session queue)
      state.queue = state.queue.filter((id) => id !== cardId);
      state.currentCardId = state.queue.length > 0 ? state.queue[0] : null;
    },

    /**
     * Undo last card rating:
     * Restores previous card state, queue, active card ID, and reveals answer so user can re-rate.
     */
    undoAnswer: (state) => {
      const lastHistoryItem = state.history.pop();
      if (!lastHistoryItem) return;

      const { cardBefore, previousQueue, previousCurrentCardId } = lastHistoryItem;

      state.cards[cardBefore.id] = cardBefore;
      state.queue = previousQueue;
      state.currentCardId = previousCurrentCardId;
      state.isRevealed = true;
      state.reviewLogsCount = Math.max(0, state.reviewLogsCount - 1);
    },

    /**
     * Reset review session state.
     */
    resetSession: (state) => {
      state.queue = Object.values(state.cards)
        .filter((card) => !card.isDeleted && card.dueAt <= state.nowIso)
        .map((card) => card.id);
      state.currentCardId = state.queue.length > 0 ? state.queue[0] : null;
      state.isRevealed = false;
      state.reviewLogsCount = 0;
      state.history = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncFsrsReviewLog.pending, (state) => {
        state.syncStatus = 'syncing';
        state.lastSyncError = null;
      })
      .addCase(syncFsrsReviewLog.fulfilled, (state) => {
        state.syncStatus = 'synced';
      })
      .addCase(syncFsrsReviewLog.rejected, (state, action) => {
        state.syncStatus = 'error';
        state.lastSyncError = (action.payload as string) || 'Failed background sync';
      });
  },
});

export const {
  loadDeck,
  tickTimer,
  revealAnswer,
  hideAnswer,
  answerCard,
  undoAnswer,
  resetSession,
} = fsrsSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectFsrsState = (state: { fsrs: FsrsSliceState }) => state.fsrs;

export const selectCanUndo = (state: { fsrs: FsrsSliceState }): boolean => {
  return state.fsrs.history.length > 0;
};

export const selectLastHistoryCardBefore = (state: { fsrs: FsrsSliceState }): FsrsRecord | null => {
  const { history } = state.fsrs;
  return history.length > 0 ? history[history.length - 1].cardBefore : null;
};

export const selectCurrentCard = (state: { fsrs: FsrsSliceState }): FsrsRecord | null => {
  const { currentCardId, cards } = state.fsrs;
  return currentCardId ? cards[currentCardId] || null : null;
};

export const selectCurrentIntervals = (state: {
  fsrs: FsrsSliceState;
}): Record<FsrsRating, { dueAt: string; intervalText: string }> | null => {
  const card = selectCurrentCard(state);
  if (!card) return null;
  const now = new Date(state.fsrs.nowIso);
  return computeFsrsIntervals(card, now);
};

export const selectCardCounts = (state: { fsrs: FsrsSliceState }) => {
  const { queue, cards } = state.fsrs;
  let newCount = 0;
  let learningCount = 0;
  let reviewCount = 0;

  queue.forEach((id) => {
    const card = cards[id];
    if (!card) return;
    if (card.state === 'New' && card.reps === 0) {
      newCount += 1;
    } else if (card.state === 'Learning' || card.state === 'Relearning') {
      learningCount += 1;
    } else {
      reviewCount += 1;
    }
  });

  return {
    newCount,
    learningCount,
    reviewCount,
    totalDueCount: queue.length,
  };
};

export const selectIsDeckComplete = (state: { fsrs: FsrsSliceState }): boolean => {
  return state.fsrs.queue.length === 0;
};

export default fsrsSlice.reducer;
