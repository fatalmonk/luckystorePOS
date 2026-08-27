import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

/**
 * OAuth Protected Resource Metadata is intentionally unavailable until Lucky
 * Store has a resource-server OAuth contract that can be advertised truthfully.
 * Agent registration discovery remains available at /auth.md.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'metadata_not_available',
      error_description: 'OAuth protected resource metadata is not published by this service.',
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
