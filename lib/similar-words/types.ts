/**
 * Core type definitions for the Advanced Similar-Word Discovery System.
 */

export type SimilarityRelationshipType =
  | 'exact'
  | 'orthographic'
  | 'word_family'
  | 'prefix'
  | 'suffix'
  | 'morphological'
  | 'transposition';

export type SimilaritySignals = {
  normalizedLevenshtein: number;
  damerauLevenshtein: number;
  longestCommonSubstring: string;
  longestCommonSubstringRatio: number;
  longestCommonSubsequence: string;
  longestCommonSubsequenceRatio: number;
  ngramScores: {
    ngram2: number;
    ngram3: number;
    ngram4: number;
    composite: number;
  };
  characterSetOverlap: number;
  sharedSequence: string;
  sharedSequenceLength: number;
  commonPrefix: string;
  prefixRatioShort: number;
  prefixRatioLong: number;
  commonSuffix: string;
  suffixRatio: number;
  isCommonSuffix: boolean;
  isCommonPrefix: boolean;
  stemMatch: boolean;
  stem: string;
  affix: string;
  baseWord: string;
  morphologicalConfidence: number;
  isTransposition: boolean;
  lengthDifference: number;
  lengthRatio: number;
};

export type WordSimilarityRecord = {
  id: string;
  sourceWordId: string;
  targetWordId: string;
  sourceWord: string;
  targetWord: string;
  overallScore: number;
  orthographicScore: number;
  ngramScore: number;
  prefixScore: number;
  suffixScore: number;
  morphologicalScore: number;
  lengthScore: number;
  relationshipType: SimilarityRelationshipType;
  secondaryTypes: SimilarityRelationshipType[];
  commonPrefix: string;
  commonSuffix: string;
  commonSubstring: string;
  sharedSequence: string;
  affix: string;
  stem: string;
  explanation: string;
  signals: SimilaritySignals;
  algorithmVersion: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
};

export type WordSimilarityResult = {
  wordId: string;
  word: string;
  score: number;
  relationship: SimilarityRelationshipType;
  secondaryRelationships: SimilarityRelationshipType[];
  explanation: string;
  scores: {
    overall: number;
    orthographic: number;
    ngram: number;
    prefix: number;
    suffix: number;
    morphological: number;
    length: number;
  };
  details: {
    commonPrefix: string;
    commonSuffix: string;
    commonSubstring: string;
    sharedSequence: string;
    affix: string;
    stem: string;
    baseWord: string;
  };
  signals?: SimilaritySignals;
};

export type WordSimilarityScoreWeights = {
  spelling: number;
  ngram: number;
  prefix: number;
  suffix: number;
  stem: number;
  length: number;
};

export type NgramWeights = {
  ngram2: number;
  ngram3: number;
  ngram4: number;
};

export type QualityThresholds = {
  minOverallScore: number;
  minWordLength: number;
  minSharedCharSequence: number;
  minNgramSimilarity: number;
  minPrefixLength: number;
  minSuffixLength: number;
  shortWordMaxEditDistance: number;
  shortWordMinScore: number;
  mediumWordMinScore: number;
  longWordMinScore: number;
};

export type ScoringPenalties = {
  shortSubstringPenalty: number;
  largeLengthDifferencePenalty: number;
  genericSuffixOnlyPenalty: number;
  genericPrefixOnlyPenalty: number;
  stopwordPenalty: number;
};

export type SimilarityConfig = {
  algorithmVersion: string;
  weights: WordSimilarityScoreWeights;
  ngramWeights: NgramWeights;
  thresholds: QualityThresholds;
  penalties: ScoringPenalties;
  commonSuffixes: string[];
  commonPrefixes: string[];
  stopwords: string[];
};

export type CandidateGenerationOptions = {
  maxCandidates?: number;
  minTrigramOverlap?: number;
  includeLengthBuckets?: boolean;
  lengthDelta?: number;
};

export type SimilarWordsQueryParams = {
  limit?: number;
  minScore?: number;
  relationshipType?: SimilarityRelationshipType | 'all';
  includeSignals?: boolean;
  algorithmVersion?: string;
};

export type SimilarityQueryParams = SimilarWordsQueryParams;
