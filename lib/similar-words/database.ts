import { supabase } from '../supabase';
import { similarWordsEngine } from './engine';
import type {
  SimilarityQueryParams,
  SimilarityRelationshipType,
  WordSimilarityRecord,
  WordSimilarityResult,
} from './types';

/**
 * Maps a database similarity record to a formatted API/UI result object.
 * Correctly re-orientates direction if query matched targetWordId instead of sourceWordId.
 */
export function formatSimilarityRecord(
  record: WordSimilarityRecord | any,
  queryWordId: string
): WordSimilarityResult {
  const isSource = record.source_word_id === queryWordId || record.sourceWordId === queryWordId;
  const relatedWordId = isSource
    ? record.target_word_id || record.targetWordId
    : record.source_word_id || record.sourceWordId;
  const relatedWord = isSource
    ? record.target_word || record.targetWord
    : record.source_word || record.sourceWord;

  return {
    wordId: relatedWordId,
    word: relatedWord,
    score: record.overall_score ?? record.overallScore,
    relationship: (record.relationship_type ||
      record.relationshipType ||
      'orthographic') as SimilarityRelationshipType,
    secondaryRelationships: (record.secondary_types ||
      record.secondaryTypes ||
      []) as SimilarityRelationshipType[],
    explanation: record.explanation || '',
    scores: {
      overall: record.overall_score ?? record.overallScore ?? 0,
      orthographic: record.orthographic_score ?? record.orthographicScore ?? 0,
      ngram: record.ngram_score ?? record.ngramScore ?? 0,
      prefix: record.prefix_score ?? record.prefixScore ?? 0,
      suffix: record.suffix_score ?? record.suffixScore ?? 0,
      morphological: record.morphological_score ?? record.morphologicalScore ?? 0,
      length: record.length_score ?? record.lengthScore ?? 0,
    },
    details: {
      commonPrefix: record.common_prefix || record.commonPrefix || '',
      commonSuffix: record.common_suffix || record.commonSuffix || '',
      commonSubstring: record.common_substring || record.commonSubstring || '',
      sharedSequence: record.shared_sequence || record.sharedSequence || '',
      affix: record.affix || '',
      stem: record.stem || '',
      baseWord: isSource
        ? record.source_word || record.sourceWord
        : record.target_word || record.targetWord,
    },
    signals: record.signals,
  };
}

/**
 * Fetches precomputed similar words from Supabase using symmetric lookup.
 */
export async function fetchSimilarWordsFromSupabase(
  wordId: string,
  params: SimilarityQueryParams = {}
): Promise<WordSimilarityResult[]> {
  const limit = params.limit ?? 20;
  const minScore = params.minScore ?? 0.45;
  const relationshipType = params.relationshipType;
  const version = params.algorithmVersion ?? 'v1';

  try {
    let query = supabase
      .from('word_similarities')
      .select('*')
      .or(`source_word_id.eq.${wordId},target_word_id.eq.${wordId}`)
      .eq('algorithm_version', version)
      .eq('deleted', false)
      .gte('overall_score', minScore)
      .order('overall_score', { ascending: false })
      .limit(limit);

    if (relationshipType && relationshipType !== 'all') {
      query = query.eq('relationship_type', relationshipType);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase word_similarities query notice:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((row) => formatSimilarityRecord(row, wordId));
  } catch (err) {
    console.warn('Failed to query Supabase word_similarities:', err);
    return [];
  }
}

/**
 * Saves precomputed word similarities to Supabase.
 */
export async function upsertWordSimilaritiesToSupabase(
  records: WordSimilarityRecord[]
): Promise<boolean> {
  if (records.length === 0) {
    return true;
  }

  try {
    const payload = records.map((r) => ({
      id: r.id,
      source_word_id: r.sourceWordId,
      target_word_id: r.targetWordId,
      source_word: r.sourceWord,
      target_word: r.targetWord,
      overall_score: r.overallScore,
      orthographic_score: r.orthographicScore,
      ngram_score: r.ngramScore,
      prefix_score: r.prefixScore,
      suffix_score: r.suffixScore,
      morphological_score: r.morphologicalScore,
      length_score: r.lengthScore,
      relationship_type: r.relationshipType,
      secondary_types: r.secondaryTypes,
      common_prefix: r.commonPrefix,
      common_suffix: r.commonSuffix,
      common_substring: r.commonSubstring,
      shared_sequence: r.sharedSequence,
      affix: r.affix,
      stem: r.stem,
      explanation: r.explanation,
      signals: r.signals,
      algorithm_version: r.algorithmVersion,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
      deleted: false,
    }));

    const { error } = await supabase
      .from('word_similarities')
      .upsert(payload, { onConflict: 'source_word_id,target_word_id,algorithm_version' });

    if (error) {
      console.warn('Supabase upsert word_similarities warning:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Failed to upsert word_similarities to Supabase:', err);
    return false;
  }
}

/**
 * Computes similar words on-the-fly and optionally persists them.
 */
export async function computeAndPersistWordSimilarities(
  wordId: string,
  wordText: string,
  allWords: Array<{ id: string; word: string }>,
  options: SimilarityQueryParams = {}
): Promise<WordSimilarityResult[]> {
  const results = similarWordsEngine.findSimilarWords(wordText, allWords, {
    limit: options.limit ?? 20,
    minScore: options.minScore ?? 0.45,
    relationshipType: options.relationshipType,
    includeSignals: true,
  });

  // Convert discovered results to canonical DB records and persist to Supabase
  const nowIso = new Date().toISOString();
  const recordsToSave: WordSimilarityRecord[] = results.map((res) => {
    const isSourceFirst = wordId < res.wordId;
    const sourceWordId = isSourceFirst ? wordId : res.wordId;
    const targetWordId = isSourceFirst ? res.wordId : wordId;
    const sourceWord = isSourceFirst ? wordText : res.word;
    const targetWord = isSourceFirst ? res.word : wordText;

    return {
      id: `${sourceWordId}:${targetWordId}`,
      sourceWordId,
      targetWordId,
      sourceWord,
      targetWord,
      overallScore: res.score,
      orthographicScore: res.scores.orthographic,
      ngramScore: res.scores.ngram,
      prefixScore: res.scores.prefix,
      suffixScore: res.scores.suffix,
      morphologicalScore: res.scores.morphological,
      lengthScore: res.scores.length,
      relationshipType: res.relationship,
      secondaryTypes: res.secondaryRelationships,
      commonPrefix: res.details.commonPrefix,
      commonSuffix: res.details.commonSuffix,
      commonSubstring: res.details.commonSubstring,
      sharedSequence: res.details.sharedSequence,
      affix: res.details.affix,
      stem: res.details.stem,
      explanation: res.explanation,
      signals: res.signals!,
      algorithmVersion: 'v1',
      createdAt: nowIso,
      updatedAt: nowIso,
      isDeleted: false,
    };
  });

  if (recordsToSave.length > 0) {
    void upsertWordSimilaritiesToSupabase(recordsToSave);
  }

  return results;
}
