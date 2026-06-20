-- Run this SQL in your Supabase SQL Editor to add group support

-- Legacy single-group column (kept for backward compatibility)
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS custom_group TEXT DEFAULT '';

-- Multi-group membership for words
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS custom_groups JSONB DEFAULT '[]'::jsonb;

-- Groups table
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

-- Backfill custom_groups from legacy custom_group where empty
UPDATE public.words
SET custom_groups = jsonb_build_array(custom_group)
WHERE (custom_groups IS NULL OR custom_groups = '[]'::jsonb)
  AND custom_group IS NOT NULL
  AND trim(custom_group) <> '';
