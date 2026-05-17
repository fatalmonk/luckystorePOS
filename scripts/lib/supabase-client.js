/**
 * Shared Supabase client factory for scripts.
 *
 * Reads VITE_SUPABASE_URL (or SUPABASE_URL) from the environment.
 * If neither is set the script will exit with a clear error instead of
 * silently falling back to a hardcoded project URL.
 *
 * Usage (ESM):
 *   import { getSupabaseUrl, createSupabaseClient } from '../lib/supabase-client.js';
 *   const supabase = createSupabaseClient(process.env.SUPABASE_SERVICE_ROLE_KEY);
 *
 * Usage (CJS – use dynamic import or copy the pattern):
 *   const { getSupabaseUrl } = await import('../lib/supabase-client.js');
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

/**
 * Load .env / .env.local files from repo root so that scripts invoked from
 * any subdirectory still pick up project-level environment variables.
 */
function loadEnv() {
  // Determine repo root relative to this lib file (scripts/lib -> repo root)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const repoRoot = join(__dirname, '..', '..');

  for (const name of ['.env', '.env.local']) {
    const p = join(repoRoot, name);
    if (existsSync(p)) {
      config({ path: p });
    }
  }

  // Also try frontend env which often holds VITE_ prefixed vars
  const frontendEnv = join(repoRoot, 'apps', 'frontend', '.env.local');
  if (existsSync(frontendEnv)) {
    config({ path: frontendEnv });
  }
}

loadEnv();

/**
 * Return the Supabase project URL from the environment.
 * Throws if neither VITE_SUPABASE_URL nor SUPABASE_URL is set.
 */
export function getSupabaseUrl() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!url) {
    console.error(
      'Error: VITE_SUPABASE_URL (or SUPABASE_URL) is not set.\n' +
        'Add it to your .env file or export it in your shell before running this script.'
    );
    process.exit(1);
  }
  return url;
}

/**
 * Convenience: create an authenticated Supabase client.
 * @param {string} key  - service-role key, anon key, etc.
 * @param {object} [options] - extra options forwarded to createClient
 */
export function createSupabaseClient(key, options = {}) {
  const url = getSupabaseUrl();
  if (!key) {
    console.error(
      'Error: Supabase key was not provided to createSupabaseClient().\n' +
        'Pass the appropriate key (SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY, etc.).'
    );
    process.exit(1);
  }
  return createClient(url, key, options);
}