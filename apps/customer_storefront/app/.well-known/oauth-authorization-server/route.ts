import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

const SUPABASE_URL = 'https://hvmyxyccfnkrbxqbhlnm.supabase.co';
const SUPABASE_AUTH = `${SUPABASE_URL}/auth/v1`;
const STOREFRONT_URL = 'https://lucky-store-six.vercel.app';

/**
 * RFC 8414 — OAuth 2.0 Authorization Server Metadata
 * Also includes agent_auth block per auth.md spec.
 */
export async function GET() {
  const metadata = {
    issuer: SUPABASE_URL,
    authorization_endpoint: `${SUPABASE_AUTH}/authorize`,
    token_endpoint: `${SUPABASE_AUTH}/token`,
    userinfo_endpoint: `${SUPABASE_AUTH}/userinfo`,
    jwks_uri: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    registration_endpoint: `${STOREFRONT_URL}/auth/register`,
    revocation_endpoint: `${SUPABASE_AUTH}/logout`,
    end_session_endpoint: `${SUPABASE_AUTH}/logout`,
    response_types_supported: ['code', 'token'],
    grant_types_supported: [
      'authorization_code',
      'refresh_token',
      'client_credentials',
      'password'
    ],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: [
      'read:products',
      'read:orders',
      'write:orders',
      'read:profile',
      'write:profile'
    ],
    token_endpoint_auth_methods_supported: [
      'client_secret_post',
      'client_secret_basic',
      'none'
    ],
    code_challenge_methods_supported: ['S256', 'plain'],
    // auth.md agent registration extension
    agent_auth: {
      register_uri: `${STOREFRONT_URL}/auth/register`,
      supported_identity_types: ['user', 'service', 'agent'],
      supported_credential_types: ['api_key', 'oauth_client'],
      claims_endpoint: `${SUPABASE_AUTH}/userinfo`,
      revocation_uri: `${SUPABASE_AUTH}/logout`
    }
  };

  return new NextResponse(JSON.stringify(metadata, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}