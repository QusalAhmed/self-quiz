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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateDatabase() {
  console.log('Running database migration for SRS practice support...');

  const sqlPath = path.resolve(__dirname, 'migrate-srs-practice.sql');
  const sqlStatements = fs.readFileSync(sqlPath, 'utf8');

  try {
    const { error } = await supabase.rpc('exec', { sql: sqlStatements });
    if (error) {
      if (error.code === 'PGRST202') {
        console.warn(
          '\n⚠️  Could not run migration automatically because the "public.exec" RPC function is missing on your Supabase project.'
        );
        console.warn(
          'Please manually copy the contents of "scripts/migrate-srs-practice.sql" and run them in your Supabase SQL Editor.'
        );
        process.exitCode = 0;
        return;
      }
      console.error('Error executing SQL migration:', error);
      process.exitCode = 1;
      return;
    }
    console.log('✅ Supabase database migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  }
}

migrateDatabase();
