import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildSupabaseClientOptions } from '../observability/egressObservation';

let browserClient: SupabaseClient | null | undefined;

export function createClient() {
  if (browserClient !== undefined) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    browserClient = null;
    return browserClient;
  }

  browserClient = createBrowserClient(url, key, buildSupabaseClientOptions());
  return browserClient;
}
