// src/auth.ts
// JWT validation & role cache per Phase 4
// Uses jose (Web Crypto API) for Cloudflare Workers-compatible verification

import { jwtVerify, createRemoteJWKSet } from 'jose';

export interface Env {
  SUPABASE_URL: string;
}

interface JwtPayload {
  sub: string;
  email?: string;
  app_metadata?: { role?: string };
  user_metadata?: Record<string, unknown>;
  iat: number;
  exp: number;
  iss?: string;
  aud?: string | string[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;

// Globally cache JWKS resolver instances to ensure in-memory caching is not defeated per request
const jwkSets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJWKSet(baseUrl: string) {
  const normalized = baseUrl.replace(/\/+$/, '');
  const jwksUrl = `${normalized}/auth/v1/.well-known/jwks.json`;
  if (!jwkSets.has(jwksUrl)) {
    jwkSets.set(
      jwksUrl,
      createRemoteJWKSet(new URL(jwksUrl), {
        cacheMaxAge: CACHE_TTL_MS,
      })
    );
  }
  return jwkSets.get(jwksUrl)!;
}

// Verify a JWT using Supabase JWKS
// createRemoteJWKSet handles its own key-caching internally
export async function validateJwt(token: string, env: Env): Promise<JwtPayload> {
  const normalizedUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  const JWKS = getJWKSet(normalizedUrl);

  let payload: JwtPayload;

  try {
    const { payload: p } = await jwtVerify(token, JWKS, {
      issuer: normalizedUrl + '/auth/v1',
    });
    payload = p as JwtPayload;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid token';
    if (message.includes('expired') || message.includes('Expired')) {
      throw new Response('Token expired', { status: 401 });
    }
    throw new Response('Invalid token', { status: 401 });
  }

  if (!payload.sub) {
    throw new Response('Invalid token: missing subject', { status: 401 });
  }

  return payload;
}

// Use app_metadata only — user_metadata is user-editable (untrusted)
// worker_agent role must be set server-side via Supabase admin/service role
export function validateRole(payload: JwtPayload, required = 'worker_agent'): boolean {
  return payload?.app_metadata?.role === required;
}
