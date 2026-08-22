import type { FsrsRecord, WordDefinition, WordFamilyMemberRecord, WordRecord } from './db';
import { getWordDefinitions } from './definitions';

export type SearchScope = 'word' | 'wordAndDefinition' | 'all';

export type WordSortOption =
  | 'alphaAsc'
  | 'alphaDesc'
  | 'newest'
  | 'oldest'
  | 'updated'
  | 'dueSoonest'
  | 'mostLapses';

/**
 * Escapes regex special characters in a search string.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes search text by lowercasing and trimming extra whitespace.
 */
export function normalizeSearchText(text?: string | null): string {
  if (!text) {
    return '';
  }
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Computes Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if subsequence `sub` appears in `str` in order.
 */
export function isSubsequence(sub: string, str: string): boolean {
  if (!sub) {
    return true;
  }
  if (!str) {
    return false;
  }
  let subIdx = 0;
  for (let i = 0; i < str.length && subIdx < sub.length; i++) {
    if (str[i] === sub[subIdx]) {
      subIdx++;
    }
  }
  return subIdx === sub.length;
}

export type WordMatchScoreOptions = {
  searchScope?: SearchScope;
  wordFamilyMembers?: WordFamilyMemberRecord[];
};

/**
 * Calculates a matching relevance score for a word given a search query and scope.
 * Returns 0 if the word does not match the query under the given search scope.
 * Higher score indicates higher relevance.
 */
export function calculateWordMatchScore(
  word: WordRecord,
  query: string,
  options: WordMatchScoreOptions = {}
): number {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return 0;
  }

  const scope: SearchScope = options.searchScope || 'all';
  const members = options.wordFamilyMembers || [];

  const headword = normalizeSearchText(word.word);
  const defs: WordDefinition[] = getWordDefinitions(word);
  const notes = normalizeSearchText(word.notes);

  let score = 0;
  let matchedAny = false;

  const queryTokens = normalizedQuery.split(/\s+/).filter((t) => t.length > 0);
  const isMultiToken = queryTokens.length > 1;

  // ── 1. Headword Matching (Highest Priority) ──
  if (headword === normalizedQuery) {
    // Exact match on headword
    score += 10000 + Math.max(0, 1000 - headword.length * 10);
    matchedAny = true;
  } else if (headword.startsWith(normalizedQuery)) {
    // Headword prefix match (e.g., query "run", headword "running")
    const lengthRatio = normalizedQuery.length / Math.max(1, headword.length);
    score += 5000 + Math.round(lengthRatio * 1500);
    matchedAny = true;
  } else {
    // Check word-boundary / token match in headword (e.g., "take off" or "state-of-the-art")
    const headwordTokens = headword.split(/[\s\-_/,]+/).filter(Boolean);
    const tokenExactMatch = headwordTokens.some((t) => t === normalizedQuery);
    const tokenPrefixMatch = headwordTokens.some((t) => t.startsWith(normalizedQuery));

    if (tokenExactMatch) {
      score += 4000;
      matchedAny = true;
    } else if (tokenPrefixMatch) {
      score += 3500;
      matchedAny = true;
    } else {
      const subIndex = headword.indexOf(normalizedQuery);
      if (subIndex !== -1) {
        // Headword substring match
        const indexPenalty = Math.min(500, subIndex * 30);
        const lengthRatio = normalizedQuery.length / Math.max(1, headword.length);
        score += 2000 - indexPenalty + Math.round(lengthRatio * 500);
        matchedAny = true;
      } else if (isMultiToken && queryTokens.every((t) => headword.includes(t))) {
        // Multi-token all present in headword
        score += 2800;
        matchedAny = true;
      } else if (scope === 'word') {
        // If searching word only, check for close fuzzy typo / subsequence match
        if (normalizedQuery.length >= 3) {
          const dist = levenshteinDistance(headword, normalizedQuery);
          const maxAllowedDist = normalizedQuery.length > 5 ? 2 : 1;
          if (dist <= maxAllowedDist) {
            score += dist === 1 ? 800 : 400;
            matchedAny = true;
          } else if (isSubsequence(normalizedQuery, headword)) {
            score += 300;
            matchedAny = true;
          }
        }
      }
    }
  }

  // ── 2. Definitions & Meanings (if scope is 'wordAndDefinition' or 'all') ──
  if (scope !== 'word') {
    let bestDefScore = 0;

    for (const def of defs) {
      const defMeaning = normalizeSearchText(def.meaning);
      const defPos = normalizeSearchText(def.partOfSpeech);

      let currentDefScore = 0;

      if (defMeaning) {
        if (defMeaning === normalizedQuery) {
          currentDefScore = Math.max(currentDefScore, 2000);
        } else if (defMeaning.startsWith(normalizedQuery)) {
          currentDefScore = Math.max(currentDefScore, 1400);
        } else {
          // Check word boundary match in definition text
          const escaped = escapeRegExp(normalizedQuery);
          const wordBoundaryRegex = new RegExp(
            `(?:^|[\\s.,;:!?"'()\\[\\]{}\\/\\-])${escaped}(?:$|[\\s.,;:!?"'()\\[\\]{}\\/\\-])`,
            'i'
          );
          if (wordBoundaryRegex.test(defMeaning)) {
            currentDefScore = Math.max(currentDefScore, 1000);
          } else if (defMeaning.includes(normalizedQuery)) {
            currentDefScore = Math.max(currentDefScore, 500);
          } else if (isMultiToken && queryTokens.every((t) => defMeaning.includes(t))) {
            currentDefScore = Math.max(currentDefScore, 650);
          }
        }
      }

      // Check Part of speech match (e.g. searching "noun", "verb", "adjective")
      if (defPos) {
        if (defPos === normalizedQuery) {
          currentDefScore = Math.max(currentDefScore, 400);
        } else if (defPos.startsWith(normalizedQuery)) {
          currentDefScore = Math.max(currentDefScore, 250);
        }
      }

      bestDefScore = Math.max(bestDefScore, currentDefScore);
    }

    if (bestDefScore > 0) {
      score += bestDefScore;
      matchedAny = true;
    }
  }

  // ── 3. Notes, Examples & Word Families (if scope is 'all') ──
  if (scope === 'all') {
    // 3A. Personal Notes
    if (notes) {
      if (notes === normalizedQuery) {
        score += 500;
        matchedAny = true;
      } else {
        const escaped = escapeRegExp(normalizedQuery);
        const wordBoundaryRegex = new RegExp(
          `(?:^|[\\s.,;:!?"'()\\[\\]{}\\/\\-])${escaped}(?:$|[\\s.,;:!?"'()\\[\\]{}\\/\\-])`,
          'i'
        );
        if (wordBoundaryRegex.test(notes)) {
          score += 350;
          matchedAny = true;
        } else if (notes.includes(normalizedQuery)) {
          score += 180;
          matchedAny = true;
        }
      }
    }

    // 3B. Example Sentences
    let bestExampleScore = 0;
    for (const def of defs) {
      const allExamples = [...(def.examples || []), ...(def.userExamples || [])];
      for (const ex of allExamples) {
        const normEx = normalizeSearchText(ex);
        if (!normEx) {
          continue;
        }
        const escaped = escapeRegExp(normalizedQuery);
        const wordBoundaryRegex = new RegExp(
          `(?:^|[\\s.,;:!?"'()\\[\\]{}\\/\\-])${escaped}(?:$|[\\s.,;:!?"'()\\[\\]{}\\/\\-])`,
          'i'
        );
        if (wordBoundaryRegex.test(normEx)) {
          bestExampleScore = Math.max(bestExampleScore, 250);
        } else if (normEx.includes(normalizedQuery)) {
          bestExampleScore = Math.max(bestExampleScore, 120);
        }
      }
    }
    if (bestExampleScore > 0) {
      score += bestExampleScore;
      matchedAny = true;
    }

    // 3C. Word Family Members
    let bestFamilyScore = 0;
    for (const mem of members) {
      const memWord = normalizeSearchText(mem.word);
      const memBangla = normalizeSearchText(mem.banglaDefinition);
      const memEng = normalizeSearchText(mem.englishDefinition);

      if (memWord === normalizedQuery) {
        bestFamilyScore = Math.max(bestFamilyScore, 750);
      } else if (memWord.startsWith(normalizedQuery)) {
        bestFamilyScore = Math.max(bestFamilyScore, 500);
      } else if (memWord.includes(normalizedQuery)) {
        bestFamilyScore = Math.max(bestFamilyScore, 300);
      } else if (memBangla.includes(normalizedQuery) || memEng.includes(normalizedQuery)) {
        bestFamilyScore = Math.max(bestFamilyScore, 150);
      }
    }
    if (bestFamilyScore > 0) {
      score += bestFamilyScore;
      matchedAny = true;
    }
  }

  // ── 4. Multi-token Global Coverage Bonus ──
  if (isMultiToken && !matchedAny) {
    // Check if every individual token matches somewhere across the allowed fields
    const allSearchableFields: string[] = [headword];
    if (scope !== 'word') {
      for (const def of defs) {
        allSearchableFields.push(normalizeSearchText(def.meaning));
        allSearchableFields.push(normalizeSearchText(def.partOfSpeech));
      }
    }
    if (scope === 'all') {
      if (notes) {
        allSearchableFields.push(notes);
      }
      for (const def of defs) {
        for (const ex of [...(def.examples || []), ...(def.userExamples || [])]) {
          allSearchableFields.push(normalizeSearchText(ex));
        }
      }
      for (const mem of members) {
        allSearchableFields.push(normalizeSearchText(mem.word));
        allSearchableFields.push(normalizeSearchText(mem.banglaDefinition));
        allSearchableFields.push(normalizeSearchText(mem.englishDefinition));
      }
    }

    const combinedText = allSearchableFields.join(' ');
    const allTokensPresent = queryTokens.every((token) => combinedText.includes(token));
    if (allTokensPresent) {
      score += 600;
      matchedAny = true;
    }
  }

  return matchedAny ? score : 0;
}

export type SortWordsOptions = {
  sortOption: WordSortOption;
  primaryFsrsByWordId?: Map<string, FsrsRecord>;
};

/**
 * Sorts words based on standard UI sort options (used when search query is empty).
 */
export function sortWordsByDefault(words: WordRecord[], options: SortWordsOptions): WordRecord[] {
  const { sortOption, primaryFsrsByWordId } = options;
  const sorted = [...words];

  if (sortOption === 'alphaAsc') {
    sorted.sort((a, b) => a.word.localeCompare(b.word));
  } else if (sortOption === 'alphaDesc') {
    sorted.sort((a, b) => b.word.localeCompare(a.word));
  } else if (sortOption === 'newest') {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else if (sortOption === 'oldest') {
    sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } else if (sortOption === 'updated') {
    sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } else if (sortOption === 'dueSoonest') {
    sorted.sort((a, b) => {
      const fsrsA = primaryFsrsByWordId?.get(a.id);
      const fsrsB = primaryFsrsByWordId?.get(b.id);
      if (!fsrsA) {
        return 1;
      }
      if (!fsrsB) {
        return -1;
      }
      return fsrsA.dueAt.localeCompare(fsrsB.dueAt);
    });
  } else if (sortOption === 'mostLapses') {
    sorted.sort((a, b) => {
      const lapsesA = primaryFsrsByWordId?.get(a.id)?.lapses || 0;
      const lapsesB = primaryFsrsByWordId?.get(b.id)?.lapses || 0;
      return lapsesB - lapsesA;
    });
  }

  return sorted;
}

export type FilterAndSortWordsParams = {
  words: WordRecord[];
  searchQuery: string;
  searchScope: SearchScope;
  sortOption: WordSortOption;
  wordFamilies?: Record<string, WordFamilyMemberRecord[]>;
  primaryFsrsByWordId?: Map<string, FsrsRecord>;
};

/**
 * Filters and sorts words:
 * - When `searchQuery` is present: scores words, filters non-matching items, and sorts
 *   strictly by match score descending (ignoring `sortOption`).
 * - When `searchQuery` is empty: sorts using the UI `sortOption`.
 */
export function filterAndSortWords(params: FilterAndSortWordsParams): WordRecord[] {
  const {
    words,
    searchQuery,
    searchScope,
    sortOption,
    wordFamilies = {},
    primaryFsrsByWordId,
  } = params;

  const trimmedQuery = searchQuery.trim();

  // If no search query, sort strictly by the UI sortOption
  if (!trimmedQuery) {
    return sortWordsByDefault(words, { sortOption, primaryFsrsByWordId });
  }

  // When search query is active, score each word and sort strictly by match score descending
  const scoredItems: Array<{ word: WordRecord; score: number }> = [];

  for (const word of words) {
    const members = wordFamilies[word.id] || [];
    const score = calculateWordMatchScore(word, trimmedQuery, {
      searchScope,
      wordFamilyMembers: members,
    });

    if (score > 0) {
      scoredItems.push({ word, score });
    }
  }

  // Sort strictly by matching score descending (ignoring UI sortOption)
  scoredItems.sort((a, b) => {
    // 1. Primary: Match Score descending
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // 2. Secondary tie-breaker: Shorter headword length
    if (a.word.word.length !== b.word.word.length) {
      return a.word.word.length - b.word.word.length;
    }
    // 3. Tertiary tie-breaker: Alphabetical A-Z
    return a.word.word.localeCompare(b.word.word);
  });

  return scoredItems.map((item) => item.word);
}
