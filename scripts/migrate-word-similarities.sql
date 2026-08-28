-- Enable pg_trgm extension for fast trigram similarity and candidate filtering
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create the word_similarities table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.word_similarities (
  id TEXT PRIMARY KEY,
  source_word_id TEXT NOT NULL,
  target_word_id TEXT NOT NULL,
  source_word TEXT NOT NULL,
  target_word TEXT NOT NULL,
  overall_score REAL NOT NULL,
  orthographic_score REAL DEFAULT 0,
  ngram_score REAL DEFAULT 0,
  prefix_score REAL DEFAULT 0,
  suffix_score REAL DEFAULT 0,
  morphological_score REAL DEFAULT 0,
  length_score REAL DEFAULT 0,
  relationship_type TEXT NOT NULL DEFAULT 'orthographic',
  secondary_types JSONB DEFAULT '[]'::jsonb,
  common_prefix TEXT DEFAULT '',
  common_suffix TEXT DEFAULT '',
  common_substring TEXT DEFAULT '',
  shared_sequence TEXT DEFAULT '',
  affix TEXT DEFAULT '',
  stem TEXT DEFAULT '',
  explanation TEXT DEFAULT '',
  signals JSONB DEFAULT '{}'::jsonb,
  algorithm_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Trigram GIN index on words table for fast candidate generation in PostgreSQL
CREATE INDEX IF NOT EXISTS idx_words_trgm ON public.words USING gin (word gin_trgm_ops);

-- Ensure all columns exist for existing installations
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS source_word_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS target_word_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS source_word TEXT NOT NULL DEFAULT '';
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS target_word TEXT NOT NULL DEFAULT '';
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS overall_score REAL NOT NULL DEFAULT 0;
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS orthographic_score REAL DEFAULT 0;
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS ngram_score REAL DEFAULT 0;
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS prefix_score REAL DEFAULT 0;
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS suffix_score REAL DEFAULT 0;
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS morphological_score REAL DEFAULT 0;
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS length_score REAL DEFAULT 0;
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS relationship_type TEXT NOT NULL DEFAULT 'orthographic';
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS secondary_types JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS common_prefix TEXT DEFAULT '';
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS common_suffix TEXT DEFAULT '';
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS common_substring TEXT DEFAULT '';
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS shared_sequence TEXT DEFAULT '';
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS affix TEXT DEFAULT '';
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS stem TEXT DEFAULT '';
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS explanation TEXT DEFAULT '';
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS signals JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS algorithm_version TEXT NOT NULL DEFAULT 'v1';
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.word_similarities ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_word_similarities_source_id ON public.word_similarities(source_word_id);
CREATE INDEX IF NOT EXISTS idx_word_similarities_target_id ON public.word_similarities(target_word_id);
CREATE INDEX IF NOT EXISTS idx_word_similarities_score ON public.word_similarities(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_word_similarities_rel_type ON public.word_similarities(relationship_type);
CREATE INDEX IF NOT EXISTS idx_word_similarities_version ON public.word_similarities(algorithm_version);
CREATE INDEX IF NOT EXISTS idx_word_similarities_deleted ON public.word_similarities(deleted);
CREATE INDEX IF NOT EXISTS idx_word_similarities_updated_at ON public.word_similarities(updated_at);

-- Unique constraint on canonical pair and algorithm version
CREATE UNIQUE INDEX IF NOT EXISTS idx_word_similarities_pair_version
  ON public.word_similarities(source_word_id, target_word_id, algorithm_version);

-- Enable RLS
ALTER TABLE public.word_similarities ENABLE ROW LEVEL SECURITY;

-- Policies for public / anonymous access matching application security model
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'word_similarities' AND policyname = 'Allow anonymous select word_similarities') THEN
    CREATE POLICY "Allow anonymous select word_similarities" ON public.word_similarities FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'word_similarities' AND policyname = 'Allow anonymous insert word_similarities') THEN
    CREATE POLICY "Allow anonymous insert word_similarities" ON public.word_similarities FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'word_similarities' AND policyname = 'Allow anonymous update word_similarities') THEN
    CREATE POLICY "Allow anonymous update word_similarities" ON public.word_similarities FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'word_similarities' AND policyname = 'Allow anonymous delete word_similarities') THEN
    CREATE POLICY "Allow anonymous delete word_similarities" ON public.word_similarities FOR DELETE USING (true);
  END IF;
END
$$;
