import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

const STOREFRONT_URL = 'https://lucky-store-six.vercel.app';
const SUPABASE_URL = 'https://hvmyxyccfnkrbxqbhlnm.supabase.co';

/**
 * RFC 9728 — OAuth Protected Resource Metadata
 * Tells agents how to obtain access tokens for this resource.
 */
export async function GET() {
  const metadata = {
    resource: STOREFRONT_URL,
    authorization_servers: [SUPABASE_URL],
    bearer_methods_supported: ['header'],
    scopes_supported: [
      'read:products',
      'read:orders',
      'write:orders',
      'read:profile',
      'write:profile'
    ],
    resource_documentation: `${STOREFRONT_URL}/.well-known/agent-skills/index.json`
  };

  return new NextResponse(JSON.stringify(metadata, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}