import {
  characterSetOverlap,
  computeMultiNgramSimilarity,
  damerauLevenshteinSimilarity,
  detectTransposition,
  longestCommonPrefix,
  longestCommonSubsequence,
  longestCommonSubstring,
  longestCommonSuffix,
  normalizedLevenshteinSimilarity,
  normalizeWord,
} from './algorithms';
import { DEFAULT_SIMILARITY_CONFIG } from './config';
import { analyzeMorphologicalRelationship } from './morphology';
import type { SimilarityConfig, SimilaritySignals } from './types';

export type WordPairScores = {
  overallScore: number;
  orthographicScore: number;
  ngramScore: number;
  prefixScore: number;
  suffixScore: number;
  morphologicalScore: number;
  lengthScore: number;
  signals: SimilaritySignals;
};

/**
 * Computes all similarity signals and composite relevance score for a pair of words.
 */
export function computePairSimilarity(
  wordA: string,
  wordB: string,
  config: SimilarityConfig = DEFAULT_SIMILARITY_CONFIG
): WordPairScores {
  const normA = normalizeWord(wordA);
  const normB = normalizeWord(wordB);

  // Exact match handling
  if (normA === normB && normA.length > 0) {
    const signals: SimilaritySignals = {
      normalizedLevenshtein: 1,
      damerauLevenshtein: 1,
      longestCommonSubstring: normA,
      longestCommonSubstringRatio: 1,
      longestCommonSubsequence: normA,
      longestCommonSubsequenceRatio: 1,
      ngramScores: { ngram2: 1, ngram3: 1, ngram4: 1, composite: 1 },
      characterSetOverlap: 1,
      sharedSequence: normA,
      sharedSequenceLength: normA.length,
      commonPrefix: normA,
      prefixRatioShort: 1,
      prefixRatioLong: 1,
      commonSuffix: normA,
      suffixRatio: 1,
      isCommonSuffix: false,
      isCommonPrefix: false,
      stemMatch: true,
      stem: normA,
      affix: '',
      baseWord: normA,
      morphologicalConfidence: 1,
      isTransposition: false,
      lengthDifference: 0,
      lengthRatio: 1,
    };

    return {
      overallScore: 1,
      orthographicScore: 1,
      ngramScore: 1,
      prefixScore: 1,
      suffixScore: 1,
      morphologicalScore: 1,
      lengthScore: 1,
      signals,
    };
  }

  // 1. Basic length metrics
  const lenA = normA.length;
  const lenB = normB.length;
  const maxLen = Math.max(lenA, lenB);
  const minLen = Math.min(lenA, lenB);
  const lenDiff = Math.abs(lenA - lenB);
  const lengthRatio = maxLen === 0 ? 0 : 1 - lenDiff / maxLen;
  const lengthScore = lengthRatio ** 1.2;

  // 2. Edit distances & transpositions

  const normLev = normalizedLevenshteinSimilarity(normA, normB);
  const damLev = damerauLevenshteinSimilarity(normA, normB);
  const transpositionCheck = detectTransposition(normA, normB);

  // 3. Substrings & Subsequences
  const lcsSubstr = longestCommonSubstring(normA, normB);
  const lcsSubseq = longestCommonSubsequence(normA, normB);
  const charOverlap = characterSetOverlap(normA, normB);

  // 4. Multi-N-Grams
  const ngram = computeMultiNgramSimilarity(normA, normB, config.ngramWeights);

  // 5. Prefix & Suffix
  const lcp = longestCommonPrefix(normA, normB);
  const lcsuf = longestCommonSuffix(normA, normB);

  const isRecognizedPrefix = config.commonPrefixes.includes(lcp.prefix);
  const isRecognizedSuffix =
    config.commonSuffixes.includes(lcsuf.suffix) ||
    (lcsuf.suffix.endsWith('tion') && config.commonSuffixes.includes('tion')) ||
    (lcsuf.suffix.endsWith('sion') && config.commonSuffixes.includes('sion'));

  // 6. Morphology & Base detection
  const morph = analyzeMorphologicalRelationship(normA, normB);

  // ── Calculate Orthographic Sub-Score ──
  let ortho =
    0.35 * damLev +
    0.2 * normLev +
    0.2 * lcsSubstr.ratio +
    0.15 * lcsSubseq.ratio +
    0.1 * charOverlap;

  if (transpositionCheck.isTransposition) {
    ortho = Math.max(ortho, 0.92);
  }

  // ── Calculate Prefix Sub-Score ──
  let prefixScore = 0;
  if (lcp.length >= config.thresholds.minPrefixLength) {
    const rawRatio = lcp.length / maxLen;
    prefixScore = isRecognizedPrefix ? Math.min(1, rawRatio * 1.3) : rawRatio;
  }

  // ── Calculate Suffix Sub-Score ──
  let suffixScore = 0;
  if (lcsuf.length >= config.thresholds.minSuffixLength) {
    const rawRatio = lcsuf.length / maxLen;
    suffixScore = isRecognizedSuffix ? Math.min(1, rawRatio * 1.25) : rawRatio;
  }

  // ── Calculate Morphological Sub-Score ──
  let morphScore = 0;
  if (morph.isRelated) {
    morphScore = morph.confidence;
  } else if (morph.stem && morph.stem.length >= 2 && morph.stem.length / maxLen >= 0.5) {
    morphScore = 0.65;
  }

  // ── Penalties ──
  let penaltyMultiplier = 1.0;

  // Penalty 1: Short common substring penalty (if shared substring is tiny relative to word length)
  if (
    lcsSubstr.length < config.thresholds.minSharedCharSequence &&
    !transpositionCheck.isTransposition &&
    !morph.isRelated
  ) {
    penaltyMultiplier *= 1 - config.penalties.shortSubstringPenalty;
  }

  // Penalty 2: Large length difference penalty (e.g. cat vs caterpillar)
  if (lenDiff >= 4 && !morph.isRelated) {
    const lengthPenalty = Math.min(
      config.penalties.largeLengthDifferencePenalty,
      (lenDiff / maxLen) * 0.4
    );
    penaltyMultiplier *= 1 - lengthPenalty;
  }

  // Penalty 3: Generic suffix-only overlap penalty (e.g. "creation" vs "station", "tradition" vs "pollution")
  if (
    isRecognizedSuffix &&
    lcsuf.length >= 3 &&
    !morph.isRelated &&
    lcp.length <= 1 &&
    lcsSubstr.length <= lcsuf.length + 1
  ) {
    penaltyMultiplier *= 1 - config.penalties.genericSuffixOnlyPenalty;
  }

  // Penalty 4: Generic prefix-only overlap penalty without stem similarity
  // e.g. "preview" vs "pressure" share "pre"
  if (
    isRecognizedPrefix &&
    lcp.length >= 3 &&
    !morph.isRelated &&
    lcsuf.length <= 1 &&
    lcsSubstr.length <= lcp.length + 1
  ) {
    penaltyMultiplier *= 1 - config.penalties.genericPrefixOnlyPenalty;
  }

  // Penalty 5: Stopwords match penalty for tiny function words (e.g. "a", "an")
  if (
    (config.stopwords.includes(normA) || config.stopwords.includes(normB)) &&
    minLen <= 2 &&
    !transpositionCheck.isTransposition &&
    !morph.isRelated
  ) {
    penaltyMultiplier *= 1 - config.penalties.stopwordPenalty;
  }

  // ── Weighted Composite Score ──
  const w = config.weights;
  let rawComposite =
    w.spelling * ortho +
    w.ngram * ngram.composite +
    w.prefix * prefixScore +
    w.suffix * suffixScore +
    w.stem * morphScore +
    w.length * lengthScore;

  // High-confidence boosts
  if (morph.isRelated) {
    if (morph.relationship === 'word_family') {
      rawComposite = Math.max(rawComposite, 0.8 + 0.18 * morph.confidence);
    } else {
      rawComposite = Math.max(rawComposite, 0.75 + 0.2 * morph.confidence);
    }
  }

  if (transpositionCheck.isTransposition) {
    rawComposite = Math.max(rawComposite, 0.88);
  }

  // Single-letter edit distance boost for same-length words (e.g. adapt vs adept, affect vs effect, angel vs angle)
  if (lenA === lenB && (normLev >= 0.75 || lcsSubseq.length >= lenA - 1)) {
    rawComposite = Math.max(rawComposite, 0.78);
  }

  // Orthographic sequence overlap boost (e.g. retail vs trail, sharing "rail" or "tail")
  if (lcsSubseq.sequence.length >= 4 && charOverlap >= 0.8 && Math.abs(lenA - lenB) <= 2) {
    rawComposite = Math.max(rawComposite, 0.65);
  }

  let finalOverallScore = rawComposite * penaltyMultiplier;

  // ── Length-Aware Threshold Adjustments ──
  // Short words (<= 4 chars): demand high similarity unless morphology or transposition
  if (minLen <= 4 && !morph.isRelated && !transpositionCheck.isTransposition) {
    if (damLev < 0.65 || lcsSubstr.length < 2) {
      finalOverallScore *= 0.5;
    }
  }

  // Ensure strict bounds [0, 1]
  finalOverallScore = Math.max(0, Math.min(1, Math.round(finalOverallScore * 1000) / 1000));

  const signals: SimilaritySignals = {
    normalizedLevenshtein: Math.round(normLev * 1000) / 1000,
    damerauLevenshtein: Math.round(damLev * 1000) / 1000,
    longestCommonSubstring: lcsSubstr.substring,
    longestCommonSubstringRatio: Math.round(lcsSubstr.ratio * 1000) / 1000,
    longestCommonSubsequence: lcsSubseq.sequence,
    longestCommonSubsequenceRatio: Math.round(lcsSubseq.ratio * 1000) / 1000,
    ngramScores: {
      ngram2: Math.round(ngram.ngram2 * 1000) / 1000,
      ngram3: Math.round(ngram.ngram3 * 1000) / 1000,
      ngram4: Math.round(ngram.ngram4 * 1000) / 1000,
      composite: Math.round(ngram.composite * 1000) / 1000,
    },
    characterSetOverlap: Math.round(charOverlap * 1000) / 1000,
    sharedSequence: lcsSubstr.length >= 3 ? lcsSubstr.substring : lcsSubseq.sequence,
    sharedSequenceLength: Math.max(lcsSubstr.length, lcsSubseq.length),
    commonPrefix: lcp.prefix,
    prefixRatioShort: Math.round(lcp.ratioShort * 1000) / 1000,
    prefixRatioLong: Math.round(lcp.ratioLong * 1000) / 1000,
    commonSuffix: lcsuf.suffix,
    suffixRatio: Math.round(lcsuf.ratioLong * 1000) / 1000,
    isCommonSuffix: isRecognizedSuffix,
    isCommonPrefix: isRecognizedPrefix,
    stemMatch: morph.isRelated,
    stem: morph.stem,
    affix: morph.affix,
    baseWord: morph.baseWord,
    morphologicalConfidence: Math.round(morph.confidence * 1000) / 1000,
    isTransposition: transpositionCheck.isTransposition,
    lengthDifference: lenDiff,
    lengthRatio: Math.round(lengthRatio * 1000) / 1000,
  };

  return {
    overallScore: finalOverallScore,
    orthographicScore: Math.round(ortho * 1000) / 1000,
    ngramScore: Math.round(ngram.composite * 1000) / 1000,
    prefixScore: Math.round(prefixScore * 1000) / 1000,
    suffixScore: Math.round(suffixScore * 1000) / 1000,
    morphologicalScore: Math.round(morphScore * 1000) / 1000,
    lengthScore: Math.round(lengthScore * 1000) / 1000,
    signals,
  };
}
