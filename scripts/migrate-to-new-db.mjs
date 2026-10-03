#!/usr/bin/env node
/**
 * migrate-to-new-db.mjs
 *
 * Transfers ALL data from the old Supabase database to the new one,
 * transforming column names and data shapes to match the new schema.
 *
 * Key transformations:
 *   - words.definitions (JSONB) → definitions + examples tables
 *   - words.custom_groups → word_groups join table
 *   - fsrs_records → flashcards (word_id → definition_id)
 *   - updated_at → _modified (handled by trigger)
 *   - deleted → _deleted
 *   - quiz_mode: camelCase → SCREAMING_SNAKE
 *   - Non-UUID ids get replaced with real UUIDs
 *
 * Usage: node scripts/migrate-to-new-db.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════
const OLD_URL = 'https://grjmhatwivvqmlafymnj.supabase.co';
const OLD_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyam1oYXR3aXZ2cW1sYWZ5bW5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA0ODU0NywiZXhwIjoyMDk1NjI0NTQ3fQ.SNou_X_ko4wscHoE-I1VLNcFJI7tJArSILdtkwQ50Ec';

const NEW_URL = 'https://vwtfexskehlcxsytzzzd.supabase.co';
const NEW_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dGZleHNrZWhsY3hzeXR6enpkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDkyMjg5MCwiZXhwIjoyMTA2NDk4ODkwfQ.HtO90YlwI6385LJB5qaWK2XCBYQy9q1XRtHTFL5nxnU';

const oldDb = createClient(OLD_URL, OLD_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const newDb = createClient(NEW_URL, NEW_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
const BATCH_SIZE = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (s) => typeof s === 'string' && UUID_RE.test(s);

/**
 * Fetch ALL rows from a table (no filters, paginates past the 1000-row cap).
 */
async function fetchAll(client, table) {
  const rows = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.warn(`  ⚠ Table '${table}' not found — skipping.`);
        return [];
      }
      throw new Error(`fetchAll(${table}): ${error.message}`);
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

/**
 * Upsert rows in batches. Falls back to row-by-row on batch failure.
 */
async function batchUpsert(client, table, rows, onConflict = 'id') {
  if (!rows.length) return { inserted: 0, failed: 0 };
  let inserted = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await client.from(table).upsert(batch, { onConflict });
    if (!error) {
      inserted += batch.length;
      continue;
    }
    // Batch failed — try row-by-row
    console.warn(`  ⚠ Batch ${Math.floor(i / BATCH_SIZE) + 1} to '${table}' failed: ${error.message}`);
    console.warn(`    Falling back to row-by-row...`);
    for (const row of batch) {
      const { error: singleErr } = await client
        .from(table)
        .upsert(row, { onConflict });
      if (singleErr) {
        failed++;
        console.error(`    ✗ id=${row.id}: ${singleErr.message}`);
      } else {
        inserted++;
      }
    }
  }
  return { inserted, failed };
}

function log(label, { inserted, failed }, total) {
  const icon = failed === 0 ? '✓' : '⚠';
  const failMsg = failed > 0 ? ` (${failed} failed)` : '';
  console.log(`  ${icon} ${label}: ${inserted}/${total}${failMsg}`);
}

// ───────────────────────────────────────────────────────────────
// Mapping helpers
// ───────────────────────────────────────────────────────────────
const QUIZ_MODE_MAP = {
  wordToMeaning: 'WORD_TO_MEANING',
  meaningToWord: 'MEANING_TO_WORD',
  spelling: 'MEANING_TO_SPELLING',
};
const mapQuizMode = (m) => QUIZ_MODE_MAP[m] || 'WORD_TO_MEANING';

const VALID_POS = new Set([
  'noun', 'verb', 'adjective', 'adverb', 'preposition',
  'conjunction', 'interjection', 'pronoun', 'determiner', 'particle', 'other',
]);
const normPOS = (p) => {
  if (!p || typeof p !== 'string') return 'other';
  const lower = p.toLowerCase().trim();
  return VALID_POS.has(lower) ? lower : 'other';
};

const VALID_STATES = new Set(['New', 'Learning', 'Review', 'Relearning']);
const normState = (s) => (VALID_STATES.has(s) ? s : 'New');

const VALID_REL = new Set(['orthographic', 'morphological', 'phonetic', 'semantic', 'other']);
const normRel = (r) => {
  if (!r) return 'orthographic';
  return VALID_REL.has(r) ? r : 'other';
};

const ts = (v) =>
  v && typeof v === 'string' && !isNaN(Date.parse(v))
    ? new Date(v).toISOString()
    : new Date().toISOString();

const tsOrNull = (v) =>
  v && typeof v === 'string' && !isNaN(Date.parse(v))
    ? new Date(v).toISOString()
    : null;

// ═══════════════════════════════════════════════════════════════
// Main Migration
// ═══════════════════════════════════════════════════════════════
async function main() {
  const t0 = Date.now();
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  DATA MIGRATION: Old DB → New DB (schema transform)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ─── Step 1: Migrate auth users ──────────────────────────────
  console.log('Step 1: Migrating auth users…');
  let defaultUserId;
  try {
    const { data: { users: oldUsers }, error: listErr } =
      await oldDb.auth.admin.listUsers();
    if (listErr) throw listErr;
    console.log(`  Found ${oldUsers.length} user(s) in old DB.`);

    for (const u of oldUsers) {
      try {
        const { error: createErr } = await newDb.auth.admin.createUser({
          id: u.id,
          email: u.email,
          email_confirm: true,
          user_metadata: u.user_metadata || {},
        });
        if (createErr) {
          const msg = createErr.message || '';
          if (msg.includes('already') || msg.includes('exists') || msg.includes('duplicate')) {
            console.log(`  → ${u.email} already exists.`);
          } else {
            console.error(`  ✗ ${u.email}: ${msg}`);
          }
        } else {
          console.log(`  ✓ Created ${u.email} (${u.id})`);
        }
      } catch (e) {
        console.error(`  ✗ ${u.email}: ${e.message}`);
      }
    }
    defaultUserId = oldUsers[0]?.id;
    console.log(`  Default user_id: ${defaultUserId}\n`);
  } catch (e) {
    console.error(`  ✗ Could not list users: ${e.message}`);
    console.error('  Aborting — user_id is required for all tables.\n');
    process.exit(1);
  }

  if (!defaultUserId) {
    console.error('  ✗ No users found in old DB. Nothing to migrate.');
    process.exit(1);
  }

  // ─── Step 2: Fetch all old data ──────────────────────────────
  console.log('Step 2: Fetching data from old database…');
  const old = {};
  for (const t of [
    'words', 'groups', 'missed_words', 'fsrs_records', 'word_families',
    'daily_usage', 'review_logs', 'app_settings', 'quran_verses', 'word_similarities',
  ]) {
    old[t] = await fetchAll(oldDb, t);
    console.log(`  ${t}: ${old[t].length} rows`);
  }
  console.log('');

  // Helper: get user_id from a row, falling back to default
  const uid = (row) => row.user_id || defaultUserId;

  // ─── Step 3: Migrate words ───────────────────────────────────
  console.log('Step 3: Migrating words…');
  const newWords = old.words.map((w) => ({
    id: w.id,
    user_id: uid(w),
    word: (w.word || '').trim() || 'Untitled',
    normalized_word: (w.word || '').trim().toLowerCase() || 'untitled',
    phonetic: w.phonetic || '',
    audio_url: w.audio_url || '',
    audio_source: w.audio_source || '',
    notes: w.notes || '',
    usage_frequency: w.usage_frequency || '',
    ai_example_count: Math.max(1, Math.min(10, Number(w.ai_example_count) || 5)),
    generator_ai_details: w.generator_ai_details || '',
    verification_issue: w.verification_issue || null,
    created_at: ts(w.created_at),
    _deleted: Boolean(w.deleted ?? w._deleted),
  }));
  log('words', await batchUpsert(newDb, 'words', newWords), newWords.length);
  console.log('');

  // ─── Step 4: Definitions + Examples (from words.definitions JSONB) ─────
  console.log('Step 4: Creating definitions & examples…');

  /** word_id → first definition UUID (used later for flashcards) */
  const wordToDefId = new Map();
  const allDefs = [];
  const allExamples = [];

  for (const w of old.words) {
    const userId = uid(w);
    const isWordDeleted = Boolean(w.deleted ?? w._deleted);
    const defs = Array.isArray(w.definitions) ? w.definitions : [];
    const createdAt = ts(w.created_at);

    // If no structured definitions but has a top-level meaning, create one
    if (defs.length === 0) {
      if (w.meaning && typeof w.meaning === 'string' && w.meaning.trim()) {
        const defId = randomUUID();
        wordToDefId.set(w.id, defId);
        allDefs.push({
          id: defId,
          user_id: userId,
          word_id: w.id,
          meaning: w.meaning.trim(),
          part_of_speech: 'other',
          created_at: createdAt,
          _deleted: isWordDeleted,
        });
      }
      continue;
    }

    for (let i = 0; i < defs.length; i++) {
      const d = defs[i];
      if (!d) continue;
      const defId = randomUUID();
      if (i === 0) wordToDefId.set(w.id, defId);

      const meaning =
        typeof d === 'string' ? d.trim()
        : typeof d.meaning === 'string' ? d.meaning.trim()
        : typeof d.definition === 'string' ? d.definition.trim()
        : '';

      allDefs.push({
        id: defId,
        user_id: userId,
        word_id: w.id,
        meaning,
        part_of_speech: normPOS(d.partOfSpeech || d.part_of_speech),
        created_at: createdAt,
        _deleted: isWordDeleted,
      });

      // AI examples
      const aiEx = Array.isArray(d.examples) ? d.examples : [];
      for (const s of aiEx) {
        if (typeof s === 'string' && s.trim()) {
          allExamples.push({
            id: randomUUID(),
            user_id: userId,
            definition_id: defId,
            sentence: s.trim(),
            is_ai_generated: true,
            created_at: createdAt,
            _deleted: isWordDeleted,
          });
        }
      }
      // User examples
      const userEx = Array.isArray(d.userExamples || d.user_examples)
        ? (d.userExamples || d.user_examples)
        : [];
      for (const s of userEx) {
        if (typeof s === 'string' && s.trim()) {
          allExamples.push({
            id: randomUUID(),
            user_id: userId,
            definition_id: defId,
            sentence: s.trim(),
            is_ai_generated: false,
            created_at: createdAt,
            _deleted: isWordDeleted,
          });
        }
      }
    }
  }

  log('definitions', await batchUpsert(newDb, 'definitions', allDefs), allDefs.length);
  log('examples', await batchUpsert(newDb, 'examples', allExamples), allExamples.length);
  console.log('');

  // ─── Step 5: Groups + word_groups ────────────────────────────
  console.log('Step 5: Migrating groups & word_groups…');

  const newGroups = old.groups.map((g) => ({
    id: g.id,
    user_id: uid(g),
    name: (g.name || '').trim() || 'Unnamed',
    created_at: ts(g.created_at),
    _deleted: Boolean(g.deleted ?? g._deleted),
  }));
  log('groups', await batchUpsert(newDb, 'groups', newGroups), newGroups.length);

  // Build group-name → id lookup (case-insensitive, per user)
  const groupKey = (userId, name) => `${userId}::${(name || '').trim().toLowerCase()}`;
  const groupLookup = new Map();
  for (const g of old.groups) {
    groupLookup.set(groupKey(uid(g), g.name), g.id);
  }

  // Create word_groups from words.custom_groups JSONB array
  const allWordGroups = [];
  const seenWG = new Set();
  for (const w of old.words) {
    const userId = uid(w);
    const groups = Array.isArray(w.custom_groups) ? w.custom_groups : [];
    for (const gName of groups) {
      if (typeof gName !== 'string' || !gName.trim()) continue;
      const gId = groupLookup.get(groupKey(userId, gName));
      if (!gId) continue;
      const dedupKey = `${w.id}::${gId}`;
      if (seenWG.has(dedupKey)) continue;
      seenWG.add(dedupKey);
      allWordGroups.push({
        id: randomUUID(),
        user_id: userId,
        word_id: w.id,
        group_id: gId,
        created_at: ts(w.created_at),
        _deleted: Boolean(w.deleted ?? w._deleted),
      });
    }
  }
  log('word_groups', await batchUpsert(newDb, 'word_groups', allWordGroups), allWordGroups.length);
  console.log('');

  // ─── Step 6: Flashcards (from fsrs_records) ──────────────────
  console.log('Step 6: Migrating flashcards (fsrs_records → flashcards)…');

  /** old fsrs_records.id → new flashcard UUID */
  const oldCardToNew = new Map();
  const newFlashcards = [];
  let skippedCards = 0;

  for (const f of old.fsrs_records) {
    const wordId = f.word_id || f.wordId;
    const defId = wordToDefId.get(wordId);
    if (!defId) {
      skippedCards++;
      continue;
    }

    const flashId = randomUUID();
    oldCardToNew.set(f.id, flashId);

    newFlashcards.push({
      id: flashId,
      user_id: uid(f),
      definition_id: defId,
      quiz_mode: mapQuizMode(f.quiz_mode || f.quizMode),
      is_active: true,
      due_date: ts(f.due_at || f.dueAt),
      stability: Number(f.stability) || 0,
      difficulty: Number(f.difficulty) || 0,
      elapsed_days: Number(f.elapsed_days ?? f.elapsedDays) || 0,
      scheduled_days: Number(f.scheduled_days ?? f.scheduledDays) || 0,
      learning_steps: Number(f.learning_steps ?? f.learningSteps) || 0,
      reps: Number(f.reps) || 0,
      lapses: Number(f.lapses) || 0,
      state: normState(f.state),
      last_rating: f.last_rating || f.lastRating || '',
      last_reviewed_at: tsOrNull(f.last_reviewed_at || f.lastReviewedAt),
      created_at: ts(f.created_at || f.createdAt),
      _deleted: Boolean(f.deleted ?? f._deleted),
    });
  }

  if (skippedCards > 0) console.warn(`  ⚠ Skipped ${skippedCards} flashcards (no matching definition).`);
  log('flashcards', await batchUpsert(newDb, 'flashcards', newFlashcards), newFlashcards.length);
  console.log('');

  // ─── Step 7: Review logs ─────────────────────────────────────
  console.log('Step 7: Migrating review_logs…');

  const newReviewLogs = [];
  let skippedLogs = 0;

  for (const r of old.review_logs) {
    const cardId = r.card_id || r.cardId;
    let flashcardId = oldCardToNew.get(cardId);

    // Fallback: try building the old key from word_id + quiz_mode
    if (!flashcardId) {
      const wordId = r.word_id || r.wordId;
      const qm = r.quiz_mode || r.quizMode || 'wordToMeaning';
      flashcardId = oldCardToNew.get(`${wordId}:${qm}`);
    }

    if (!flashcardId) {
      skippedLogs++;
      continue;
    }

    newReviewLogs.push({
      id: isUUID(r.id) ? r.id : randomUUID(),
      user_id: uid(r),
      flashcard_id: flashcardId,
      word: r.word || '',
      meaning: r.meaning || '',
      rating: r.rating || 'good',
      state_before: normState(r.state_before || r.stateBefore),
      state_after: normState(r.state_after || r.stateAfter),
      reviewed_at: ts(r.reviewed_at || r.reviewedAt),
      duration_ms: Math.max(0, Math.round(Number(r.duration_ms ?? r.durationMs) || 0)),
      stability: Number(r.stability) || 0,
      difficulty: Number(r.difficulty) || 0,
      elapsed_days: Number(r.elapsed_days ?? r.elapsedDays) || 0,
      scheduled_days: Math.round(Number(r.scheduled_days ?? r.scheduledDays) || 0),
      due_at: tsOrNull(r.due_at || r.dueAt),
      previous_due_at: tsOrNull(r.previous_due_at || r.previousDueAt),
      lapses: Number(r.lapses) || 0,
      reps: Number(r.reps) || 0,
      retrievability: Number(r.retrievability) || 0,
      created_at: ts(r.created_at || r.createdAt),
      _deleted: Boolean(r.deleted ?? r._deleted),
    });
  }

  if (skippedLogs > 0) console.warn(`  ⚠ Skipped ${skippedLogs} review_logs (no matching flashcard).`);
  log('review_logs', await batchUpsert(newDb, 'review_logs', newReviewLogs), newReviewLogs.length);
  console.log('');

  // ─── Step 8: Missed words ────────────────────────────────────
  console.log('Step 8: Migrating missed_words…');

  const newMissed = old.missed_words.map((m) => ({
    id: isUUID(m.id) ? m.id : randomUUID(),
    user_id: uid(m),
    word_id: m.word_id || m.wordId,
    word: m.word || '',
    meaning: m.meaning || '',
    quiz_mode: mapQuizMode(m.quiz_mode || m.quizMode),
    missed_count: Math.max(1, Number(m.missed_count ?? m.missedCount) || 1),
    missed_at: ts(m.missed_at || m.missedAt),
    _deleted: Boolean(m.deleted ?? m._deleted),
  }));
  log('missed_words', await batchUpsert(newDb, 'missed_words', newMissed), newMissed.length);
  console.log('');

  // ─── Step 9: Word families ───────────────────────────────────
  console.log('Step 9: Migrating word_families…');

  const newFamilies = old.word_families.map((wf) => ({
    id: isUUID(wf.id) ? wf.id : randomUUID(),
    user_id: uid(wf),
    word_id: wf.word_id || wf.wordId,
    word: (wf.word || '').trim() || '',
    part_of_speech: normPOS(wf.part_of_speech || wf.partOfSpeech),
    bangla_definition: wf.bangla_definition || wf.banglaDefinition || '',
    english_definition: wf.english_definition || wf.englishDefinition || '',
    examples: Array.isArray(wf.examples) ? wf.examples : [],
    usage_frequency: wf.usage_frequency || wf.usageFrequency || '',
    generator_ai_details: wf.generator_ai_details || wf.generatorAiDetails || '',
    created_at: ts(wf.created_at || wf.createdAt),
    _deleted: Boolean(wf.deleted ?? wf._deleted),
  }));
  log('word_families', await batchUpsert(newDb, 'word_families', newFamilies), newFamilies.length);
  console.log('');

  // ─── Step 10: Daily usage ────────────────────────────────────
  console.log('Step 10: Migrating daily_usage…');

  const newUsage = old.daily_usage.map((d) => ({
    id: isUUID(d.id) ? d.id : randomUUID(),
    user_id: uid(d),
    usage_date: d.date || d.usage_date,
    device_id: d.device_id || d.deviceId || 'unknown',
    seconds: Math.max(0, Number(d.seconds) || 0),
    _deleted: Boolean(d.deleted ?? d._deleted),
  }));
  log('daily_usage', await batchUpsert(newDb, 'daily_usage', newUsage), newUsage.length);
  console.log('');

  // ─── Step 11: App settings ───────────────────────────────────
  console.log('Step 11: Migrating app_settings…');

  const newSettings = old.app_settings.map((s) => ({
    id: isUUID(s.id) ? s.id : randomUUID(),
    user_id: uid(s),
    appearance: s.appearance || {},
    study_quiz: s.study_quiz || s.studyQuiz || {},
    audio: s.audio || {},
    fsrs: s.fsrs || {},
    ai: s.ai || {},
    notifications: s.notifications || {},
    data: s.data || {},
    quran_verse: s.quran_verse || s.quranVerse || {},
    created_at: ts(s.created_at || s.createdAt),
    _deleted: Boolean(s.deleted ?? s._deleted),
  }));
  log('app_settings', await batchUpsert(newDb, 'app_settings', newSettings), newSettings.length);
  console.log('');

  // ─── Step 12: Quran verses ───────────────────────────────────
  console.log('Step 12: Migrating quran_verses…');

  const newQuran = old.quran_verses.map((q) => ({
    id: isUUID(q.id) ? q.id : randomUUID(),
    user_id: uid(q),
    chapter: Number(q.chapter) || 1,
    verse: Number(q.verse) || 1,
    verse_end: q.verse_end != null ? Number(q.verse_end) : null,
    category: q.category || 'Inspirational',
    notes: q.notes || '',
    status: q.status || 'active',
    view_count: Math.max(0, Number(q.view_count ?? q.viewCount) || 0),
    last_viewed_at: tsOrNull(q.last_viewed_at || q.lastViewedAt),
    last_error: q.last_error || q.lastError || null,
    created_at: ts(q.created_at || q.createdAt),
    _deleted: Boolean(q.deleted ?? q._deleted),
  }));
  log('quran_verses', await batchUpsert(newDb, 'quran_verses', newQuran), newQuran.length);
  console.log('');

  // ─── Step 13: Word similarities ──────────────────────────────
  console.log('Step 13: Migrating word_similarities…');

  const newSim = old.word_similarities.map((s) => ({
    id: isUUID(s.id) ? s.id : randomUUID(),
    user_id: uid(s),
    source_word_id: s.source_word_id || s.sourceWordId,
    target_word_id: s.target_word_id || s.targetWordId,
    overall_score: Number(s.overall_score ?? s.overallScore) || 0,
    orthographic_score: Number(s.orthographic_score ?? s.orthographicScore) || 0,
    ngram_score: Number(s.ngram_score ?? s.ngramScore) || 0,
    prefix_score: Number(s.prefix_score ?? s.prefixScore) || 0,
    suffix_score: Number(s.suffix_score ?? s.suffixScore) || 0,
    morphological_score: Number(s.morphological_score ?? s.morphologicalScore) || 0,
    length_score: Number(s.length_score ?? s.lengthScore) || 0,
    relationship_type: normRel(s.relationship_type || s.relationshipType),
    secondary_types: Array.isArray(s.secondary_types || s.secondaryTypes)
      ? (s.secondary_types || s.secondaryTypes)
      : [],
    common_prefix: s.common_prefix || s.commonPrefix || '',
    common_suffix: s.common_suffix || s.commonSuffix || '',
    common_substring: s.common_substring || s.commonSubstring || '',
    shared_sequence: s.shared_sequence || s.sharedSequence || '',
    affix: s.affix || '',
    stem: s.stem || '',
    explanation: s.explanation || '',
    signals: s.signals || {},
    algorithm_version: s.algorithm_version || s.algorithmVersion || 'v1',
    created_at: ts(s.created_at || s.createdAt),
    _deleted: Boolean(s.deleted ?? s._deleted),
  }));
  log('word_similarities', await batchUpsert(newDb, 'word_similarities', newSim), newSim.length);
  console.log('');

  // ─── Done ────────────────────────────────────────────────────
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Migration complete in ${elapsed}s`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n✗ FATAL:', err);
  process.exit(1);
});
