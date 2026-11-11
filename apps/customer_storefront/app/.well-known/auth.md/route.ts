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

1. This host does not publish OAuth metadata or an agent registration API.
2. Create an account at /signup or sign in at /login.
3. There is no register_uri, token exchange, or /auth/register endpoint on this storefront.

---

## Discovery

OAuth authorization-server and protected-resource metadata are not published on this host. Requests to /.well-known/oauth-authorization-server and /.well-known/oauth-protected-resource return HTTP 404 so clients do not treat the storefront as a token server. Agent instructions are this document. The agent service publishes protected-resource metadata at https://agent.luckystore1947.com/.well-known/oauth-protected-resource.

---

## Accounts

People create accounts at /signup and sign in at /login. This host does not publish /auth/register, token exchange, or scoped agent credentials.

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