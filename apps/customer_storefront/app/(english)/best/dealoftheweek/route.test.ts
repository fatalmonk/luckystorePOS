import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  catalogError: null as null | { message: string },
  campaignError: null as null | { message: string },
  campaignRows: [] as unknown[],
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(async () => ({
      data: state.catalogError ? null : [{
        id: 'item-1', name: 'Verified Ramen', price: 150, mrp: 190, qty_on_hand: 3,
        category: 'Noodles', image_url: null,
      }],
      error: state.catalogError,
    })),
    from: vi.fn(() => {
      const query: Record<string, any> = {};
      query.select = vi.fn(() => query);
      query.eq = vi.fn(() => query);
      query.gt = vi.fn(async () => ({ data: state.campaignRows, error: state.campaignError }));
      return query;
    }),
  },
}));

import { GET } from './route';

describe('Deal of the Week route', () => {
  beforeEach(() => {
    state.catalogError = null;
    state.campaignError = null;
    state.campaignRows = [];
  });

  it('renders the indexed unranked fallback with a category link and live catalogue values', async () => {
    const response = await GET();
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('rel="canonical" href="https://www.luckystore1947.com/best/dealoftheweek"');
    expect(html).toContain('Current unranked deals');
    expect(html).toContain('Verified Ramen');
    expect(html).toContain('/category?theme=deals');
    expect(html).not.toContain('Add to Cart');
  });

  it('shows verified catalogue deals when the weekly edition lookup is unavailable', async () => {
    state.campaignError = { message: 'weekly edition unavailable' };
    const response = await GET();
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('Current unranked deals');
    expect(html).toContain('Verified Ramen');
    expect(html).toContain('৳150.00');
    expect(html).not.toContain('This week’s unranked picks');
    expect(html).not.toContain('Add to Cart');
  });

  it('returns a temporary 503 with no product or price claims when catalogue data fails', async () => {
    state.catalogError = { message: 'catalogue unavailable' };
    const response = await GET();
    const html = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(html).toContain('Deals are temporarily unavailable');
    expect(html).not.toContain('Verified Ramen');
    expect(html).not.toContain('৳');
  });
});
