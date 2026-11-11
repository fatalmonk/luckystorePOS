/**
 * Installs security headers on every Node HTTP response from this process.
 * Loaded before Next's server so static files, redirects, ISR, route handlers,
 * and rendered pages cannot leave without them.
 */
const { ServerResponse } = require('http');
const {
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
} = require('./security-headers.cjs');

function pathnameOf(res) {
  const url = res.req && res.req.url ? res.req.url : '';
  const path = url.split('?')[0] || '/';
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function hasAuthCookie(res) {
  const cookie = res.req && res.req.headers ? res.req.headers.cookie || '' : '';
  return /(?:^|;\s*)sb-[^=;]*auth-token/i.test(cookie);
}

function applyOutgoingHeaders(res, statusCode) {
  if (res.headersSent) return;
  for (const header of SECURITY_HEADERS) {
    if (!res.hasHeader(header.key)) res.setHeader(header.key, header.value);
  }
  if (process.env.NODE_ENV !== 'production') return;
  if (statusCode >= 500) return;

  const pathname = pathnameOf(res);
  if (String(res.getHeader('x-lucky-negotiated') || '') === 'markdown') {
    res.setHeader('Cache-Control', PRIVATE_CACHE_CONTROL);
    res.setHeader('CDN-Cache-Control', 'private, no-store');
    return;
  }
  const existingCache = String(res.getHeader('cache-control') || '');
  const existingCdn = String(res.getHeader('cdn-cache-control') || '');
  const authed = hasAuthCookie(res) || res.hasHeader('set-cookie');
  const markedPrivate = /(?:^|,)\s*(?:private|no-store)\b/i.test(existingCache)
    || /(?:^|,)\s*(?:private|no-store)\b/i.test(existingCdn);
  if (isPrivateStorefrontPath(pathname) || authed) {
    res.setHeader('Cache-Control', PRIVATE_CACHE_CONTROL);
    res.setHeader('CDN-Cache-Control', 'private, no-store');
    return;
  }
  if (markedPrivate) return;
  if (isHashedStaticPath(pathname)) {
    if (!existingCache) res.setHeader('Cache-Control', HASHED_STATIC_CACHE_CONTROL);
    return;
  }
  if (isWebManifestPath(pathname)) {
    if (!existingCache) res.setHeader('Cache-Control', MANIFEST_CACHE_CONTROL);
    return;
  }
  if (isPublicAssetPath(pathname)) {
    if (!existingCache) res.setHeader('Cache-Control', PUBLIC_ASSET_CACHE_CONTROL);
    return;
  }
  if (isPublicCatalogPath(pathname)) {
    res.setHeader('Cache-Control', PUBLIC_CATALOG_CACHE_CONTROL);
    res.setHeader('CDN-Cache-Control', PUBLIC_CATALOG_CACHE_CONTROL);
  }
}

function installSecurityHeaders() {
  if (ServerResponse.prototype.__luckySecurityHeaders) return;
  const originalWriteHead = ServerResponse.prototype.writeHead;
  const originalEnd = ServerResponse.prototype.end;

  ServerResponse.prototype.writeHead = function writeHeadWithSecurity(status, ...rest) {
    const code = typeof status === 'number' ? status : this.statusCode || 200;
    const headerIndex = rest.length - 1;
    const explicit = headerIndex >= 0 && rest[headerIndex] && typeof rest[headerIndex] === 'object'
      ? rest[headerIndex]
      : null;
    const protectedHeader = (key) => key === 'cache-control'
      || key === 'cdn-cache-control'
      || SECURITY_HEADERS.some((header) => header.key.toLowerCase() === key);
    if (Array.isArray(explicit)) {
      const remaining = [];
      for (let i = 0; i < explicit.length; i += 2) {
        const key = explicit[i];
        const value = explicit[i + 1];
        const lower = String(key).toLowerCase();
        if (lower === 'set-cookie' || lower === 'cache-control' || lower === 'cdn-cache-control') {
          this.setHeader(key, value);
        }
        if (!protectedHeader(lower)) remaining.push(key, value);
      }
      rest[headerIndex] = remaining;
    } else if (explicit) {
      for (const key of Object.keys(explicit)) {
        const lower = key.toLowerCase();
        if (lower === 'set-cookie' || lower === 'cache-control' || lower === 'cdn-cache-control') {
          this.setHeader(key, explicit[key]);
        }
        if (protectedHeader(lower)) {
          delete explicit[key];
        }
      }
    }
    applyOutgoingHeaders(this, code);
    return originalWriteHead.call(this, status, ...rest);
  };

  ServerResponse.prototype.end = function endWithSecurity(...args) {
    applyOutgoingHeaders(this, this.statusCode || 200);
    return originalEnd.apply(this, args);
  };

  ServerResponse.prototype.__luckySecurityHeaders = true;
}

installSecurityHeaders();

module.exports = { installSecurityHeaders, applyOutgoingHeaders };
