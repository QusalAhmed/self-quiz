export const quizRanges = {
  all: 'All Words',
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Last 7 days',
  month: 'Last 30 days',
  year: 'This year',
  custom: 'Custom Range',
} as const;

export const quizSources = {
  words: 'Regular',
  missed: 'Missed Words',
  fsrs: 'FSRS Review',
  fsrsForgetting: 'FSRS Again & Hard Words',
  similarGroups: 'Similar Word Groups',
} as const;

export const practiceDisplayModes = {
  allMissed: 'All Missed & Again/Hard',
  missed: 'Manual Missed Words',
  fsrsAgainHard: 'FSRS Again & Hard',
  fsrsAgain: 'FSRS Again Only',
  fsrsHard: 'FSRS Hard Only',
} as const;

export const quizDirections = {
  wordToMeaning: 'Word → Meaning',
  meaningToWord: 'Meaning → Word',
  spelling: 'Spelling Mode',
} as const;

export const fsrsReviewDateFilters = {
  current: 'Due Today',
  tomorrow: 'Due by Tomorrow',
  week: 'Next 7 Days',
  all: 'All Dates',
  custom: 'Custom Date',
} as const;

export type QuizRangeKey = keyof typeof quizRanges;
export type QuizSourceKey = keyof typeof quizSources;
export type QuizDirectionKey = keyof typeof quizDirections;
export type PracticeDisplayKey = keyof typeof practiceDisplayModes;
export type FsrsReviewDateFilterKey = keyof typeof fsrsReviewDateFilters;

export const GROUP_QUIZ_STORAGE_KEY = 'self_quiz_active_group_quiz_v1';
export const SIMILAR_CLUSTERS_CACHE_KEY = 'self_quiz_similar_clusters_cache_v1';
