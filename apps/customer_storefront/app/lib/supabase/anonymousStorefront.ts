import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let anonymousStorefrontClient: SupabaseClient | null = null;

/** A dedicated public-read client; never attach a user session to this instance. */
export function getAnonymousStorefrontClient(): SupabaseClient {
  if (!anonymousStorefrontClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      console.warn('Warning: Missing Supabase public URL or anon key for storefront reads.');
    }

    anonymousStorefrontClient = createClient(
      url || 'https://placeholder.supabase.co',
      anonKey || 'placeholder',
      { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
    );
  }
  return anonymousStorefrontClient;
}
