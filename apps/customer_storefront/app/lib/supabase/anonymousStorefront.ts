import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let anonymousStorefrontClient: SupabaseClient | null = null;

/**
 * True when `client` is the shared anonymous storefront client.
 *
 * Deliberately compares against the already-created instance instead of calling
 * the getter, so this never instantiates a client as a side effect and returns
 * false for any isolated client (tests, custom callers).
 */
export function isAnonymousStorefrontClient(client: unknown): boolean {
  return client != null && client === anonymousStorefrontClient;
}

/** A dedicated public-read client; never attach a user session to this instance. */
export function getAnonymousStorefrontClient(): SupabaseClient {
  if (!anonymousStorefrontClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    // Keep the same alias chain as the shared client in `app/lib/supabase.ts` so
    // deployments configured with SUPABASE_API_KEY still get live storefront reads.
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || process.env.SUPABASE_API_KEY
      || process.env.SUPABASE_ANON_KEY;
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
