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
  srs: 'SRS Review',
  srsPractice: 'SRS Practice',
} as const;

export const practiceDisplayModes = {
  missed: 'Missed Words',
  srs: 'SRS Practice',
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
