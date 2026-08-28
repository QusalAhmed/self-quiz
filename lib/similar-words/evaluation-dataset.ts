import { computePairSimilarity } from './scorer';
import type { SimilarityConfig, SimilarityRelationshipType } from './types';

export type LabeledWordPair = {
  wordA: string;
  wordB: string;
  expectedRelated: boolean;
  expectedCategory?: SimilarityRelationshipType;
  description: string;
  minExpectedScore?: number;
  maxExpectedScore?: number;
};

/**
 * Standard gold-standard evaluation dataset for testing similarity algorithms,
 * morphological classification, and quality thresholding.
 */
export const EVALUATION_DATASET: LabeledWordPair[] = [
  // ── 1. Strong Spelling / Orthographic Relationships ──
  {
    wordA: 'trial',
    wordB: 'trail',
    expectedRelated: true,
    expectedCategory: 'transposition',
    description: 'Single character transposition: swapped "ia" and "ai"',
    minExpectedScore: 0.75,
  },
  {
    wordA: 'retail',
    wordB: 'trail',
    expectedRelated: true,
    expectedCategory: 'orthographic',
    description: 'High character sequence overlap ("rail" / edit distance 2)',
    minExpectedScore: 0.6,
  },
  {
    wordA: 'adapt',
    wordB: 'adept',
    expectedRelated: true,
    expectedCategory: 'orthographic',
    description: 'Single vowel substitution (edit distance 1)',
    minExpectedScore: 0.75,
  },
  {
    wordA: 'affect',
    wordB: 'effect',
    expectedRelated: true,
    expectedCategory: 'orthographic',
    description: 'Single character prefix substitution (edit distance 1)',
    minExpectedScore: 0.75,
  },
  {
    wordA: 'form',
    wordB: 'from',
    expectedRelated: true,
    expectedCategory: 'transposition',
    description: 'Character transposition in short word',
    minExpectedScore: 0.75,
  },
  {
    wordA: 'angel',
    wordB: 'angle',
    expectedRelated: true,
    expectedCategory: 'transposition',
    description: 'Character transposition "el" / "le"',
    minExpectedScore: 0.75,
  },
  {
    wordA: 'dairy',
    wordB: 'diary',
    expectedRelated: true,
    expectedCategory: 'transposition',
    description: 'Character transposition "ai" / "ia"',
    minExpectedScore: 0.75,
  },

  // ── 2. Strong Morphological & Word Family Relationships ──
  {
    wordA: 'teach',
    wordB: 'teacher',
    expectedRelated: true,
    expectedCategory: 'word_family',
    description: 'Direct base + agent suffix "-er"',
    minExpectedScore: 0.85,
  },
  {
    wordA: 'care',
    wordB: 'careful',
    expectedRelated: true,
    expectedCategory: 'word_family',
    description: 'Direct base + suffix "-ful"',
    minExpectedScore: 0.85,
  },
  {
    wordA: 'predict',
    wordB: 'prediction',
    expectedRelated: true,
    expectedCategory: 'morphological',
    description: 'Root "predict" + Latinate nominal suffix "-ion"',
    minExpectedScore: 0.85,
  },
  {
    wordA: 'retail',
    wordB: 'retailer',
    expectedRelated: true,
    expectedCategory: 'word_family',
    description: 'Direct base "retail" + suffix "-er"',
    minExpectedScore: 0.85,
  },
  {
    wordA: 'decide',
    wordB: 'decision',
    expectedRelated: true,
    expectedCategory: 'morphological',
    description: 'Latinate alternation "-de" <-> "-sion"',
    minExpectedScore: 0.8,
  },
  {
    wordA: 'produce',
    wordB: 'producer',
    expectedRelated: true,
    expectedCategory: 'word_family',
    description: 'Base "produce" with e-drop + suffix "-er"',
    minExpectedScore: 0.85,
  },
  {
    wordA: 'protract',
    wordB: 'protraction',
    expectedRelated: true,
    expectedCategory: 'morphological',
    description: 'Root "protract" + suffix "-ion"',
    minExpectedScore: 0.85,
  },
  {
    wordA: 'quick',
    wordB: 'quickly',
    expectedRelated: true,
    expectedCategory: 'word_family',
    description: 'Base "quick" + adverbial suffix "-ly"',
    minExpectedScore: 0.85,
  },
  {
    wordA: 'beauty',
    wordB: 'beautiful',
    expectedRelated: true,
    expectedCategory: 'word_family',
    description: 'Base "beauty" with y->i mutation + suffix "-ful"',
    minExpectedScore: 0.8,
  },

  // ── 3. Prefix / Derivative Pairs ──
  {
    wordA: 'active',
    wordB: 'activate',
    expectedRelated: true,
    expectedCategory: 'morphological',
    description: 'Shared root "act" with verbal suffix "-ate"',
    minExpectedScore: 0.65,
  },
  {
    wordA: 'action',
    wordB: 'activate',
    expectedRelated: true,
    expectedCategory: 'morphological',
    description: 'Shared root "act" across derivatives',
    minExpectedScore: 0.6,
  },

  // ── 4. Weak / Unrelated Pairs (Must be rejected or receive low score) ──
  {
    wordA: 'retail',
    wordB: 'restaurant',
    expectedRelated: false,
    description: 'Semantic/linguistic false match sharing only weak prefix letters',
    maxExpectedScore: 0.44,
  },
  {
    wordA: 'predict',
    wordB: 'banana',
    expectedRelated: false,
    description: 'Completely unrelated English words',
    maxExpectedScore: 0.3,
  },
  {
    wordA: 'care',
    wordB: 'table',
    expectedRelated: false,
    description: 'Completely unrelated words',
    maxExpectedScore: 0.35,
  },
  {
    wordA: 'cat',
    wordB: 'caterpillar',
    expectedRelated: false,
    description: 'Large length difference penalty (3 vs 11) with no morphology',
    maxExpectedScore: 0.44,
  },
  {
    wordA: 'a',
    wordB: 'an',
    expectedRelated: false,
    description: 'Stopwords / short function words penalty',
    maxExpectedScore: 0.44,
  },

  // ── 5. Difficult False-Positive Traps (Suffix/Prefix overlap without stem similarity) ──
  {
    wordA: 'station',
    wordB: 'creation',
    expectedRelated: false,
    description: 'Shared "-tion" suffix without stem/root relation (must be penalized)',
    maxExpectedScore: 0.44,
  },
  {
    wordA: 'tradition',
    wordB: 'pollution',
    expectedRelated: false,
    description: 'Shared "-tion" suffix across unrelated words',
    maxExpectedScore: 0.44,
  },
  {
    wordA: 'preview',
    wordB: 'pressure',
    expectedRelated: false,
    description: 'Shared "pre" characters across unrelated stems',
    maxExpectedScore: 0.44,
  },
];

export type EvaluationReport = {
  totalPairs: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  failures: Array<{
    pair: [string, string];
    expectedRelated: boolean;
    actualScore: number;
    threshold: number;
    reason: string;
  }>;
};

/**
 * Runs evaluation on the gold-standard dataset using given or default configuration.
 */
export function runEvaluation(config?: SimilarityConfig): EvaluationReport {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;
  const failures: EvaluationReport['failures'] = [];

  const threshold = config?.thresholds.minOverallScore ?? 0.45;

  for (const item of EVALUATION_DATASET) {
    const scores = computePairSimilarity(item.wordA, item.wordB, config);
    const actualScore = scores.overallScore;
    const isPredictedRelated = actualScore >= threshold;

    let passed = true;
    let reason = '';

    if (item.expectedRelated) {
      if (isPredictedRelated) {
        if (item.minExpectedScore && actualScore < item.minExpectedScore) {
          passed = false;
          reason = `Score ${actualScore} was below minExpectedScore ${item.minExpectedScore}`;
        } else {
          tp++;
        }
      } else {
        fn++;
        passed = false;
        reason = `Failed to recognize related pair (score ${actualScore} < threshold ${threshold})`;
      }
    } else if (!isPredictedRelated) {
      if (item.maxExpectedScore && actualScore > item.maxExpectedScore) {
        passed = false;
        reason = `Score ${actualScore} exceeded maxExpectedScore ${item.maxExpectedScore}`;
      } else {
        tn++;
      }
    } else {
      fp++;
      passed = false;
      reason = `False positive: falsely recognized as related (score ${actualScore} >= threshold ${threshold})`;
    }

    if (!passed) {
      failures.push({
        pair: [item.wordA, item.wordB],
        expectedRelated: item.expectedRelated,
        actualScore,
        threshold,
        reason,
      });
    }
  }

  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1Score = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const accuracy = (tp + tn) / EVALUATION_DATASET.length;

  return {
    totalPairs: EVALUATION_DATASET.length,
    truePositives: tp,
    trueNegatives: tn,
    falsePositives: fp,
    falseNegatives: fn,
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    f1Score: Math.round(f1Score * 1000) / 1000,
    accuracy: Math.round(accuracy * 1000) / 1000,
    failures,
  };
}
