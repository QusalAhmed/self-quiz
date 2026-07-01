import type { QuizMode } from './db';
import type { SrsRating } from './srs';

export type SrsPracticeRecord = {
  id: string; // "{wordId}:srs-practice:{quizMode}"
  wordId: string;
  quizMode: QuizMode;
  word: string;
  meaning: string;
  difficulty: SrsRating;
  practicedAt: string;
  updatedAt: string;
  lastSyncedAt: string;
  isDeleted: boolean;
};

export function buildSrsPracticeId(wordId: string, quizMode: QuizMode): string {
  return `${wordId}:srs-practice:${quizMode}`;
}

export function createInitialSrsPracticeRecord(
  wordId: string,
  quizMode: QuizMode,
  word: string,
  meaning: string,
  difficulty: SrsRating,
  practicedAt: string = new Date().toISOString()
): SrsPracticeRecord {
  return {
    id: buildSrsPracticeId(wordId, quizMode),
    wordId,
    quizMode,
    word,
    meaning,
    difficulty,
    practicedAt,
    updatedAt: practicedAt,
    lastSyncedAt: '',
    isDeleted: false,
  };
}
