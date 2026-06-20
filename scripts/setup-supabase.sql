-- Create the words table
CREATE TABLE IF NOT EXISTS public.words (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  meaning TEXT,
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
