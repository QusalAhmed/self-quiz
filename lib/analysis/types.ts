import type { QuizMode, WordRecord } from '@/lib/db';
import type { FsrsRating } from '@/lib/fsrs';

export type DateRangePreset = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom';
export type ComparisonPeriod = 'previous_period' | 'prev_30d' | 'prev_90d' | 'none';
export type WordStateFilter = 'all' | 'Mastered' | 'Review' | 'Learning' | 'Relearning' | 'New';
export type AggregationPeriod = 'daily' | 'weekly' | 'monthly';

export type AnalysisFilters = {
  datePreset: DateRangePreset;
  customStartDate?: string;
  customEndDate?: string;
  comparison: ComparisonPeriod;
  quizMode: 'all' | QuizMode;
  groupFilter: string; // 'all' or specific group name
  stateFilter: WordStateFilter;
  difficultyRange?: [number, number];
};

export type KpiMetric = {
  value: number;
  formattedValue: string;
  previousValue?: number;
  formattedPrevious?: string;
  changePercent?: number; // e.g. +12.5 or -4.2
  trendDirection?: 'up' | 'down' | 'neutral';
  isPositive?: boolean; // whether "up" is good or bad
  subtitle: string;
  helperTooltip?: string;
};

export type KpiOverviewData = {
  wordsMastered: KpiMetric;
  wordsLearning: KpiMetric;
  estimatedRetention: KpiMetric;
  reviewsCompleted: KpiMetric;
  activeStudyDays: KpiMetric;
  currentStreak: KpiMetric;
  longestStreak: number;
  avgDailyReviews: KpiMetric;
  totalStudyTimeSec: KpiMetric;
};

export type TimeSeriesDataPoint = {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Aug 12"
  totalWords: number;
  wordsAdded: number;
  wordsLearningEntered: number;
  masteredWords: number;
  reviewWords: number;
  learningWords: number;
  newWords: number;
  reviewsCount: number;
  studyMinutes: number;
  studySeconds: number;
  avgReviewDurationSec: number;
  recallRate?: number;
};

export type DailyWordsAddedPoint = {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Aug 18"
  fullDateLabel: string; // e.g. "Aug 18, 2026"
  wordsAdded: number;
};

export type DailyWordsAddedData = {
  timeSeries: DailyWordsAddedPoint[];
  totalAdded: number;
  dailyAverage: number; // average words added per calendar day in the selected period
  mostProductiveDay: {
    date: string;
    label: string;
    count: number;
  } | null;
  hasActivity: boolean;
};

export type LearningStateCount = {
  state: 'New' | 'Learning' | 'Review' | 'Relearning' | 'Mastered';
  count: number;
  percent: number; // 0..100
  color: string;
  description: string;
};

export type LearningStateDistributionData = {
  states: LearningStateCount[];
  totalWords: number;
  masteryRuleDescription: string;
};

export type RatingDistribution = {
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
  totalRatings: number;
  againRate: number; // 0..100
  hardRate: number;
  goodRate: number;
  easyRate: number;
  successfulRecallRate: number; // (good + easy) / total
};

export type FsrsMemoryHealthData = {
  avgStabilityDays: number;
  avgDifficulty: number; // 1..10 scale
  avgRetrievability: number; // 0..100%
  stabilityBuckets: {
    fragile: number; // < 7 days
    moderate: number; // 7 - 30 days
    strong: number; // 30 - 90 days
    mature: number; // > 90 days
  };
  difficultyBuckets: {
    easy: number; // 1 - 3
    medium: number; // 4 - 6
    hard: number; // 7 - 8
    veryHard: number; // 9 - 10
  };
  fragileCardsCount: number; // retrievability < 70%
  approachingForgettingCount: number; // due in next 24h with retrievability < 85%
  highlyStableCardsCount: number; // stability >= 30 days
  totalTrackedCards: number;
};

export type HeatmapDay = {
  date: string; // YYYY-MM-DD
  count: number; // number of reviews
  studySeconds: number; // study time
  level: 0 | 1 | 2 | 3 | 4; // intensity 0 to 4
};

export type ActivitySummary = {
  daysStudied: number;
  totalCalendarDays: number;
  currentStreak: number;
  longestStreak: number;
  mostActiveDayOfWeek: string; // e.g. "Tuesday"
  avgReviewsOnActiveDays: number;
  totalStudySeconds: number;
  heatmapDays: HeatmapDay[];
  weekdayReviews: number;
  weekendReviews: number;
};

export type ProblematicWordItem = {
  id: string; // wordId
  word: string;
  meaning: string;
  definitions?: WordRecord['definitions'];
  difficulty: number;
  stability: number;
  retrievability: number;
  reps: number;
  lapses: number;
  againCount: number;
  totalTimeSec: number;
  avgDurationSec: number;
  lastRating?: FsrsRating;
  lastReviewedAt?: string;
  dueAt?: string;
  missedCount: number;
  problemScore: number;
  tags: string[];
};

export type StrongWordItem = {
  id: string; // wordId
  word: string;
  meaning: string;
  definitions?: WordRecord['definitions'];
  stability: number;
  retrievability: number;
  reps: number;
  lapses: number;
  totalTimeSec: number;
  avgDurationSec: number;
  lastRating?: FsrsRating;
  lastReviewedAt?: string;
  dueAt?: string;
  tags: string[];
};

export type WordTimeSpentItem = {
  id: string; // wordId
  word: string;
  meaning: string;
  definitions?: WordRecord['definitions'];
  totalTimeSec: number;
  avgDurationSec: number;
  reviewsCount: number;
  lapses: number;
  difficulty: number;
  stability: number;
  retrievability: number;
  state: 'New' | 'Learning' | 'Review' | 'Relearning' | 'Mastered';
  tags: string[];
};

export type TimeToMasteryData = {
  avgDaysToMastery: number;
  medianDaysToMastery: number;
  avgReviewsBeforeMastery: number;
  avgStudyTimeBeforeMasterySec: number;
  masteredWordsCount: number;
  fastestMasteredWords: {
    id: string;
    word: string;
    meaning: string;
    days: number;
    reviews: number;
    studyTimeSec: number;
  }[];
  slowestMasteredWords: {
    id: string;
    word: string;
    meaning: string;
    days: number;
    reviews: number;
    studyTimeSec: number;
  }[];
  hasSufficientData: boolean;
};

export type WordEffortPoint = {
  id: string;
  word: string;
  meaning: string;
  difficulty: number; // 1..10
  totalTimeSec: number;
  reviewsCount: number;
  lapses: number;
  avgDurationSec: number;
  stability: number;
  retrievability: number;
  state: string;
};

export type CategoryComparisonItem = {
  category: string;
  totalWords: number;
  masteredWords: number;
  masteryRate: number; // 0..100%
  retentionRate: number; // 0..100%
  avgDifficulty: number;
  reviewsCount: number;
  totalStudyTimeSec: number;
  avgTimePerWordSec: number;
  lapses: number;
};

export type VocabularyGrowthData = {
  currentVocabularySize: number;
  wordsAddedInPeriod: number;
  wordsMasteredInPeriod: number;
  wordsAddedPerWeekAvg: number;
  wordsMasteredPerWeekAvg: number;
  avgDaysNewToMastered: number;
  growthRatePercent: number;
  projectedMasteryNext30Days: number;
};

export type StudyEfficiencyData = {
  reviewsPerMinute: number;
  avgReviewDurationSec: number;
  successfulReviewsPerMinute: number;
  reviewsPerMasteredWord: number;
  studyMinutesPerMasteredWord: number;
  wordsMasteredPerHour: number;
  efficiencyTrendPercent?: number;
  hasSufficientData: boolean;
};

export type InsightType = 'success' | 'info' | 'warning' | 'tip';

export type LearningInsight = {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  metricHighlight?: string;
  actionable?: boolean;
};

export type LearningRecommendation = {
  id: string;
  title: string;
  action: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  category: 'pacing' | 'retention' | 'backlog' | 'habits';
};

export type SectionDataStatus = 'available' | 'limited_data' | 'unavailable' | 'no_activity';

export type SectionStatusInfo = {
  status: SectionDataStatus;
  label: string;
  badgeColor: 'teal' | 'yellow' | 'gray' | 'blue' | 'indigo';
  message: string;
  sampleCount?: number;
};

export type AnalysisSectionKey =
  | 'overview'
  | 'progress'
  | 'dailyWordsAdded'
  | 'stateDistribution'
  | 'studyTime'
  | 'wordTime'
  | 'timeToMastery'
  | 'difficultyVsTime'
  | 'categoryComparison'
  | 'retention'
  | 'memoryHealth'
  | 'activity'
  | 'wordsBreakdown'
  | 'growth'
  | 'efficiency'
  | 'insights';

export type AnalysisResult = {
  kpis: KpiOverviewData;
  timeSeries: TimeSeriesDataPoint[];
  timeSeriesWeekly: TimeSeriesDataPoint[];
  timeSeriesMonthly: TimeSeriesDataPoint[];
  dailyWordsAdded: DailyWordsAddedData;
  stateDistribution: LearningStateDistributionData;
  timeSpentPerWord: WordTimeSpentItem[];
  topTimeConsumingWords: WordTimeSpentItem[];
  timeToMastery: TimeToMasteryData;
  wordEffortPoints: WordEffortPoint[];
  categoryComparisons: CategoryComparisonItem[];
  ratingDistribution: RatingDistribution;
  memoryHealth: FsrsMemoryHealthData;
  activity: ActivitySummary;
  difficultWords: ProblematicWordItem[];
  strongestWords: StrongWordItem[];
  vocabularyGrowth: VocabularyGrowthData;
  efficiency: StudyEfficiencyData;
  insights: LearningInsight[];
  recommendations: LearningRecommendation[];
  statuses: Record<AnalysisSectionKey, SectionStatusInfo>;
  hasData: boolean;
  totalWordsCount: number;
  totalCardsCount: number;
  totalReviewsCount: number;
};
