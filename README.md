# English Word Memorizer PWA

Local-first English word memorization app with quiz practice. Words are stored in RxDB (IndexedDB) and optionally synced to Supabase.

## Features

- Add words and meanings
- Local-first storage with RxDB
- Optional Supabase sync for remote backup
- Quiz mode based on saved words
- Basic PWA setup with offline caching
- Optional AI Bangla meaning backfill when meaning is left blank

## AI Services Setup (3-Tier Priority System)

The app features an automatic 3-tier fallback hierarchy for AI word family generation and example sentences:

1. **Tier 1 (Highest Priority)**: **Groq AI** (`llama-3.3-70b-versatile` by default)
2. **Tier 2 (Fallback)**: **Google AI** (`gemini-2.5-flash` / `gemma-4-26b-a4b-it`)
3. **Tier 3 (Fallback)**: **Cloudflare Workers AI** (`@cf/meta/llama-3.1-8b-instruct` by default)

### 1. Groq AI Setup (Recommended / Primary)
Add `GROQ_API_KEY` to `.env.local`. You can get a free API key at [Groq Console](https://console.groq.com/).
- `GROQ_API_KEY`
- `GROQ_AI_MODEL` (optional, default: `llama-3.3-70b-versatile`)

### 2. Google AI Setup
Add `GEMINI_API_KEY` or `GOOGLE_API_KEY` to `.env.local`. Get your free API key at [Google AI Studio](https://aistudio.google.com/).
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `GOOGLE_AI_MODEL` (optional, default: `gemma-4-26b-a4b-it`)

### 3. Cloudflare Workers AI Setup
Add `CF_ACCOUNT_ID` and `CF_API_TOKEN` to `.env.local`. You can optionally set `CF_AI_MODEL` (default: `@cf/meta/llama-3.1-8b-instruct`).
- `CF_ACCOUNT_ID`
- `CF_API_TOKEN`
- `CF_AI_MODEL` (optional, default: `@cf/meta/llama-3.1-8b-instruct`)

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
- `GROQ_API_KEY` (Tier 1 AI)
- `GROQ_AI_MODEL` (optional, default: `llama-3.3-70b-versatile`)
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` (Tier 2 AI)
- `GOOGLE_AI_MODEL` (optional, default: `gemma-4-26b-a4b-it`)
- `CF_ACCOUNT_ID` (Tier 3 AI)
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
