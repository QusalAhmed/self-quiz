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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const updates = [
  {
    wordPattern: 'Abjectly',
    audio_url: 'https://media.merriam-webster.com/audio/prons/en/us/mp3/a/abject02.mp3',
    phonetic: '\\ˈab-ˌjek(t)-lē\\',
    audio_source: 'merriam-webster',
  },
  {
    wordPattern: 'Cautionary',
    audio_url: 'https://media.merriam-webster.com/audio/prons/en/us/mp3/c/cautio02.mp3',
    phonetic: '\\ˈkȯ-shə-ˌner-ē\\',
    audio_source: 'merriam-webster',
  },
  {
    wordPattern: 'Percolation',
    audio_url: 'https://media.merriam-webster.com/audio/prons/en/us/mp3/p/percol03.mp3',
    phonetic: '\\ˌpər-kə-ˈlā-shən\\',
    audio_source: 'merriam-webster',
  },
  {
    wordPattern: 'Palpably',
    audio_url: 'https://media.merriam-webster.com/audio/prons/en/us/mp3/p/palpab03.mp3',
    phonetic: '\\ˈpal-pə-blē\\',
    audio_source: 'merriam-webster',
  },
  {
    wordPattern: 'Foresight',
    audio_url: 'https://media.merriam-webster.com/audio/prons/en/us/mp3/f/foresi02.mp3',
    phonetic: '\\ˈfȯr-ˌsīt\\',
    audio_source: 'merriam-webster',
  },
  {
    wordPattern: 'Drag on',
    audio_url: '',
    phonetic: '',
    audio_source: 'tts-fallback',
  },
  {
    wordPattern: 'In the hands of',
    audio_url: '',
    phonetic: '',
    audio_source: 'tts-fallback',
  },
];

async function applyFixes() {
  console.log('Starting Supabase pronunciation repair...');
  for (const item of updates) {
    const { data: existing, error: selectErr } = await supabase
      .from('words')
      .select('id, word, audio_url, phonetic, audio_source')
      .ilike('word', item.wordPattern);

    if (selectErr) {
      console.error(`Error checking ${item.wordPattern}:`, selectErr.message);
      continue;
    }

    if (!existing || existing.length === 0) {
      console.log(`Word "${item.wordPattern}" not found in database.`);
      continue;
    }

    for (const record of existing) {
      console.log(`Updating "${record.word}" (ID: ${record.id}):`);
      console.log(`  OLD: audio=${record.audio_url}, phonetic=${record.phonetic}`);
      console.log(`  NEW: audio=${item.audio_url}, phonetic=${item.phonetic}`);

      const { error: updateErr } = await supabase
        .from('words')
        .update({
          audio_url: item.audio_url,
          phonetic: item.phonetic,
          audio_source: item.audio_source,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (updateErr) {
        console.error(`  Failed to update record ${record.id}:`, updateErr.message);
      } else {
        console.log(`  Successfully updated record ${record.id}`);
      }
    }
  }

  console.log('\nVerification of updated records:');
  const checkWords = updates.map((u) => u.wordPattern);
  const { data: verified } = await supabase
    .from('words')
    .select('id, word, audio_url, phonetic, audio_source')
    .in('word', checkWords);

  console.table(
    verified?.map((v) => ({
      word: v.word,
      audio_url: v.audio_url,
      phonetic: v.phonetic,
      audio_source: v.audio_source,
    }))
  );
}

applyFixes();
