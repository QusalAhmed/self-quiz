-- =============================================================================
-- Migration: Add audio_url, phonetic, and audio_source to words table
-- Run this SQL in your Supabase SQL Editor
-- =============================================================================

-- Add columns to words table
ALTER TABLE public.words 
ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT '';

ALTER TABLE public.words 
ADD COLUMN IF NOT EXISTS phonetic TEXT DEFAULT '';

ALTER TABLE public.words 
ADD COLUMN IF NOT EXISTS audio_source TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_words_audio_url ON public.words(audio_url);

-- Repair any legacy malformed Merriam-Webster audio URLs (e.g. /audio/prons/c/mp3/ -> /audio/prons/en/us/mp3/)
UPDATE public.words 
SET audio_url = REPLACE(audio_url, '/audio/prons/c/mp3/', '/audio/prons/en/us/mp3/')
WHERE audio_url LIKE '%/audio/prons/c/mp3/%';

UPDATE public.words 
SET audio_url = REPLACE(audio_url, '/audio/prons/me/mp3/', '/audio/prons/en/us/mp3/')
WHERE audio_url LIKE '%/audio/prons/me/mp3/%';

UPDATE public.words 
SET audio_url = REPLACE(audio_url, '/audio/prons/la/mp3/', '/audio/prons/en/us/mp3/')
WHERE audio_url LIKE '%/audio/prons/la/mp3/%';
