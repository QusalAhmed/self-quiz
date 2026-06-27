-- =============================================================================
-- SRS Records Table — run this in your Supabase SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.srs_records (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL,
  quiz_mode TEXT NOT NULL DEFAULT 'wordToMeaning',
  word TEXT NOT NULL,
  meaning TEXT DEFAULT '',
  ease_factor FLOAT DEFAULT 2.5,
  interval INTEGER DEFAULT 0,
  repetitions INTEGER DEFAULT 0,
  next_review_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_srs_records_word_id ON public.srs_records(word_id);
CREATE INDEX IF NOT EXISTS idx_srs_records_quiz_mode ON public.srs_records(quiz_mode);
CREATE INDEX IF NOT EXISTS idx_srs_records_next_review_at ON public.srs_records(next_review_at);
CREATE INDEX IF NOT EXISTS idx_srs_records_deleted ON public.srs_records(deleted);
CREATE INDEX IF NOT EXISTS idx_srs_records_updated_at ON public.srs_records(updated_at);

-- Row Level Security
ALTER TABLE public.srs_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select srs_records" ON public.srs_records
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert srs_records" ON public.srs_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update srs_records" ON public.srs_records
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete srs_records" ON public.srs_records
  FOR DELETE USING (true);
