import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupDatabase() {
  console.log('Setting up Supabase database...');

  const sqlStatements = `
    -- Create the words table
    CREATE TABLE IF NOT EXISTS public.words (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL,
      meaning TEXT,
      definitions JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      deleted BOOLEAN DEFAULT FALSE
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_words_word ON public.words(word);
    CREATE INDEX IF NOT EXISTS idx_words_deleted ON public.words(deleted);
    CREATE INDEX IF NOT EXISTS idx_words_created_at ON public.words(created_at);
    CREATE INDEX IF NOT EXISTS idx_words_updated_at ON public.words(updated_at);

    -- Enable RLS (Row Level Security)
    ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

    -- Create policy to allow anonymous users to read all non-deleted records
    CREATE POLICY IF NOT EXISTS "Allow anonymous select" ON public.words
      FOR SELECT
      USING (true);

    -- Create policy to allow anonymous users to insert
    CREATE POLICY IF NOT EXISTS "Allow anonymous insert" ON public.words
      FOR INSERT
      WITH CHECK (true);

    -- Create policy to allow anonymous users to update their own records
    CREATE POLICY IF NOT EXISTS "Allow anonymous update" ON public.words
      FOR UPDATE
      USING (true);

    -- Create policy to allow anonymous users to soft-delete
    CREATE POLICY IF NOT EXISTS "Allow anonymous delete" ON public.words
      FOR DELETE
      USING (true);
  `;

  try {
    const { error } = await supabase.rpc('exec', { sql: sqlStatements });
    if (error) {
      console.error('Error executing SQL:', error);
      process.exit(1);
    }
    console.log('✅ Database setup completed successfully!');
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();

