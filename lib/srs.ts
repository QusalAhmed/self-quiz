import type { QuizMode } from './db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SrsRating = 'again' | 'hard' | 'good' | 'easy';

export type SrsRecord = {
  id: string; // "{wordId}:{quizMode}"
  wordId: string;
  quizMode: QuizMode;
  word: string;
  meaning: string;
  /** SM-2 ease factor — minimum 1.3, starts at 2.5 */
  easeFactor: number;
  /** Days until next review */
  interval: number;
  /** Consecutive successful reviews */
  repetitions: number;
  /** ISO datetime — when this card is due for review */
  nextReviewAt: string;
  /** ISO datetime — when this card was last reviewed */
  lastReviewedAt: string;
  updatedAt: string;
  lastSyncedAt: string;
  isDeleted: boolean;
};

export type SrsCardState = Pick<
  SrsRecord,
  'easeFactor' | 'interval' | 'repetitions'
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIN_EASE_FACTOR = 1.3;
const INITIAL_EASE_FACTOR = 2.5;

function clampEaseFactor(ef: number): number {
  return Math.max(MIN_EASE_FACTOR, ef);
}

/** Add `days` calendar days to a date and return ISO string */
function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

// ---------------------------------------------------------------------------
// SM-2 algorithm
// ---------------------------------------------------------------------------

/**
 * Compute the next SRS state for a card using the SM-2 algorithm.
 *
 * SM-2 grade mapping:
 *   again → grade 0  (complete blackout)
 *   hard  → grade 2  (incorrect but recognised)
 *   good  → grade 4  (correct with effort)
 *   easy  → grade 5  (perfect recall)
 *
 * Returns the updated { easeFactor, interval, repetitions, nextReviewAt }.
 */
export function computeSm2(
  current: SrsCardState,
  rating: SrsRating,
  now: Date = new Date()
): SrsCardState & { nextReviewAt: string } {
  const gradeMap: Record<SrsRating, number> = {
    again: 0,
    hard: 2,
    good: 4,
    easy: 5,
  };

  const grade = gradeMap[rating];
  let { easeFactor, interval, repetitions } = current;

  if (grade < 3) {
    // Failed recall — reset to beginning
    repetitions = 0;
    interval = 1;
    // For "again", shrink ease factor; "hard" also penalises slightly
    if (grade === 0) {
      easeFactor = clampEaseFactor(easeFactor - 0.2);
    } else {
      easeFactor = clampEaseFactor(easeFactor - 0.15);
    }
  } else {
    // Successful recall
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    // SM-2 ease factor update: EF' = EF + (0.1 - (5-q)*(0.08+(5-q)*0.02))
    const q = grade;
    const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
    easeFactor = clampEaseFactor(easeFactor + delta);

    repetitions += 1;
  }

  // "easy" gives a bonus multiplier on interval
  if (rating === 'easy' && repetitions > 1) {
    interval = Math.round(interval * 1.3);
  }

  const nextReviewAt = addDays(now, interval);

  return { easeFactor, interval, repetitions, nextReviewAt };
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export function buildSrsId(wordId: string, quizMode: QuizMode): string {
  return `${wordId}:srs:${quizMode}`;
}

/** Create a brand-new SRS record for a word, due immediately. */
export function createInitialSrsRecord(
  wordId: string,
  quizMode: QuizMode,
  word: string,
  meaning: string
): SrsRecord {
  const now = new Date().toISOString();
  return {
    id: buildSrsId(wordId, quizMode),
    wordId,
    quizMode,
    word,
    meaning,
    easeFactor: INITIAL_EASE_FACTOR,
    interval: 0,
    repetitions: 0,
    nextReviewAt: now, // due immediately
    lastReviewedAt: now,
    updatedAt: now,
    lastSyncedAt: '',
    isDeleted: false,
  };
}
