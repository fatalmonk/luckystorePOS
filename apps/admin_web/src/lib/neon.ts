/**
 * Neon serverless client — read-only analytics replica.
 * 
 * Uses @neondatabase/serverless HTTP driver for edge-compatible connections.
 * All queries here are READ-ONLY — writes go through Supabase.
 * 
 * Env vars (admin_web):
 *   VITE_NEON_DATABASE_URL — Neon connection string (postgresql://...)
 */

import { neon } from '@neondatabase/serverless';

const neonUrl = import.meta.env.VITE_NEON_DATABASE_URL;

if (!neonUrl) {
  throw new Error('Missing VITE_NEON_DATABASE_URL — set it in .env.local');
}

/**
 * Tagged template literal for type-safe SQL queries.
 * Returns rows as plain objects.
 * 
 * @example
 * const rows = await sql`SELECT id, name FROM items WHERE store_id = ${storeId}`;
 */
export const sql = neon(neonUrl);

/**
 * Execute a query and return the first row, or null.
 */
export async function sqlOne<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T | null> {
  const rows = await sql(strings, ...values);
  return (rows[0] as T) ?? null;
}

/**
 * Check if Neon is reachable (health check).
 */
export async function neonHealthCheck(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}