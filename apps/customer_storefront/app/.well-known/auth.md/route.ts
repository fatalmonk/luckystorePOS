import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Serve auth.md as markdown at /.well-known/auth.md
 * Required by auth.md spec for agent discovery
 */
export async function GET() {
  const authMdContent = `# auth.md

**Lucky Store (luckystore1947.com)** supports agent-assisted authentication and registration via the [auth.md](https://workos.com/auth.md) protocol.

This document describes how agents can register, authenticate, and obtain credentials to act on behalf of users when interacting with Lucky Store's API.

---

## Quick Start for Agents

1. **Discover** this service's capabilities via /.well-known/oauth-authorization-server
2. **Register** at the register_uri endpoint shown in the agent_auth block
3. **Assert identity** (ID-JAG, verified email, or anonymous) to receive a credential
4. **Exchange** credentials for access tokens
5. **Use** the API with proper Authorization headers
6. **Revoke** when no longer needed

---

## Discovery

### OAuth Protected Resource Metadata

GET /.well-known/oauth-protected-resource

Returns:
- resource: https://luckystore1947.com
- authorization_servers: https://hvmyxyccfnkrbxqbhlnm.supabase.co
- scopes_supported: read:products, read:orders, write:orders, read:profile, write:profile
- bearer_methods_supported: header

### OAuth Authorization Server Metadata

GET /.well-known/oauth-authorization-server

Returns full OAuth 2.1 metadata plus an agent_auth block with:
- skill: This document
- register_uri: Agent registration endpoint
- identity_types_supported: identity_assertion, anonymous
- identity_assertion.assertion_types_supported: urn:ietf:params:oauth:token-type:id-jag, verified_email
- claim_uri: Endpoint to claim identity details
- revocation_uri: Endpoint to revoke credentials
- events_supported: revocation events

---

## Agent Registration Flow

### 1. Register Agent Identity

Endpoint: POST /auth/register (URL from agent_auth.register_uri)

Request Body:
{
  "agent_identifier": "unique-agent-id",
  "credential_type": "api_key",
  "callback_url": "https://agent.example.com/callback"
}

Response:
{
  "status": "pending",
  "claim_url": "https://luckystore1947.com/claim/abc123",
  "expires_in": 900
}

### 2. Assert Identity (Optional - ID-JAG flow)

Endpoint: POST /.well-known/agent-identity (if using ID-JAG tokens)

Request Body:
{
  "type": "identity_assertion",
  "assertion": "<ID-JAG JWT token>",
  "audience": "https://luckystore1947.com"
}

Response:
{
  "status": "accepted",
  "identity_assertion_id": "uuid",
  "exchange_endpoint": "/oauth2/token"
}

### 3. Claim Endpoint (Anonymous/Verified Email flows)

Serve the claim URL from the registration response:

GET /claim/{challenge_id}

User verifies ownership (email/anonymous flow), then:

POST /claim/{challenge_id}/verify
{
  "proof": "user-verification-token"
}

Response:
{
  "credential_type": "api_key",
  "api_key": "lucky_live_xxx...",
  "expires_at": "ISO8601 timestamp"
}

### 4. Exchange for Access Token

Endpoint: POST /oauth2/token (Supabase auth endpoint)

Grant Type: urn:ietf:params:oauth:grant-type:jwt-bearer (for ID-JAG) or urn:workos:agent-auth:grant-type:claim

Request Body (ID-JAG):
{
  "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
  "assertion": "<signed identity assertion>"
}

Response:
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read:products read:orders"
}

---

## Using Credentials

Authorization Header:
  Authorization: Bearer <access_token>

API Key Header (for long-lived credentials):
  X-API-Key: lucky_live_xxx...

Supported Scopes:
- read:products - Browse products, categories, prices
- read:orders - View order history
- write:orders - Create orders, submit purchases
- read:profile - Read user profile data
- write:profile - Update user preferences

---

## Revocation

### Revoke Token

Endpoint: POST /.well-known/oauth/revoke (or Supabase logout endpoint)

Request Body:
{
  "token": "<access_token or refresh_token>",
  "token_type_hint": "access_token"
}

### Revocation Events (for Agent Providers)

Agents that mint ID-JAGs should listen for revocation events:

Event Type: https://schemas.workos.com/events/agent/auth/identity/assertion/revoked

Push to your events_endpoint when:
- User revokes access
- Credential expires
- Security incident detected

---

## Security Considerations

- All endpoints require HTTPS
- ID-JAG assertions must be signed by a trusted Agent Provider
- Claims expire after 15 minutes
- API keys are scoped to specific permissions
- Rate limiting applies per credential

---

## Support

- Documentation: https://github.com/workos/auth.md
- Issue Reporting: Submit via GitHub Issues
- Status Page: (add when available)

---

Last updated: June 25, 2026
`;

  return new NextResponse(authMdContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}