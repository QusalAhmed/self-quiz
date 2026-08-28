import type { WordPairScores } from './scorer';
import type { SimilarityRelationshipType } from './types';

export type ClassificationResult = {
  primaryType: SimilarityRelationshipType;
  secondaryTypes: SimilarityRelationshipType[];
  explanation: string;
};

/**
 * Classifies the relationship between two words and generates a human-friendly pedagogical explanation.
 */
export function classifyRelationship(
  sourceWord: string,
  targetWord: string,
  scores: WordPairScores
): ClassificationResult {
  const { signals, overallScore } = scores;
  const secondaryTypes: SimilarityRelationshipType[] = [];

  // 1. Exact match
  if (sourceWord.trim().toLowerCase() === targetWord.trim().toLowerCase()) {
    return {
      primaryType: 'exact',
      secondaryTypes: [],
      explanation: 'Exact match (identical word)',
    };
  }

  // 2. Transposition match (e.g. trial / trail, form / from)
  if (signals.isTransposition) {
    if (signals.stemMatch) {
      secondaryTypes.push('morphological');
    }
    return {
      primaryType: 'transposition',
      secondaryTypes,
      explanation: `Similar spelling (transposed adjacent characters)`,
    };
  }

  // 3. Word Family (e.g. retail -> retailer, care -> careful, produce -> producer)
  if (signals.stemMatch && signals.morphologicalConfidence >= 0.88) {
    if (signals.damerauLevenshtein >= 0.6) {
      secondaryTypes.push('orthographic');
    }
    if (signals.commonSuffix.length >= 2) {
      secondaryTypes.push('suffix');
    }
    if (signals.commonPrefix.length >= 2) {
      secondaryTypes.push('prefix');
    }

    const baseInfo = signals.baseWord ? `Base word: "${signals.baseWord}"` : '';
    const affixInfo = signals.affix ? `, Affix: "${signals.affix}"` : '';
    const explanation =
      baseInfo || affixInfo
        ? `Likely word family (${[baseInfo, affixInfo].filter(Boolean).join('')})`
        : `Likely word family (shares base stem "${signals.stem}")`;

    return {
      primaryType: 'word_family',
      secondaryTypes,
      explanation,
    };
  }

  // 4. Morphological relationship (e.g. predict -> prediction, decide -> decision, active -> activate)
  if (signals.stemMatch && signals.morphologicalConfidence >= 0.6) {
    if (signals.damerauLevenshtein >= 0.6) {
      secondaryTypes.push('orthographic');
    }
    if (signals.commonPrefix.length >= 3) {
      secondaryTypes.push('prefix');
    }

    const affixStr = signals.affix ? ` with affix "${signals.affix}"` : '';
    return {
      primaryType: 'morphological',
      secondaryTypes,
      explanation: `Morphological relation (shares root "${signals.stem}"${affixStr})`,
    };
  }

  // 5. Strong Orthographic / Spelling Similarity (e.g. retail -> trail, adapt -> adept, affect -> effect)
  if (
    signals.damerauLevenshtein >= 0.65 ||
    signals.longestCommonSubstringRatio >= 0.6 ||
    (signals.characterSetOverlap >= 0.75 && signals.longestCommonSubsequenceRatio >= 0.7)
  ) {
    if (signals.commonPrefix.length >= 3) {
      secondaryTypes.push('prefix');
    }
    if (signals.commonSuffix.length >= 3) {
      secondaryTypes.push('suffix');
    }

    let detail = '';
    if (signals.sharedSequence && signals.sharedSequence.length >= 3) {
      detail = ` (Shared sequence: "${signals.sharedSequence}")`;
    } else if (signals.commonPrefix && signals.commonPrefix.length >= 2) {
      detail = ` (Common prefix: "${signals.commonPrefix}")`;
    } else if (signals.commonSuffix && signals.commonSuffix.length >= 2) {
      detail = ` (Common suffix: "${signals.commonSuffix}")`;
    }

    return {
      primaryType: 'orthographic',
      secondaryTypes,
      explanation: `Spelling similarity${detail}`,
    };
  }

  // 6. Strong Prefix relationship (e.g. activate / action)
  if (
    signals.commonPrefix.length >= 3 &&
    signals.prefixRatioShort >= 0.6 &&
    signals.prefixRatioLong >= 0.4
  ) {
    if (signals.damerauLevenshtein >= 0.5) {
      secondaryTypes.push('orthographic');
    }
    return {
      primaryType: 'prefix',
      secondaryTypes,
      explanation: `Shares common prefix "${signals.commonPrefix}" (length ${signals.commonPrefix.length})`,
    };
  }

  // 7. Strong Suffix relationship
  if (
    signals.commonSuffix.length >= 3 &&
    signals.suffixRatio >= 0.5 &&
    signals.sharedSequenceLength >= 3
  ) {
    if (signals.damerauLevenshtein >= 0.5) {
      secondaryTypes.push('orthographic');
    }
    return {
      primaryType: 'suffix',
      secondaryTypes,
      explanation: `Shares common suffix "${signals.commonSuffix}"`,
    };
  }

  // Fallback for general relatedness
  return {
    primaryType: 'orthographic',
    secondaryTypes,
    explanation:
      signals.sharedSequenceLength >= 2
        ? `Orthographically related (shared sequence "${signals.sharedSequence}")`
        : `Structural similarity (score: ${Math.round(overallScore * 100)}%)`,
  };
}
