-- =============================================================================
-- Daily Usage Records Table — run this in your Supabase SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.daily_usage (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  device_id TEXT NOT NULL,
  seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_date ON public.daily_usage(date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_device_id ON public.daily_usage(device_id);
CREATE INDEX IF NOT EXISTS idx_daily_usage_updated_at ON public.daily_usage(updated_at);
CREATE INDEX IF NOT EXISTS idx_daily_usage_deleted ON public.daily_usage(deleted);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select daily_usage" ON public.daily_usage
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert daily_usage" ON public.daily_usage
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update daily_usage" ON public.daily_usage
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete daily_usage" ON public.daily_usage
  FOR DELETE USING (true);
