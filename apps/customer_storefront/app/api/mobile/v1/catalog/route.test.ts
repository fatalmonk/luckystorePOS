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
import { getMobileCatalog } from '../../../../lib/mobile/catalog';

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
    expect(response.headers.get('X-Correlation-ID')).toMatch(/^[0-9a-f-]{36}$/i);
    expect(response.headers.get('Server-Timing')).toMatch(/^mobile-catalog;dur=/);
    const body = await response.json();
    expect(body.locale).toBe('en');
    expect(Array.isArray(body.categories)).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
  });

  it('returns a sanitized 500 with correlation and duration headers on catalog failure', async () => {
    vi.mocked(getMobileCatalog).mockRejectedValueOnce(new Error('database credentials leaked'));
    const request = new NextRequest('https://www.luckystore1947.com/api/mobile/v1/catalog?locale=en');

    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Correlation-ID')).toMatch(/^[0-9a-f-]{36}$/i);
    expect(response.headers.get('Server-Timing')).toMatch(/^mobile-catalog;dur=/);
    await expect(response.json()).resolves.toEqual({ error: 'Catalog temporarily unavailable' });
  });
});
