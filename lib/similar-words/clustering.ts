import { longestCommonSubstring, longestCommonSubsequence } from './algorithms';
import { stemWord } from './morphology';
import type {
  SimilarityRelationshipType,
  WordSimilarityRecord,
  WordSimilarityResult,
} from './types';

export type WordItem = {
  id: string;
  word: string;
};

export type ClusterRelationshipEdge = {
  sourceWordId: string;
  targetWordId: string;
  sourceWord: string;
  targetWord: string;
  score: number;
  relationshipType: SimilarityRelationshipType;
  secondaryTypes?: SimilarityRelationshipType[];
  explanation: string;
  commonSubstring?: string;
  sharedSequence?: string;
  affix?: string;
};

export type SimilarWordCluster = {
  id: string;
  name: string;
  clusterType: SimilarityRelationshipType;
  hubWord: string;
  hubWordId: string;
  wordIds: string[];
  words: string[];
  size: number;
  averageScore: number;
  maxScore: number;
  density: number; // edges / possible_edges
  sharedFeatures: {
    commonRoot?: string;
    commonPrefix?: string;
    commonSuffix?: string;
    commonSubstring?: string;
    commonSequence?: string;
    affixes?: string[];
  };
  edges: ClusterRelationshipEdge[];
  explanation: string;
};

export type ClusteringOptions = {
  minScore?: number;
  maxClusterSize?: number;
  relationshipFilter?: SimilarityRelationshipType | 'all';
};

/**
 * Finds the longest common contiguous substring across an array of strings.
 */
export function findCommonContiguousCore(words: string[]): string {
  if (words.length === 0) {
    return '';
  }
  if (words.length === 1) {
    return words[0].toLowerCase();
  }

  let core = words[0].toLowerCase();
  for (let i = 1; i < words.length; i++) {
    const nextWord = words[i].toLowerCase();
    const lcs = longestCommonSubstring(core, nextWord);
    if (lcs.substring.length >= 2) {
      core = lcs.substring;
    } else {
      return '';
    }
  }
  return core.length >= 2 ? core : '';
}

/**
 * Finds the longest common subsequence across an array of strings.
 */
export function findCommonSubsequenceCore(words: string[]): string {
  if (words.length === 0) {
    return '';
  }
  if (words.length === 1) {
    return words[0].toLowerCase();
  }

  let core = words[0].toLowerCase();
  for (let i = 1; i < words.length; i++) {
    const nextWord = words[i].toLowerCase();
    const lcs = longestCommonSubsequence(core, nextWord);
    if (lcs.sequence.length >= 2) {
      core = lcs.sequence;
    } else {
      return '';
    }
  }
  return core.length >= 2 ? core : '';
}

/**
 * Clusters vocabulary words and pairwise similarity relationships into cohesive linguistic groups.
 */
export function clusterSimilarWords(
  words: WordItem[],
  similarityRecords: Array<WordSimilarityRecord | WordSimilarityResult | any>,
  options: ClusteringOptions = {}
): SimilarWordCluster[] {
  const minScore = options.minScore ?? 0.45;
  const wordMap = new Map<string, string>();
  const wordById = new Map<string, WordItem>();

  words.forEach((w) => {
    wordMap.set(w.id, w.word);
    wordById.set(w.id, w);
  });

  // Normalize similarity edges into undirected graph adjacency
  const adj = new Map<string, Set<string>>();
  const edgeMap = new Map<string, ClusterRelationshipEdge>();

  function getEdgeKey(idA: string, idB: string): string {
    return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
  }

  for (const record of similarityRecords) {
    const score = record.overall_score ?? record.overallScore ?? record.score ?? 0;
    if (score < minScore) {
      continue;
    }

    const sourceId = record.source_word_id || record.sourceWordId || record.wordId;
    const targetId = record.target_word_id || record.targetWordId;
    const sourceWord = record.source_word || record.sourceWord || wordMap.get(sourceId);
    const targetWord =
      record.target_word || record.targetWord || record.word || wordMap.get(targetId);

    if (!sourceId || !targetId || sourceId === targetId) {
      continue;
    }

    const relType = (record.relationship_type ||
      record.relationshipType ||
      record.relationship ||
      'orthographic') as SimilarityRelationshipType;

    if (options.relationshipFilter && options.relationshipFilter !== 'all') {
      if (relType !== options.relationshipFilter) {
        continue;
      }
    }

    // Register in word map if missing
    if (sourceWord && !wordMap.has(sourceId)) {
      wordMap.set(sourceId, sourceWord);
    }
    if (targetWord && !wordMap.has(targetId)) {
      wordMap.set(targetId, targetWord);
    }

    if (!adj.has(sourceId)) {
      adj.set(sourceId, new Set());
    }
    if (!adj.has(targetId)) {
      adj.set(targetId, new Set());
    }

    adj.get(sourceId)!.add(targetId);
    adj.get(targetId)!.add(sourceId);

    const edgeKey = getEdgeKey(sourceId, targetId);
    if (!edgeMap.has(edgeKey) || edgeMap.get(edgeKey)!.score < score) {
      edgeMap.set(edgeKey, {
        sourceWordId: sourceId < targetId ? sourceId : targetId,
        targetWordId: sourceId < targetId ? targetId : sourceId,
        sourceWord: sourceId < targetId ? sourceWord : targetWord,
        targetWord: sourceId < targetId ? targetWord : sourceWord,
        score,
        relationshipType: relType,
        secondaryTypes:
          record.secondary_types || record.secondaryTypes || record.secondaryRelationships || [],
        explanation: record.explanation || '',
        commonSubstring:
          record.common_substring || record.commonSubstring || record.details?.commonSubstring,
        sharedSequence:
          record.shared_sequence || record.sharedSequence || record.details?.sharedSequence,
        affix: record.affix || record.details?.affix,
      });
    }
  }

  // Connected component discovery using BFS
  const visited = new Set<string>();
  const rawClusters: string[][] = [];

  for (const nodeId of adj.keys()) {
    if (visited.has(nodeId)) {
      continue;
    }

    const component: string[] = [];
    const queue: string[] = [nodeId];
    visited.add(nodeId);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      component.push(curr);

      const neighbors = adj.get(curr);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }

    if (component.length >= 2) {
      rawClusters.push(component);
    }
  }

  // Process and analyze each cluster
  const clusters: SimilarWordCluster[] = [];

  for (const component of rawClusters) {
    const clusterWordObjects: Array<{ id: string; word: string }> = component
      .map((id) => ({ id, word: wordMap.get(id) || id }))
      .filter((item) => Boolean(item.word));

    if (clusterWordObjects.length < 2) {
      continue;
    }

    const clusterWordStrings = clusterWordObjects.map((w) => w.word);

    // Collect all edges in this cluster
    const clusterEdges: ClusterRelationshipEdge[] = [];
    const degreeCounts = new Map<string, number>();
    const nodeScores = new Map<string, number>();

    component.forEach((id) => {
      degreeCounts.set(id, 0);
      nodeScores.set(id, 0);
    });

    for (let i = 0; i < component.length; i++) {
      for (let j = i + 1; j < component.length; j++) {
        const idA = component[i];
        const idB = component[j];
        const edgeKey = getEdgeKey(idA, idB);
        const edge = edgeMap.get(edgeKey);
        if (edge) {
          clusterEdges.push(edge);
          degreeCounts.set(idA, (degreeCounts.get(idA) || 0) + 1);
          degreeCounts.set(idB, (degreeCounts.get(idB) || 0) + 1);
          nodeScores.set(idA, (nodeScores.get(idA) || 0) + edge.score);
          nodeScores.set(idB, (nodeScores.get(idB) || 0) + edge.score);
        }
      }
    }

    if (clusterEdges.length === 0) {
      continue;
    }

    // Determine Hub Word (Centroid)
    let hubWordId = component[0];
    let maxHubScore = -1;
    for (const id of component) {
      const deg = degreeCounts.get(id) || 0;
      const scoreSum = nodeScores.get(id) || 0;
      const combinedCentrality = deg * 10 + scoreSum;
      if (combinedCentrality > maxHubScore) {
        maxHubScore = combinedCentrality;
        hubWordId = id;
      }
    }
    const hubWord = wordMap.get(hubWordId) || hubWordId;

    // Calculate cluster statistics
    const totalScore = clusterEdges.reduce((sum, e) => sum + e.score, 0);
    const averageScore = totalScore / clusterEdges.length;
    const maxScore = Math.max(...clusterEdges.map((e) => e.score));
    const possibleEdges = (component.length * (component.length - 1)) / 2;
    const density = possibleEdges > 0 ? clusterEdges.length / possibleEdges : 1;

    // Determine Dominant Cluster Category
    const typeCounts = new Map<SimilarityRelationshipType, number>();
    for (const edge of clusterEdges) {
      typeCounts.set(edge.relationshipType, (typeCounts.get(edge.relationshipType) || 0) + 1);
    }

    let dominantType: SimilarityRelationshipType = 'orthographic';
    let maxCount = 0;
    for (const [t, count] of typeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = t;
      }
    }

    // Linguistic Feature Extraction
    const commonSubstring = findCommonContiguousCore(clusterWordStrings);
    const commonSequence = findCommonSubsequenceCore(clusterWordStrings);
    const affixes: string[] = [];
    clusterEdges.forEach((e) => {
      if (e.affix && !affixes.includes(e.affix)) {
        affixes.push(e.affix);
      }
    });

    // Check shared stem
    const stems = clusterWordStrings.map((w) => stemWord(w));
    const firstStem = stems[0];
    const allShareStem = stems.every(
      (s) => s === firstStem || s.startsWith(firstStem) || firstStem.startsWith(s)
    );
    const commonRoot = allShareStem ? firstStem : undefined;

    // Generate cluster title & pedagogical explanation
    let name = '';
    let explanation = '';

    if (dominantType === 'word_family') {
      name = `${hubWord} Family`;
      explanation = `Word family group containing ${clusterWordObjects.length} related words derived from base "${commonRoot || hubWord}" (${affixes.join(', ') || 'inflections'}).`;
    } else if (dominantType === 'morphological') {
      name = `${hubWord} • Morphological Root`;
      explanation = `Morphological group sharing root "${commonRoot || hubWord}" with derivational alternations.`;
    } else if (dominantType === 'transposition') {
      name = `${clusterWordStrings.slice(0, 3).join(' ↔ ')} Pair`;
      explanation = `Transposition & anagram group with swapped character positions.`;
    } else if (dominantType === 'prefix') {
      name = `Prefix "${affixes[0] || clusterWordStrings[0].slice(0, 3)}" Group`;
      explanation = `Group sharing common prefix with high structural overlap.`;
    } else if (dominantType === 'suffix') {
      name = `Suffix "${affixes[0] || clusterWordStrings[0].slice(-3)}" Group`;
      explanation = `Group sharing common suffix with morphological inflection.`;
    } else {
      name = `${clusterWordStrings.slice(0, 3).join(' • ')}${clusterWordStrings.length > 3 ? '...' : ''}`;
      explanation = `Orthographic cluster sharing core "${commonSubstring || commonSequence || hubWord}" across ${clusterWordObjects.length} words (avg score: ${Math.round(averageScore * 100)}%).`;
    }

    const clusterId = `cluster-${hubWordId}-${component.slice(0, 3).join('-')}`;

    clusters.push({
      id: clusterId,
      name,
      clusterType: dominantType,
      hubWord,
      hubWordId,
      wordIds: component,
      words: clusterWordStrings,
      size: component.length,
      averageScore,
      maxScore,
      density,
      sharedFeatures: {
        commonRoot,
        commonSubstring: commonSubstring || undefined,
        commonSequence: commonSequence || undefined,
        affixes: affixes.length > 0 ? affixes : undefined,
      },
      edges: clusterEdges,
      explanation,
    });
  }

  // Sort clusters by size (descending) and average score (descending)
  clusters.sort((a, b) => {
    if (b.size !== a.size) {
      return b.size - a.size;
    }
    return b.averageScore - a.averageScore;
  });

  return clusters;
}
