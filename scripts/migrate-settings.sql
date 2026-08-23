-- =============================================================================
-- Application Settings Table — run this in your Supabase SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  appearance JSONB NOT NULL DEFAULT '{}'::jsonb,
  study_quiz JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio JSONB NOT NULL DEFAULT '{}'::jsonb,
  fsrs JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai JSONB NOT NULL DEFAULT '{}'::jsonb,
  notifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_app_settings_updated_at ON public.app_settings(updated_at);
CREATE INDEX IF NOT EXISTS idx_app_settings_deleted ON public.app_settings(deleted);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select app_settings" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert app_settings" ON public.app_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update app_settings" ON public.app_settings
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete app_settings" ON public.app_settings
  FOR DELETE USING (true);
