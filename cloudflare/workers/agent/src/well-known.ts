import { publicCorsHeaders } from './cors.js';
import type { Env } from './index.js';

export function handleAuthMd(): Response {
  const content = `# Authentication

Bearer token (Supabase JWT) required on all /api/* routes.
Role: app_metadata.role = "worker_agent"

## Access Control

- Customer storefront (lucky-store-bd.vercel.app): read-only via /api/neon/select
- Admin portal (lucky-store-pos-six.vercel.app): full CRUD via /api/neon/rpc
1 customer-facing store (Lucky Store id 4acf0fb2). All other stores are test/demo data.

## Token Validation

JWKS cache: 5-minute TTL with exponential backoff retry (max 3 attempts).
Rate limiting: 100 requests per minute per IP.
Audit logging: auth_fail, role_fail, rate_limit events captured in observability.logs.`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/markdown',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      ...publicCorsHeaders(),
    },
  });
}

export function handleRobotsTxt(): Response {
  const content = `User-agent: *
Disallow: /api/
Allow: /.well-known/
Allow: /`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      ...publicCorsHeaders(),
    },
  });
}

export function handleOpenApiJson(): Promise<Response> {
// TODO: Generate from actual routes
  const spec = {
    openapi: "3.0.3",
    info: { title: "agent.luckystore1947.com", version: "1.0.0" },
    paths: {
      "/api/neon/{query}": {
        post: {
          summary: "Query Neon database via proxy",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "query", in: "path", required: true, schema: { type: "string" } }],
        },
      },
      "/api/images/{action}": {
        post: {
          summary: "Upload/delete images via R2 worker",
          security: [{ bearerAuth: [] }],
          parameters: [{ name: "action", in: "path", required: true, schema: { type: "string" } }],
        },
    },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  };

  return Promise.resolve(
    new Response(JSON.stringify(spec, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        ...publicCorsHeaders(),
      },
    })
  );
}

export function handleHealth(): Response {
  return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      ...publicCorsHeaders(),
    },
  });
}

export async function handleOAuthProtectedResource(env: Env): Promise<Response> {
  const upstream = await fetch(env.OAUTH_METADATA_URL);
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      ...publicCorsHeaders(),
    },
  });
}

export function handleOAuthAuthorizationServer(supabaseUrl: string): Response {
  const issuer = 'https://agent.luckystore1947.com';
  const meta = {
    issuer,
    authorization_endpoint: `${supabaseUrl}/auth/v1/authorize`,
    token_endpoint: `${supabaseUrl}/auth/v1/token`,
    jwks_uri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    scopes_supported: ['openid', 'email', 'worker_agent'],
  };
  return new Response(JSON.stringify(meta, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      ...publicCorsHeaders(),
    },
  });
}

export async function handleHealthz(env: Env): Promise<Response> {
  const checks = await Promise.allSettled([
    fetch(`${env.SUPABASE_URL}/auth/v1/health`, {
      headers: { 'apikey': env.SUPABASE_ANON_KEY },
    }),
    fetch(`${env.NEON_PROXY_URL}/health`),
    fetch(`${env.IMAGES_WORKER_URL}/health`),
  ]);

  const result = {
    supabase: checks[0].status === 'fulfilled' && (checks[0] as PromiseFulfilledResult<Response>).value.ok,
    neon_proxy: checks[1].status === 'fulfilled' && (checks[1] as PromiseFulfilledResult<Response>).value.ok,
    images: checks[2].status === 'fulfilled' && (checks[2] as PromiseFulfilledResult<Response>).value.ok,
  };

  const allOk = Object.values(result).every(Boolean);
  return new Response(
    JSON.stringify({ status: allOk ? 'ok' : 'degraded', checks: result, ts: new Date().toISOString() }, null, 2),
    { status: allOk ? 200 : 503, headers: { 'Content-Type': 'application/json', ...publicCorsHeaders() } }
  );
}
