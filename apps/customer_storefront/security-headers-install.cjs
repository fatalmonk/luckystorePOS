/**
 * Installs security headers on every Node HTTP response from this process.
 * Loaded before Next's server so static files, redirects, ISR, route handlers,
 * and rendered pages cannot leave without them.
 */
const { ServerResponse } = require('http');
const {
  SECURITY_HEADERS,
  STATIC_CACHE_CONTROL,
  PUBLIC_CATALOG_CACHE_CONTROL,
  PRIVATE_CACHE_CONTROL,
  isPrivateStorefrontPath,
  isPublicCatalogPath,
  isStaticAssetPath,
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

function applyOutgoingHeaders(res, statusCode) {
  if (res.headersSent) return;
  for (const header of SECURITY_HEADERS) {
    if (!res.hasHeader(header.key)) res.setHeader(header.key, header.value);
  }
  if (process.env.NODE_ENV !== 'production') return;
  if (statusCode >= 500) return;

  const pathname = pathnameOf(res);
  if (isPrivateStorefrontPath(pathname)) {
    res.setHeader('Cache-Control', PRIVATE_CACHE_CONTROL);
    res.setHeader('CDN-Cache-Control', 'private, no-store');
    return;
  }
  if (isStaticAssetPath(pathname)) {
    if (!res.getHeader('cache-control')) res.setHeader('Cache-Control', STATIC_CACHE_CONTROL);
    return;
  }
  if (isPublicCatalogPath(pathname) && !res.hasHeader('set-cookie')) {
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
