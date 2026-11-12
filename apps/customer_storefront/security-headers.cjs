/**
 * Security and cache headers for every storefront response.
 *
 * Next.js `headers()` covers responses the Node server renders. Hostinger's
 * LiteSpeed serves `public/` and often `/_next/static` itself, so the same
 * values are also written to `.htaccess` and re-applied on the way out of
 * Node by `security-headers-install.cjs`.
 */

const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  {
    // Report-only on purpose. Do not add upgrade-insecure-requests here:
    // browsers ignore that directive in a report-only policy and log an error.
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://maps.googleapis.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://images.luckystore1947.com https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://*.facebook.com https://maps.gstatic.com https://maps.googleapis.com https://*.google.com https://*.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://connect.facebook.net https://www.facebook.com https://*.facebook.com https://maps.googleapis.com https://images.luckystore1947.com https://agent.luckystore1947.com https://notfair.co https://cloudflareinsights.com https://*.cloudflare.com",
      "frame-src 'self' https://www.google.com https://maps.google.com https://www.googletagmanager.com https://www.facebook.com",
    ].join('; '),
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), payment=(), usb=(), interest-cohort=(), browsing-topics=(), geolocation=(self)',
  },
];

const HASHED_STATIC_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const PUBLIC_ASSET_CACHE_CONTROL = 'public, max-age=2592000, stale-while-revalidate=86400';
const MANIFEST_CACHE_CONTROL = 'public, max-age=3600';
const PUBLIC_CATALOG_CACHE_CONTROL = 'public, max-age=0, s-maxage=120, stale-while-revalidate=600';
const PRIVATE_CACHE_CONTROL = 'private, no-store, max-age=0, must-revalidate';

function isPrivateStorefrontPath(pathname) {
  return /^\/(?:bn\/)?(?:cart|checkout|login|signup|profile|order|wishlist|account)(?:\/|$)/.test(pathname);
}

function isPublicCatalogPath(pathname) {
  if (pathname === '/' || pathname === '/bn') return true;
  return /^\/(?:bn\/)?(?:product|category|brand|blog)(?:\/|$)/.test(pathname);
}

function isHashedStaticPath(pathname) {
  return pathname.startsWith('/_next/static/');
}

function isWebManifestPath(pathname) {
  return /\.webmanifest$/i.test(pathname);
}

function isPublicAssetPath(pathname) {
  return /\.(?:webp|avif|png|jpe?g|gif|svg|ico|woff2)$/i.test(pathname);
}

function applySecurityHeaders(headers) {
  for (const header of SECURITY_HEADERS) {
    headers.set(header.key, header.value);
  }
}

function escapeHtaccessQuoted(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function renderHtaccess({ immutableDirectory = false } = {}) {
  const lines = [
    '# Keep in sync with security-headers.cjs. LiteSpeed serves static files',
    '# without passing them through Next.js header rules.',
    '<IfModule mod_headers.c>',
  ];
  for (const { key, value } of SECURITY_HEADERS) {
    lines.push(`  Header always unset ${key}`);
    lines.push(`  Header always set ${key} "${escapeHtaccessQuoted(value)}"`);
  }
  if (immutableDirectory) {
    lines.push(`  Header always set Cache-Control "${escapeHtaccessQuoted(HASHED_STATIC_CACHE_CONTROL)}"`);
  } else {
    lines.push('  SetEnvIf Request_URI "^/scripts/" lucky_versioned_script');
    lines.push(`  Header set Cache-Control "${escapeHtaccessQuoted(HASHED_STATIC_CACHE_CONTROL)}" env=lucky_versioned_script`);
    lines.push('  <FilesMatch "\\.(?:webp|avif|png|jpe?g|gif|svg|ico|woff2)$">');
    lines.push(`    Header always set Cache-Control "${escapeHtaccessQuoted(PUBLIC_ASSET_CACHE_CONTROL)}"`);
    lines.push('  </FilesMatch>');
    lines.push('  <FilesMatch "\\.webmanifest$">');
    lines.push(`    Header always set Cache-Control "${escapeHtaccessQuoted(MANIFEST_CACHE_CONTROL)}"`);
    lines.push('  </FilesMatch>');
  }
  lines.push('</IfModule>');
  lines.push('AddType application/manifest+json .webmanifest');
  lines.push('');
  return lines.join('\n');
}

module.exports = {
  SECURITY_HEADERS,
  HASHED_STATIC_CACHE_CONTROL,
  PUBLIC_ASSET_CACHE_CONTROL,
  MANIFEST_CACHE_CONTROL,
  PUBLIC_CATALOG_CACHE_CONTROL,
  PRIVATE_CACHE_CONTROL,
  isPrivateStorefrontPath,
  isPublicCatalogPath,
  isHashedStaticPath,
  isWebManifestPath,
  isPublicAssetPath,
  applySecurityHeaders,
  escapeHtaccessQuoted,
  renderHtaccess,
};
