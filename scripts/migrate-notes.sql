-- Migration: Add notes column to words table in Supabase
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
