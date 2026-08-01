-- Create the words table
CREATE TABLE IF NOT EXISTS public.words (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  meaning TEXT,
  definitions JSONB DEFAULT '[]'::jsonb,
  ai_example_count INTEGER DEFAULT 5,
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
