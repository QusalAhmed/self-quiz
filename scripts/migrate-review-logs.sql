-- =============================================================================
-- Review Logs Table — run this in your Supabase SQL Editor
-- =============================================================================

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
