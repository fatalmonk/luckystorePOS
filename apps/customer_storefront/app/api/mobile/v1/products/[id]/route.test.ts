import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('../../../../../lib/mobile/product', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../lib/mobile/product')>();
  return {
    ...actual,
    getMobileProductDetail: vi.fn().mockImplementation((id: string, locale = 'en') => {
      if (id === 'non-existent') return Promise.resolve(null);
      return Promise.resolve({
        locale,
        product: {
          id: 'p1',
          name: locale === 'bn' ? 'চাল 5 kg' : 'Rice 5kg',
          emoji: '🌾',
          price: 350,
          unit: '5 kg',
          stock: 10,
          category: locale === 'bn' ? '' : 'rice-and-grain',
          description: locale === 'bn' ? 'পর্যালোচিত বাংলা বিবরণ।' : 'Aromatic rice',
          ...(locale === 'bn' ? { translationStatus: 'published' } : {}),
        },
        related: [],
      });
    }),
  };
});

import { GET } from './route';
import { getMobileProductDetail } from '../../../../../lib/mobile/product';

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

  it('forwards Bengali locale and returns explicit publication status', async () => {
    const request = new NextRequest('https://www.luckystore1947.com/api/mobile/v1/products/p1?locale=bn');
    const response = await GET(request, { params: Promise.resolve({ id: 'p1' }) });
    const body = await response.json();

    expect(getMobileProductDetail).toHaveBeenLastCalledWith('p1', 'bn');
    expect(body.locale).toBe('bn');
    expect(body.product).toMatchObject({
      name: 'চাল 5 kg',
      description: 'পর্যালোচিত বাংলা বিবরণ।',
      translationStatus: 'published',
    });
    expect(JSON.stringify(body)).not.toContain('Rice 5kg');
  });
});
