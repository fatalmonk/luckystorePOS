# auth.md — Lucky Store Agent Authentication

## Overview

Lucky Store provides AI agents with access to our storefront API via
OAuth 2.0 / OpenID Connect, backed by Supabase Auth.

## Authentication

All protected API endpoints require a Bearer access token issued by
our OAuth authorization server.

**Authorization Server:** `https://hvmyxyccfnkrbxqbhlnm.supabase.co/auth/v1`
**Discovery URL:** `https://luckystore1947.com/.well-known/oauth-authorization-server`
**OIDC Discovery:** `https://luckystore1947.com/.well-known/openid-configuration`
**Protected Resource Metadata:** `https://luckystore1947.com/.well-known/oauth-protected-resource`

## Supported Grant Types

- **Authorization Code** (with PKCE) — for interactive agents
- **Client Credentials** — for server-to-server agents (service role)
- **Refresh Token** — for maintaining long-lived sessions

## Scopes

| Scope | Description |
|-------|-------------|
| `read:products` | Read product catalog and categories |
| `read:orders` | Read order history |
| `write:orders` | Create new orders (checkout) |
| `read:profile` | Read user profile information |
| `write:profile` | Update user profile |

## Agent Registration

Agents can register using the following methods:

### Identity Assertion

Agents with an existing identity (e.g., verified email or ID-JAG token)
can register at:

**Registration URL:** `https://luckystore1947.com/auth/register`

Supported assertion types:
- `urn:ietf:params:oauth:token-type:id-jag` — ID-JAG identity assertion
- `verified_email` — Verified email assertion

Supported credential types:
- `api_key` — API key credential
- `oauth_client` — OAuth client credentials

### Anonymous Access

Agents without an identity can obtain a limited `api_key` credential
for read-only access to the product catalog.

**Registration URL:** `https://luckystore1947.com/auth/register`

## Claims

Claims can be retrieved from:
`https://hvmyxyccfnkrbxqbhlnm.supabase.co/auth/v1/userinfo`

## Token Revocation

Tokens can be revoked at:
`https://hvmyxyccfnkrbxqbhlnm.supabase.co/auth/v1/logout`

Revocation events supported: `revocation`

## Contact

For agent integration support: `hello@luckystore1947.com`