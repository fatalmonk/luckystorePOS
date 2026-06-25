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
const PROD_ALLOWED_ORIGINS = [
  'https://lucky-store-bd.vercel.app',       // customer storefront (Vercel)
  'https://luckystore1947.com',              // customer storefront (custom domain)
  'https://lucky-store-pos-six.vercel.app',  // admin web portal
  'https://admin.luckystore1947.com',        // admin custom domain
];

const DEV_ALLOWED_ORIGINS = [
  ...PROD_ALLOWED_ORIGINS,
  'http://localhost:5173',                   // local dev (admin_web)
  'http://localhost:3000',                   // local dev (storefront)
];

export function getDataCorsHeaders(origin: string, isProd = false): HeadersInit {
  const allowedOrigins = isProd ? PROD_ALLOWED_ORIGINS : DEV_ALLOWED_ORIGINS;
  const allowed = allowedOrigins.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-request-id',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
  };
}