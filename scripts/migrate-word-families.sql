-- Create the word_families table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.word_families (
  id TEXT PRIMARY KEY,
  word_id TEXT NOT NULL,
  word TEXT NOT NULL DEFAULT '',
  part_of_speech TEXT NOT NULL DEFAULT '',
  bangla_definition TEXT DEFAULT '',
  english_definition TEXT DEFAULT '',
  examples JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Ensure all columns exist for existing table
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS word TEXT NOT NULL DEFAULT '';
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS part_of_speech TEXT NOT NULL DEFAULT '';
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS bangla_definition TEXT DEFAULT '';
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS english_definition TEXT DEFAULT '';
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS examples JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.word_families ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_word_families_word_id ON public.word_families(word_id);
CREATE INDEX IF NOT EXISTS idx_word_families_word ON public.word_families(word);
CREATE INDEX IF NOT EXISTS idx_word_families_deleted ON public.word_families(deleted);
CREATE INDEX IF NOT EXISTS idx_word_families_updated_at ON public.word_families(updated_at);

-- Enable RLS
ALTER TABLE public.word_families ENABLE ROW LEVEL SECURITY;

-- Policies for public / anonymous access matching words table
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
