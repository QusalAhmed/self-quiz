-- Create the words table
CREATE TABLE IF NOT EXISTS public.words (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  meaning TEXT,
  definitions JSONB DEFAULT '[]'::jsonb,
  ai_example_count INTEGER DEFAULT 5,
  notes TEXT DEFAULT '',
  examples JSONB,
  user_examples JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_words_word ON public.words(word);
CREATE INDEX IF NOT EXISTS idx_words_deleted ON public.words(deleted);
CREATE INDEX IF NOT EXISTS idx_words_created_at ON public.words(created_at);
CREATE INDEX IF NOT EXISTS idx_words_updated_at ON public.words(updated_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous users to read all non-deleted records
CREATE POLICY "Allow anonymous select" ON public.words
  FOR SELECT
  USING (true);

-- Create policy to allow anonymous users to insert
CREATE POLICY "Allow anonymous insert" ON public.words
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow anonymous users to update their own records
CREATE POLICY "Allow anonymous update" ON public.words
  FOR UPDATE
  USING (true);

-- Create policy to allow anonymous users to soft-delete
CREATE POLICY "Allow anonymous delete" ON public.words
  FOR DELETE
  USING (true);

-- Migration for existing databases
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS user_examples JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS custom_group TEXT DEFAULT '';
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS custom_groups JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS definitions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS ai_example_count INTEGER DEFAULT 5;
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS usage_frequency TEXT DEFAULT '';
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS generator_ai_details TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_words_usage_frequency ON public.words(usage_frequency);

-- Create the groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_groups_name ON public.groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_deleted ON public.groups(deleted);
CREATE INDEX IF NOT EXISTS idx_groups_updated_at ON public.groups(updated_at);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select groups" ON public.groups
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert groups" ON public.groups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update groups" ON public.groups
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete groups" ON public.groups
  FOR DELETE USING (true);

-- Create the missed_words table
CREATE TABLE IF NOT EXISTS public.missed_words (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL,
  quiz_mode TEXT NOT NULL DEFAULT 'wordToMeaning',
  word TEXT NOT NULL,
  meaning TEXT,
  missed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  missed_count INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_missed_words_word_id ON public.missed_words(word_id);
CREATE INDEX IF NOT EXISTS idx_missed_words_quiz_mode ON public.missed_words(quiz_mode);
CREATE INDEX IF NOT EXISTS idx_missed_words_deleted ON public.missed_words(deleted);

ALTER TABLE public.missed_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select missed" ON public.missed_words
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert missed" ON public.missed_words
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update missed" ON public.missed_words
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete missed" ON public.missed_words
  FOR DELETE USING (true);

-- Migration for existing missed_words databases
ALTER TABLE public.missed_words ADD COLUMN IF NOT EXISTS quiz_mode TEXT DEFAULT 'wordToMeaning';

-- Create the srs_practice_words table
CREATE TABLE IF NOT EXISTS public.srs_practice_words (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL,
  quiz_mode TEXT NOT NULL DEFAULT 'wordToMeaning',
  word TEXT NOT NULL,
  meaning TEXT DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'good',
  practiced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_srs_practice_words_word_id ON public.srs_practice_words(word_id);
CREATE INDEX IF NOT EXISTS idx_srs_practice_words_quiz_mode ON public.srs_practice_words(quiz_mode);
CREATE INDEX IF NOT EXISTS idx_srs_practice_words_practiced_at ON public.srs_practice_words(practiced_at);
CREATE INDEX IF NOT EXISTS idx_srs_practice_words_deleted ON public.srs_practice_words(deleted);
CREATE INDEX IF NOT EXISTS idx_srs_practice_words_updated_at ON public.srs_practice_words(updated_at);

ALTER TABLE public.srs_practice_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select srs_practice_words" ON public.srs_practice_words
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert srs_practice_words" ON public.srs_practice_words
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update srs_practice_words" ON public.srs_practice_words
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete srs_practice_words" ON public.srs_practice_words
  FOR DELETE USING (true);

-- Create the fsrs_records table
CREATE TABLE IF NOT EXISTS public.fsrs_records (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL,
  quiz_mode TEXT NOT NULL DEFAULT 'wordToMeaning',
  word TEXT NOT NULL,
  meaning TEXT DEFAULT '',
  due_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stability FLOAT DEFAULT 0,
  difficulty FLOAT DEFAULT 0,
  elapsed_days INTEGER DEFAULT 0,
  scheduled_days INTEGER DEFAULT 0,
  learning_steps INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'New',
  last_reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_fsrs_records_word_id ON public.fsrs_records(word_id);
CREATE INDEX IF NOT EXISTS idx_fsrs_records_quiz_mode ON public.fsrs_records(quiz_mode);
CREATE INDEX IF NOT EXISTS idx_fsrs_records_due_at ON public.fsrs_records(due_at);
CREATE INDEX IF NOT EXISTS idx_fsrs_records_deleted ON public.fsrs_records(deleted);
CREATE INDEX IF NOT EXISTS idx_fsrs_records_updated_at ON public.fsrs_records(updated_at);

ALTER TABLE public.fsrs_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select fsrs_records" ON public.fsrs_records
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert fsrs_records" ON public.fsrs_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update fsrs_records" ON public.fsrs_records
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete fsrs_records" ON public.fsrs_records
  FOR DELETE USING (true);

-- Create the daily_usage table
CREATE TABLE IF NOT EXISTS public.daily_usage (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  device_id TEXT NOT NULL,
  seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON public.daily_usage(date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_device_id ON public.daily_usage(device_id);
CREATE INDEX IF NOT EXISTS idx_daily_usage_updated_at ON public.daily_usage(updated_at);
CREATE INDEX IF NOT EXISTS idx_daily_usage_deleted ON public.daily_usage(deleted);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select daily_usage" ON public.daily_usage
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert daily_usage" ON public.daily_usage
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update daily_usage" ON public.daily_usage
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete daily_usage" ON public.daily_usage
  FOR DELETE USING (true);

-- Create the word_families table
CREATE TABLE IF NOT EXISTS public.word_families (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL,
  word TEXT NOT NULL,
  part_of_speech TEXT NOT NULL DEFAULT '',
  bangla_definition TEXT DEFAULT '',
  english_definition TEXT DEFAULT '',
  examples JSONB DEFAULT '[]'::jsonb,
  usage_frequency TEXT DEFAULT '',
  generator_ai_details TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_word_families_word_id ON public.word_families(word_id);
CREATE INDEX IF NOT EXISTS idx_word_families_word ON public.word_families(word);
CREATE INDEX IF NOT EXISTS idx_word_families_usage_frequency ON public.word_families(usage_frequency);
CREATE INDEX IF NOT EXISTS idx_word_families_deleted ON public.word_families(deleted);
CREATE INDEX IF NOT EXISTS idx_word_families_updated_at ON public.word_families(updated_at);

ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS usage_frequency TEXT DEFAULT '';
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS generator_ai_details TEXT DEFAULT '';

ALTER TABLE public.word_families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select word_families" ON public.word_families
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert word_families" ON public.word_families
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update word_families" ON public.word_families
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete word_families" ON public.word_families
  FOR DELETE USING (true);

-- Create the review_logs table
CREATE TABLE IF NOT EXISTS public.review_logs (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  quiz_mode TEXT NOT NULL DEFAULT 'wordToMeaning',
  word TEXT NOT NULL,
  meaning TEXT,
  rating TEXT NOT NULL,
  state_before TEXT NOT NULL,
  state_after TEXT NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_ms INTEGER DEFAULT 0,
  stability NUMERIC DEFAULT 0,
  difficulty NUMERIC DEFAULT 0,
  elapsed_days NUMERIC DEFAULT 0,
  scheduled_days INTEGER DEFAULT 0,
  due_at TIMESTAMP WITH TIME ZONE,
  previous_due_at TIMESTAMP WITH TIME ZONE,
  lapses INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  retrievability NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_review_logs_word_id ON public.review_logs(word_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_card_id ON public.review_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_reviewed_at ON public.review_logs(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_review_logs_rating ON public.review_logs(rating);
CREATE INDEX IF NOT EXISTS idx_review_logs_updated_at ON public.review_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_review_logs_deleted ON public.review_logs(deleted);

ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select review_logs" ON public.review_logs
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert review_logs" ON public.review_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update review_logs" ON public.review_logs
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete review_logs" ON public.review_logs
  FOR DELETE USING (true);

-- =============================================================================
-- Word Families Table (Morphological and related family words)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.word_families (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL,
  word TEXT NOT NULL DEFAULT '',
  part_of_speech TEXT NOT NULL DEFAULT '',
  bangla_definition TEXT DEFAULT '',
  english_definition TEXT DEFAULT '',
  examples JSONB DEFAULT '[]'::jsonb,
  usage_frequency TEXT DEFAULT '',
  generator_ai_details TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Ensure all columns exist for existing installations
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS word TEXT NOT NULL DEFAULT '';
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS part_of_speech TEXT NOT NULL DEFAULT '';
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS bangla_definition TEXT DEFAULT '';
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS english_definition TEXT DEFAULT '';
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS examples JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS usage_frequency TEXT DEFAULT '';
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS generator_ai_details TEXT DEFAULT '';
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Indexes for word_families
CREATE INDEX IF NOT EXISTS idx_word_families_word_id ON public.word_families(word_id);
CREATE INDEX IF NOT EXISTS idx_word_families_word ON public.word_families(word);
CREATE INDEX IF NOT EXISTS idx_word_families_usage_frequency ON public.word_families(usage_frequency);
CREATE INDEX IF NOT EXISTS idx_word_families_deleted ON public.word_families(deleted);
CREATE INDEX IF NOT EXISTS idx_word_families_updated_at ON public.word_families(updated_at);

-- Enable RLS for word_families
ALTER TABLE public.word_families ENABLE ROW LEVEL SECURITY;

-- Policies for word_families
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'word_families' AND policyname = 'Allow anonymous select word_families') THEN
    CREATE POLICY "Allow anonymous select word_families" ON public.word_families FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'word_families' AND policyname = 'Allow anonymous insert word_families') THEN
    CREATE POLICY "Allow anonymous insert word_families" ON public.word_families FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'word_families' AND policyname = 'Allow anonymous update word_families') THEN
    CREATE POLICY "Allow anonymous update word_families" ON public.word_families FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'word_families' AND policyname = 'Allow anonymous delete word_families') THEN
    CREATE POLICY "Allow anonymous delete word_families" ON public.word_families FOR DELETE USING (true);
  END IF;
END
$$;

-- Create the app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  appearance JSONB NOT NULL DEFAULT '{}'::jsonb,
  study_quiz JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio JSONB NOT NULL DEFAULT '{}'::jsonb,
  fsrs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai JSONB NOT NULL DEFAULT '{}'::jsonb,
  notifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  quran_verse JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS quran_verse JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON public.app_settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_app_settings_deleted ON public.app_settings(deleted);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow anonymous select app_settings') THEN
    CREATE POLICY "Allow anonymous select app_settings" ON public.app_settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow anonymous insert app_settings') THEN
    CREATE POLICY "Allow anonymous insert app_settings" ON public.app_settings FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow anonymous update app_settings') THEN
    CREATE POLICY "Allow anonymous update app_settings" ON public.app_settings FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow anonymous delete app_settings') THEN
    CREATE POLICY "Allow anonymous delete app_settings" ON public.app_settings FOR DELETE USING (true);
  END IF;
END
$$;

-- Create the quran_verses table
CREATE TABLE IF NOT EXISTS public.quran_verses (
  id TEXT PRIMARY KEY,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  category TEXT DEFAULT 'Inspirational',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_quran_verses_chapter_verse ON public.quran_verses(chapter, verse);
CREATE INDEX IF NOT EXISTS idx_quran_verses_status ON public.quran_verses(status);
CREATE INDEX IF NOT EXISTS idx_quran_verses_deleted ON public.quran_verses(deleted);
CREATE INDEX IF NOT EXISTS idx_quran_verses_updated_at ON public.quran_verses(updated_at);
CREATE INDEX IF NOT EXISTS idx_quran_verses_category ON public.quran_verses(category);

ALTER TABLE public.quran_verses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quran_verses' AND policyname = 'Allow anonymous select quran_verses') THEN
    CREATE POLICY "Allow anonymous select quran_verses" ON public.quran_verses FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quran_verses' AND policyname = 'Allow anonymous insert quran_verses') THEN
    CREATE POLICY "Allow anonymous insert quran_verses" ON public.quran_verses FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quran_verses' AND policyname = 'Allow anonymous update quran_verses') THEN
    CREATE POLICY "Allow anonymous update quran_verses" ON public.quran_verses FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quran_verses' AND policyname = 'Allow anonymous delete quran_verses') THEN
    CREATE POLICY "Allow anonymous delete quran_verses" ON public.quran_verses FOR DELETE USING (true);
  END IF;
END
$$;


