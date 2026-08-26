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

// Reusable static typed buffers to avoid memory allocation on every Levenshtein comparison
let levRowA = new Int32Array(128);
let levRowB = new Int32Array(128);

/**
 * Computes Levenshtein distance between two strings with zero heap allocation.
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

  let s1 = a;
  let s2 = b;
  if (s1.length < s2.length) {
    s1 = b;
    s2 = a;
  }
  const s1Len = s1.length;
  const s2Len = s2.length;

  if (s2Len + 1 > levRowA.length) {
    levRowA = new Int32Array(s2Len + 64);
    levRowB = new Int32Array(s2Len + 64);
  }

  let prevRow = levRowA;
  let currRow = levRowB;

  for (let j = 0; j <= s2Len; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= s1Len; i++) {
    currRow[0] = i;
    const ch1 = s1.charCodeAt(i - 1);
    for (let j = 1; j <= s2Len; j++) {
      const cost = ch1 === s2.charCodeAt(j - 1) ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // insertion
        currRow[j - 1] + 1, // deletion
        prevRow[j - 1] + cost // substitution
      );
    }
    const tmp = prevRow;
    prevRow = currRow;
    currRow = tmp;
  }

  return prevRow[s2Len];
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

export type SearchableDefinition = {
  meaning: string;
  partOfSpeech: string;
  examples: string[];
};

export type SearchableMember = {
  word: string;
  bangla: string;
  english: string;
  freq: string;
};

export type SearchableWordData = {
  headword: string;
  headwordTokens: string[];
  headwordLength: number;
  defs: SearchableDefinition[];
  notes: string;
  usageFrequency: string;
  generatorAiDetails: string;
  members: SearchableMember[];
};

// Memoized WeakMap to avoid re-normalizing immutable WordRecord structures on every keystroke
const searchableWordCache = new WeakMap<WordRecord, SearchableWordData>();

/**
 * Creates or retrieves pre-normalized searchable data for a word and optional family members.
 */
export function getSearchableWordData(
  word: WordRecord,
  members: WordFamilyMemberRecord[] = []
): SearchableWordData {
  let cached = searchableWordCache.get(word);
  const hasMembers = members.length > 0;

  if (!cached || (hasMembers && cached.members.length === 0)) {
    const headword = normalizeSearchText(word.word);
    const headwordTokens = headword.split(/[\s\-_/,]+/).filter(Boolean);
    const defs: WordDefinition[] = getWordDefinitions(word);
    const notes = normalizeSearchText(word.notes);
    const usageFrequency = word.usageFrequency ? normalizeSearchText(word.usageFrequency) : '';
    const generatorAiDetails = word.generatorAiDetails
      ? normalizeSearchText(word.generatorAiDetails)
      : '';

    const searchableDefs: SearchableDefinition[] = new Array(defs.length);
    for (let i = 0; i < defs.length; i++) {
      const d = defs[i];
      const allEx = [...(d.examples || []), ...(d.userExamples || [])];
      const normEx: string[] = [];
      for (let j = 0; j < allEx.length; j++) {
        const norm = normalizeSearchText(allEx[j]);
        if (norm) {
          normEx.push(norm);
        }
      }
      searchableDefs[i] = {
        meaning: normalizeSearchText(d.meaning),
        partOfSpeech: normalizeSearchText(d.partOfSpeech),
        examples: normEx,
      };
    }

    const searchableMembers: SearchableMember[] = new Array(members.length);
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      searchableMembers[i] = {
        word: normalizeSearchText(m.word),
        bangla: normalizeSearchText(m.banglaDefinition),
        english: normalizeSearchText(m.englishDefinition),
        freq: m.usageFrequency ? normalizeSearchText(m.usageFrequency) : '',
      };
    }

    cached = {
      headword,
      headwordTokens,
      headwordLength: headword.length,
      defs: searchableDefs,
      notes,
      usageFrequency,
      generatorAiDetails,
      members: searchableMembers,
    };

    searchableWordCache.set(word, cached);
  }

  return cached;
}

export type CompiledSearchQuery = {
  raw: string;
  normalized: string;
  tokens: string[];
  isMultiToken: boolean;
  escaped: string;
  wordBoundaryRegex: RegExp;
};

/**
 * Compiles and pre-computes search query tokens and regex patterns once per search operation.
 */
export function compileSearchQuery(query: string): CompiledSearchQuery | null {
  const normalized = normalizeSearchText(query);
  if (!normalized) {
    return null;
  }
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);
  const escaped = escapeRegExp(normalized);
  const wordBoundaryRegex = new RegExp(
    `(?:^|[\\s.,;:!?"'()\\[\\]{}\\/\\-])${escaped}(?:$|[\\s.,;:!?"'()\\[\\]{}\\/\\-])`,
    'i'
  );
  return {
    raw: query,
    normalized,
    tokens,
    isMultiToken: tokens.length > 1,
    escaped,
    wordBoundaryRegex,
  };
}

/**
 * Calculates a matching relevance score for a pre-normalized searchable word data object.
 * Runs in sub-microsecond time with 0 regex compilations and 0 string heap allocations.
 */
export function calculateScoreFromSearchable(
  data: SearchableWordData,
  compiled: CompiledSearchQuery,
  scope: SearchScope = 'all'
): number {
  const {
    normalized: normalizedQuery,
    tokens: queryTokens,
    isMultiToken,
    wordBoundaryRegex,
  } = compiled;
  const { headword, headwordTokens, headwordLength } = data;

  let score = 0;
  let matchedAny = false;

  // ── 1. Headword Matching (Highest Priority) ──
  if (headword === normalizedQuery) {
    score += 10000 + Math.max(0, 1000 - headwordLength * 10);
    matchedAny = true;
  } else if (headword.startsWith(normalizedQuery)) {
    const lengthRatio = normalizedQuery.length / Math.max(1, headwordLength);
    score += 5000 + Math.round(lengthRatio * 1500);
    matchedAny = true;
  } else {
    // Check word-boundary / token match in headword
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
        const indexPenalty = Math.min(500, subIndex * 30);
        const lengthRatio = normalizedQuery.length / Math.max(1, headwordLength);
        score += 2000 - indexPenalty + Math.round(lengthRatio * 500);
        matchedAny = true;
      } else if (isMultiToken && queryTokens.every((t) => headword.includes(t))) {
        score += 2800;
        matchedAny = true;
      } else if (scope === 'word') {
        if (normalizedQuery.length >= 3) {
          const maxAllowedDist = normalizedQuery.length > 5 ? 2 : 1;
          if (Math.abs(headwordLength - normalizedQuery.length) <= maxAllowedDist) {
            const dist = levenshteinDistance(headword, normalizedQuery);
            if (dist <= maxAllowedDist) {
              score += dist === 1 ? 800 : 400;
              matchedAny = true;
            }
          }
          if (!matchedAny && isSubsequence(normalizedQuery, headword)) {
            score += 300;
            matchedAny = true;
          }
        }
      }
    }
  }

  // Early return for word-only scope
  if (scope === 'word') {
    return matchedAny ? score : 0;
  }

  // ── 2. Definitions & Meanings (if scope is 'wordAndDefinition' or 'all') ──
  let bestDefScore = 0;

  for (let i = 0; i < data.defs.length; i++) {
    const def = data.defs[i];
    const { meaning: defMeaning, partOfSpeech: defPos } = def;
    let currentDefScore = 0;

    if (defMeaning) {
      if (defMeaning === normalizedQuery) {
        currentDefScore = Math.max(currentDefScore, 2000);
      } else if (defMeaning.startsWith(normalizedQuery)) {
        currentDefScore = Math.max(currentDefScore, 1400);
      } else if (wordBoundaryRegex.test(defMeaning)) {
        currentDefScore = Math.max(currentDefScore, 1000);
      } else if (defMeaning.includes(normalizedQuery)) {
        currentDefScore = Math.max(currentDefScore, 500);
      } else if (isMultiToken && queryTokens.every((t) => defMeaning.includes(t))) {
        currentDefScore = Math.max(currentDefScore, 650);
      }
    }

    if (defPos) {
      if (defPos === normalizedQuery) {
        currentDefScore = Math.max(currentDefScore, 400);
      } else if (defPos.startsWith(normalizedQuery)) {
        currentDefScore = Math.max(currentDefScore, 250);
      }
    }

    if (currentDefScore > bestDefScore) {
      bestDefScore = currentDefScore;
    }
  }

  if (bestDefScore > 0) {
    score += bestDefScore;
    matchedAny = true;
  }

  // ── 3. Notes, Examples & Word Families (if scope is 'all') ──
  if (scope === 'all') {
    // 3A. Personal Notes
    if (data.notes) {
      if (data.notes === normalizedQuery) {
        score += 500;
        matchedAny = true;
      } else if (wordBoundaryRegex.test(data.notes)) {
        score += 350;
        matchedAny = true;
      } else if (data.notes.includes(normalizedQuery)) {
        score += 180;
        matchedAny = true;
      }
    }

    // 3B. Example Sentences
    let bestExampleScore = 0;
    for (let i = 0; i < data.defs.length; i++) {
      const def = data.defs[i];
      for (let j = 0; j < def.examples.length; j++) {
        const ex = def.examples[j];
        if (wordBoundaryRegex.test(ex)) {
          bestExampleScore = Math.max(bestExampleScore, 250);
        } else if (ex.includes(normalizedQuery)) {
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
    for (let i = 0; i < data.members.length; i++) {
      const mem = data.members[i];
      if (mem.word === normalizedQuery) {
        bestFamilyScore = Math.max(bestFamilyScore, 750);
      } else if (mem.word.startsWith(normalizedQuery)) {
        bestFamilyScore = Math.max(bestFamilyScore, 500);
      } else if (mem.word.includes(normalizedQuery)) {
        bestFamilyScore = Math.max(bestFamilyScore, 300);
      } else if (mem.bangla.includes(normalizedQuery) || mem.english.includes(normalizedQuery)) {
        bestFamilyScore = Math.max(bestFamilyScore, 150);
      } else if (mem.freq && (mem.freq === normalizedQuery || mem.freq.includes(normalizedQuery))) {
        bestFamilyScore = Math.max(bestFamilyScore, 180);
      }
    }
    if (bestFamilyScore > 0) {
      score += bestFamilyScore;
      matchedAny = true;
    }

    // 3D. Usage Frequency & Generator AI Details
    if (data.usageFrequency) {
      if (
        data.usageFrequency === normalizedQuery ||
        data.usageFrequency.includes(normalizedQuery)
      ) {
        score += 300;
        matchedAny = true;
      }
    }
    if (data.generatorAiDetails) {
      if (
        data.generatorAiDetails === normalizedQuery ||
        data.generatorAiDetails.includes(normalizedQuery)
      ) {
        score += 250;
        matchedAny = true;
      }
    }
  }

  // ── 4. Multi-token Global Coverage Bonus ──
  if (isMultiToken && !matchedAny) {
    let allTokensPresent = true;
    for (let t = 0; t < queryTokens.length; t++) {
      const token = queryTokens[t];
      let found =
        headword.includes(token) ||
        (data.notes && data.notes.includes(token)) ||
        (data.usageFrequency && data.usageFrequency.includes(token)) ||
        (data.generatorAiDetails && data.generatorAiDetails.includes(token));

      if (!found) {
        for (let i = 0; i < data.defs.length; i++) {
          const d = data.defs[i];
          if (
            d.meaning.includes(token) ||
            d.partOfSpeech.includes(token) ||
            d.examples.some((ex) => ex.includes(token))
          ) {
            found = true;
            break;
          }
        }
      }

      if (!found) {
        for (let i = 0; i < data.members.length; i++) {
          const m = data.members[i];
          if (
            m.word.includes(token) ||
            m.bangla.includes(token) ||
            m.english.includes(token) ||
            (m.freq && m.freq.includes(token))
          ) {
            found = true;
            break;
          }
        }
      }

      if (!found) {
        allTokensPresent = false;
        break;
      }
    }

    if (allTokensPresent) {
      score += 600;
      matchedAny = true;
    }
  }

  return matchedAny ? score : 0;
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
  const compiled = compileSearchQuery(query);
  if (!compiled) {
    return 0;
  }
  const scope: SearchScope = options.searchScope || 'all';
  const members = options.wordFamilyMembers || [];
  const searchable = getSearchableWordData(word, members);

  return calculateScoreFromSearchable(searchable, compiled, scope);
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
 * - When `searchQuery` is present: scores words using high-speed pre-indexed scoring,
 *   filters non-matching items, and sorts strictly by match score descending (ignoring `sortOption`).
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

  const compiled = compileSearchQuery(searchQuery);

  // If no search query, sort strictly by the UI sortOption
  if (!compiled) {
    return sortWordsByDefault(words, { sortOption, primaryFsrsByWordId });
  }

  // When search query is active, score each word using pre-compiled regex & pre-indexed data
  const scoredItems: Array<{ word: WordRecord; score: number }> = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const members = wordFamilies[word.id] || [];
    const searchable = getSearchableWordData(word, members);
    const score = calculateScoreFromSearchable(searchable, compiled, searchScope);

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
