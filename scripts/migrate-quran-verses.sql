-- ==========================================================
-- Migration: Create public.quran_verses table
-- Description: Stores Quran chapter & verse records, themes,
--              and display/fetch status for recurring motivational popups.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.quran_verses (
  id TEXT PRIMARY KEY,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  verse_end INTEGER,
  category TEXT DEFAULT 'Inspirational',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE
);

-- Ensure verse_end column exists for existing installations
ALTER TABLE public.quran_verses ADD COLUMN IF NOT EXISTS verse_end INTEGER;

-- Create indexes for fast lookup and random selection
CREATE INDEX IF NOT EXISTS idx_quran_verses_chapter_verse ON public.quran_verses(chapter, verse);
CREATE INDEX IF NOT EXISTS idx_quran_verses_status ON public.quran_verses(status);
CREATE INDEX IF NOT EXISTS idx_quran_verses_deleted ON public.quran_verses(deleted);
CREATE INDEX IF NOT EXISTS idx_quran_verses_updated_at ON public.quran_verses(updated_at);
CREATE INDEX IF NOT EXISTS idx_quran_verses_category ON public.quran_verses(category);

-- Enable Row Level Security (RLS)
ALTER TABLE public.quran_verses ENABLE ROW LEVEL SECURITY;

-- Anonymous Select Policy
CREATE POLICY "Allow anonymous select quran_verses" ON public.quran_verses
  FOR SELECT
  USING (true);

-- Anonymous Insert Policy
CREATE POLICY "Allow anonymous insert quran_verses" ON public.quran_verses
  FOR INSERT
  WITH CHECK (true);

-- Anonymous Update Policy
CREATE POLICY "Allow anonymous update quran_verses" ON public.quran_verses
  FOR UPDATE
  USING (true);

-- Anonymous Delete Policy
CREATE POLICY "Allow anonymous delete quran_verses" ON public.quran_verses
  FOR DELETE
  USING (true);

-- ==========================================================
-- Seed Initial Curated Motivational / Inspirational Verses
-- ==========================================================
INSERT INTO public.quran_verses (id, chapter, verse, category, notes, status, view_count, created_at, updated_at, deleted)
VALUES
  ('2:255', 2, 255, 'Protection & Majesty', 'Ayatul Kursi - The greatest verse in the Quran', 'active', 0, NOW(), NOW(), false),
  ('2:286', 2, 286, 'Hope & Relief', 'Allah does not burden a soul beyond that it can bear', 'active', 0, NOW(), NOW(), false),
  ('3:139', 3, 139, 'Courage & Strength', 'Do not lose heart nor fall into despair! You shall triumph if you are believers', 'active', 0, NOW(), NOW(), false),
  ('94:5', 94, 5, 'Ease & Relief', 'For indeed, with hardship [will be] ease', 'active', 0, NOW(), NOW(), false),
  ('94:6', 94, 6, 'Ease & Relief', 'Indeed, with hardship [will be] ease', 'active', 0, NOW(), NOW(), false),
  ('65:2', 65, 2, 'Trust & Provision', 'And whoever fears Allah - He will make for him a way out', 'active', 0, NOW(), NOW(), false),
  ('65:3', 65, 3, 'Trust & Provision', 'And will provide for him from where he does not expect', 'active', 0, NOW(), NOW(), false),
  ('39:53', 39, 53, 'Mercy & Forgiveness', 'Do not despair of the mercy of Allah. Indeed, Allah forgives all sins', 'active', 0, NOW(), NOW(), false),
  ('2:152', 2, 152, 'Remembrance & Gratitude', 'So remember Me; I will remember you. And be grateful to Me and do not deny Me', 'active', 0, NOW(), NOW(), false),
  ('2:153', 2, 153, 'Patience & Prayer', 'O you who have believed, seek help through patience and prayer', 'active', 0, NOW(), NOW(), false),
  ('13:28', 13, 28, 'Peace of Heart', 'Unquestionably, by the remembrance of Allah hearts are assured', 'active', 0, NOW(), NOW(), false),
  ('93:3', 93, 3, 'Comfort & Love', 'Your Lord has not taken leave of you, [O Muhammad], nor has He detested [you]', 'active', 0, NOW(), NOW(), false),
  ('93:4', 93, 4, 'Hope for Future', 'And the Hereafter is better for you than the first [life]', 'active', 0, NOW(), NOW(), false),
  ('93:5', 93, 5, 'Promise of Contentment', 'And your Lord is going to give you, and you will be satisfied', 'active', 0, NOW(), NOW(), false),
  ('21:87', 21, 87, 'Relief in Distress', 'Dua of Prophet Yunus: There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers', 'active', 0, NOW(), NOW(), false),
  ('3:173', 3, 173, 'Trust in Allah', 'Sufficient for us is Allah, and [He is] the best Disposer of affairs', 'active', 0, NOW(), NOW(), false),
  ('55:13', 55, 13, 'Gratitude', 'So which of the favors of your Lord would you deny?', 'active', 0, NOW(), NOW(), false)
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Reload PostgREST schema cache so newly added columns (such as verse_end)
-- are recognized by Supabase client immediately without PGRST204 errors
NOTIFY pgrst, 'reload schema';
