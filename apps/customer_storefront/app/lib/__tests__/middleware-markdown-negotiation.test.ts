import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('../supabase/middleware', () => ({
  updateSession: vi.fn(async () => new Response(null, { status: 200 })),
}));

import { middleware } from '../../../middleware';

describe('Markdown content negotiation', () => {
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

  it('varies HTML responses by Accept and User-Agent', async () => {
    const request = new NextRequest('https://www.luckystore1947.com/', {
      headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0' },
    });
    const response = await middleware(request);

    expect(response.headers.get('Vary')).toBe('Accept, User-Agent');
  });
});
