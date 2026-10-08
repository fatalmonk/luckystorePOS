import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('../../../../../lib/mobile/product', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../lib/mobile/product')>();
  return {
    ...actual,
    getMobileProductDetail: vi.fn().mockImplementation((id: string) => {
      if (id === 'non-existent') return Promise.resolve(null);
      return Promise.resolve({
        locale: 'en',
        product: {
          id: 'p1',
          name: 'Rice 5kg',
          emoji: '🌾',
          price: 350,
          unit: '5 kg',
          stock: 10,
          category: 'rice-and-grain',
          description: 'Aromatic rice',
        },
        related: [],
      });
    }),
  };
});

import { GET } from './route';

describe('GET /api/mobile/v1/products/[id]', () => {
  it('rejects unsupported locale with 400', async () => {
    const request = new NextRequest('https://www.luckystore1947.com/api/mobile/v1/products/p1?locale=de');
    const response = await GET(request, { params: Promise.resolve({ id: 'p1' }) });
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('returns 404 when product not found', async () => {
    const request = new NextRequest('https://www.luckystore1947.com/api/mobile/v1/products/non-existent?locale=en');
    const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) });
    expect(response.status).toBe(404);
  });

  it('returns product details with 200 and Cache-Control no-store', async () => {
    const request = new NextRequest('https://www.luckystore1947.com/api/mobile/v1/products/p1?locale=en');
    const response = await GET(request, { params: Promise.resolve({ id: 'p1' }) });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = await response.json();
    expect(body.product.id).toBe('p1');
    expect(body.product.price).toBe(350);
  });
});
