#!/usr/bin/env node

/**
 * Word Frequency Batch Backfill Script
 *
 * Scans Supabase for words missing `usage_frequency` and retrieves frequency tiers
 * using WordsAPI (https://www.wordsapi.com/) or AI (Google Gemini, Groq, Cloudflare).
 *
 * Usage:
 *   node scripts/fetch-word-frequencies.mjs [options]
 *
 * Options:
 *   --limit <n>        Limit to n words (default: all)
 *   --provider <p>     Provider to use: auto, wordsapi, gemini, groq, cloudflare (default: auto)
 *   --dry-run          Preview words and detected frequencies without updating database
 *   --overwrite        Also update words that already have usage_frequency
 *   --word <word>      Fetch frequency for a single specific word
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  }
}

// Parse command-line args
const args = process.argv.slice(2);
function getArg(flag, defaultValue = undefined) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return defaultValue;
}
const isDryRun = args.includes('--dry-run');
const overwrite = args.includes('--overwrite');
const limitArg = getArg('--limit');
const limit = limitArg ? parseInt(limitArg, 10) : undefined;
const preferredProvider = getArg('--provider', 'auto').toLowerCase();
const targetWord = getArg('--word');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function zipfToTier(zipf) {
  if (typeof zipf !== 'number' || isNaN(zipf)) return 'Rare';
  if (zipf >= 6.0) return 'Top 500';
  if (zipf >= 5.0) return 'Top 1000';
  if (zipf >= 4.3) return 'Top 2000';
  if (zipf >= 3.8) return 'Top 3000';
  if (zipf >= 3.0) return 'Top 5000';
  if (zipf >= 2.0) return 'Top 10000';
  return 'Rare';
}

function perMillionToTier(perMillion) {
  if (typeof perMillion !== 'number' || isNaN(perMillion)) return 'Rare';
  if (perMillion >= 1000) return 'Top 500';
  if (perMillion >= 300) return 'Top 1000';
  if (perMillion >= 100) return 'Top 2000';
  if (perMillion >= 30) return 'Top 3000';
  if (perMillion >= 10) return 'Top 5000';
  if (perMillion >= 1) return 'Top 10000';
  return 'Rare';
}

async function fetchFromWordsApi(word, apiKey) {
  if (!apiKey) return null;
  const encoded = encodeURIComponent(word.trim().toLowerCase());
  const headers = {
    'x-rapidapi-host': 'wordsapiv1.p.rapidapi.com',
    'x-rapidapi-key': apiKey,
  };

  try {
    const res = await fetch(`https://wordsapiv1.p.rapidapi.com/words/${encoded}/frequency`, {
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      const freq = data.frequency || data;
      const zipf = typeof freq.zipf === 'number' ? freq.zipf : undefined;
      const perMillion = typeof freq.perMillion === 'number' ? freq.perMillion : undefined;

      let tier;
      if (zipf !== undefined) tier = zipfToTier(zipf);
      else if (perMillion !== undefined) tier = perMillionToTier(perMillion);

      if (tier) {
        return {
          usageFrequency: tier,
          generatorAiDetails: `WordsAPI (RapidAPI zipf: ${zipf ?? 'N/A'})`,
          source: 'wordsapi',
        };
      }
    }
  } catch {
    // ignore
  }

  // Fallback to main words endpoint
  try {
    const res = await fetch(`https://wordsapiv1.p.rapidapi.com/words/${encoded}`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.frequency === 'number') {
        return {
          usageFrequency: zipfToTier(data.frequency),
          generatorAiDetails: `WordsAPI (RapidAPI zipf: ${data.frequency})`,
          source: 'wordsapi',
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

function parseFrequencyJson(rawText) {
  if (!rawText) return null;
  try {
    const trimmed = rawText.trim();
    // Strip markdown code fences if present
    const cleaned = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.usageFrequency) return parsed;
  } catch {
    const match = rawText.match(/\"usageFrequency\"\s*:\s*\"(Top\s+\d+|Rare)\"/i);
    if (match) {
      return { usageFrequency: match[1] };
    }
  }
  return null;
}

async function fetchFromGemini(word, meaning, apiKey) {
  if (!apiKey) return null;
  const prompt = `Classify the general English corpus usage frequency of the word "${word}"${meaning ? ` (meaning: "${meaning}")` : ''}.
Return ONLY valid JSON matching this schema:
{
  "usageFrequency": "Top 500" | "Top 1000" | "Top 2000" | "Top 3000" | "Top 5000" | "Top 10000" | "Rare",
  "confidence": 0.95,
  "rationale": "Brief reason"
}`;

  const model = process.env.GOOGLE_AI_MODEL || 'gemma-4-26b-a4b-it';

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = parseFrequencyJson(rawText);
      if (parsed?.usageFrequency) {
        return {
          usageFrequency: parsed.usageFrequency,
          generatorAiDetails: `Google Gemma (${parsed.usageFrequency})`,
          source: 'gemini',
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function fetchFromGroq(word, meaning, apiKey) {
  if (!apiKey) return null;
  const prompt = `Classify the general English corpus usage frequency of the word "${word}"${meaning ? ` (meaning: "${meaning}")` : ''}.
Return ONLY valid JSON matching this schema:
{
  "usageFrequency": "Top 500" | "Top 1000" | "Top 2000" | "Top 3000" | "Top 5000" | "Top 10000" | "Rare",
  "confidence": 0.95,
  "rationale": "Brief reason"
}`;

  const model = process.env.GROQ_AI_MODEL || 'qwen/qwen3.6-27b';

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      const parsed = parseFrequencyJson(content);
      if (parsed?.usageFrequency) {
        return {
          usageFrequency: parsed.usageFrequency,
          generatorAiDetails: `Groq (${parsed.usageFrequency})`,
          source: 'groq',
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function resolveFrequency(word, meaning) {
  const wordsApiKey = process.env.WORDS_API_KEY || process.env.RAPIDAPI_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (preferredProvider === 'wordsapi') {
    return (await fetchFromWordsApi(word, wordsApiKey)) || { usageFrequency: 'Rare', generatorAiDetails: 'WordsAPI (Fallback)' };
  }

  if (preferredProvider === 'gemini') {
    return (await fetchFromGemini(word, meaning, geminiKey)) || { usageFrequency: 'Rare', generatorAiDetails: 'Gemini (Fallback)' };
  }

  if (preferredProvider === 'groq') {
    return (await fetchFromGroq(word, meaning, groqKey)) || { usageFrequency: 'Rare', generatorAiDetails: 'Groq (Fallback)' };
  }

  // Auto mode: WordsAPI first, fallback to Gemini, fallback to Groq
  if (wordsApiKey) {
    const res = await fetchFromWordsApi(word, wordsApiKey);
    if (res) return res;
  }

  if (geminiKey) {
    const res = await fetchFromGemini(word, meaning, geminiKey);
    if (res) return res;
  }

  if (groqKey) {
    const res = await fetchFromGroq(word, meaning, groqKey);
    if (res) return res;
  }

  return {
    usageFrequency: 'Rare',
    generatorAiDetails: 'Fallback (No API key responded)',
    source: 'fallback',
  };
}

async function main() {
  console.log('🔍 Word Usage Frequency Backfill');
  console.log(`   Provider: ${preferredProvider}`);
  console.log(`   Dry Run:  ${isDryRun ? 'YES (No DB updates)' : 'NO'}`);
  console.log(`   Overwrite existing: ${overwrite ? 'YES' : 'NO'}`);
  if (limit) console.log(`   Limit:    ${limit} words`);
  console.log('----------------------------------------------------');

  let query = supabase.from('words').select('id, word, meaning, usage_frequency, deleted').neq('deleted', true);

  if (targetWord) {
    query = query.ilike('word', targetWord);
  } else if (!overwrite) {
    query = query.or('usage_frequency.is.null,usage_frequency.eq.""');
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data: words, error } = await query;
  if (error) {
    console.error('❌ Failed to fetch words from Supabase:', error.message);
    process.exit(1);
  }

  if (!words || words.length === 0) {
    console.log('✅ No words found needing frequency backfill.');
    return;
  }

  console.log(`Found ${words.length} word(s) to process.\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < words.length; i++) {
    const item = words[i];
    process.stdout.write(`[${i + 1}/${words.length}] "${item.word}"... `);

    try {
      const result = await resolveFrequency(item.word, item.meaning);
      if (result && result.usageFrequency) {
        console.log(`-> ${result.usageFrequency} (${result.generatorAiDetails})`);

        if (!isDryRun) {
          const { error: updateErr } = await supabase
            .from('words')
            .update({
              usage_frequency: result.usageFrequency,
              generator_ai_details: result.generatorAiDetails,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          if (updateErr) {
            console.error(`   ⚠️ Failed to update DB: ${updateErr.message}`);
            failCount++;
          } else {
            successCount++;
          }
        } else {
          successCount++;
        }
      } else {
        console.log('-> FAILED (No frequency returned)');
        failCount++;
      }
    } catch (err) {
      console.log(`-> ERROR: ${err.message}`);
      failCount++;
    }

    // Rate-limiting pause
    if (i < words.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  console.log('\n----------------------------------------------------');
  console.log(`Summary: ${successCount} successful, ${failCount} failed.`);
  if (isDryRun) {
    console.log('ℹ️  Run without --dry-run to commit changes to Supabase.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
