import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';

describe('blog.luckystore1947.com 301 Root Redirect', () => {
  it('redirects the subdomain root to https://www.luckystore1947.com/blog with 301', async () => {
    const request = new NextRequest('https://blog.luckystore1947.com/', {
      headers: { host: 'blog.luckystore1947.com' },
    });
    const response = await middleware(request);
    expect(response?.status).toBe(301);
    expect(response?.headers.get('location')).toBe('https://www.luckystore1947.com/blog');
  });

  it('redirects article slug paths on the subdomain directly to /blog/{slug}', async () => {
    const request = new NextRequest('https://blog.luckystore1947.com/household-essential-guide', {
      headers: { host: 'blog.luckystore1947.com' },
    });
    const response = await middleware(request);
    expect(response?.status).toBe(301);
    expect(response?.headers.get('location')).toBe('https://www.luckystore1947.com/blog/household-essential-guide');
  });

  it('redirects /blog/{slug} paths on the subdomain without duplicating prefix', async () => {
    const request = new NextRequest('https://blog.luckystore1947.com/blog/household-essential-guide', {
      headers: { host: 'blog.luckystore1947.com' },
    });
    const response = await middleware(request);
    expect(response?.status).toBe(301);
    expect(response?.headers.get('location')).toBe('https://www.luckystore1947.com/blog/household-essential-guide');
  });

  it('preserves query parameters during the 301 redirect', async () => {
    const request = new NextRequest('https://blog.luckystore1947.com/?utm_source=twitter', {
      headers: { host: 'blog.luckystore1947.com' },
    });
    const response = await middleware(request);
    expect(response?.status).toBe(301);
    expect(response?.headers.get('location')).toBe('https://www.luckystore1947.com/blog?utm_source=twitter');
  });
});
