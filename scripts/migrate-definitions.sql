-- =============================================================================
-- Multi-definition support (definitions column + per-definition examples)
-- Run this in your Supabase SQL Editor if the app reports:
--   "Could not find the 'definitions' column of 'words' in the schema cache"
-- =============================================================================

ALTER TABLE public.words ADD COLUMN IF NOT EXISTS definitions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS examples JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS user_examples JSONB DEFAULT '[]'::jsonb;

-- Ask PostgREST to reload its schema cache immediately instead of waiting for
-- the next automatic refresh, so the new column is usable right away.
NOTIFY pgrst, 'reload schema';
