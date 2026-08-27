import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

/**
 * Lucky Store is not an OAuth authorization server. Returning a non-success
 * response prevents clients from treating storefront URLs as token, agent
 * registration, claim, or revocation endpoints.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'metadata_not_available',
      error_description: 'OAuth authorization server metadata is not published by this service.',
      auth_md: 'https://luckystore1947.com/auth.md',
    },
    {
      status: 404,
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
