import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  catalogError: null as null | { message: string },
  campaignError: null as null | { message: string },
  catalogRows: [
    { id: 'item-1', name: 'Verified Ramen', price: 150, mrp: 190, qty_on_hand: 3, category: 'Noodles', image_url: null },
    { id: 'item-2', name: 'Verified Soap', price: 80, mrp: 100, qty_on_hand: 2, category: 'Personal Care', image_url: null },
  ] as Array<Record<string, unknown>>,
  campaignRows: [] as unknown[],
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(async () => ({
      data: state.catalogError ? null : state.catalogRows,
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
    state.catalogRows = [
      { id: 'item-1', name: 'Verified Ramen', price: 150, mrp: 190, qty_on_hand: 3, category: 'Noodles', image_url: null },
      { id: 'item-2', name: 'Verified Soap', price: 80, mrp: 100, qty_on_hand: 2, category: 'Personal Care', image_url: null },
    ];
    state.campaignRows = [];
  });

  it('renders the indexed all-store fallback as one concise, unranked product grid', async () => {
    const response = await GET();
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('rel="canonical" href="https://www.luckystore1947.com/best/dealoftheweek"');
    expect(html).toContain('Current unranked store deals');
    expect(html).toContain('<title>Deal of the Week: Current Store Offers | Lucky Store</title>');
    expect(html).toContain('offers across Lucky Store products');
    expect(html).not.toContain('Browse by category');
    expect(html).not.toContain('class="deal-category"');
    expect(html.match(/class="grid"/g)).toHaveLength(1);
    expect(html).not.toContain('class="trust-panel"');
    expect(html).not.toContain('class="checked-note"');
    expect(html).not.toContain('class="hero-aside"');
    expect(html).not.toContain('class="category"');
    expect(html).not.toContain('class="editorial-note"');
    expect(html).toContain('Verified Ramen');
    expect(html).not.toContain('% off MRP');
    expect(html).not.toContain('<del class="mrp">');
    expect(html).toContain('/category?theme=deals');
    expect(html).not.toContain('Add to Cart');
  });

  it('shows live fallback deals even when their MRP comparison is below ten percent', async () => {
    const response = await GET();
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('Verified Ramen');
    expect(html).not.toContain('% off MRP');
  });

  it('shows verified catalogue deals when the weekly edition lookup is unavailable', async () => {
    state.campaignError = { message: 'weekly edition unavailable' };
    const response = await GET();
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('Current unranked store deals');
    expect(html).not.toContain('% off MRP');
    expect(html).toContain('Verified Ramen');
    expect(html).toContain('class="price">৳150</strong>');
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

  it('renders the approved weekly edition with its catalogue-backed dates and verified comparison prices', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T12:00:00.000Z'));
    state.catalogRows = Array.from({ length: 12 }, (_, index) => ({
      id: `weekly-${index}`,
      name: `Weekly product ${index}`,
      price: 90,
      mrp: 100,
      qty_on_hand: 5,
      category: index % 2 ? 'Grocery' : 'Household',
      image_url: null,
    }));
    state.campaignRows = state.catalogRows.map((product, index) => ({
      item_id: product.id,
      expected_name: product.name,
      expected_price: product.price,
      expected_mrp: product.mrp,
      discount_percent: 5,
      starts_at: '2026-10-18T18:00:00.000Z',
      ends_at: '2026-10-25T18:00:00.000Z',
      campaign_key: 'dealoftheweek-2026-10-19',
      is_current: true,
      selection_reason: `Editor reason ${index}`,
      offer_terms: 'Online checkout only; valid this week.',
      evidence_source: 'Verified catalogue snapshot',
      evidence_checked_at: '2026-10-15T15:52:22.000Z',
    }));

    const response = await GET();
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('19 October 2026–25 October 2026 (Asia/Dhaka)');
    expect(html).toContain('10% below verified MRP');
    expect(html).toContain('Extra 5% off this week');
    expect(html).toContain('class="editorial-note"');
    expect(html).toContain('href="/best/editorial"');
    expect(html).toContain('Selected and sold by Lucky Store');
    expect(html).not.toContain('Browse by category');
    vi.useRealTimers();
  });
});
