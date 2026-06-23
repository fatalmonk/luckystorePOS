# auth.md — Lucky Store Agent Authentication

## Overview

Lucky Store provides AI agents with access to our storefront API via
OAuth 2.0 / OpenID Connect, backed by Supabase Auth.

## Authentication

All protected API endpoints require a Bearer access token issued by
our OAuth authorization server.

**Authorization Server:** `https://hvmyxyccfnkrbxqbhlnm.supabase.co/auth/v1`
**Discovery URL:** `https://lucky-store-six.vercel.app/.well-known/oauth-authorization-server`
**OIDC Discovery:** `https://lucky-store-six.vercel.app/.well-known/openid-configuration`
**Protected Resource Metadata:** `https://lucky-store-six.vercel.app/.well-known/oauth-protected-resource`

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

To register a new AI agent:

1. Send a POST request to the registration endpoint with your agent metadata
2. Include the following claims:
   - `agent_name`: Human-readable name
   - `agent_type`: One of `assistant`, `crawler`, `automation`
   - `redirect_uris`: Array of callback URLs (for interactive agents)
   - `credential_type`: `api_key` or `oauth_client`

**Registration URL:** `https://lucky-store-six.vercel.app/auth/register`

## Identity Types Supported

- `user`: End-user (customer) identity
- `service`: Server-to-service identity (API key / service role)
- `agent`: AI agent identity (with scoped permissions)

## Token Revocation

Tokens can be revoked at:
`https://hvmyxyccfnkrbxqbhlnm.supabase.co/auth/v1/logout`

## Contact

For agent integration support: `hello@luckystore1947.com`