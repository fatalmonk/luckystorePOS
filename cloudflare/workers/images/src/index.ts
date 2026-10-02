/**
 * Lucky Store Image Worker
 *
 * Handles:
 * - POST /upload   — image upload to R2 (multipart/form-data)
 * - GET  /:key     — serve image from R2 with cache headers
 * - DELETE /:key   — delete image from R2 (requires a server-issued capability)
 *
 * Rate limiting: in-memory per-IP sliding window (30 uploads/min, 600 reads/min)
 * NOTE: Rate limits reset on cold start. For true cross-instance limiting, bind
 *       a Durable Object and move checkRate() calls there.
 */

export interface Env {
  IMAGES: R2Bucket;
  ALLOWED_ORIGINS: string;
  /** Public base URL for generated image URLs, e.g. https://images.luckystore1947.com */
  PUBLIC_BASE_URL: string;
  /** HMAC secret used by the Lucky Store ticket issuer for browser uploads. */
  UPLOAD_SIGNING_SECRET: string;
  /** Separate server-to-server secret for trusted backend uploads. */
  INTERNAL_UPLOAD_SECRET: string;
}

// --- Rate limiter (in-memory, per-isolate) -----------------------------------

const rateLimits = new Map<string, { uploads: number[]; reads: number[] }>();

function checkRate(ip: string, type: 'uploads' | 'reads', limit: number): boolean {
  const now = Date.now();
  const windowMs = 60_000;

  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { uploads: [], reads: [] });
  }
  const entry = rateLimits.get(ip)!;
  const timestamps = entry[type];

  // Evict expired timestamps
  while (timestamps.length > 0 && timestamps[0] < now - windowMs) {
    timestamps.shift();
  }

  if (timestamps.length >= limit) {
    return false;
  }

  timestamps.push(now);

  // Prune stale IPs to prevent unbounded Map growth (keep last 10 000 IPs)
  if (rateLimits.size > 10_000) {
    const oldest = rateLimits.keys().next().value;
    if (oldest) rateLimits.delete(oldest);
  }

  return true;
}

// --- Key validation ----------------------------------------------------------

const KEY_RE = /^[\w\-.\/]+$/;

function isValidKey(key: string): boolean {
  return key.length > 0 && key.length <= 512 && KEY_RE.test(key);
}

function decodeBase64Url(value: string): Uint8Array {
  const remainder = value.length % 4;
  const padding = remainder === 0 ? '' : '='.repeat(4 - remainder);
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + padding;
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function verifyUploadToken(token: string, env: Env): Promise<{ op?: string; key: string; contentType: string; maxBytes: number } | null> {
  try {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature || !env.UPLOAD_SIGNING_SECRET) return null;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.UPLOAD_SIGNING_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('HMAC', key, decodeBase64Url(signature), new TextEncoder().encode(encoded))) return null;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))) as { op?: string; key?: string; contentType?: string; maxBytes?: number; exp?: number };
    if (!payload.key || !payload.contentType || !payload.maxBytes || payload.maxBytes > 10 * 1024 * 1024 || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { op: payload.op, key: payload.key, contentType: payload.contentType, maxBytes: payload.maxBytes };
  } catch {
    return null;
  }
}

// --- CORS --------------------------------------------------------------------

function corsHeaders(origin: string, allowed: string): Record<string, string> {
  const allowedOrigins = allowed.split(',').map(o => o.trim());
  const isAllowed =
    allowedOrigins.includes(origin) || /^https?:\/\/localhost(:\d+)?$/.test(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Token, X-Delete-Token, X-Internal-Upload-Secret',
    'Access-Control-Max-Age': '86400',
  };
}

// --- Worker ------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // Require a real IP — never let 'unknown' consume a shared bucket
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) {
      return new Response(JSON.stringify({ error: 'Cannot identify client IP' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // -------------------------------------------------------------------------
    // POST /upload
    // -------------------------------------------------------------------------
    if (request.method === 'POST' && url.pathname === '/upload') {
      const capability = await verifyUploadToken(request.headers.get('X-Upload-Token') || '', env);
      if (!capability || capability.op !== 'upload') {
        return new Response(JSON.stringify({ error: 'Valid upload capability required' }), {
          status: 401,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      if (!checkRate(ip, 'uploads', 30)) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': '60' },
        });
      }

      try {
        const formData = await request.formData();
        const file = formData.get('file') as unknown as File | null;
        const key = formData.get('key') as string | null;

        if (!file || !key) {
          return new Response(JSON.stringify({ error: 'Missing file or key' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }

        // Sanitize key
        if (!isValidKey(key) || key !== capability.key || file.type !== capability.contentType) {
          return new Response(JSON.stringify({ error: 'Invalid key format' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }

        // Validate MIME type (client-provided — sufficient for basic guard)
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
          'image/x-icon',
          'image/vnd.microsoft.icon',
          'image/svg+xml',
        ];
        if (!allowedTypes.includes(file.type)) {
          return new Response(JSON.stringify({ error: 'Invalid file type' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }

        // Validate size (max 10 MB)
        if (file.size > capability.maxBytes) {
          return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }

        const arrayBuffer = await file.arrayBuffer();
        await env.IMAGES.put(key, arrayBuffer, {
          httpMetadata: {
            contentType: file.type,
            cacheControl: 'public, max-age=31536000, immutable',
          },
        });

        const base = env.PUBLIC_BASE_URL?.replace(/\/$/, '') || url.origin;
        const publicUrl = `${base}/${key}`;

        return new Response(JSON.stringify({ url: publicUrl, key, size: arrayBuffer.byteLength }), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.error('[upload] error:', err);
        return new Response(JSON.stringify({ error: 'Upload failed' }), {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    // Trusted backend uploads use a separate secret and never accept browser
    // tickets. This is the path for Canva exports after server validation.
    if (request.method === 'POST' && url.pathname === '/internal-upload') {
      if (!env.INTERNAL_UPLOAD_SECRET || request.headers.get('X-Internal-Upload-Secret') !== env.INTERNAL_UPLOAD_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const key = formData.get('key') as string | null;
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!file || !key || !isValidKey(key) || !allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'Invalid internal upload' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
      await env.IMAGES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' } });
      const base = env.PUBLIC_BASE_URL?.replace(/\/$/, '') || url.origin;
      return new Response(JSON.stringify({ url: `${base}/${key}`, key, size: file.size }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // -------------------------------------------------------------------------
    // DELETE /:key  — requires a server-issued delete capability
    // -------------------------------------------------------------------------
    if (request.method === 'DELETE') {
      // Authenticate
      const capability = await verifyUploadToken(request.headers.get('X-Delete-Token') || '', env);
      if (!capability || capability.op !== 'delete') {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      const key = url.pathname.slice(1);
      if (!key || !isValidKey(key) || key !== capability.key) {
        return new Response(JSON.stringify({ error: 'Missing or invalid key' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      try {
        await env.IMAGES.delete(key);
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        console.error('[delete] error:', err);
        return new Response(JSON.stringify({ error: 'Delete failed' }), {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    // -------------------------------------------------------------------------
    // GET /:key — serve image
    // -------------------------------------------------------------------------
    if (request.method === 'GET' || request.method === 'HEAD') {
      const key = url.pathname.slice(1);
      // Block exposure of repository metadata or env files
      const blockedKeys = ['.git', '.env', '.git/HEAD', '.env.backup'];
      if (blockedKeys.includes(key) || key.startsWith('.')) {
        return new Response('Forbidden', { status: 403, headers: cors });
      }
      if (!key) {
        return new Response('Not found', { status: 404 });
      }

      if (!checkRate(ip, 'reads', 600)) {
        return new Response('Rate limit exceeded', {
          status: 429,
          headers: { ...cors, 'Retry-After': '60' },
        });
      }

      const object = await env.IMAGES.get(key);
      if (!object) {
        return new Response('Not found', { status: 404 });
      }

      const ext = key.split('.').pop()?.toLowerCase();
      let defaultType = 'image/jpeg';
      if (ext === 'ico') defaultType = 'image/x-icon';
      else if (ext === 'svg') defaultType = 'image/svg+xml';
      else if (ext === 'png') defaultType = 'image/png';
      else if (ext === 'webp') defaultType = 'image/webp';
      else if (ext === 'gif') defaultType = 'image/gif';

      const headers = new Headers();
      headers.set('Content-Type', object.httpMetadata?.contentType || defaultType);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('ETag', object.httpEtag);
      object.writeHttpMetadata(headers);

      for (const [k, v] of Object.entries(cors)) {
        headers.set(k, v);
      }

      // For HEAD requests, return headers without streaming the body
      if (request.method === 'HEAD') {
        return new Response(null, { headers });
      }

      return new Response(object.body, { headers });
    }

    return new Response('Method not allowed', { status: 405, headers: cors });
  },
};
