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
 * RFC 9727 — API Catalog Discovery
 * Returns a linkset+json describing all APIs available on this site.
 */
export async function GET(req: NextRequest) {
  const BASE_URL = getBaseUrl(req);
  const catalog = {
    linkset: [
      {
        anchor: `${BASE_URL}/api/checkout`,
        'http://www.w3.org/ns/hydra#method': ['POST'],
        'https://www.iana.org/assignments/link-relations/service-desc': [
          { anchor: `${BASE_URL}/.well-known/agent-skills/checkout.md` }
        ],
        'https://www.iana.org/assignments/link-relations/service-doc': [
          { anchor: `${BASE_URL}/.well-known/agent-skills/checkout.md` }
        ],
        'https://www.iana.org/assignments/link-relations/status': [
          { anchor: `${BASE_URL}/api/health` }
        ]
      },
      {
        anchor: `${BASE_URL}/api/health`,
        'http://www.w3.org/ns/hydra#method': ['GET'],
        'https://www.iana.org/assignments/link-relations/service-desc': [
          { anchor: `${BASE_URL}/.well-known/agent-skills/browse-products.md` }
        ],
        'https://www.iana.org/assignments/link-relations/status': [
          { anchor: `${BASE_URL}/api/health` }
        ]
      },
      {
        anchor: `${BASE_URL}/api/products`,
        'http://www.w3.org/ns/hydra#method': ['GET'],
        'https://www.iana.org/assignments/link-relations/service-desc': [
          { anchor: `${BASE_URL}/.well-known/agent-skills/browse-products.md` }
        ],
        'https://www.iana.org/assignments/link-relations/service-doc': [
          { anchor: `${BASE_URL}/.well-known/agent-skills/search-products.md` }
        ],
        'https://www.iana.org/assignments/link-relations/status': [
          { anchor: `${BASE_URL}/api/health` }
        ]
      },
      {
        anchor: `${BASE_URL}/api/categories`,
        'http://www.w3.org/ns/hydra#method': ['GET'],
        'https://www.iana.org/assignments/link-relations/service-desc': [
          { anchor: `${BASE_URL}/.well-known/agent-skills/browse-products.md` }
        ],
        'https://www.iana.org/assignments/link-relations/status': [
          { anchor: `${BASE_URL}/api/health` }
        ]
      }
    ]
  };

  return new NextResponse(JSON.stringify(catalog, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/linkset+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}