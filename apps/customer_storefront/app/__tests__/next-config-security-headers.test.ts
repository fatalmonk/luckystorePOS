import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';
import {
  PUBLIC_CATALOG_CACHE_CONTROL,
  SECURITY_HEADERS,
  escapeHtaccessQuoted,
  renderHtaccess,
} from '../../security-headers.cjs';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type HeaderRule = { source: string; headers: { key: string; value: string }[] };
const headers = await (nextConfig as { headers: () => Promise<HeaderRule[]> }).headers();

function headerMap(rule: HeaderRule | undefined) {
  return new Map(rule?.headers.map((header) => [header.key, header.value]));
}

describe('next.config.js security headers', () => {
  it('keeps dynamic metadata in the document head for raw HTML clients', () => {
    const htmlLimitedBots = (nextConfig as { htmlLimitedBots?: RegExp }).htmlLimitedBots;

    expect(htmlLimitedBots).toBeInstanceOf(RegExp);
    expect(htmlLimitedBots?.test('Mozilla/5.0')).toBe(true);
  });

  it.each(['/:path*', '/(.*)'])('applies the full security set on %s', (source) => {
    const rule = headers.find((item) => item.source === source);
    const applied = headerMap(rule);
    for (const header of SECURITY_HEADERS) {
      expect(applied.get(header.key), header.key).toBe(header.value);
    }
    expect(applied.get('Content-Security-Policy')).toBeUndefined();
    expect(applied.get('Content-Security-Policy-Report-Only')).toContain("default-src 'self'");
    expect(applied.get('Strict-Transport-Security')).toContain('max-age=31536000');
    expect(applied.get('Strict-Transport-Security')).toContain('preload');
    expect(applied.get('Permissions-Policy')).toContain('geolocation=(self)');
  });

  it('does not advertise the storefront OAuth metadata documents that return 404', () => {
    const link = headers
      .filter((rule) => rule.source === '/:path*' || rule.source === '/(.*)')
      .flatMap((rule) => rule.headers.filter((header) => header.key === 'Link').map((header) => header.value))
      .join('\n');
    expect(link).not.toContain('</.well-known/oauth-authorization-server>');
    expect(link).not.toContain('</.well-known/oauth-protected-resource>');
    expect(link).toContain('https://agent.luckystore1947.com/.well-known/oauth-protected-resource');
  });

  it('gives static files a long immutable cache and private pages no-store', () => {
    const images = headers.find((rule) => rule.source === '/images/:path*');
    const nextStatic = headers.find((rule) => rule.source === '/_next/static/:path*');
    const cart = headers.find((rule) => rule.source === '/bn/cart');
    expect(headerMap(images).get('Cache-Control')).toBe('public, max-age=2592000, stale-while-revalidate=86400');
    expect(headerMap(nextStatic).get('Cache-Control')).toMatch(/immutable/);
    expect(headerMap(cart).get('Cache-Control')).toBe('private, no-store, max-age=0, must-revalidate');
    expect(PUBLIC_CATALOG_CACHE_CONTROL).not.toContain('no-store');
  });

  it('keeps the hashed static rule after the overlapping font and image rule', () => {
    const publicExtensionIndex = headers.findIndex((rule) => rule.source.includes('woff2'));
    const hashedStaticIndex = headers.findIndex((rule) => rule.source === '/_next/static/:path*');
    expect(publicExtensionIndex).toBeGreaterThanOrEqual(0);
    expect(hashedStaticIndex).toBeGreaterThan(publicExtensionIndex);
    expect(headerMap(headers[hashedStaticIndex]).get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  });

  it('writes the same security headers into the LiteSpeed htaccess file', () => {
    const htaccess = readFileSync(path.join(__dirname, '../../public/.htaccess'), 'utf8');
    expect(htaccess).toBe(renderHtaccess());
    expect(escapeHtaccessQuoted('say "hi" \\ path')).toBe('say \\"hi\\" \\\\ path');
    for (const header of SECURITY_HEADERS) {
      expect(htaccess).toContain(header.key);
      expect(htaccess).toContain(header.value);
    }
  });
});

describe('next.config.js CSS emission guard', () => {
  it('serves remote images directly across hosting modes', () => {
    const images = (nextConfig as { images?: { unoptimized?: boolean; loader?: string } }).images;

    expect(images?.loader).toBeUndefined();
    expect(images?.unoptimized).toBe(true);
  });

  it('does not opt into duplicated inline CSS', () => {
    const experimental = (nextConfig as { experimental?: { inlineCss?: boolean; optimizeCss?: boolean } }).experimental;

    expect(experimental?.inlineCss).not.toBe(true);
    expect(experimental?.optimizeCss).not.toBe(true);
  });
});
