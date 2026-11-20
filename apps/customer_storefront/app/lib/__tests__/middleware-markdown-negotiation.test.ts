import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('../supabase/middleware', () => ({
  updateSession: vi.fn(async () => new Response(null, { status: 200 })),
}));

import { middleware } from '../../../middleware';
import { GET as getMarkdown } from '../../api/markdown/route';

const BASE = 'https://www.luckystore1947.com/';

async function negotiate(accept: string, userAgent = 'Mozilla/5.0', cookie?: string) {
  const headers = new Headers({ Accept: accept, 'User-Agent': userAgent });
  if (cookie) headers.set('Cookie', cookie);
  return middleware(new NextRequest(BASE, { headers }));
}

const isPrivate = (response: Response) =>
  /(?:^|,)\s*(?:private|no-store)\b/i.test(response.headers.get('Cache-Control') ?? '') ||
  /(?:^|,)\s*(?:private|no-store)\b/i.test(response.headers.get('CDN-Cache-Control') ?? '');

describe('Markdown content negotiation is exact Accept-only', () => {
  it.each([
    ['browser wildcard', '*/*', 'Mozilla/5.0', false],
    ['GPTBot wildcard', '*/*', 'GPTBot', false],
    ['ClaudeBot wildcard', '*/*', 'ClaudeBot', false],
    ['browser markdown', 'text/markdown', 'Mozilla/5.0', true],
    ['GPTBot markdown', 'text/markdown', 'GPTBot', true],
    ['ClaudeBot markdown', 'text/markdown', 'ClaudeBot', true],
    ['text wildcard', 'text/*', 'GPTBot', false],
    ['markdown q zero', 'text/markdown;q=0, */*;q=1', 'GPTBot', false],
    ['HTML quality preferred', 'text/markdown;q=0.3, text/html;q=0.9', 'GPTBot', false],
    ['markdown quality preferred', 'text/markdown;q=0.9, text/html;q=0.5', 'Mozilla/5.0', true],
    ['equal explicit HTML/markdown quality', 'text/markdown;q=0.8, text/html;q=0.8', 'ClaudeBot', false],
    ['unsupported charset alone', 'text/markdown;charset=iso-8859-1;q=1, text/html;q=0.5', 'GPTBot', false],
    ['unsupported charset with text wildcard', 'text/markdown;charset=iso-8859-1;q=1, text/*;q=0.8, text/html;q=0.5', 'GPTBot', false],
    ['supported charset', 'text/markdown;charset=utf-8;q=0.9, text/html;q=0.5', 'Mozilla/5.0', true],
    ['parameter precedence overrides unparameterized range', 'text/markdown;q=0.9, text/markdown;charset=utf-8;q=0, text/html;q=0.5', 'GPTBot', false],
    ['multiple ranges highest quality', 'text/markdown;q=0.2, text/markdown;q=0.9, text/html;q=0.5', 'Mozilla/5.0', true],
    ['uppercase text/markdown', 'TEXT/MARKDOWN', 'Mozilla/5.0', true],
    ['invalid q', 'text/markdown;q=1.5, text/html;q=0.5', 'GPTBot', false],
    ['explicit HTML', 'text/html', 'GPTBot', false],
  ])('%s', async (_, accept, userAgent, markdown) => {
    const response = await negotiate(accept, userAgent);
    expect(response.headers.get('x-lucky-negotiated')).toBe(markdown ? 'markdown' : null);
    expect(response.headers.get('Vary')).toBe('Accept');
    expect(response.headers.get('Cache-Control')).toBeTruthy();
    if (markdown) {
      expect(response.headers.get('Cache-Control')).toContain('private');
      expect(response.headers.get('Cache-Control')).toContain('no-store');
      expect(response.headers.get('CDN-Cache-Control')).toContain('no-store');
    }
  });

  it('keeps authenticated HTML private and no-store', async () => {
    const response = await negotiate('*/*', 'Mozilla/5.0', 'sb-test-auth-token=placeholder');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0, must-revalidate');
    expect(response.headers.get('CDN-Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('x-lucky-negotiated')).toBeNull();
  });

  it('does not weaken authenticated cache protection for explicit Markdown', async () => {
    const response = await negotiate('text/markdown', 'GPTBot', 'sb-test-auth-token=placeholder');
    expect(response.headers.get('x-lucky-negotiated')).toBe('markdown');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0, must-revalidate');
    expect(response.headers.get('CDN-Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Vary')).toBe('Accept');
  });
});

/**
 * Application-level simulation of an HTTP shared cache, not evidence of actual
 * Cloudflare Cache Rules, CDN behavior or its cache-key implementation.
 *
 * The effective Vary: Accept representation is keyed by the request's Accept
 * value. Private/no-store responses are never inserted.
 */
class SimulatedSharedCache {
  private entries = new Map<string, Response>();
  originInvocations = 0;
  hits = 0;

  private key(url: string, accept: string, vary: string | null): string {
    const effectiveVary = (vary ?? '').toLowerCase().split(',').map((s) => s.trim());
    return JSON.stringify([url, effectiveVary.includes('accept') ? accept : '']);
  }

  async request(accept: string, userAgent: string): Promise<Response> {
    const url = BASE;
    // Negotiate Vary with a stored candidate by URL; this deliberately models
    // only Vary: Accept and never assumes any Cloudflare-specific cache logic.
    const match = [...this.entries.entries()].find(([key]) => {
      const [storedUrl, storedAccept] = JSON.parse(key) as [string, string];
      return storedUrl === url && storedAccept === accept;
    });
    if (match) {
      this.hits++;
      return match[1].clone();
    }

    this.originInvocations++;
    const response = await negotiate(accept, userAgent);
    if (!isPrivate(response)) {
      const key = this.key(url, accept, response.headers.get('Vary'));
      this.entries.set(key, response.clone());
    }
    return response;
  }

  get storedCount() {
    return this.entries.size;
  }
}

describe('application-level cache simulation (not Cloudflare verification)', () => {
  it.each([
    ['browser then GPTBot', 'Mozilla/5.0', 'GPTBot'],
    ['GPTBot then browser', 'GPTBot', 'Mozilla/5.0'],
  ])('%s reuses one public HTML representation for wildcard requests', async (_, first, second) => {
    const cache = new SimulatedSharedCache();
    const a = await cache.request('*/*', first);
    const b = await cache.request('*/*', second);
    expect(a.headers.get('x-lucky-negotiated')).toBeNull();
    expect(b.headers.get('x-lucky-negotiated')).toBeNull();
    expect(a.headers.get('Vary')).toBe('Accept');
    expect(b.headers.get('Vary')).toBe('Accept');
    expect(cache.originInvocations).toBe(1);
    expect(cache.hits).toBe(1);
    expect(cache.storedCount).toBe(1);
  });

  it('does not store explicit Markdown or let it share an HTML cache entry', async () => {
    const cache = new SimulatedSharedCache();
    const html = await cache.request('*/*', 'Mozilla/5.0');
    const markdown = await cache.request('text/markdown', 'GPTBot');
    const markdownAgain = await cache.request('text/markdown', 'GPTBot');
    const htmlAgain = await cache.request('*/*', 'GPTBot');

    expect(html.headers.get('x-lucky-negotiated')).toBeNull();
    expect(markdown.headers.get('x-lucky-negotiated')).toBe('markdown');
    expect(markdownAgain.headers.get('x-lucky-negotiated')).toBe('markdown');
    expect(htmlAgain.headers.get('x-lucky-negotiated')).toBeNull();
    expect(cache.originInvocations).toBe(3);
    expect(cache.hits).toBe(1);
    expect(cache.storedCount).toBe(1);
  });

  it('keeps private Markdown separate when an explicit HTML entry is already cached', async () => {
    const cache = new SimulatedSharedCache();
    await cache.request('text/html', 'Mozilla/5.0');
    const markdown = await cache.request('text/markdown', 'ClaudeBot');
    expect(markdown.headers.get('x-lucky-negotiated')).toBe('markdown');
    expect(cache.originInvocations).toBe(2);
    expect(cache.storedCount).toBe(1);
  });
});

describe('Markdown API endpoint cache controls', () => {
  it('returns a non-cacheable Markdown representation for a direct request', async () => {
    // Delivery representation uses fixed policy data, avoiding product lookups.
    const request = new NextRequest('https://www.luckystore1947.com/api/markdown?path=/delivery', {
      headers: { accept: 'text/markdown' },
    });
    const response = await getMarkdown(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toContain('private');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('CDN-Cache-Control')).toContain('no-store');
    expect(response.headers.get('Vary')).toBe('Accept');
  });
});
