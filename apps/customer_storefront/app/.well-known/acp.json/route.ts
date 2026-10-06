import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = new Set([
  'www.luckystore1947.com',
  'luckystore1947.com',
  'next.luckystore1947.com',
  'localhost:3000',
  '127.0.0.1:3000',
]);

function getBaseUrl(req: NextRequest): string {
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (forwardedHost && ALLOWED_HOSTS.has(forwardedHost)) {
    return `https://${forwardedHost}`;
  }
  return process.env.SITE_URL || 'https://www.luckystore1947.com';
}

/**
 * Agentic Commerce Protocol (ACP) Discovery Document
 * https://agenticcommerce.dev
 *
 * Requirements:
 * - Serve JSON at /.well-known/acp.json with HTTP 200
 * - Include protocol.name set to "acp" and protocol.version
 * - Include api_base_url as an absolute HTTP(S) URL
 * - Include transports as a non-empty array of supported transport types
 * - Include capabilities.services as a non-empty array of offered services
 */
export async function GET(req: NextRequest) {
  const BASE_URL = getBaseUrl(req);
  const acpDiscovery = {
    protocol: {
      name: 'acp',
      version: '1.0.0',
    },
    api_base_url: `${BASE_URL}/api`,
    transports: ['http-rest', 'sse'],
    capabilities: {
      services: ['catalog', 'cart', 'checkout', 'search', 'orders'],
      streaming: true,
      auth_types_supported: ['bearer', 'api_key', 'anonymous'],
    },
    endpoints: {
      products: `${BASE_URL}/api/products`,
      categories: `${BASE_URL}/api/categories`,
      search: `${BASE_URL}/api/products`,
      checkout: `${BASE_URL}/api/checkout`,
      orders: `${BASE_URL}/api/orders`,
      health: `${BASE_URL}/api/health`,
    },
    documentation: `${BASE_URL}/.well-known/agent-skills/index.json`,
  };

  return new NextResponse(JSON.stringify(acpDiscovery, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
