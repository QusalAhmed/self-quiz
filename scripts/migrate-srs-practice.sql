-- =============================================================================
-- SRS Practice Records Table — run this in your Supabase SQL Editor
-- =============================================================================

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
