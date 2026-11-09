import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

type HeaderRule = { source: string; headers: { key: string; value: string }[] };
const headers = await (nextConfig as { headers: () => Promise<HeaderRule[]> }).headers();

describe('next.config.js security headers', () => {
  it('keeps dynamic metadata in the document head for raw HTML clients', () => {
    const htmlLimitedBots = (nextConfig as { htmlLimitedBots?: RegExp }).htmlLimitedBots;

    expect(htmlLimitedBots).toBeInstanceOf(RegExp);
    expect(htmlLimitedBots?.test('Mozilla/5.0')).toBe(true);
  });

  it('returns a catch-all header rule for /(.*)', () => {
    const catchAll = headers.find((rule) => rule.source === '/(.*)');
    expect(catchAll).toBeDefined();
    expect(catchAll?.headers).toBeDefined();
  });

  it('includes X-Frame-Options: SAMEORIGIN on the catch-all rule', () => {
    const catchAll = headers.find((rule) => rule.source === '/(.*)');
    const xfo = catchAll?.headers.find((h) => h.key === 'X-Frame-Options');
    expect(xfo).toEqual({ key: 'X-Frame-Options', value: 'SAMEORIGIN' });
  });

  it('includes Referrer-Policy: strict-origin-when-cross-origin on the catch-all rule', () => {
    const catchAll = headers.find((rule) => rule.source === '/(.*)');
    const rp = catchAll?.headers.find((h) => h.key === 'Referrer-Policy');
    expect(rp).toEqual({ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' });
  });

  it('includes X-Content-Type-Options: nosniff on the catch-all rule', () => {
    const catchAll = headers.find((rule) => rule.source === '/(.*)');
    const xcto = catchAll?.headers.find((h) => h.key === 'X-Content-Type-Options');
    expect(xcto).toEqual({ key: 'X-Content-Type-Options', value: 'nosniff' });
  });
});
