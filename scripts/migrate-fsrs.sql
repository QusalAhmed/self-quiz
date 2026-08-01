-- =============================================================================
-- FSRS Records Table — run this in your Supabase SQL Editor
-- =============================================================================

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
