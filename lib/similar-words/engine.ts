import { CandidateGenerator } from './candidate-generator';
import { classifyRelationship } from './classifier';
import { DEFAULT_SIMILARITY_CONFIG } from './config';
import { computePairSimilarity } from './scorer';
import type {
  CandidateGenerationOptions,
  SimilarityConfig,
  SimilarityQueryParams,
  WordSimilarityRecord,
  WordSimilarityResult,
} from './types';

export type WordInput = {
  id: string;
  word: string;
};

export type BatchComputeMetrics = {
  totalWords: number;
  candidateGenerationMs: number;
  scoringAndRankingMs: number;
  totalDurationMs: number;
  discoveredRelationships: number;
  averageCandidatesPerWord: number;
};

/**
 * Builds a deterministic canonical key for symmetric word pairs to avoid duplicate storage.
 */
export function buildCanonicalPairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

/**
 * Advanced Similar-Word Discovery Engine coordinating candidate retrieval,
 * multi-signal linguistic scoring, relationship classification, and explainability.
 */
export class SimilarWordsEngine {
  private config: SimilarityConfig;
  private candidateGenerator: CandidateGenerator | null = null;

  constructor(config: SimilarityConfig = DEFAULT_SIMILARITY_CONFIG) {
    this.config = config;
  }

  public setConfig(config: SimilarityConfig): void {
    this.config = config;
  }

  public getConfig(): SimilarityConfig {
    return this.config;
  }

  /**
   * Initializes or updates the inverted index with vocabulary words.
   */
  public initializeIndex(words: WordInput[]): void {
    if (!this.candidateGenerator) {
      this.candidateGenerator = new CandidateGenerator(words);
    } else {
      this.candidateGenerator.buildIndex(words);
    }
  }

  /**
   * Computes comprehensive similarity between two specific words.
   */
  public computePair(
    sourceWord: string,
    targetWord: string,
    _sourceWordId = 'source',
    targetWordId = 'target'
  ): WordSimilarityResult {
    const scores = computePairSimilarity(sourceWord, targetWord, this.config);
    const classification = classifyRelationship(sourceWord, targetWord, scores);

    return {
      wordId: targetWordId,
      word: targetWord,
      score: scores.overallScore,
      relationship: classification.primaryType,
      secondaryRelationships: classification.secondaryTypes,
      explanation: classification.explanation,
      scores: {
        overall: scores.overallScore,
        orthographic: scores.orthographicScore,
        ngram: scores.ngramScore,
        prefix: scores.prefixScore,
        suffix: scores.suffixScore,
        morphological: scores.morphologicalScore,
        length: scores.lengthScore,
      },
      details: {
        commonPrefix: scores.signals.commonPrefix,
        commonSuffix: scores.signals.commonSuffix,
        commonSubstring: scores.signals.longestCommonSubstring,
        sharedSequence: scores.signals.sharedSequence,
        affix: scores.signals.affix,
        stem: scores.signals.stem,
        baseWord: scores.signals.baseWord,
      },
      signals: scores.signals,
    };
  }

  /**
   * Finds similar words for a query word from an existing candidate generator or word collection.
   */
  public findSimilarWords(
    queryWord: string,
    allWords: WordInput[],
    params: SimilarityQueryParams & CandidateGenerationOptions = {}
  ): WordSimilarityResult[] {
    const limit = params.limit ?? 20;
    const minScore = params.minScore ?? this.config.thresholds.minOverallScore;
    const filterType = params.relationshipType;

    if (!this.candidateGenerator) {
      this.candidateGenerator = new CandidateGenerator(allWords);
    }

    // Stage 1: Candidate Generation
    const candidates = this.candidateGenerator.generateCandidates(queryWord, {
      maxCandidates: params.maxCandidates ?? 150,
      lengthDelta: params.lengthDelta ?? 5,
    });

    const results: WordSimilarityResult[] = [];

    // Stage 2: Multi-Signal Scoring & Stage 3: Classification
    for (const cand of candidates) {
      if (cand.normalized === queryWord.trim().toLowerCase()) {
        continue;
      }

      const scores = computePairSimilarity(queryWord, cand.word, this.config);
      if (scores.overallScore < minScore) {
        continue;
      }

      const classification = classifyRelationship(queryWord, cand.word, scores);

      // Optional relationship type filter
      if (
        filterType &&
        filterType !== 'all' &&
        classification.primaryType !== filterType &&
        !classification.secondaryTypes.includes(filterType)
      ) {
        continue;
      }

      results.push({
        wordId: cand.id,
        word: cand.word,
        score: scores.overallScore,
        relationship: classification.primaryType,
        secondaryRelationships: classification.secondaryTypes,
        explanation: classification.explanation,
        scores: {
          overall: scores.overallScore,
          orthographic: scores.orthographicScore,
          ngram: scores.ngramScore,
          prefix: scores.prefixScore,
          suffix: scores.suffixScore,
          morphological: scores.morphologicalScore,
          length: scores.lengthScore,
        },
        details: {
          commonPrefix: scores.signals.commonPrefix,
          commonSuffix: scores.signals.commonSuffix,
          commonSubstring: scores.signals.longestCommonSubstring,
          sharedSequence: scores.signals.sharedSequence,
          affix: scores.signals.affix,
          stem: scores.signals.stem,
          baseWord: scores.signals.baseWord,
        },
        signals: params.includeSignals ? scores.signals : undefined,
      });
    }

    // Sort by relevance score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Precomputes similarities for the entire vocabulary dataset in batch.
   * Produces deduplicated canonical records ready for PostgreSQL / Supabase storage.
   */
  public batchComputeAll(
    words: WordInput[],
    minScoreThreshold?: number
  ): { records: WordSimilarityRecord[]; metrics: BatchComputeMetrics } {
    const startTime = Date.now();
    const threshold = minScoreThreshold ?? this.config.thresholds.minOverallScore;

    const generator = new CandidateGenerator(words);
    const candidateGenDuration = Date.now() - startTime;

    const scoringStart = Date.now();
    const processedPairs = new Set<string>();
    const records: WordSimilarityRecord[] = [];
    let totalCandidatesChecked = 0;

    const nowIso = new Date().toISOString();

    for (let i = 0; i < words.length; i++) {
      const source = words[i];
      const candidates = generator.generateCandidates(source.word, {
        maxCandidates: 120,
        lengthDelta: 5,
      });
      totalCandidatesChecked += candidates.length;

      for (const target of candidates) {
        if (source.id === target.id || source.word.toLowerCase() === target.word.toLowerCase()) {
          continue;
        }

        const pairKey = buildCanonicalPairKey(source.id, target.id);
        if (processedPairs.has(pairKey)) {
          continue;
        }
        processedPairs.add(pairKey);

        const scores = computePairSimilarity(source.word, target.word, this.config);
        if (scores.overallScore < threshold) {
          continue;
        }

        const classification = classifyRelationship(source.word, target.word, scores);

        // Store canonical record (ordered source.id < target.id)
        const isSourceFirst = source.id < target.id;
        const sourceWordId = isSourceFirst ? source.id : target.id;
        const targetWordId = isSourceFirst ? target.id : source.id;
        const sourceWord = isSourceFirst ? source.word : target.word;
        const targetWord = isSourceFirst ? target.word : source.word;

        records.push({
          id: `${sourceWordId}:${targetWordId}`,
          sourceWordId,
          targetWordId,
          sourceWord,
          targetWord,
          overallScore: scores.overallScore,
          orthographicScore: scores.orthographicScore,
          ngramScore: scores.ngramScore,
          prefixScore: scores.prefixScore,
          suffixScore: scores.suffixScore,
          morphologicalScore: scores.morphologicalScore,
          lengthScore: scores.lengthScore,
          relationshipType: classification.primaryType,
          secondaryTypes: classification.secondaryTypes,
          commonPrefix: scores.signals.commonPrefix,
          commonSuffix: scores.signals.commonSuffix,
          commonSubstring: scores.signals.longestCommonSubstring,
          sharedSequence: scores.signals.sharedSequence,
          affix: scores.signals.affix,
          stem: scores.signals.stem,
          explanation: classification.explanation,
          signals: scores.signals,
          algorithmVersion: this.config.algorithmVersion,
          createdAt: nowIso,
          updatedAt: nowIso,
          isDeleted: false,
        });
      }
    }

    const scoringDuration = Date.now() - scoringStart;
    const totalDuration = Date.now() - startTime;

    return {
      records,
      metrics: {
        totalWords: words.length,
        candidateGenerationMs: candidateGenDuration,
        scoringAndRankingMs: scoringDuration,
        totalDurationMs: totalDuration,
        discoveredRelationships: records.length,
        averageCandidatesPerWord:
          words.length === 0 ? 0 : Math.round((totalCandidatesChecked / words.length) * 10) / 10,
      },
    };
  }
}

// Global default instance singleton
export const similarWordsEngine = new SimilarWordsEngine();
