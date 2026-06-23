import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

const BASE_URL = 'https://lucky-store-six.vercel.app';

/**
 * RFC 9727 — API Catalog Discovery
 * Returns a linkset+json describing all APIs available on this site.
 */
export async function GET() {
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