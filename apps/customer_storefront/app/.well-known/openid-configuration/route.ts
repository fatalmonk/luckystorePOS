import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

const SUPABASE_URL = 'https://hvmyxyccfnkrbxqbhlnm.supabase.co';
const SUPABASE_AUTH = `${SUPABASE_URL}/auth/v1`;

/**
 * OpenID Connect Discovery 1.0
 * https://openid.net/specs/openid-connect-discovery-1_0.html
 */
export async function GET() {
  const config = {
    issuer: SUPABASE_URL,
    authorization_endpoint: `${SUPABASE_AUTH}/authorize`,
    token_endpoint: `${SUPABASE_AUTH}/token`,
    userinfo_endpoint: `${SUPABASE_AUTH}/userinfo`,
    jwks_uri: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    end_session_endpoint: `${SUPABASE_AUTH}/logout`,
    response_types_supported: ['code', 'token', 'id_token'],
    grant_types_supported: [
      'authorization_code',
      'refresh_token',
      'client_credentials',
      'password'
    ],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: [
      'openid',
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
    claims_supported: [
      'sub',
      'email',
      'email_verified',
      'phone',
      'name',
      'role',
      'store_id'
    ],
    code_challenge_methods_supported: ['S256', 'plain']
  };

  return new NextResponse(JSON.stringify(config, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}