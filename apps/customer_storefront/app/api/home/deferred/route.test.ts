import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { getHomePageData } = vi.hoisted(() => ({ getHomePageData: vi.fn() }));

vi.mock('../../../lib/products/getHomePageData', () => ({ getHomePageData }));
vi.mock('../../../lib/deals', () => ({
  getDealOfTheWeekProducts: vi.fn(() => null),
  getDiscountBadgePercentage: vi.fn(() => null),
  WEEKLY_DEALS_LIMIT: 48,
}));

import { GET } from './route';

describe('GET /api/home/deferred', () => {
  it('rejects an unsupported locale', async () => {
    const response = await GET(new NextRequest('https://store.test/api/home/deferred?locale=fr'));

    expect(response.status).toBe(400);
    expect(getHomePageData).not.toHaveBeenCalled();
  });

  it('returns a private 503 when homepage data fails', async () => {
    getHomePageData.mockRejectedValueOnce(new Error('catalog unavailable'));

    const response = await GET(new NextRequest('https://store.test/api/home/deferred?locale=en'));

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('returns cached shelf data for a valid locale', async () => {
    getHomePageData.mockResolvedValueOnce({
      inStock: [], pantryProducts: [], snacksProducts: [], personalCareProducts: [], weeklyPicks: [],
      weeklyEditionActive: false, weeklyEditionUnavailable: false,
    });

    const response = await GET(new NextRequest('https://store.test/api/home/deferred?locale=bn'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=120, stale-while-revalidate=600');
    expect(response.headers.get('cdn-cache-control')).toBe('public, s-maxage=120, stale-while-revalidate=600');
    expect(await response.json()).toMatchObject({ locale: 'bn', pantryProducts: [] });
  });
});
