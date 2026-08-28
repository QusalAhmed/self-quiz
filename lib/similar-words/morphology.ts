import { COMMON_ENGLISH_PREFIXES, COMMON_ENGLISH_SUFFIXES } from './config';

/**
 * Result of morphological analysis between two words.
 */
export type MorphologyAnalysisResult = {
  isRelated: boolean;
  relationship: 'word_family' | 'morphological' | 'none';
  baseWord: string;
  derivedWord: string;
  affix: string;
  stem: string;
  confidence: number;
};

function isVowel(char: string): boolean {
  return char === 'a' || char === 'e' || char === 'i' || char === 'o' || char === 'u';
}

function hasVowel(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    if (isVowel(str[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Enhanced lightweight Porter-inspired English stemmer.
 */
export function stemWord(word: string): string {
  if (!word || word.length <= 2) {
    return word;
  }

  let stem = word.toLowerCase();

  // Step 1: Plurals and basic inflectional suffixes
  if (stem.endsWith('sses')) {
    stem = stem.slice(0, -2);
  } else if (stem.endsWith('ies')) {
    stem = stem.slice(0, -2);
  } else if (stem.endsWith('ss')) {
    // keep ss
  } else if (
    stem.endsWith('s') &&
    stem.length > 3 &&
    !stem.endsWith('us') &&
    !stem.endsWith('is')
  ) {
    stem = stem.slice(0, -1);
  }

  // -eed, -ed, -ing
  if (stem.endsWith('eed')) {
    if (stem.length > 4) {
      stem = stem.slice(0, -1);
    }
  } else if (stem.endsWith('ed')) {
    const base = stem.slice(0, -2);
    if (hasVowel(base)) {
      stem = base;
      if (stem.endsWith('at') || stem.endsWith('bl') || stem.endsWith('iz')) {
        stem += 'e';
      } else if (
        stem.length >= 2 &&
        stem[stem.length - 1] === stem[stem.length - 2] &&
        !stem.endsWith('ll') &&
        !stem.endsWith('ss') &&
        !stem.endsWith('zz')
      ) {
        stem = stem.slice(0, -1);
      }
    }
  } else if (stem.endsWith('ing')) {
    const base = stem.slice(0, -3);
    if (hasVowel(base)) {
      stem = base;
      if (stem.endsWith('at') || stem.endsWith('bl') || stem.endsWith('iz')) {
        stem += 'e';
      } else if (
        stem.length >= 2 &&
        stem[stem.length - 1] === stem[stem.length - 2] &&
        !stem.endsWith('ll') &&
        !stem.endsWith('ss') &&
        !stem.endsWith('zz')
      ) {
        stem = stem.slice(0, -1);
      }
    }
  }

  // Step 2: -ily, -ly
  if (stem.endsWith('ily')) {
    stem = `${stem.slice(0, -3)}i`;
  } else if (stem.endsWith('ly') && stem.length > 4) {
    stem = stem.slice(0, -2);
  }

  // Step 3: y -> i
  if (stem.endsWith('y') && stem.length > 2 && !isVowel(stem[stem.length - 2])) {
    stem = `${stem.slice(0, -1)}i`;
  }

  // Step 4: Derivational suffixes normalization
  const derivationalSuffixes = [
    { suffix: 'ational', repl: 'ate' },
    { suffix: 'tional', repl: 't' },
    { suffix: 'ization', repl: 'ize' },
    { suffix: 'isation', repl: 'ise' },
    { suffix: 'iveness', repl: 'ive' },
    { suffix: 'fulness', repl: 'ful' },
    { suffix: 'ousness', repl: 'ous' },
    { suffix: 'alism', repl: 'al' },
    { suffix: 'aliti', repl: 'al' },
    { suffix: 'biliti', repl: 'ble' },
    { suffix: 'ative', repl: 'ate' },
    { suffix: 'alize', repl: 'al' },
    { suffix: 'iciti', repl: 'ic' },
    { suffix: 'ment', repl: '' },
    { suffix: 'ness', repl: '' },
    { suffix: 'able', repl: '' },
    { suffix: 'ible', repl: '' },
    { suffix: 'less', repl: '' },
    { suffix: 'ful', repl: '' },
    { suffix: 'er', repl: '' },
    { suffix: 'est', repl: '' },
    { suffix: 'ity', repl: '' },
    { suffix: 'ous', repl: '' },
    { suffix: 'tion', repl: 't' },
    { suffix: 'sion', repl: 's' },
    { suffix: 'ivate', repl: '' },
    { suffix: 'ate', repl: '' },
    { suffix: 'ive', repl: '' },
  ];

  for (const item of derivationalSuffixes) {
    if (stem.endsWith(item.suffix) && stem.length - item.suffix.length >= 2) {
      const candidate = stem.slice(0, -item.suffix.length) + item.repl;
      if (hasVowel(candidate)) {
        stem = candidate;
        break;
      }
    }
  }

  return stem;
}

/**
 * Known Latinate root and derivational alternations.
 */
const LATINATE_ALTERNATIONS: Array<{
  patternA: RegExp;
  patternB: RegExp;
  stripA: (s: string) => string;
  stripB: (s: string) => string;
  confidence: number;
}> = [
  // -de / -d <-> -sion / -sive (decide -> decision, decisive, divide -> division, conclude -> conclusion)
  {
    patternA: /(?:de|d)$/,
    patternB: /(?:sion|sive|sory|sorily)$/,
    stripA: (s) => s.replace(/(?:de|d)$/, ''),
    stripB: (s) => s.replace(/(?:sion|sive|sory|sorily)$/, ''),
    confidence: 0.94,
  },
  // -t / -te / -tion / -tive / -tor / -ate (predict -> prediction, predictive; act -> action, activate)
  {
    patternA: /(?:te|t|tion|tive|tor|ate|ating|ation|ive)$/,
    patternB: /(?:tion|tive|tor|tory|tional|tively|ate|ating|ation|ive)$/,
    stripA: (s) => s.replace(/(?:te|t|tion|tive|tor|ate|ating|ation|ive)$/, ''),
    stripB: (s) => s.replace(/(?:tion|tive|tor|tory|tional|tively|ate|ating|ation|ive)$/, ''),
    confidence: 0.92,
  },
  // -ce / -c <-> -tion / -tious / -cial / -duct (produce -> product, production, productive; reduce -> reduction)
  {
    patternA: /(?:duce|ce)$/,
    patternB: /(?:duct|duction|ductive|ductivity|cial)$/,
    stripA: (s) => s.replace(/(?:duce|ce)$/, ''),
    stripB: (s) => s.replace(/(?:duct|duction|ductive|ductivity|cial)$/, ''),
    confidence: 0.93,
  },
  // -mit <-> -mission / -missive (admit -> admission, transmit -> transmission)
  {
    patternA: /mit$/,
    patternB: /(?:mission|missive)$/,
    stripA: (s) => s.replace(/mit$/, ''),
    stripB: (s) => s.replace(/(?:mission|missive)$/, ''),
    confidence: 0.96,
  },
  // -fy <-> -fication (beautify -> beautification, clarify -> clarification)
  {
    patternA: /fy$/,
    patternB: /fication$/,
    stripA: (s) => s.replace(/fy$/, ''),
    stripB: (s) => s.replace(/fication$/, ''),
    confidence: 0.96,
  },
  // -ize / -ise <-> -ization / -isation (realize -> realization)
  {
    patternA: /(?:ize|ise)$/,
    patternB: /(?:ization|isation)$/,
    stripA: (s) => s.replace(/(?:ize|ise)$/, ''),
    stripB: (s) => s.replace(/(?:ization|isation)$/, ''),
    confidence: 0.98,
  },
];

/**
 * Checks if word derived directly from base by affixation, consonant doubling, e-dropping, or y->i mutation.
 */
export function checkDirectAffixation(
  base: string,
  derivative: string
): { isDirect: boolean; affix: string; confidence: number } {
  if (derivative.length <= base.length) {
    return { isDirect: false, affix: '', confidence: 0 };
  }

  // 1. Direct Prefixation
  for (const prefix of COMMON_ENGLISH_PREFIXES) {
    if (derivative.startsWith(prefix) && derivative.slice(prefix.length) === base) {
      return { isDirect: true, affix: `${prefix}-`, confidence: 0.92 };
    }
  }

  // 2. Direct Suffixation
  if (derivative.startsWith(base)) {
    const remainder = derivative.slice(base.length);
    if (COMMON_ENGLISH_SUFFIXES.includes(remainder)) {
      return { isDirect: true, affix: `-${remainder}`, confidence: 0.95 };
    }
  }

  // 3. E-dropping + suffix
  if (base.endsWith('e')) {
    const baseWithoutE = base.slice(0, -1);
    if (derivative.startsWith(baseWithoutE)) {
      const remainder = derivative.slice(baseWithoutE.length);
      if (COMMON_ENGLISH_SUFFIXES.includes(remainder) || remainder.startsWith('i')) {
        return { isDirect: true, affix: `-${remainder}`, confidence: 0.93 };
      }
    }
  }

  // 4. Consonant doubling + suffix
  const lastChar = base[base.length - 1];
  if (base.length >= 3 && derivative.startsWith(base + lastChar)) {
    const remainder = derivative.slice(base.length + 1);
    if (COMMON_ENGLISH_SUFFIXES.includes(remainder)) {
      return { isDirect: true, affix: `-${remainder}`, confidence: 0.94 };
    }
  }

  // 5. Y-to-I mutation + suffix
  if (base.endsWith('y')) {
    const baseWithoutY = base.slice(0, -1);
    if (derivative.startsWith(`${baseWithoutY}i`)) {
      const remainder = derivative.slice(baseWithoutY.length + 1);
      if (
        COMMON_ENGLISH_SUFFIXES.includes(remainder) ||
        COMMON_ENGLISH_SUFFIXES.includes(`i${remainder}`)
      ) {
        return { isDirect: true, affix: `-${remainder}`, confidence: 0.93 };
      }
    }
  }

  return { isDirect: false, affix: '', confidence: 0 };
}

/**
 * Analyzes morphological relationship between two words.
 */
export function analyzeMorphologicalRelationship(
  wordA: string,
  wordB: string
): MorphologyAnalysisResult {
  const normA = wordA.toLowerCase().trim();
  const normB = wordB.toLowerCase().trim();

  if (!normA || !normB || normA === normB) {
    return {
      isRelated: false,
      relationship: 'none',
      baseWord: normA,
      derivedWord: normB,
      affix: '',
      stem: '',
      confidence: 0,
    };
  }

  // Check direct affixation in either direction
  const directAB = checkDirectAffixation(normA, normB);
  if (directAB.isDirect) {
    return {
      isRelated: true,
      relationship: 'word_family',
      baseWord: normA,
      derivedWord: normB,
      affix: directAB.affix,
      stem: normA,
      confidence: directAB.confidence,
    };
  }

  const directBA = checkDirectAffixation(normB, normA);
  if (directBA.isDirect) {
    return {
      isRelated: true,
      relationship: 'word_family',
      baseWord: normB,
      derivedWord: normA,
      affix: directBA.affix,
      stem: normB,
      confidence: directBA.confidence,
    };
  }

  // Check Latinate / Root alternations
  for (const alt of LATINATE_ALTERNATIONS) {
    if (alt.patternA.test(normA) && alt.patternB.test(normB)) {
      const rootA = alt.stripA(normA);
      const rootB = alt.stripB(normB);
      if (rootA === rootB && rootA.length >= 2) {
        return {
          isRelated: true,
          relationship: 'morphological',
          baseWord: normA,
          derivedWord: normB,
          affix: normB.slice(rootB.length),
          stem: rootA,
          confidence: alt.confidence,
        };
      }
    }

    if (alt.patternA.test(normB) && alt.patternB.test(normA)) {
      const rootB = alt.stripA(normB);
      const rootA = alt.stripB(normA);
      if (rootA === rootB && rootA.length >= 2) {
        return {
          isRelated: true,
          relationship: 'morphological',
          baseWord: normB,
          derivedWord: normA,
          affix: normA.slice(rootA.length),
          stem: rootB,
          confidence: alt.confidence,
        };
      }
    }
  }

  // Stem comparison
  const stemA = stemWord(normA);
  const stemB = stemWord(normB);

  if (stemA === stemB && stemA.length >= 2) {
    const base = normA.length <= normB.length ? normA : normB;
    const derived = normA.length > normB.length ? normA : normB;
    const affix = derived.slice(stemA.length);
    return {
      isRelated: true,
      relationship: 'morphological',
      baseWord: base,
      derivedWord: derived,
      affix: affix ? `-${affix}` : '',
      stem: stemA,
      confidence: 0.88,
    };
  }

  return {
    isRelated: false,
    relationship: 'none',
    baseWord: normA,
    derivedWord: normB,
    affix: '',
    stem: stemA,
    confidence: 0,
  };
}
