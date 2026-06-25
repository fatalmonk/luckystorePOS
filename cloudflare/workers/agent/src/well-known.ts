import { publicCorsHeaders } from './cors.js';
import type { Env } from './index.js';

export function handleAuthMd(): Response {
  const content = `# auth.md — Lucky Store Agent Worker Authentication

## Overview

Lucky Store provides AI agents with access to our agent API via
OAuth 2.0 / OpenID Connect, backed by Supabase Auth.

## Authentication

All protected API endpoints require a Bearer access token issued by
our OAuth authorization server.

**Authorization Server:** \`https://hvmyxyccfnkrbxqbhlnm.supabase.co/auth/v1\`
**Discovery URL:** \`https://agent.luckystore1947.com/.well-known/oauth-authorization-server\`
**Protected Resource Metadata:** \`https://agent.luckystore1947.com/.well-known/oauth-protected-resource\`

## Supported Grant Types

- **Authorization Code** (with PKCE) — for interactive agents
- **Client Credentials** — for server-to-server agents (service role)
- **Refresh Token** — for maintaining long-lived sessions

## Scopes

| Scope | Description |
|-------|-------------|
| \`openid\` | OpenID Connect scope |
| \`email\` | User email scope |
| \`worker_agent\` | Access to the worker API |

## Agent Registration

Agents can register using the following methods:

### Identity Assertion

Agents with an existing identity (e.g., verified email or ID-JAG token)
can register at:

**Registration URL:** \`https://luckystore1947.com/auth/register\`

Supported assertion types:
- \`urn:ietf:params:oauth:token-type:id-jag\` — ID-JAG identity assertion
- \`verified_email\` — Verified email assertion

Supported credential types:
- \`api_key\` — API key credential
- \`oauth_client\` — OAuth client credentials

### Anonymous Access

Agents without an identity can obtain a limited \`api_key\` credential.

**Registration URL:** \`https://luckystore1947.com/auth/register\`

## Claims

Claims can be retrieved from:
\`https://hvmyxyccfnkrbxqbhlnm.supabase.co/auth/v1/userinfo\`

## Token Revocation

Tokens can be revoked at:
\`https://hvmyxyccfnkrbxqbhlnm.supabase.co/auth/v1/logout\`

Revocation events supported: \`revocation\`

## Contact

For agent integration support: \`hello@luckystore1947.com\``;

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
  try {
    const upstream = await fetch(env.OAUTH_METADATA_URL, {
      signal: AbortSignal.timeout(5000),
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        ...publicCorsHeaders(),
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'OAuth metadata unavailable' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        ...publicCorsHeaders(),
      },
    });
  }
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
    agent_auth: {
      skill: 'https://luckystore1947.com/.well-known/agent-skills/index.json',
      register_uri: 'https://luckystore1947.com/auth/register',
      identity_types_supported: ['identity_assertion', 'anonymous'],
      identity_assertion: {
        assertion_types_supported: [
          'urn:ietf:params:oauth:token-type:id-jag',
          'verified_email',
        ],
        credential_types_supported: ['api_key', 'oauth_client'],
      },
      anonymous: {
        credential_types_supported: ['api_key'],
      },
      claim_uri: `${supabaseUrl}/auth/v1/userinfo`,
      revocation_uri: `${supabaseUrl}/auth/v1/logout`,
      events_supported: ['revocation'],
    }
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
      signal: AbortSignal.timeout(5000),
    }),
    fetch(`${env.NEON_PROXY_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    }),
    fetch(`${env.IMAGES_WORKER_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    }),
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
