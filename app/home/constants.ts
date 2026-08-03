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
  fsrsForgetting: 'FSRS Missed (Again/Hard >6h)',
} as const;

export const practiceDisplayModes = {
  allMissed: 'All Missed & Forgotten',
  missed: 'Manual Missed Words',
  fsrsAgainHard: 'FSRS Again & Hard (>6h)',
  fsrsAgain: 'FSRS Again Only (>6h)',
  fsrsHard: 'FSRS Hard Only (>6h)',
} as const;

export const quizDirections = {
  wordToMeaning: 'Word → Meaning',
  meaningToWord: 'Meaning → Word',
  spelling: 'Spelling Mode',
} as const;

export type QuizRangeKey = keyof typeof quizRanges;
export type QuizSourceKey = keyof typeof quizSources;
export type QuizDirectionKey = keyof typeof quizDirections;
export type PracticeDisplayKey = keyof typeof practiceDisplayModes;
