-- ==========================================================
-- Migration: Create & Ensure public.app_settings table in Supabase
-- Description: Stores application preferences, appearance, study/quiz,
--              audio, FSRS, AI configuration, system notifications,
--              backup settings, and Quran verse popup settings.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  appearance JSONB NOT NULL DEFAULT '{}'::jsonb,
  study_quiz JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio JSONB NOT NULL DEFAULT '{}'::jsonb,
  fsrs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai JSONB NOT NULL DEFAULT '{}'::jsonb,
  notifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  quran_verse JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Ensure all columns exist for existing tables
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS appearance JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS study_quiz JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS audio JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS fsrs JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS ai JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS notifications JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS quran_verse JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Indexes for efficient replication & query performance
CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON public.app_settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_app_settings_deleted ON public.app_settings(deleted);

-- Enable Row Level Security (RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anonymous Select Policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow anonymous select app_settings') THEN
    CREATE POLICY "Allow anonymous select app_settings" ON public.app_settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow anonymous insert app_settings') THEN
    CREATE POLICY "Allow anonymous insert app_settings" ON public.app_settings FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow anonymous update app_settings') THEN
    CREATE POLICY "Allow anonymous update app_settings" ON public.app_settings FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow anonymous delete app_settings') THEN
    CREATE POLICY "Allow anonymous delete app_settings" ON public.app_settings FOR DELETE USING (true);
  END IF;
END
$$;

-- Enable Supabase Realtime publication for app_settings table
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- Table already in publication
    WHEN undefined_object THEN
      NULL; -- Publication does not exist in standard local postgres
  END;
END
$$;
