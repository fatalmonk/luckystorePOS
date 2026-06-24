/**
 * Neon analytics read replica client — routes through Cloudflare Worker proxy.
 *
 * The Worker (neon-proxy) executes parameterized SELECT queries server-side.
 * No database connection string is exposed to the browser.
 *
 * Env vars (admin_web):
 *   VITE_NEON_PROXY_URL — Worker endpoint URL (e.g. https://neon-proxy.xxx.workers.dev)
 *   VITE_NEON_API_KEY  — shared secret for Worker authentication
 */

const NEON_PROXY_URL = import.meta.env.VITE_NEON_PROXY_URL || '';
const NEON_API_KEY = import.meta.env.VITE_NEON_API_KEY || '';

if (!NEON_PROXY_URL) {
  throw new Error('Missing VITE_NEON_PROXY_URL — set it in .env.local');
}

/**
 * Execute a parameterized SQL query against Neon via the Worker proxy.
 *
 * The sql string uses $1, $2, ... placeholders (PostgreSQL pg-style).
 * The params array provides values in order.
 *
 * @example
 * const rows = await query('SELECT * FROM items WHERE store_id = $1', [storeId]);
 */
export async function query<T = any>(sqlString: string, params: any[] = []): Promise<T[]> {
  const response = await fetch(`${NEON_PROXY_URL}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': NEON_API_KEY,
    },
    body: JSON.stringify({ sql: sqlString, params }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(`Neon proxy error: ${(errorData as any).error || response.status}`);
  }

  const data = await response.json() as { rows: T[] };
  return data.rows;
}

/**
 * Execute a query and return the first row, or null.
 */
export async function queryOne<T = any>(sqlString: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sqlString, params);
  return rows[0] ?? null;
}

/**
 * Check if Neon proxy is reachable (health check).
 */
export async function neonHealthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${NEON_PROXY_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}