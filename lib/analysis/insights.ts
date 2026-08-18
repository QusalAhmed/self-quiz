import type { WordRecord } from '@/lib/db';
import type {
  ActivitySummary,
  FsrsMemoryHealthData,
  KpiOverviewData,
  LearningInsight,
  LearningRecommendation,
  ProblematicWordItem,
  RatingDistribution,
  StudyEfficiencyData,
  VocabularyGrowthData,
} from './types';

export function generateInsights({
  kpis: _kpis,
  ratingDistribution,
  memoryHealth,
  activity,
  growth,
  efficiency,
  difficultWords,
  words,
}: {
  kpis: KpiOverviewData;
  ratingDistribution: RatingDistribution;
  memoryHealth: FsrsMemoryHealthData;
  activity: ActivitySummary;
  growth: VocabularyGrowthData;
  efficiency: StudyEfficiencyData;
  difficultWords: ProblematicWordItem[];
  words: WordRecord[];
}): LearningInsight[] {
  const list: LearningInsight[] = [];

  // 1. Recall & Retention Quality Insight
  if (ratingDistribution.totalRatings >= 10) {
    const recall = ratingDistribution.successfulRecallRate;
    if (recall >= 88) {
      list.push({
        id: 'retention-excellent',
        type: 'success',
        title: 'Outstanding Recall Retention',
        description: `Your successful recall rate is ${recall}%. Your memory consolidation is strong with steady FSRS intervals.`,
        metricHighlight: `${recall}% recall`,
      });
    } else if (recall < 75) {
      list.push({
        id: 'retention-struggling',
        type: 'warning',
        title: 'High Forgetting & Lapse Frequency',
        description: `Your recall rate is currently ${recall}% with ${ratingDistribution.againRate}% 'Again' ratings. Consider shortening session intervals or adding contextual examples.`,
        metricHighlight: `${ratingDistribution.againRate}% Again rate`,
        actionable: true,
      });
    } else {
      list.push({
        id: 'retention-moderate',
        type: 'info',
        title: 'Stable Memory Progression',
        description: `Your retention is at ${recall}%, which is close to the standard 90% FSRS target retention rate.`,
        metricHighlight: `${recall}% recall`,
      });
    }
  }

  // 2. Study Habit & Day-of-Week Variance
  if (activity.daysStudied >= 4) {
    const weekdayRatio =
      activity.weekdayReviews / Math.max(1, activity.weekdayReviews + activity.weekendReviews);
    if (weekdayRatio > 0.85 && activity.weekendReviews < 5) {
      list.push({
        id: 'habit-weekend-drop',
        type: 'tip',
        title: 'Weekend Study Gap Detected',
        description: `Over 85% of your reviews occur on weekdays. Your activity drops noticeably on weekends, which can cause Monday review backlogs.`,
        metricHighlight: `${Math.round(weekdayRatio * 100)}% weekday bias`,
        actionable: true,
      });
    } else if (activity.currentStreak >= 5) {
      list.push({
        id: 'habit-streak-strong',
        type: 'success',
        title: 'Remarkable Study Streak',
        description: `You have maintained a ${activity.currentStreak}-day learning streak! Consistent daily exposure significantly enhances long-term retention.`,
        metricHighlight: `${activity.currentStreak} days streak`,
      });
    }
  }

  // 3. Forgetting Risk & Fragile Cards Alert
  if (memoryHealth.approachingForgettingCount > 0) {
    list.push({
      id: 'fsrs-forgetting-risk',
      type: 'warning',
      title: 'Cards Approaching Forgetting Threshold',
      description: `You have ${memoryHealth.approachingForgettingCount} cards with retrievability below 85% due within the next 24 hours. Prompt review will prevent memory decay.`,
      metricHighlight: `${memoryHealth.approachingForgettingCount} fragile cards`,
      actionable: true,
    });
  } else if (memoryHealth.highlyStableCardsCount >= 10) {
    list.push({
      id: 'fsrs-stable-cards',
      type: 'success',
      title: 'Solid Long-Term Memory Base',
      description: `${memoryHealth.highlyStableCardsCount} of your cards have achieved high stability (≥ 30 days interval), reflecting durable long-term memory encoding.`,
      metricHighlight: `${memoryHealth.highlyStableCardsCount} stable cards`,
    });
  }

  // 4. Tag / Category Discrepancy Insight
  const tagLapses = new Map<string, { total: number; lapses: number }>();
  for (const item of difficultWords) {
    for (const tag of item.tags) {
      const cur = tagLapses.get(tag) || { total: 0, lapses: 0 };
      cur.total += item.reps;
      cur.lapses += item.lapses;
      tagLapses.set(tag, cur);
    }
  }

  for (const [tag, stats] of tagLapses.entries()) {
    if (stats.lapses >= 4 && stats.total >= 8) {
      const lapsePct = Math.round((stats.lapses / stats.total) * 100);
      if (lapsePct >= 35) {
        list.push({
          id: `tag-difficulty-${tag}`,
          type: 'info',
          title: `Challenging Group: "${tag}"`,
          description: `Words grouped under "${tag}" have an elevated lapse rate of ${lapsePct}%. Reviewing definitions or AI example sentences for this group is advised.`,
          metricHighlight: `${lapsePct}% lapse rate`,
          actionable: true,
        });
        break; // Only show one top tag insight
      }
    }
  }

  // 5. Efficiency & Pacing Insight
  if (efficiency.hasSufficientData) {
    if (efficiency.reviewsPerMinute > 12) {
      list.push({
        id: 'efficiency-fast-pacing',
        type: 'tip',
        title: 'Rapid Review Pacing',
        description: `You are averaging ${efficiency.reviewsPerMinute} reviews per minute (${efficiency.avgReviewDurationSec}s per card). Ensure you take sufficient time to absorb definitions and example sentences.`,
        metricHighlight: `${efficiency.avgReviewDurationSec}s / card`,
      });
    } else if (efficiency.reviewsPerMinute >= 4 && efficiency.reviewsPerMinute <= 10) {
      list.push({
        id: 'efficiency-optimal',
        type: 'success',
        title: 'Optimal Review Rhythm',
        description: `Your pacing of ${efficiency.avgReviewDurationSec} seconds per review is in the ideal focus zone for active memory retrieval.`,
        metricHighlight: `${efficiency.reviewsPerMinute} cards / min`,
      });
    }
  }

  // 6. Vocabulary Acquisition Velocity
  if (growth.wordsAddedInPeriod >= 15) {
    list.push({
      id: 'growth-rapid',
      type: 'info',
      title: 'Active Vocabulary Expansion',
      description: `You added ${growth.wordsAddedInPeriod} new words in this period (${growth.wordsAddedPerWeekAvg} words/week). Projected mastery over the next 30 days is ~${growth.projectedMasteryNext30Days} words.`,
      metricHighlight: `+${growth.wordsAddedInPeriod} words`,
    });
  }

  // Default fallback insight if sparse data
  if (list.length === 0) {
    list.push({
      id: 'welcome-insight',
      type: 'info',
      title: 'Building Learning Baseline',
      description: `Complete a few daily flashcard and FSRS review sessions to unlock deep learning analytics, memory health diagnostics, and personalized recommendations.`,
      metricHighlight: `${words.length} words in dictionary`,
    });
  }

  return list;
}

export function generateRecommendations({
  kpis: _kpis,
  ratingDistribution,
  memoryHealth,
  activity,
  growth: _growth,
  efficiency: _efficiency,
  difficultWordsCount,
}: {
  kpis: KpiOverviewData;
  ratingDistribution: RatingDistribution;
  memoryHealth: FsrsMemoryHealthData;
  activity: ActivitySummary;
  growth: VocabularyGrowthData;
  efficiency: StudyEfficiencyData;
  difficultWordsCount: number;
}): LearningRecommendation[] {
  const list: LearningRecommendation[] = [];

  // Recommendation 1: Forgetting Backlog & Urgent Cards
  if (memoryHealth.approachingForgettingCount >= 10) {
    list.push({
      id: 'rec-urgent-backlog',
      title: 'Clear Urgent Review Backlog',
      action: 'Prioritize FSRS Review session before adding new vocabulary words.',
      reason: `${memoryHealth.approachingForgettingCount} words are nearing memory decay threshold. Reviewing them today prevents forgotten lapses.`,
      priority: 'high',
      category: 'backlog',
    });
  }

  // Recommendation 2: High Lapse Rate / Pacing adjustment
  if (ratingDistribution.totalRatings >= 15 && ratingDistribution.againRate >= 20) {
    list.push({
      id: 'rec-reduce-new-intake',
      title: 'Consolidate Difficult Vocabulary',
      action:
        'Temporarily pause adding new words and focus on reviewing difficult cards with AI examples.',
      reason: `Your Again rating rate is ${ratingDistribution.againRate}%. Focusing on consolidating difficult cards will stabilize your retention.`,
      priority: 'high',
      category: 'pacing',
    });
  }

  // Recommendation 3: High Retention Capacity -> Safe to expand
  if (
    ratingDistribution.totalRatings >= 15 &&
    ratingDistribution.successfulRecallRate >= 92 &&
    memoryHealth.approachingForgettingCount < 5
  ) {
    list.push({
      id: 'rec-increase-new-words',
      title: 'Ready for Vocabulary Expansion',
      action: 'Safely increase your daily new word intake by 3–5 words.',
      reason: `Your recall retention is exceptionally strong at ${ratingDistribution.successfulRecallRate}%, indicating capacity for new words without overwhelming your review queue.`,
      priority: 'medium',
      category: 'pacing',
    });
  }

  // Recommendation 4: Weekend consistency
  if (activity.daysStudied >= 5 && activity.weekendReviews === 0) {
    list.push({
      id: 'rec-weekend-micro-session',
      title: 'Maintain Weekend Momentum',
      action: 'Set a target of a quick 5-minute review session on Saturdays and Sundays.',
      reason:
        'Spaced repetition works best with small daily touchpoints, preventing large Monday review pileups.',
      priority: 'medium',
      category: 'habits',
    });
  }

  // Recommendation 5: Problematic words targeted practice
  if (difficultWordsCount >= 8) {
    list.push({
      id: 'rec-practice-difficult-words',
      title: 'Target Problematic Words',
      action:
        'Inspect your Difficult Words table below and review their definitions and usage contexts.',
      reason: `You have ${difficultWordsCount} words with multiple lapses or high difficulty scores that require focused attention.`,
      priority: 'medium',
      category: 'retention',
    });
  }

  // Fallback recommendation
  if (list.length === 0) {
    list.push({
      id: 'rec-daily-habit',
      title: 'Establish Daily Review Routine',
      action: 'Complete at least 1 FSRS review session daily to train the memory algorithm.',
      reason: 'FSRS calculates optimal review intervals based on your response consistency.',
      priority: 'low',
      category: 'habits',
    });
  }

  return list;
}
