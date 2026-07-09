/**
 * Lucky Store Image Worker
 * 
 * Handles:
 * - POST /upload   — image upload to R2 (multipart/form-data)
 * - GET  /:key     — serve image from R2 with cache headers
 * - DELETE /:key   — delete image from R2
 * 
 * Rate limiting: in-memory per-IP counter (30 uploads/min, 600 reads/min)
 */

export interface Env {
  IMAGES: R2Bucket;
  ALLOWED_ORIGINS: string;
}

// Simple in-memory rate limiter
const rateLimits = new Map<string, { uploads: number[]; reads: number[] }>();

function checkRate(ip: string, type: 'uploads' | 'reads', limit: number): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { uploads: [], reads: [] });
  }
  const entry = rateLimits.get(ip)!;
  const timestamps = entry[type];
  
  // Remove expired entries
  while (timestamps.length > 0 && timestamps[0] < now - windowMs) {
    timestamps.shift();
  }
  
  if (timestamps.length >= limit) {
    return false;
  }
  
  timestamps.push(now);
  return true;
}

function corsHeaders(origin: string, allowed: string): Record<string, string> {
  const allowedOrigins = allowed.split(',').map(o => o.trim());
  const isAllowed = allowedOrigins.includes(origin) || /^https?:\/\/localhost(:\d+)?$/.test(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0] || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Store-Id',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // POST /upload — upload image
    if (request.method === 'POST' && url.pathname === '/upload') {
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

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
          return new Response(JSON.stringify({ error: 'Invalid file type' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }

        // Upload to R2
        const arrayBuffer = await file.arrayBuffer();
        await env.IMAGES.put(key, arrayBuffer, {
          httpMetadata: {
            contentType: file.type,
            cacheControl: 'public, max-age=31536000, immutable',
          },
        });

        const publicUrl = `${url.origin}/${key}`;
        return new Response(JSON.stringify({ url: publicUrl, key }), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Upload failed' }), {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    // DELETE /:key — delete image
    if (request.method === 'DELETE') {
      const key = url.pathname.slice(1);
      if (!key) {
        return new Response(JSON.stringify({ error: 'Missing key' }), {
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
      } catch {
        return new Response(JSON.stringify({ error: 'Delete failed' }), {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    // GET /:key — serve image from R2 with cache headers
    if (request.method === 'GET') {
      const key = url.pathname.slice(1);
      if (!key || key === 'favicon.ico') {
        return new Response('Not found', { status: 404 });
      }

      if (!checkRate(ip, 'reads', 600)) {
        return new Response('Rate limit exceeded', {
          status: 429,
          headers: { 'Retry-After': '60' },
        });
      }

      const object = await env.IMAGES.get(key);
      if (!object) {
        return new Response('Not found', { status: 404 });
      }

      const headers = new Headers();
      headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('ETag', object.httpEtag);
      object.writeHttpMetadata(headers);

      // Add CORS headers so client apps can query/fetch image files programmatically
      for (const [k, v] of Object.entries(cors)) {
        headers.set(k, v);
      }

      return new Response(object.body, { headers });
    }

    return new Response('Method not allowed', { status: 405, headers: cors });
  },
};