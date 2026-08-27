import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

const AUTH_MD = `# auth.md

This document is for agents that need to understand how a person registers for
and signs in to Lucky Store.

## Registration

- Registration URI: https://luckystore1947.com/signup
- Method: interactive verified-email registration
- Required information: full name, WhatsApp number, email address, and password
- Email confirmation may be required before the account can be used.

Registration is an interactive, user-controlled flow. Lucky Store does not
currently offer autonomous agent registration, dynamic OAuth client
registration, ID-JAG, verified-email assertion, anonymous agent identity, or
API-key provisioning. Agents must not submit the registration form without the
user's explicit participation.

## Sign-in and credential use

- Sign-in URI: https://luckystore1947.com/login
- Method: email and password

Successful sign-in creates a user session managed by Lucky Store's authentication
provider. Credentials are for the registered user and must only be used with that
user's authorization. Do not place passwords, session tokens, or refresh tokens
in URLs, logs, or discovery requests. Send bearer access tokens only in the
\`Authorization: Bearer <token>\` request header when calling an endpoint that
explicitly documents bearer authentication.

## OAuth discovery status

Lucky Store does not currently publish Auth.md agent-registration OAuth
metadata. In particular, it does not advertise an authorization server or an
\`agent_auth\` registration block until the corresponding registration and
credential lifecycle endpoints are implemented.

Discovery requests are passive. Do not probe registration endpoints with POST
requests because registration can create an account and send email.
`;

export async function GET() {
  return new NextResponse(AUTH_MD, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
