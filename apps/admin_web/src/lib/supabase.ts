import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

let _client: ReturnType<typeof createClient<Database>> | null = null;

function getClient() {
  if (!_client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables are missing. API calls will fail.');
    }
    _client = createClient<Database>(supabaseUrl || '', supabaseAnonKey || '');
  }
  return _client;
}

// Proxy preserves the same import API while deferring client creation to first access.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = new Proxy({} as any, {
  get(_, prop) {
    return (getClient() as any)[prop];
  },
});
