import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('../../../../lib/mobile/catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/mobile/catalog')>();
  return {
    ...actual,
    getMobileCatalog: vi.fn().mockResolvedValue({
      locale: 'en',
      categories: [{ id: 'c1', slug: 'rice', name: 'Rice', emoji: '🌾' }],
      items: [{ id: 'p1', name: 'Rice 1kg', emoji: '🌾', price: 100, unit: 'kg', stock: 5, category: 'rice' }],
      total: 1,
      hasMore: false,
    }),
  };
});

import { GET } from './route';

describe('GET /api/mobile/v1/catalog', () => {
  it('rejects unsupported locales with 400', async () => {
    const request = new NextRequest('https://www.luckystore1947.com/api/mobile/v1/catalog?locale=fr');
    const response = await GET(request);
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('rejects negative offset with 400', async () => {
    const request = new NextRequest('https://www.luckystore1947.com/api/mobile/v1/catalog?offset=-5');
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it('rejects invalid limit with 400', async () => {
    const request = new NextRequest('https://www.luckystore1947.com/api/mobile/v1/catalog?limit=100');
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  it('returns valid catalog payload with Cache-Control no-store', async () => {
    const request = new NextRequest('https://www.luckystore1947.com/api/mobile/v1/catalog?locale=en&limit=10');
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = await response.json();
    expect(body.locale).toBe('en');
    expect(Array.isArray(body.categories)).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
  });
});
