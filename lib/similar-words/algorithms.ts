import type { NgramWeights } from './types';

/**
 * Normalizes an English word by trimming, lowercasing, and removing extraneous punctuation.
 */
export function normalizeWord(word: string): string {
  if (!word) {
    return '';
  }
  return word
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Computes standard Levenshtein distance between two normalized strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  const aLen = a.length;
  const bLen = b.length;
  if (!aLen) {
    return bLen;
  }
  if (!bLen) {
    return aLen;
  }

  const v0 = new Int32Array(bLen + 1);
  const v1 = new Int32Array(bLen + 1);

  for (let j = 0; j <= bLen; j++) {
    v0[j] = j;
  }

  for (let i = 0; i < aLen; i++) {
    v1[0] = i + 1;
    const aChar = a.charCodeAt(i);

    for (let j = 0; j < bLen; j++) {
      const cost = aChar === b.charCodeAt(j) ? 0 : 1;
      v1[j + 1] = Math.min(
        v1[j] + 1, // insertion
        v0[j + 1] + 1, // deletion
        v0[j] + cost // substitution
      );
    }

    for (let j = 0; j <= bLen; j++) {
      v0[j] = v1[j];
    }
  }

  return v0[bLen];
}

/**
 * Computes Normalized Levenshtein similarity scaled to [0, 1].
 */
export function normalizedLevenshteinSimilarity(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) {
    return 1;
  }
  const dist = levenshteinDistance(a, b);
  return Math.max(0, Math.min(1, 1 - dist / maxLen));
}

/**
 * Computes Optimal String Alignment (OSA) / Damerau-Levenshtein distance
 * including insertions, deletions, substitutions, and adjacent transpositions.
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  const aLen = a.length;
  const bLen = b.length;
  if (!aLen) {
    return bLen;
  }
  if (!bLen) {
    return aLen;
  }

  // 2D distance matrix: (aLen + 2) x (bLen + 2)
  const d: number[][] = Array.from({ length: aLen + 2 }, () => new Array(bLen + 2).fill(0));
  const maxDist = aLen + bLen;
  d[0][0] = maxDist;

  for (let i = 0; i <= aLen; i++) {
    d[i + 1][0] = maxDist;
    d[i + 1][1] = i;
  }
  for (let j = 0; j <= bLen; j++) {
    d[0][j + 1] = maxDist;
    d[1][j + 1] = j;
  }

  const da: Record<string, number> = {};

  for (let i = 1; i <= aLen; i++) {
    let db = 0;
    const aChar = a[i - 1];

    for (let j = 1; j <= bLen; j++) {
      const bChar = b[j - 1];
      const k = da[bChar] || 0;
      const l = db;
      let cost = 1;

      if (aChar === bChar) {
        cost = 0;
        db = j;
      }

      d[i + 1][j + 1] = Math.min(
        d[i][j + 1] + 1, // deletion
        d[i + 1][j] + 1, // insertion
        d[i][j] + cost, // substitution
        d[k][l] + (i - k - 1) + 1 + (j - l - 1) // transposition
      );
    }

    da[aChar] = i;
  }

  return d[aLen + 1][bLen + 1];
}

/**
 * Computes Damerau-Levenshtein similarity scaled to [0, 1].
 */
export function damerauLevenshteinSimilarity(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) {
    return 1;
  }
  const dist = damerauLevenshteinDistance(a, b);
  return Math.max(0, Math.min(1, 1 - dist / maxLen));
}

/**
 * Detects if two strings differ solely by a single adjacent character transposition.
 * e.g., "trial" and "trail", "form" and "from".
 */
export function detectTransposition(
  a: string,
  b: string
): { isTransposition: boolean; swappedChars?: [string, string] } {
  if (a.length !== b.length || a.length < 2 || a === b) {
    return { isTransposition: false };
  }

  const diffIndices: number[] = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      diffIndices.push(i);
    }
  }

  if (
    diffIndices.length === 2 &&
    diffIndices[1] === diffIndices[0] + 1 &&
    a[diffIndices[0]] === b[diffIndices[1]] &&
    a[diffIndices[1]] === b[diffIndices[0]]
  ) {
    return {
      isTransposition: true,
      swappedChars: [a[diffIndices[0]], a[diffIndices[1]]],
    };
  }

  return { isTransposition: false };
}

/**
 * Finds the Longest Common Substring (LCS) shared between two strings.
 */
export function longestCommonSubstring(
  a: string,
  b: string
): { substring: string; length: number; ratio: number } {
  if (!a || !b) {
    return { substring: '', length: 0, ratio: 0 };
  }
  if (a === b) {
    return { substring: a, length: a.length, ratio: 1 };
  }

  const aLen = a.length;
  const bLen = b.length;
  let maxLength = 0;
  let endIndexA = 0;

  // Optimized 1D buffer DP
  let prev = new Int32Array(bLen + 1);
  let curr = new Int32Array(bLen + 1);

  for (let i = 1; i <= aLen; i++) {
    const charA = a.charCodeAt(i - 1);
    for (let j = 1; j <= bLen; j++) {
      if (charA === b.charCodeAt(j - 1)) {
        curr[j] = prev[j - 1] + 1;
        if (curr[j] > maxLength) {
          maxLength = curr[j];
          endIndexA = i;
        }
      } else {
        curr[j] = 0;
      }
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }

  const substring = a.slice(endIndexA - maxLength, endIndexA);
  const ratio = (2 * maxLength) / (aLen + bLen);
  return { substring, length: maxLength, ratio };
}

/**
 * Finds the Longest Common Subsequence (LCS) shared between two strings.
 */
export function longestCommonSubsequence(
  a: string,
  b: string
): { sequence: string; length: number; ratio: number } {
  if (!a || !b) {
    return { sequence: '', length: 0, ratio: 0 };
  }
  if (a === b) {
    return { sequence: a, length: a.length, ratio: 1 };
  }

  const aLen = a.length;
  const bLen = b.length;

  const dp: number[][] = Array.from({ length: aLen + 1 }, () => new Array(bLen + 1).fill(0));

  for (let i = 1; i <= aLen; i++) {
    const charA = a.charCodeAt(i - 1);
    for (let j = 1; j <= bLen; j++) {
      if (charA === b.charCodeAt(j - 1)) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build the sequence
  let seq = '';
  let i = aLen;
  let j = bLen;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      seq = a[i - 1] + seq;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const length = dp[aLen][bLen];
  const ratio = (2 * length) / (aLen + bLen);
  return { sequence: seq, length, ratio };
}

/**
 * Extracts character n-grams from a word with optional boundary padding.
 */
export function extractNgrams(word: string, n: number, padded = true): Map<string, number> {
  const map = new Map<string, number>();
  if (!word || n <= 0) {
    return map;
  }

  const target = padded ? `^${word}$` : word;
  if (target.length < n) {
    map.set(target, 1);
    return map;
  }

  for (let i = 0; i <= target.length - n; i++) {
    const gram = target.slice(i, i + n);
    map.set(gram, (map.get(gram) || 0) + 1);
  }

  return map;
}

/**
 * Computes Jaccard similarity over two n-gram multiset frequency maps.
 */
export function ngramJaccardSimilarity(
  mapA: Map<string, number>,
  mapB: Map<string, number>
): number {
  if (mapA.size === 0 && mapB.size === 0) {
    return 1;
  }
  if (mapA.size === 0 || mapB.size === 0) {
    return 0;
  }

  let intersection = 0;
  let union = 0;

  const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
  for (const key of allKeys) {
    const countA = mapA.get(key) || 0;
    const countB = mapB.get(key) || 0;
    intersection += Math.min(countA, countB);
    union += Math.max(countA, countB);
  }

  return union === 0 ? 0 : intersection / union;
}

/**
 * Computes Cosine similarity over two n-gram multiset frequency maps.
 */
export function ngramCosineSimilarity(
  mapA: Map<string, number>,
  mapB: Map<string, number>
): number {
  if (mapA.size === 0 && mapB.size === 0) {
    return 1;
  }
  if (mapA.size === 0 || mapB.size === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const count of mapA.values()) {
    normA += count * count;
  }
  for (const count of mapB.values()) {
    normB += count * count;
  }

  for (const [key, countA] of mapA.entries()) {
    const countB = mapB.get(key);
    if (countB !== undefined) {
      dotProduct += countA * countB;
    }
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Computes multi-n-gram composite similarity across 2-grams, 3-grams, and 4-grams.
 */
export function computeMultiNgramSimilarity(
  a: string,
  b: string,
  weights: NgramWeights = { ngram2: 0.2, ngram3: 0.5, ngram4: 0.3 }
): { ngram2: number; ngram3: number; ngram4: number; composite: number } {
  if (a === b) {
    return { ngram2: 1, ngram3: 1, ngram4: 1, composite: 1 };
  }

  const g2A = extractNgrams(a, 2, true);
  const g2B = extractNgrams(b, 2, true);
  const sim2 = ngramJaccardSimilarity(g2A, g2B);

  const g3A = extractNgrams(a, 3, true);
  const g3B = extractNgrams(b, 3, true);
  const sim3 = ngramJaccardSimilarity(g3A, g3B);

  const g4A = extractNgrams(a, 4, true);
  const g4B = extractNgrams(b, 4, true);
  const sim4 = ngramJaccardSimilarity(g4A, g4B);

  const composite = weights.ngram2 * sim2 + weights.ngram3 * sim3 + weights.ngram4 * sim4;

  return {
    ngram2: sim2,
    ngram3: sim3,
    ngram4: sim4,
    composite: Math.max(0, Math.min(1, composite)),
  };
}

/**
 * Computes character set Jaccard overlap (unique letter intersection / union).
 */
export function characterSetOverlap(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));

  if (setA.size === 0 && setB.size === 0) {
    return 1;
  }
  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const char of setA) {
    if (setB.has(char)) {
      intersection++;
    }
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Finds the Longest Common Prefix (LCP) between two words.
 */
export function longestCommonPrefix(
  a: string,
  b: string
): { prefix: string; length: number; ratioShort: number; ratioLong: number } {
  if (!a || !b) {
    return { prefix: '', length: 0, ratioShort: 0, ratioLong: 0 };
  }

  const minLen = Math.min(a.length, b.length);
  const maxLen = Math.max(a.length, b.length);
  let len = 0;

  while (len < minLen && a.charCodeAt(len) === b.charCodeAt(len)) {
    len++;
  }

  const prefix = a.slice(0, len);
  return {
    prefix,
    length: len,
    ratioShort: minLen === 0 ? 0 : len / minLen,
    ratioLong: maxLen === 0 ? 0 : len / maxLen,
  };
}

/**
 * Finds the Longest Common Suffix between two words.
 */
export function longestCommonSuffix(
  a: string,
  b: string
): { suffix: string; length: number; ratioShort: number; ratioLong: number } {
  if (!a || !b) {
    return { suffix: '', length: 0, ratioShort: 0, ratioLong: 0 };
  }

  const aLen = a.length;
  const bLen = b.length;
  const minLen = Math.min(aLen, bLen);
  const maxLen = Math.max(aLen, bLen);
  let len = 0;

  while (len < minLen && a.charCodeAt(aLen - 1 - len) === b.charCodeAt(bLen - 1 - len)) {
    len++;
  }

  const suffix = a.slice(aLen - len);
  return {
    suffix,
    length: len,
    ratioShort: minLen === 0 ? 0 : len / minLen,
    ratioLong: maxLen === 0 ? 0 : len / maxLen,
  };
}
