/**
 * Lucky Store Neon Query Proxy Worker
 *
 * Accepts POST /query with JSON body { sql: string, params: any[] }
 * Executes the parameterized query against Neon (read-only)
 * Returns JSON { rows: any[] } or { error: string }
 *
 * Security:
 * - Only SELECT queries allowed (validated server-side)
 * - API key required via x-api-key header
 * - Per-IP rate limiting (60 queries/min)
 * - CORS restricted to admin_web + localhost origins
 */

export interface Env {
  NEON_DATABASE_URL: string;
  API_KEY: string;
  ALLOWED_ORIGINS: string;
}

// In-memory rate limiter
const rateLimits = new Map<string, number[]>();

function checkRate(ip: string, limit: number): boolean {
  const now = Date.now();
  const windowMs = 60_000;

  if (!rateLimits.has(ip)) rateLimits.set(ip, []);
  const timestamps = rateLimits.get(ip)!;

  while (timestamps.length > 0 && timestamps[0] < now - windowMs) {
    timestamps.shift();
  }

  if (timestamps.length >= limit) return false;

  timestamps.push(now);
  return true;
}

function corsHeaders(origin: string, allowed: string): Record<string, string> {
  const allowedList = allowed.split(',').map(o => o.trim());
  const isAllowed = allowedList.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedList[0] || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Max-Age': '86400',
  };
}

// Validate that SQL is read-only — reject anything that isn't a SELECT
function isReadOnlyQuery(sql: string): boolean {
  const trimmed = sql.trim().toLowerCase();
  // Must start with SELECT or WITH (for CTEs)
  if (!trimmed.startsWith('select') && !trimmed.startsWith('with')) {
    return false;
  }
  // Block write/DDL keywords anywhere after the initial SELECT
  const forbidden = [
    /\binsert\b/, /\bupdate\b/, /\bdelete\b/, /\bdrop\b/, /\btruncate\b/,
    /\bcreate\b/, /\balter\b/, /\bgrant\b/, /\brevoke\b/, /\bvacuum\b/,
    /\bcopy\b/, /\bcall\b/, /\bexecute\b/,
  ];
  // Check for these as standalone words (not inside string literals)
  // Simple heuristic: strip string literals first
  const withoutStrings = trimmed.replace(/'[^']*'/g, "''");
  for (const pattern of forbidden) {
    if (pattern.test(withoutStrings)) return false;
  }
  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

    // Health check
    if (request.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // Only POST /query is accepted
    if (request.method !== 'POST' || url.pathname !== '/query') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    // API key check
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== env.API_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!checkRate(ip, 60)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    // Parse request body
    let body: { sql: string; params?: any[] };
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (!body.sql || typeof body.sql !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing sql field' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Validate read-only
    if (!isReadOnlyQuery(body.sql)) {
      return new Response(JSON.stringify({ error: 'Only SELECT queries are allowed' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Execute against Neon using HTTP fetch driver directly
    // We can't use the tagged template because we have a raw SQL string + params
    try {
      const { Pool } = await import('@neondatabase/serverless');
      const pool = new Pool({ connectionString: env.NEON_DATABASE_URL });

      const params = body.params || [];
      const result = await pool.query(body.sql, params);
      await pool.end();

      return new Response(JSON.stringify({ rows: result.rows }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Query failed';
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};