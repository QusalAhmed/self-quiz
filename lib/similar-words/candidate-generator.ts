import { extractNgrams } from './algorithms';
import { stemWord } from './morphology';
import type { CandidateGenerationOptions } from './types';

export type IndexedWord = {
  id: string;
  word: string;
  normalized: string;
  length: number;
  stem: string;
};

/**
 * High-performance candidate generator implementing multi-index inverted lookups
 * for sub-millisecond Stage-1 filtering across large vocabulary datasets.
 */
export class CandidateGenerator {
  private words: IndexedWord[] = [];
  private wordById = new Map<string, IndexedWord>();
  private wordByNormalized = new Map<string, IndexedWord>();

  // Inverted trigram index: trigram -> set of word indices
  private trigramIndex = new Map<string, Set<number>>();

  // Prefix index: 3-letter & 4-letter prefixes -> set of word indices
  private prefixIndex = new Map<string, Set<number>>();

  // Suffix index: 3-letter & 4-letter suffixes -> set of word indices
  private suffixIndex = new Map<string, Set<number>>();

  // Stem index: stem -> set of word indices
  private stemIndex = new Map<string, Set<number>>();

  // Length bucket index: length -> array of word indices
  private lengthBuckets = new Map<number, number[]>();

  constructor(words: Array<{ id: string; word: string }>) {
    this.buildIndex(words);
  }

  /**
   * Rebuilds indices from a collection of words.
   */
  public buildIndex(words: Array<{ id: string; word: string }>): void {
    this.words = [];
    this.wordById.clear();
    this.wordByNormalized.clear();
    this.trigramIndex.clear();
    this.prefixIndex.clear();
    this.suffixIndex.clear();
    this.stemIndex.clear();
    this.lengthBuckets.clear();

    for (let i = 0; i < words.length; i++) {
      const item = words[i];
      const normalized = item.word.trim().toLowerCase();
      if (!normalized) {
        continue;
      }

      const stem = stemWord(normalized);
      const indexed: IndexedWord = {
        id: item.id,
        word: item.word,
        normalized,
        length: normalized.length,
        stem,
      };

      const wordIdx = this.words.length;
      this.words.push(indexed);
      this.wordById.set(indexed.id, indexed);
      this.wordByNormalized.set(indexed.normalized, indexed);

      // Index Trigrams
      const trigrams = extractNgrams(normalized, 3, true);
      for (const [tg] of trigrams.entries()) {
        let set = this.trigramIndex.get(tg);
        if (!set) {
          set = new Set();
          this.trigramIndex.set(tg, set);
        }
        set.add(wordIdx);
      }

      // Index Prefixes (length 3 and 4)
      if (normalized.length >= 3) {
        const p3 = normalized.slice(0, 3);
        let set3 = this.prefixIndex.get(p3);
        if (!set3) {
          set3 = new Set();
          this.prefixIndex.set(p3, set3);
        }
        set3.add(wordIdx);
      }
      if (normalized.length >= 4) {
        const p4 = normalized.slice(0, 4);
        let set4 = this.prefixIndex.get(p4);
        if (!set4) {
          set4 = new Set();
          this.prefixIndex.set(p4, set4);
        }
        set4.add(wordIdx);
      }

      // Index Suffixes (length 3 and 4)
      if (normalized.length >= 3) {
        const s3 = normalized.slice(-3);
        let set3 = this.suffixIndex.get(s3);
        if (!set3) {
          set3 = new Set();
          this.suffixIndex.set(s3, set3);
        }
        set3.add(wordIdx);
      }
      if (normalized.length >= 4) {
        const s4 = normalized.slice(-4);
        let set4 = this.suffixIndex.get(s4);
        if (!set4) {
          set4 = new Set();
          this.suffixIndex.set(s4, set4);
        }
        set4.add(wordIdx);
      }

      // Index Stem
      if (stem && stem.length >= 3) {
        let stemSet = this.stemIndex.get(stem);
        if (!stemSet) {
          stemSet = new Set();
          this.stemIndex.set(stem, stemSet);
        }
        stemSet.add(wordIdx);
      }

      // Index Length Bucket
      let bucket = this.lengthBuckets.get(indexed.length);
      if (!bucket) {
        bucket = [];
        this.lengthBuckets.set(indexed.length, bucket);
      }
      bucket.push(wordIdx);
    }
  }

  /**
   * Generates candidate matches for a query word without performing O(N) full scans.
   */
  public generateCandidates(
    queryWord: string,
    options: CandidateGenerationOptions = {}
  ): IndexedWord[] {
    const maxCandidates = options.maxCandidates ?? 150;
    const lengthDelta = options.lengthDelta ?? 5;
    const normalized = queryWord.trim().toLowerCase();

    if (!normalized || this.words.length === 0) {
      return [];
    }

    // Accumulate candidate scores: candidate word index -> score accumulator
    const candidateScores = new Map<number, number>();

    // 1. Trigram index query
    const trigrams = extractNgrams(normalized, 3, true);
    const queryTrigramCount = trigrams.size;

    for (const [tg] of trigrams.entries()) {
      const postingList = this.trigramIndex.get(tg);
      if (postingList) {
        for (const idx of postingList) {
          const current = candidateScores.get(idx) || 0;
          candidateScores.set(idx, current + 1);
        }
      }
    }

    // 2. Prefix index boost
    if (normalized.length >= 3) {
      const p3 = normalized.slice(0, 3);
      const prefixPostings = this.prefixIndex.get(p3);
      if (prefixPostings) {
        for (const idx of prefixPostings) {
          const current = candidateScores.get(idx) || 0;
          candidateScores.set(idx, current + 2);
        }
      }
    }

    // 3. Suffix index boost
    if (normalized.length >= 3) {
      const s3 = normalized.slice(-3);
      const suffixPostings = this.suffixIndex.get(s3);
      if (suffixPostings) {
        for (const idx of suffixPostings) {
          const current = candidateScores.get(idx) || 0;
          candidateScores.set(idx, current + 1.5);
        }
      }
    }

    // 4. Stem index boost
    const queryStem = stemWord(normalized);
    if (queryStem && queryStem.length >= 3) {
      const stemPostings = this.stemIndex.get(queryStem);
      if (stemPostings) {
        for (const idx of stemPostings) {
          const current = candidateScores.get(idx) || 0;
          candidateScores.set(idx, current + 4);
        }
      }
    }

    // 5. If short word (<= 4 chars) and candidate count is very small, check length neighbor buckets
    if (normalized.length <= 4 && candidateScores.size < 3) {
      for (let len = Math.max(1, normalized.length - 1); len <= normalized.length + 1; len++) {
        const bucket = this.lengthBuckets.get(len);
        if (bucket) {
          for (const idx of bucket) {
            if (!candidateScores.has(idx)) {
              candidateScores.set(idx, 0.5);
            }
          }
        }
      }
    }

    // Sort candidates by initial signal score and filter by length delta
    const scoredCandidates: Array<{ index: number; score: number }> = [];

    for (const [idx, score] of candidateScores.entries()) {
      const candidate = this.words[idx];
      if (candidate.normalized === normalized) {
        continue;
      }
      const lenDiff = Math.abs(candidate.length - normalized.length);
      if (lenDiff > lengthDelta && score < 3) {
        continue;
      }

      // Filter out zero/negligible scores unless candidate pool is tiny
      if (score < 1 && candidateScores.size > 10) {
        continue;
      }

      const normalizedScore = score / (queryTrigramCount + 2);
      scoredCandidates.push({ index: idx, score: normalizedScore });
    }

    // Top K candidates
    scoredCandidates.sort((a, b) => b.score - a.score);
    const topCandidates = scoredCandidates.slice(0, maxCandidates);

    return topCandidates.map((c) => this.words[c.index]);
  }

  public getWordById(id: string): IndexedWord | undefined {
    return this.wordById.get(id);
  }

  public getWordByNormalized(word: string): IndexedWord | undefined {
    return this.wordByNormalized.get(word.trim().toLowerCase());
  }

  public getAllWords(): IndexedWord[] {
    return this.words;
  }
}
