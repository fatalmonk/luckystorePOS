// src/cors.ts
// CORS strategy per Phase 3

// Discovery routes → Access-Control-Allow-Origin: *
export function publicCorsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

// Data routes (/api/*) → strict whitelist
const ALLOWED_ORIGINS = [
  'https://lucky-store-bd.vercel.app',       // customer storefront (Vercel)
  'https://luckystore1947.com',              // customer storefront (custom domain)
  'https://lucky-store-pos-six.vercel.app',  // admin web portal
  'http://localhost:5173',                   // local dev (admin_web)
  'http://localhost:3000',                   // local dev (storefront)
];

export function getDataCorsHeaders(origin: string): HeadersInit {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-request-id',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
  };
}