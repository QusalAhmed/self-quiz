import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SimilarWordsEngine } from '../lib/similar-words/engine.js';
import { ALGORITHM_VERSION } from '../lib/similar-words/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fetchAllWords() {
  console.log('Fetching vocabulary words from database...');
  let allWords = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('words')
      .select('id, word, deleted')
      .eq('deleted', false)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching words:', error);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    allWords = allWords.concat(data);
    if (data.length < pageSize) {
      break;
    }
    page++;
  }

  console.log(`Fetched ${allWords.length} active vocabulary words.`);
  return allWords;
}

async function batchUpsertSimilarities(records, batchSize = 250) {
  console.log(`Upserting ${records.length} similarity relationships in batches of ${batchSize}...`);
  let savedCount = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize).map((r) => ({
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
      .upsert(batch, { onConflict: 'source_word_id,target_word_id,algorithm_version' });

    if (error) {
      console.warn(`Warning: Batch ${Math.floor(i / batchSize) + 1} upsert encountered error:`, error.message);
    } else {
      savedCount += batch.length;
      process.stdout.write(`\rProgress: ${savedCount} / ${records.length} relationships stored.`);
    }
  }

  console.log(`\n✅ Finished storing ${savedCount} word similarities.`);
}

async function runPrecomputation() {
  console.log(`=== Similar-Word Discovery Precomputation (Algorithm ${ALGORITHM_VERSION}) ===`);
  const words = await fetchAllWords();

  if (words.length === 0) {
    console.log('No words found in database. Exiting.');
    return;
  }

  const engine = new SimilarWordsEngine();
  console.log('Starting two-stage candidate generation and multi-signal scoring...');

  const startTime = Date.now();
  const { records, metrics } = engine.batchComputeAll(words, 0.45);
  const duration = Date.now() - startTime;

  console.log('\n--- Precomputation Performance Metrics ---');
  console.log(`• Total vocabulary words: ${metrics.totalWords}`);
  console.log(`• Stage 1 (Candidate Generation): ${metrics.candidateGenerationMs}ms`);
  console.log(`• Stage 2 (Multi-Signal Scoring & Ranking): ${metrics.scoringAndRankingMs}ms`);
  console.log(`• Total Processing Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log(`• Average Candidates Evaluated Per Word: ${metrics.averageCandidatesPerWord}`);
  console.log(`• Discovered Relationships (Score >= 0.45): ${records.length}`);

  if (records.length > 0) {
    await batchUpsertSimilarities(records);
  }

  console.log('\n✅ Precomputation complete!');
}

runPrecomputation();
