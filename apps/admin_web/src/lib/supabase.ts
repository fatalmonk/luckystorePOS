import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables are missing. API calls will fail.');
    }
    _client = createClient(supabaseUrl || '', supabaseAnonKey || '');
  }
  return _client;
}

// Proxy preserves the same import API while deferring client creation to first access.
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    return (getClient() as Record<string | symbol, unknown>)[prop];
  },
});
