# English Word Memorizer PWA

Local-first English word memorization app with quiz practice. Words are stored in RxDB (IndexedDB) and optionally synced to Supabase.

## Features

- Add words and meanings
- Local-first storage with RxDB
- Optional Supabase sync for remote backup
- Quiz mode based on saved words
- Basic PWA setup with offline caching
- Optional AI Bangla meaning backfill when meaning is left blank

## Cloudflare Worker AI setup

Add `CF_ACCOUNT_ID` and `CF_API_TOKEN` to `.env.local`. You can optionally set `CF_AI_MODEL` (default: `@cf/meta/llama-3.1-8b-instruct`).

Get your Account ID from the [Cloudflare Dashboard](https://dash.cloudflare.com/) and generate an API Token with **Workers AI** permissions.

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
- `CF_ACCOUNT_ID`
- `CF_API_TOKEN`
- `CF_AI_MODEL` (optional, default: `@cf/meta/llama-3.1-8b-instruct`)

## Scripts

Known scripts from `package.json`:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run test`

## Notes

- If Supabase is not configured, the app still works fully offline.
- Deletions are soft-deleted to keep remote sync consistent.
