# English Word Memorizer PWA

Local-first English word memorization app with quiz practice. Words are stored in RxDB (IndexedDB) and optionally synced to Supabase.

## Features

- Add words and meanings
- Local-first storage with RxDB
- Optional Supabase sync for remote backup
- Quiz mode based on saved words
- Basic PWA setup with offline caching
- Optional AI Bangla meaning backfill when meaning is left blank

## Gemini setup

Add `GEMINI_KEY` to `.env.local`. You can optionally set `GEMINI_MODEL` (default: `gemini-3.5-flash`).

## Supabase setup

Create a `words` table with the following columns:

- `id` text primary key
- `word` text
- `meaning` text
- `examples` jsonb
- `created_at` timestamptz
- `updated_at` timestamptz
- `deleted` boolean default false

Then set the environment variables below.

## Environment variables

Create `.env.local` with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_KEY`
- `GEMINI_MODEL` (optional)

## Scripts

Known scripts from `package.json`:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run test`

## Notes

- If Supabase is not configured, the app still works fully offline.
- Deletions are soft-deleted to keep remote sync consistent.
