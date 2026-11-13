import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('../supabase/middleware', () => ({
  updateSession: vi.fn(async () => new Response(null, { status: 200 })),
}));

import { middleware } from '../../../middleware';

describe('Markdown content negotiation', () => {
  it.each([
    ['text/markdown;charset=iso-8859-1;q=1, text/html;q=0.5', null],
    ['text/markdown;charset=iso-8859-1;q=1, text/*;q=0.8, text/html;q=0.5', 'markdown'],
    ['text/markdown;charset=utf-8;q=0.9, text/html;q=0.5', 'markdown'],
    ['text/markdown;q=0.9, text/markdown;charset=utf-8;q=0, text/html;q=0.5', null],
    ['text/markdown;q=0.2, text/markdown;q=0.9, text/html;q=0.5', 'markdown'],
    ['text/markdown;q=1.5, text/html;q=0.5', null],
  ])('negotiates parameterized Accept: %s', async (accept, negotiated) => {
    const request = new NextRequest('https://www.luckystore1947.com/', {
      headers: { accept, 'user-agent': 'Mozilla/5.0' },
    });
    const response = await middleware(request);
    expect(response.headers.get('x-lucky-negotiated')).toBe(negotiated);
  });

  it.each([
    ['*/*', 'markdown'],
    ['text/markdown;q=0, */*;q=1', null],
    ['text/html, */*', null],
  ])('handles a known AI bot with Accept: %s', async (accept, negotiated) => {
    const request = new NextRequest('https://www.luckystore1947.com/', {
      headers: { accept, 'user-agent': 'GPTBot' },
    });

    const response = await middleware(request);

    expect(response.headers.get('x-lucky-negotiated')).toBe(negotiated);
  });

  it('keeps ordinary HTML on Vary: Accept so shared cache keys stay stable', async () => {
    const request = new NextRequest('https://www.luckystore1947.com/', {
      headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0' },
    });
    const response = await middleware(request);

    expect(response.headers.get('Vary')).toBe('Accept');
    expect(response.headers.get('x-lucky-negotiated')).toBeNull();
    expect(response.headers.get('Cache-Control')).not.toContain('no-store');
  });

  it('does not store negotiated Markdown in the shared cache', async () => {
    const request = new NextRequest('https://www.luckystore1947.com/', {
      headers: { accept: 'text/markdown', 'user-agent': 'Mozilla/5.0' },
    });
    const response = await middleware(request);

    expect(response.headers.get('x-lucky-negotiated')).toBe('markdown');
    expect(response.headers.get('Vary')).toBe('Accept');
    expect(response.headers.get('Cache-Control')).toContain('private');
    expect(response.headers.get('CDN-Cache-Control')).toContain('no-store');
  });
});
