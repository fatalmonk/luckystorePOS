import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      console.warn('Warning: Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). Using placeholder values.');
    }
    client = createClient(
      url || 'https://placeholder.supabase.co',
      anon || 'placeholder',
      { auth: { persistSession: false } }
    );
  }
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    // Prevent Next.js/React internals or promise checks from triggering client initialization
    if (
      prop === '$$typeof' ||
      prop === 'then' ||
      prop === 'toJSON' ||
      prop === 'constructor' ||
      typeof prop === 'symbol'
    ) {
      return undefined;
    }
    return getClient()[prop as keyof SupabaseClient];
  },
});

