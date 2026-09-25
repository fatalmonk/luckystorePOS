import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string; user_metadata: Record<string, string> },
  filters: [] as Array<[string, unknown]>,
  order: null as null | Record<string, unknown>,
}));

vi.mock('../../lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) } })),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const filters: Array<[string, unknown]> = [];
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((key: string, value: unknown) => {
          mocks.filters.push([key, value]);
          filters.push([key, value]);
          return builder;
        }),
        order: vi.fn(() => builder),
        limit: vi.fn(async () => ({ data: [], error: null })),
        maybeSingle: vi.fn(async () => {
          if (table === 'storefront_order_tracking') {
            const tokenHash = filters.find(([key]) => key === 'token_hash')?.[1];
            const order = mocks.order;
            return {
              data: order && order.guest_tracking_token_hash === tokenHash ? { order_id: order.id } : null,
              error: null,
            };
          }
          return {
            data: mocks.order && filters.every(([key, value]) => mocks.order?.[key] === value) ? mocks.order : null,
            error: null,
          };
        }),
      };
      return builder;
    }),
  })),
}));

import { GET } from './route';

describe('GET /api/orders', () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.filters = [];
    mocks.order = null;
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
  });

  it('does not infer order ownership from user metadata', async () => {
    mocks.user = { id: 'customer-1', user_metadata: { phone: '01712345678', full_name: 'Test Customer' } };
    const response = await GET(new NextRequest('https://store.test/api/orders'));
    expect(response.status).toBe(200);
    expect(mocks.filters).toContainEqual(['customer_user_id', 'customer-1']);
    expect(mocks.filters.some(([key]) => key === 'customer_phone' || key === 'customer_name')).toBe(false);
  });

  it('requires an exact guest tracking capability for guest order lookup', async () => {
    const token = 'ea8a43b4-42bb-49f7-a4b5-6f3b603e7b0f';
    const tokenHash = createHash('sha256').update(token).digest('hex');
    mocks.order = { id: 'order-1', order_number: 'LSO-1', guest_tracking_token_hash: tokenHash };
    const response = await GET(new NextRequest('https://store.test/api/orders?num=LSO-1', {
      headers: { 'x-order-tracking-token': token },
    }));
    expect(response.status).toBe(200);
    expect(mocks.filters).toContainEqual([
      'token_hash',
      tokenHash,
    ]);
  });

  it('returns 404 when valid-format token exists but order number does not match', async () => {
    const token = 'ea8a43b4-42bb-49f7-a4b5-6f3b603e7b0f';
    const tokenHash = createHash('sha256').update(token).digest('hex');
    mocks.order = { id: 'order-1', order_number: 'LSO-REAL', guest_tracking_token_hash: tokenHash };
    const response = await GET(new NextRequest('https://store.test/api/orders?num=LSO-OTHER', {
      headers: { 'x-order-tracking-token': token },
    }));
    expect(response.status).toBe(404);
  });

  it('returns 404 when token hashes to no tracking row', async () => {
    const token = 'ea8a43b4-42bb-49f7-a4b5-6f3b603e7b0f';
    mocks.order = null;
    const response = await GET(new NextRequest('https://store.test/api/orders?num=LSO-1', {
      headers: { 'x-order-tracking-token': token },
    }));
    expect(response.status).toBe(404);
  });

  it('allows an authenticated customer to use a guest tracking capability', async () => {
    const token = 'ea8a43b4-42bb-49f7-a4b5-6f3b603e7b0f';
    const tokenHash = createHash('sha256').update(token).digest('hex');
    mocks.user = { id: 'different-account', user_metadata: {} };
    mocks.order = { id: 'guest-order', order_number: 'LSO-2', guest_tracking_token_hash: tokenHash };

    const response = await GET(new NextRequest('https://store.test/api/orders?num=LSO-2', {
      headers: { 'x-order-tracking-token': token },
    }));

    expect(response.status).toBe(200);
    expect(mocks.filters).toContainEqual(['customer_user_id', 'different-account']);
    expect(mocks.filters).toContainEqual(['token_hash', tokenHash]);
  });

  it('rejects unauthenticated fuzzy lookup even when profile metadata exists', async () => {
    const response = await GET(new NextRequest('https://store.test/api/orders'));
    expect(response.status).toBe(401);
    expect(mocks.filters).toEqual([]);
  });
});
