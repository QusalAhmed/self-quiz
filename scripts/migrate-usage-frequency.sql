-- =============================================================================
-- Migration: Add usage_frequency and generator_ai_details to words and word_families
-- Run this SQL in your Supabase SQL Editor
-- =============================================================================

-- 1. Add columns to words table
ALTER TABLE public.words 
ADD COLUMN IF NOT EXISTS usage_frequency TEXT DEFAULT '';

ALTER TABLE public.words 
ADD COLUMN IF NOT EXISTS generator_ai_details TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_words_usage_frequency ON public.words(usage_frequency);

-- 2. Add columns to word_families table
ALTER TABLE public.word_families 
ADD COLUMN IF NOT EXISTS usage_frequency TEXT DEFAULT '';

ALTER TABLE public.word_families 
ADD COLUMN IF NOT EXISTS generator_ai_details TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_word_families_usage_frequency ON public.word_families(usage_frequency);
