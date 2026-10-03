-- =============================================================================
-- Phase 1: Initial Database Schema (per-user private vocabulary)
-- =============================================================================
-- Replaces the earlier shared/admin-moderated design. Ownership model follows
-- the existing production app: every row belongs to exactly one user_id, and
-- there is no cross-user review workflow. Engineering conventions (sync
-- columns, RLS, indexing) carry over from that earlier design.
--
-- REPLICATION CONTRACT (what RxDB's replicateSupabase plugin needs):
--   1. Single-column UUID primary key on every synced table
--      (`id UUID DEFAULT gen_random_uuid()`); client-generated ids must be
--      valid UUIDs. For tables keyed on a natural pair (word_groups,
--      word_similarities, flashcards), derive the id deterministically
--      (UUIDv5) from that pair so a duplicate collides on the primary key
--      rather than a secondary unique index.
--   2. `_modified` (timestamptz) is the pull checkpoint, maintained by
--      bump_version_and_timestamp() / touch_modified() — clients never set
--      it. Uses clock_timestamp(), not NOW(), to narrow (not eliminate) the
--      skew from a long-running transaction committing with an earlier
--      timestamp than one that started later but finished first.
--   3. `_deleted` (boolean) is the canonical soft-delete flag. Rows are never
--      hard-deleted by client-facing roles, so an offline device always has a
--      tombstone to pull. `deleted_at` is a derived audit timestamp, kept in
--      sync by trigger — clients never set it directly.
--   4. Every synced table is in the supabase_realtime publication (section 8).
--   5. RLS stays on; every policy is scoped to `user_id = auth.uid()`, so a
--      user only ever sees, and only ever gets realtime events for, their own
--      rows. There is no public/anon read path at all in this model, except
--      word_pronunciations (see design note 5).
--
-- DESIGN NOTES:
--   1. `words`/`definitions`/`examples`/`flashcards` are normalized tables
--      (not JSONB blobs on `words`), matching how this project built the
--      shared-model version. `word_families` keeps its `examples` as JSONB:
--      it's supplementary related-word data, not part of the core
--      study/review flow, so full normalization wasn't worth the extra joins.
--   2. `flashcards` merges what the shared model split into two tables
--      (`flashcards` + `user_flashcard_states`): since a card only ever
--      exists in the context of one user's own definition now, there's no
--      separate "global card definition" to track — the row IS the card AND
--      the FSRS state in one. `learning_steps` is carried over from the
--      existing fsrs_records table; the shared-model version didn't have it.
--   3. `groups`/`word_groups` replace the `custom_group`/`custom_groups`
--      text/JSONB fields on the existing `words` table with a normalized
--      join, consistent with how word/tag associations were modeled in the
--      shared design.
--   4. Every child table stores its own `user_id` directly (denormalized,
--      matching the existing schema's own pattern) rather than only being
--      reachable via a join to its parent. RLS INSERT policies verify the
--      referenced parent actually belongs to the same user — e.g., you can't
--      create a definition under a word you don't own, even though the
--      definition row itself carries its own user_id.
--   5. `word_pronunciations` is the one shared/global table (an audio cache
--      keyed by word text, not user content) — public read, writes restricted
--      to service_role.
--   6. auth.users(id) ON DELETE CASCADE is used for every user_id column: once
--      an account is gone, there is no longer any authenticated session to
--      sync a tombstone to, so the usual "always soft-delete for sync" rule
--      doesn't apply the same way it would to content shared with others.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 2. Custom Enum Types
-- ---------------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('ADMIN', 'USER');

CREATE TYPE public.quiz_mode AS ENUM (
  'WORD_TO_MEANING',
  'MEANING_TO_WORD',
  'MEANING_TO_SPELLING'
);

CREATE TYPE public.card_state AS ENUM (
  'New',
  'Learning',
  'Review',
  'Relearning'
);

CREATE TYPE public.part_of_speech AS ENUM (
  'noun', 'verb', 'adjective', 'adverb', 'preposition',
  'conjunction', 'interjection', 'pronoun', 'determiner', 'particle', 'other'
);

CREATE TYPE public.similarity_relationship AS ENUM (
  'orthographic', 'morphological', 'phonetic', 'semantic', 'other'
);

-- ---------------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------------

-- 3.1 Profiles — not synced (server-managed; no client write path).
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role       public.app_role NOT NULL DEFAULT 'USER',
  created_at TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'One row per auth user. role is for future admin/support tooling, not content moderation — there is nothing shared left to moderate. Not replicated via RxDB.';

-- 3.2 Words
CREATE TABLE public.words (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word                 TEXT        NOT NULL,
  normalized_word      TEXT        NOT NULL,
  phonetic             TEXT        DEFAULT '',
  audio_url            TEXT        DEFAULT '',
  audio_source         TEXT        DEFAULT '',
  notes                TEXT        DEFAULT '',
  usage_frequency      TEXT        DEFAULT '',
  ai_example_count     INTEGER     NOT NULL DEFAULT 5 CHECK (ai_example_count BETWEEN 1 AND 10),
  generator_ai_details TEXT        DEFAULT '',
  verification_issue   TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _modified            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _deleted             BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at           TIMESTAMPTZ,
  version              INTEGER     NOT NULL DEFAULT 1,

  CONSTRAINT words_normalized_word_matches CHECK (normalized_word = lower(trim(word)))
);

COMMENT ON TABLE public.words IS 'Per-user vocabulary words. Each user owns their own copy; no sharing, no approval. normalized_word drives per-user dedup.';

-- 3.3 Definitions
CREATE TABLE public.definitions (
  id          UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID                  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id     UUID                  NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  meaning     TEXT                  NOT NULL,
  part_of_speech public.part_of_speech NOT NULL,
  created_at  TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  _modified   TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  _deleted    BOOLEAN               NOT NULL DEFAULT FALSE,
  deleted_at  TIMESTAMPTZ,
  version     INTEGER               NOT NULL DEFAULT 1
);

COMMENT ON TABLE public.definitions IS 'Senses of a word. Belongs to the same user as its parent word (enforced by RLS on insert).';

-- 3.4 Examples (both AI-generated and user-authored, via is_ai_generated)
CREATE TABLE public.examples (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  definition_id   UUID        NOT NULL REFERENCES public.definitions(id) ON DELETE CASCADE,
  sentence        TEXT        NOT NULL,
  is_ai_generated BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _modified       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _deleted        BOOLEAN     NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  version         INTEGER     NOT NULL DEFAULT 1
);

COMMENT ON TABLE public.examples IS 'Example sentences for a definition. is_ai_generated = FALSE is what the old schema called a "user example".';

-- 3.5 Word families (related/derived forms) — examples kept as JSONB; see design note 1.
CREATE TABLE public.word_families (
  id                   UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID                  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id              UUID                  NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  word                 TEXT                  NOT NULL DEFAULT '',
  part_of_speech       public.part_of_speech NOT NULL,
  bangla_definition    TEXT                  DEFAULT '',
  english_definition   TEXT                  DEFAULT '',
  examples             JSONB                 NOT NULL DEFAULT '[]'::jsonb,
  usage_frequency      TEXT                  DEFAULT '',
  generator_ai_details TEXT                  DEFAULT '',
  created_at           TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  _modified            TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  _deleted              BOOLEAN              NOT NULL DEFAULT FALSE,
  version               INTEGER              NOT NULL DEFAULT 1
);

COMMENT ON TABLE public.word_families IS 'Related/derived forms of a word (e.g. run/ran/running), carried over from the existing schema including the Bangla definition field.';

-- 3.6 Flashcards — merges the shared model's flashcards + user_flashcard_states,
-- and the existing fsrs_records, into one per-user card+state row.
CREATE TABLE public.flashcards (
  id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  definition_id  UUID              NOT NULL REFERENCES public.definitions(id) ON DELETE CASCADE,
  quiz_mode      public.quiz_mode  NOT NULL,
  is_active      BOOLEAN           NOT NULL DEFAULT TRUE,
  due_date       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  stability      REAL              NOT NULL DEFAULT 0,
  difficulty     REAL              NOT NULL DEFAULT 0,
  elapsed_days   REAL              NOT NULL DEFAULT 0,
  scheduled_days REAL              NOT NULL DEFAULT 0,
  learning_steps INTEGER           NOT NULL DEFAULT 0,
  reps           INTEGER           NOT NULL DEFAULT 0,
  lapses         INTEGER           NOT NULL DEFAULT 0,
  state          public.card_state NOT NULL DEFAULT 'New',
  last_rating    TEXT              DEFAULT '',
  last_reviewed_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  _modified      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  _deleted       BOOLEAN           NOT NULL DEFAULT FALSE,
  version        INTEGER           NOT NULL DEFAULT 1
);

COMMENT ON TABLE public.flashcards IS 'One FSRS card per (definition, quiz_mode), owned by the same user as the definition. Replaces flashcards + user_flashcard_states + fsrs_records from the two prior designs.';

-- 3.7 Review logs — append-only, text rating/state to match the existing FSRS integration.
CREATE TABLE public.review_logs (
  id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id     UUID              NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  word             TEXT              NOT NULL,
  meaning          TEXT,
  rating           TEXT              NOT NULL,
  state_before     public.card_state NOT NULL,
  state_after      public.card_state NOT NULL,
  reviewed_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  duration_ms      INTEGER           DEFAULT 0,
  stability        NUMERIC           DEFAULT 0,
  difficulty       NUMERIC           DEFAULT 0,
  elapsed_days     NUMERIC           DEFAULT 0,
  scheduled_days   INTEGER           DEFAULT 0,
  due_at           TIMESTAMPTZ,
  previous_due_at  TIMESTAMPTZ,
  lapses           INTEGER           DEFAULT 0,
  reps             INTEGER           DEFAULT 0,
  retrievability   NUMERIC           DEFAULT 0,
  created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  _modified        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  _deleted         BOOLEAN           NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE public.review_logs IS 'Immutable per-user review history. word/meaning are a deliberate denormalized snapshot (matches the existing schema) so history reads correctly even after the card is edited later.';

-- 3.8 Missed words — lightweight per-user quiz-miss tracking.
CREATE TABLE public.missed_words (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id      UUID        NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  word         TEXT        NOT NULL,
  meaning      TEXT,
  quiz_mode    public.quiz_mode,
  missed_count INTEGER     NOT NULL DEFAULT 1,
  missed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _modified    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _deleted     BOOLEAN     NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE public.missed_words IS 'Per-user record of quiz misses, one row per (word, quiz_mode) the user has gotten wrong at least once.';

-- 3.9 Groups + word_groups (replaces custom_group/custom_groups)
CREATE TABLE public.groups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _modified  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _deleted   BOOLEAN     NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE public.groups IS 'Per-user named word groups/categories.';

CREATE TABLE public.word_groups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id    UUID        NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  group_id   UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _modified  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _deleted   BOOLEAN     NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE public.word_groups IS 'Word-to-group membership, normalized replacement for the old custom_group/custom_groups fields on words.';

-- 3.10 Word pronunciations — the one shared/global table (see design note 5).
CREATE TABLE public.word_pronunciations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  word         TEXT        NOT NULL,
  audio_base64 TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT word_pronunciations_word_lowercase CHECK (word = lower(trim(word)))
);

COMMENT ON TABLE public.word_pronunciations IS 'Shared/global audio cache keyed by the lowercased word text. Not user content — public read, service_role write only.';

-- 3.11 Daily usage
CREATE TABLE public.daily_usage (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE       NOT NULL,
  device_id TEXT        NOT NULL,
  seconds   INTEGER     NOT NULL DEFAULT 0,
  _modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _deleted  BOOLEAN     NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE public.daily_usage IS 'Per-user, per-device, per-day usage seconds.';

-- 3.12 App settings — one row per user.
CREATE TABLE public.app_settings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  appearance    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  study_quiz    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  audio         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  fsrs          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  ai            JSONB       NOT NULL DEFAULT '{}'::jsonb,
  notifications JSONB       NOT NULL DEFAULT '{}'::jsonb,
  data          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  quran_verse   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _modified     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _deleted      BOOLEAN     NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE public.app_settings IS 'One settings document per user (UNIQUE user_id), replacing the old single-row-keyed-by-text-id design.';

-- 3.13 Quran verses — personal bookmarking feature, unrelated to vocab.
CREATE TABLE public.quran_verses (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter        INTEGER     NOT NULL,
  verse          INTEGER     NOT NULL,
  verse_end      INTEGER,
  category       TEXT        DEFAULT 'Inspirational',
  notes          TEXT        DEFAULT '',
  status         TEXT        NOT NULL DEFAULT 'active',
  view_count     INTEGER     NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  last_error     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _modified      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _deleted       BOOLEAN     NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE public.quran_verses IS 'Per-user saved/bookmarked Quran verses.';

-- 3.14 Word similarities — computed between two of the SAME user's words.
CREATE TABLE public.word_similarities (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_word_id     UUID        NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  target_word_id     UUID        NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  overall_score      REAL        NOT NULL,
  orthographic_score REAL        DEFAULT 0,
  ngram_score        REAL        DEFAULT 0,
  prefix_score       REAL        DEFAULT 0,
  suffix_score       REAL        DEFAULT 0,
  morphological_score REAL       DEFAULT 0,
  length_score       REAL        DEFAULT 0,
  relationship_type  public.similarity_relationship NOT NULL DEFAULT 'orthographic',
  secondary_types    JSONB       DEFAULT '[]'::jsonb,
  common_prefix      TEXT        DEFAULT '',
  common_suffix      TEXT        DEFAULT '',
  common_substring   TEXT        DEFAULT '',
  shared_sequence    TEXT        DEFAULT '',
  affix              TEXT        DEFAULT '',
  stem               TEXT        DEFAULT '',
  explanation        TEXT        DEFAULT '',
  signals            JSONB       DEFAULT '{}'::jsonb,
  algorithm_version  TEXT        NOT NULL DEFAULT 'v1',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _modified          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _deleted           BOOLEAN     NOT NULL DEFAULT FALSE,

  CONSTRAINT word_similarities_not_self CHECK (source_word_id <> target_word_id)
);

COMMENT ON TABLE public.word_similarities IS 'Computed similarity between two words owned by the same user. source_word_id/target_word_id must both belong to that user (enforced by RLS on insert).';

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------
-- Every synced table gets a (user_id, _modified, id) index for RxDB's
-- checkpoint-ordered pull.

CREATE UNIQUE INDEX words_user_normalized_word_active_unique ON public.words (user_id, normalized_word) WHERE _deleted = FALSE;
CREATE INDEX idx_words_sync ON public.words (user_id, _modified, id);

CREATE INDEX idx_definitions_word_id ON public.definitions (word_id);
CREATE INDEX idx_definitions_sync    ON public.definitions (user_id, _modified, id);

CREATE INDEX idx_examples_definition_id ON public.examples (definition_id);
CREATE INDEX idx_examples_sync          ON public.examples (user_id, _modified, id);

CREATE INDEX idx_word_families_word_id ON public.word_families (word_id);
CREATE INDEX idx_word_families_sync    ON public.word_families (user_id, _modified, id);

-- Prevents the exact same related-word entry being added twice under a word.
CREATE UNIQUE INDEX word_families_user_word_related_active_unique
  ON public.word_families (user_id, word_id, word) WHERE _deleted = FALSE;

CREATE UNIQUE INDEX flashcards_definition_quiz_active_unique ON public.flashcards (definition_id, quiz_mode) WHERE _deleted = FALSE;
CREATE INDEX idx_flashcards_due  ON public.flashcards (user_id, due_date) WHERE _deleted = FALSE AND is_active = TRUE;
CREATE INDEX idx_flashcards_sync ON public.flashcards (user_id, _modified, id);

CREATE INDEX idx_review_logs_flashcard ON public.review_logs (flashcard_id);
CREATE INDEX idx_review_logs_sync      ON public.review_logs (user_id, _modified, id);

CREATE INDEX idx_missed_words_word_id ON public.missed_words (word_id);
CREATE INDEX idx_missed_words_sync    ON public.missed_words (user_id, _modified, id);

-- One live row per (user, word, quiz_mode), so the app can upsert
-- missed_count on a repeat miss instead of accumulating duplicate rows.
CREATE UNIQUE INDEX missed_words_user_word_quizmode_active_unique
  ON public.missed_words (user_id, word_id, quiz_mode) WHERE _deleted = FALSE;

CREATE UNIQUE INDEX groups_user_name_active_unique ON public.groups (user_id, name) WHERE _deleted = FALSE;
CREATE INDEX idx_groups_sync ON public.groups (user_id, _modified, id);

CREATE UNIQUE INDEX word_groups_pair_active_unique ON public.word_groups (word_id, group_id) WHERE _deleted = FALSE;
CREATE INDEX idx_word_groups_sync ON public.word_groups (user_id, _modified, id);

CREATE UNIQUE INDEX word_pronunciations_word_unique ON public.word_pronunciations (word);

CREATE UNIQUE INDEX daily_usage_user_date_device_unique ON public.daily_usage (user_id, usage_date, device_id);
CREATE INDEX idx_daily_usage_sync ON public.daily_usage (user_id, _modified, id);

CREATE INDEX idx_app_settings_sync ON public.app_settings (user_id, _modified, id);

CREATE INDEX idx_quran_verses_sync ON public.quran_verses (user_id, _modified, id);

CREATE UNIQUE INDEX word_similarities_pair_active_unique ON public.word_similarities (user_id, source_word_id, target_word_id) WHERE _deleted = FALSE;
CREATE INDEX idx_word_similarities_sync ON public.word_similarities (user_id, _modified, id);

-- ---------------------------------------------------------------------------
-- 5. Helper Functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'USER', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- A user may update their own profile (display_name, avatar_url, ...), but
-- never their own role — self-promotion to ADMIN must not be just an RLS
-- policy away. Checked against current_user IN ('authenticated', 'anon')
-- rather than excluding service_role by name, for the same reason
-- lock_word_tags_pair does: a SECURITY DEFINER caller's current_user is the
-- function owner, not service_role, so an exclusion list would miss it.
CREATE OR REPLACE FUNCTION public.lock_profile_role()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role cannot be changed by the user themselves'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_lock_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_profile_role();

-- Forces version/_modified server-side on every INSERT and UPDATE of a
-- versioned, synced table — see replication contract note 2 at top of file.
CREATE OR REPLACE FUNCTION public.bump_version_and_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.version = 1;
  ELSE
    NEW.version = OLD.version + 1;
  END IF;
  NEW._modified = clock_timestamp();
  RETURN NEW;
END;
$$;

-- Lighter-weight version for tables with no `version` column (missed_words,
-- word_pronunciations is not synced so is excluded, groups, word_groups,
-- app_settings, quran_verses, daily_usage, word_similarities, review_logs).
CREATE OR REPLACE FUNCTION public.touch_modified()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW._modified = clock_timestamp();
  RETURN NEW;
END;
$$;

-- Derives deleted_at from _deleted for tables that have the audit column
-- (words, definitions, examples). Clients never set deleted_at directly.
CREATE OR REPLACE FUNCTION public.sync_deleted_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.deleted_at = CASE WHEN NEW._deleted THEN NOW() ELSE NULL END;
  ELSIF NEW._deleted THEN
    NEW.deleted_at = CASE WHEN OLD._deleted THEN OLD.deleted_at ELSE NOW() END;
  ELSE
    NEW.deleted_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Soft-deleting a word/definition cascades to its live children, since rows
-- are never hard-deleted (so ON DELETE CASCADE never fires for this).
CREATE OR REPLACE FUNCTION public.cascade_soft_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW._deleted AND NOT OLD._deleted THEN
    IF TG_TABLE_NAME = 'words' THEN
      UPDATE public.definitions    SET _deleted = TRUE WHERE word_id = NEW.id AND _deleted = FALSE;
      UPDATE public.word_families  SET _deleted = TRUE WHERE word_id = NEW.id AND _deleted = FALSE;
      UPDATE public.word_groups    SET _deleted = TRUE WHERE word_id = NEW.id AND _deleted = FALSE;
      UPDATE public.missed_words   SET _deleted = TRUE WHERE word_id = NEW.id AND _deleted = FALSE;
      UPDATE public.word_similarities SET _deleted = TRUE WHERE (source_word_id = NEW.id OR target_word_id = NEW.id) AND _deleted = FALSE;
    ELSIF TG_TABLE_NAME = 'definitions' THEN
      UPDATE public.examples   SET _deleted = TRUE WHERE definition_id = NEW.id AND _deleted = FALSE;
      UPDATE public.flashcards SET _deleted = TRUE WHERE definition_id = NEW.id AND _deleted = FALSE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cascade_soft_delete() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 6. Triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_words_bump       BEFORE INSERT OR UPDATE ON public.words       FOR EACH ROW EXECUTE FUNCTION public.bump_version_and_timestamp();
CREATE TRIGGER trg_definitions_bump BEFORE INSERT OR UPDATE ON public.definitions FOR EACH ROW EXECUTE FUNCTION public.bump_version_and_timestamp();
CREATE TRIGGER trg_examples_bump    BEFORE INSERT OR UPDATE ON public.examples    FOR EACH ROW EXECUTE FUNCTION public.bump_version_and_timestamp();
CREATE TRIGGER trg_word_families_bump BEFORE INSERT OR UPDATE ON public.word_families FOR EACH ROW EXECUTE FUNCTION public.bump_version_and_timestamp();
CREATE TRIGGER trg_flashcards_bump  BEFORE INSERT OR UPDATE ON public.flashcards  FOR EACH ROW EXECUTE FUNCTION public.bump_version_and_timestamp();

CREATE TRIGGER trg_review_logs_touch    BEFORE INSERT ON public.review_logs      FOR EACH ROW EXECUTE FUNCTION public.touch_modified();
CREATE TRIGGER trg_missed_words_touch   BEFORE INSERT OR UPDATE ON public.missed_words   FOR EACH ROW EXECUTE FUNCTION public.touch_modified();
CREATE TRIGGER trg_groups_touch         BEFORE INSERT OR UPDATE ON public.groups         FOR EACH ROW EXECUTE FUNCTION public.touch_modified();
CREATE TRIGGER trg_word_groups_touch    BEFORE INSERT OR UPDATE ON public.word_groups    FOR EACH ROW EXECUTE FUNCTION public.touch_modified();
CREATE TRIGGER trg_daily_usage_touch    BEFORE INSERT OR UPDATE ON public.daily_usage    FOR EACH ROW EXECUTE FUNCTION public.touch_modified();
CREATE TRIGGER trg_app_settings_touch   BEFORE INSERT OR UPDATE ON public.app_settings   FOR EACH ROW EXECUTE FUNCTION public.touch_modified();
CREATE TRIGGER trg_quran_verses_touch   BEFORE INSERT OR UPDATE ON public.quran_verses   FOR EACH ROW EXECUTE FUNCTION public.touch_modified();
CREATE TRIGGER trg_word_similarities_touch BEFORE INSERT OR UPDATE ON public.word_similarities FOR EACH ROW EXECUTE FUNCTION public.touch_modified();

CREATE TRIGGER trg_words_deleted_at       BEFORE INSERT OR UPDATE ON public.words       FOR EACH ROW EXECUTE FUNCTION public.sync_deleted_at();
CREATE TRIGGER trg_definitions_deleted_at BEFORE INSERT OR UPDATE ON public.definitions FOR EACH ROW EXECUTE FUNCTION public.sync_deleted_at();
CREATE TRIGGER trg_examples_deleted_at    BEFORE INSERT OR UPDATE ON public.examples    FOR EACH ROW EXECUTE FUNCTION public.sync_deleted_at();

CREATE TRIGGER trg_words_cascade       AFTER UPDATE ON public.words       FOR EACH ROW EXECUTE FUNCTION public.cascade_soft_delete();
CREATE TRIGGER trg_definitions_cascade AFTER UPDATE ON public.definitions FOR EACH ROW EXECUTE FUNCTION public.cascade_soft_delete();

-- ---------------------------------------------------------------------------
-- 7. Row Level Security — every policy scoped to user_id = auth.uid(); no
--    anon/public read path exists anywhere in this schema except
--    word_pronunciations (the one shared cache table).
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.definitions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examples          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_families     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missed_words      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_pronunciations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_verses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_similarities ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));

-- role is excluded from what's actually changeable, by trg_profiles_lock_role
-- above, not by this policy — RLS alone can't compare a column's new value to
-- its old one.
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- words: plain per-user CRUD, no parent to check.
CREATE POLICY words_all_own ON public.words FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- definitions: the referenced word must belong to the same user.
CREATE POLICY definitions_all_own ON public.definitions FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.words w WHERE w.id = word_id AND w.user_id = (SELECT auth.uid()))
  );

CREATE POLICY examples_all_own ON public.examples FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.definitions d WHERE d.id = definition_id AND d.user_id = (SELECT auth.uid()))
  );

CREATE POLICY word_families_all_own ON public.word_families FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.words w WHERE w.id = word_id AND w.user_id = (SELECT auth.uid()))
  );

CREATE POLICY flashcards_all_own ON public.flashcards FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.definitions d WHERE d.id = definition_id AND d.user_id = (SELECT auth.uid()))
  );

-- review_logs: append-only (no UPDATE policy at all).
CREATE POLICY review_logs_select_own ON public.review_logs FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY review_logs_insert_own ON public.review_logs FOR INSERT TO authenticated WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.flashcards f WHERE f.id = flashcard_id AND f.user_id = (SELECT auth.uid()))
);

CREATE POLICY missed_words_all_own ON public.missed_words FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.words w WHERE w.id = word_id AND w.user_id = (SELECT auth.uid()))
  );

CREATE POLICY groups_all_own ON public.groups FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY word_groups_all_own ON public.word_groups FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.words w  WHERE w.id = word_id  AND w.user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.user_id = (SELECT auth.uid()))
  );

-- word_pronunciations: shared cache — everyone can read, only service_role writes.
CREATE POLICY word_pronunciations_select_all ON public.word_pronunciations FOR SELECT TO authenticated, anon USING (TRUE);

CREATE POLICY daily_usage_all_own ON public.daily_usage FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY app_settings_all_own ON public.app_settings FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY quran_verses_all_own ON public.quran_verses FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY word_similarities_all_own ON public.word_similarities FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.words w WHERE w.id = source_word_id AND w.user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.words w WHERE w.id = target_word_id AND w.user_id = (SELECT auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 7a. Data API Grants
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON TABLE public.word_pronunciations TO anon;

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.words, public.definitions, public.examples, public.word_families,
  public.flashcards, public.missed_words, public.groups, public.word_groups,
  public.daily_usage, public.app_settings, public.quran_verses, public.word_similarities
TO authenticated;

GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT ON TABLE public.review_logs TO authenticated;
GRANT SELECT ON TABLE public.word_pronunciations TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;

-- ---------------------------------------------------------------------------
-- 8. Realtime
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.words, public.definitions, public.examples, public.word_families,
  public.flashcards, public.review_logs, public.missed_words, public.groups,
  public.word_groups, public.daily_usage, public.app_settings,
  public.quran_verses, public.word_similarities;
