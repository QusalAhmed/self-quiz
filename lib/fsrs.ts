import { createEmptyCard, fsrs, Rating, State, type Grade, type Card } from 'ts-fsrs';
import type { QuizMode } from './db';

export type FsrsRating = 'again' | 'hard' | 'good' | 'easy';

export type FsrsCardState = 'New' | 'Learning' | 'Review' | 'Relearning';

export type FsrsRecord = {
  id: string; // "{wordId}:fsrs:{quizMode}"
  wordId: string;
  quizMode: QuizMode;
  word: string;
  meaning: string;
  dueAt: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: FsrsCardState;
  lastReviewedAt: string;
  updatedAt: string;
  lastSyncedAt: string;
  isDeleted: boolean;
  lastRating?: FsrsRating;
};

const scheduler = fsrs({ enable_fuzz: false });

const STATE_TO_ENUM: Record<FsrsCardState, State> = {
  New: State.New,
  Learning: State.Learning,
  Review: State.Review,
  Relearning: State.Relearning,
};

const ENUM_TO_STATE: Record<State, FsrsCardState> = {
  [State.New]: 'New',
  [State.Learning]: 'Learning',
  [State.Review]: 'Review',
  [State.Relearning]: 'Relearning',
};

const RATING_TO_ENUM: Record<FsrsRating, Grade> = {
  again: Rating.Again as Grade,
  hard: Rating.Hard as Grade,
  good: Rating.Good as Grade,
  easy: Rating.Easy as Grade,
};

export function buildFsrsId(wordId: string, quizMode: QuizMode): string {
  return `${wordId}:fsrs:${quizMode}`;
}

function toCard(record: FsrsRecord): Card {
  return {
    due: new Date(record.dueAt),
    stability: record.stability,
    difficulty: record.difficulty,
    elapsed_days: record.elapsedDays,
    scheduled_days: record.scheduledDays,
    learning_steps: record.learningSteps,
    reps: record.reps,
    lapses: record.lapses,
    state: STATE_TO_ENUM[record.state],
    last_review: record.lastReviewedAt ? new Date(record.lastReviewedAt) : undefined,
  };
}

function fromCard(
  base: Pick<
    FsrsRecord,
    'id' | 'wordId' | 'quizMode' | 'word' | 'meaning' | 'lastSyncedAt' | 'isDeleted' | 'lastRating'
  >,
  card: Card,
  updatedAt: string
): FsrsRecord {
  return {
    ...base,
    dueAt: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: ENUM_TO_STATE[card.state],
    lastReviewedAt: card.last_review ? card.last_review.toISOString() : updatedAt,
    updatedAt,
  };
}

export function createInitialFsrsRecord(
  wordId: string,
  quizMode: QuizMode,
  word: string,
  meaning: string,
  now: Date = new Date()
): FsrsRecord {
  const timestamp = now.toISOString();
  const card = createEmptyCard(now);
  return fromCard(
    {
      id: buildFsrsId(wordId, quizMode),
      wordId,
      quizMode,
      word,
      meaning,
      lastSyncedAt: '',
      isDeleted: false,
    },
    card,
    timestamp
  );
}

export function computeFsrs(
  current: FsrsRecord,
  rating: FsrsRating,
  now: Date = new Date(),
  word: string = current.word,
  meaning: string = current.meaning
): FsrsRecord {
  const card = toCard(current);
  const result = scheduler.next(card, now, RATING_TO_ENUM[rating]);

  return fromCard(
    {
      id: current.id,
      wordId: current.wordId,
      quizMode: current.quizMode,
      word,
      meaning,
      lastSyncedAt: current.lastSyncedAt,
      isDeleted: false,
      lastRating: rating,
    },
    result.card,
    now.toISOString()
  );
}

/**
 * Formats time difference between `dueDate` and `now` into an Anki-style interval string.
 * Examples: "<1m", "5m", "10m", "1h", "1.5d", "4d", "1.2mo", "2.5y"
 */
export function formatInterval(dueDate: Date | string, now: Date = new Date()): string {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const diffMs = due.getTime() - now.getTime();

  if (isNaN(diffMs)) return '';

  const diffSec = Math.max(0, diffMs / 1000);
  const diffMin = diffSec / 60;
  const diffHour = diffMin / 60;
  const diffDay = diffHour / 24;

  if (diffMin < 1) {
    return '<1m';
  }

  if (diffMin < 60) {
    return `${Math.round(diffMin)}m`;
  }

  if (diffHour < 24) {
    return `${Math.round(diffHour)}h`;
  }

  if (diffDay < 30) {
    if (diffDay < 10) {
      const rounded = Math.round(diffDay * 10) / 10;
      return Number.isInteger(rounded) ? `${rounded}d` : `${rounded.toFixed(1)}d`;
    }
    return `${Math.round(diffDay)}d`;
  }

  if (diffDay < 365) {
    const months = diffDay / 30.4375;
    const rounded = Math.round(months * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}mo` : `${rounded.toFixed(1)}mo`;
  }

  const years = diffDay / 365.25;
  const rounded = Math.round(years * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}y` : `${rounded.toFixed(1)}y`;
}

export function computeFsrsIntervals(
  current: FsrsRecord,
  now: Date = new Date()
): Record<FsrsRating, { dueAt: string; intervalText: string }> {
  const card = toCard(current);
  const repeatResult = scheduler.repeat(card, now);

  const getResult = (grade: Grade) => {
    const item = repeatResult[grade];
    const due = item.card.due;
    return {
      dueAt: due.toISOString(),
      intervalText: formatInterval(due, now),
    };
  };

  return {
    again: getResult(Rating.Again as Grade),
    hard: getResult(Rating.Hard as Grade),
    good: getResult(Rating.Good as Grade),
    easy: getResult(Rating.Easy as Grade),
  };
}

export function updateFsrsRecordContent(
  record: FsrsRecord,
  word: string,
  meaning: string,
  updatedAt: string = new Date().toISOString()
): FsrsRecord {
  return {
    ...record,
    word,
    meaning,
    updatedAt,
  };
}

export function softDeleteFsrsRecord(
  record: FsrsRecord,
  updatedAt: string = new Date().toISOString()
): FsrsRecord {
  return {
    ...record,
    isDeleted: true,
    updatedAt,
  };
}

export function fsrsRecordToCard(record: FsrsRecord): Card {
  return toCard(record);
}

const FACTOR = 19 / 81; // 0.2345679 -> at t = S, R = 0.90 (90% target retention)

export function computeRetrievability(
  stability: number,
  lastReviewedAt?: string,
  now: Date = new Date()
): number {
  if (!stability || stability <= 0) {
    return 1;
  }
  if (!lastReviewedAt) {
    return 1;
  }
  const reviewDate = new Date(lastReviewedAt);
  if (isNaN(reviewDate.getTime())) {
    return 1;
  }
  const elapsedMs = Math.max(0, now.getTime() - reviewDate.getTime());
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  const power = -0.5;
  const r = (1 + FACTOR * (elapsedDays / Math.max(stability, 0.1))) ** power;
  return Math.min(1, Math.max(0, r));
}

export function createReviewLogEvent({
  currentState,
  updatedCard,
  rating,
  durationMs = 0,
  now = new Date(),
}: {
  currentState: FsrsRecord;
  updatedCard: FsrsRecord;
  rating: FsrsRating;
  durationMs?: number;
  now?: Date;
}): import('./db').ReviewLogRecord {
  const timestamp = now.toISOString();
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    wordId: currentState.wordId,
    cardId: currentState.id,
    quizMode: currentState.quizMode,
    word: currentState.word,
    meaning: currentState.meaning,
    rating,
    stateBefore: currentState.state,
    stateAfter: updatedCard.state,
    reviewedAt: timestamp,
    durationMs: Math.max(0, Math.round(durationMs)),
    stability: updatedCard.stability,
    difficulty: updatedCard.difficulty,
    elapsedDays: updatedCard.elapsedDays,
    scheduledDays: updatedCard.scheduledDays,
    dueAt: updatedCard.dueAt,
    previousDueAt: currentState.dueAt,
    lapses: updatedCard.lapses,
    reps: updatedCard.reps,
    retrievability: computeRetrievability(currentState.stability, currentState.lastReviewedAt, now),
    createdAt: timestamp,
    updatedAt: timestamp,
    isDeleted: false,
    lastSyncedAt: '',
  };
}
