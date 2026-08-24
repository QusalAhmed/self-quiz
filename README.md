# English Word Memorizer PWA

Local-first English word memorization app with quiz practice. Words are stored in RxDB (IndexedDB) and optionally synced to Supabase.

## Features

- Add words and meanings
- Local-first storage with RxDB
- Optional Supabase sync for remote backup
- Quiz mode based on saved words
- Basic PWA setup with offline caching
- Optional AI Bangla meaning backfill when meaning is left blank

## AI Services Setup (Multi-Tier Priority System)

The app features an automatic fallback hierarchy for AI word family generation, example sentences, and contextual stories:

1. **Tier 1 (Highest Priority)**: **Google AI** (`gemma-4-26b-a4b-it`)
2. **Tier 2 (Fallback 1)**: **Cloudflare Workers AI** (`@cf/google/gemma-4-26b-a4b-it`)
3. **Tier 3 (Fallback 2)**: **Groq AI** (`qwen/qwen3.6-27b`)
4. **Tier 4 (Fallback 3)**: **Groq AI** (`openai/gpt-oss-120b`)

### 1. Google AI Setup (Primary / Recommended)
Add `GEMINI_API_KEY` or `GOOGLE_API_KEY` to `.env.local`. Get your free API key at [Google AI Studio](https://aistudio.google.com/).
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `GOOGLE_AI_MODEL` (optional, default: `gemma-4-26b-a4b-it`)

### 2. Cloudflare Workers AI Setup
Add `CF_ACCOUNT_ID` and `CF_API_TOKEN` to `.env.local`. You can optionally set `CF_AI_MODEL` (default: `@cf/google/gemma-4-26b-a4b-it`).
- `CF_ACCOUNT_ID`
- `CF_API_TOKEN`
- `CF_AI_MODEL` (optional, default: `@cf/google/gemma-4-26b-a4b-it`)

Get your Account ID from the [Cloudflare Dashboard](https://dash.cloudflare.com/) and generate an API Token with **Workers AI** permissions.

### 3. Groq AI Setup
Add `GROQ_API_KEY` to `.env.local`. You can get a free API key at [Groq Console](https://console.groq.com/).
- `GROQ_API_KEY`
- `GROQ_AI_MODEL` (optional, default: `qwen/qwen3.6-27b`)

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
- `GEMINI_API_KEY` or `GOOGLE_API_KEY` (Tier 1 AI)
- `GOOGLE_AI_MODEL` (optional, default: `gemma-4-26b-a4b-it`)
- `CF_ACCOUNT_ID` (Tier 2 AI)
- `CF_API_TOKEN`
- `CF_AI_MODEL` (optional, default: `@cf/google/gemma-4-26b-a4b-it`)
- `GROQ_API_KEY` (Tier 3 & 4 AI)
- `GROQ_AI_MODEL` (optional, default: `qwen/qwen3.6-27b`)

## Scripts

Known scripts from `package.json`:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run test`

## Notes

- If Supabase is not configured, the app still works fully offline.
- Deletions are soft-deleted to keep remote sync consistent.
