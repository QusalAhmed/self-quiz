import { createClient } from '@supabase/supabase-js';

type EnvValue = string | undefined;

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL as EnvValue) ?? '';
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as EnvValue) ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
