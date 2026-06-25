// src/headers.ts
// Security headers per Phase 6

export function applySecurityHeaders(headers: Headers): void {
  // CSP for modern web standards
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'interest-cohort=()');
  
  // HSTS preload (only for HTTPS)
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}