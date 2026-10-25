import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const state = vi.hoisted(() => ({
  catalogError: null as null | { message: string },
  campaignError: null as null | { message: string },
  catalogRows: [
    {
      id: 'item-1',
      name: 'Verified Ramen',
      price: 150,
      mrp: 190,
      qty_on_hand: 5,
      sellable_qty: 5,
      category: 'Noodles',
      image_url: 'https://example.com/ramen.jpg',
    },
    {
      id: 'item-2',
      name: 'Verified Soap',
      price: 80,
      mrp: 100,
      qty_on_hand: 3,
      sellable_qty: 3,
      category: 'Personal Care',
      image_url: 'https://example.com/soap.jpg',
    },
  ] as Array<Record<string, unknown>>,
  rpcCalls: [] as Array<{ name: string; args: Record<string, unknown> }>,
  campaignRows: [] as unknown[],
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      state.rpcCalls.push({ name, args });
      return {
        data: state.catalogError ? null : state.catalogRows,
        error: state.catalogError,
      };
    }),
    from: vi.fn(() => {
      const query: Record<string, any> = {};
      query.select = vi.fn(() => query);
      query.eq = vi.fn(() => query);
      query.gt = vi.fn(async () => ({ data: state.campaignRows, error: state.campaignError }));
      return query;
    }),
  },
}));

vi.mock('../../../hooks/useProductCart', () => ({
  useProductCart: (product: any) => ({
    quantity: 0,
    canAdd: product.stock > 0,
    add: vi.fn(),
    increment: vi.fn(),
    decrement: vi.fn(),
    announcement: '',
  }),
}));

vi.mock('../../../hooks/useProductWishlist', () => ({
  useProductWishlist: () => ({
    isWishlisted: false,
    isPending: false,
    toggle: vi.fn(),
  }),
}));

import DealOfTheWeekPage, { generateMetadata } from './page';

describe('Deal of the Week page', () => {
  beforeEach(() => {
    state.catalogError = null;
    state.campaignError = null;
    state.catalogRows = [
      {
        id: 'item-1',
        name: 'Verified Ramen',
        price: 150,
        mrp: 190,
        qty_on_hand: 5,
        sellable_qty: 5,
        category: 'Noodles',
        image_url: 'https://example.com/ramen.jpg',
      },
      {
        id: 'item-2',
        name: 'Verified Soap',
        price: 80,
        mrp: 100,
        qty_on_hand: 3,
        sellable_qty: 3,
        category: 'Personal Care',
        image_url: 'https://example.com/soap.jpg',
      },
    ];
    state.rpcCalls = [];
    state.campaignRows = [];
  });

  it('generates correct SEO metadata and canonical URL', async () => {
    const metadata = await generateMetadata();
    const title = typeof metadata.title === 'string' ? metadata.title : metadata.title?.absolute || '';
    expect(title).toContain('Deal of the Week');
    expect(metadata.alternates?.canonical).toBe('https://www.luckystore1947.com/best/dealoftheweek');
    expect(metadata.openGraph?.siteName).toBe('Lucky Store');
  });

  it('renders the fallback deal grid when no campaign is active with direct Add to Cart buttons', async () => {
    const Page = await DealOfTheWeekPage();
    render(Page);

    // H1 exists and mentions Deal of the Week
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Deal of the Week/i);

    // Product cards are rendered with interactive Add to Cart buttons
    expect(screen.getByText('Verified Ramen')).toBeInTheDocument();
    expect(screen.getByText('Verified Soap')).toBeInTheDocument();

    const addToCartButtons = screen.getAllByRole('button', { name: /Add to Cart/i });
    expect(addToCartButtons.length).toBeGreaterThanOrEqual(2);

    // Check bounded RPC call
    expect(state.rpcCalls.map((c) => c.name)).toContain('get_storefront_deals');
  });

  it('generates JSON-LD schema with stock-derived availability and valid promotion pricing', async () => {
    const { container } = render(await DealOfTheWeekPage());
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBe(2);

    const collectionLd = JSON.parse(scripts[1].textContent || '{}');
    expect(collectionLd['@type']).toBe('CollectionPage');
    expect(collectionLd.mainEntity['@type']).toBe('ItemList');

    const firstItem = collectionLd.mainEntity.itemListElement[0];
    expect(firstItem.item.name).toBe('Verified Ramen');
    expect(firstItem.item.offers.availability).toBe('https://schema.org/InStock');
    expect(firstItem.item.offers.price).toBe(150);
  });

  it('renders accessible category filter buttons with role="group" and aria-pressed', async () => {
    const Page = await DealOfTheWeekPage();
    render(Page);

    const filterGroup = screen.getByRole('group', { name: /Filter deals by category/i });
    expect(filterGroup).toBeInTheDocument();

    const allButton = screen.getByRole('button', { name: /All Deals/i });
    expect(allButton).toHaveAttribute('aria-pressed', 'true');

    const noodlesButton = screen.getByRole('button', { name: /Noodles/i });
    expect(noodlesButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('degrades to catalogue deals when campaign has fewer than MIN_CAMPAIGN_ELIGIBLE_PRODUCTS', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T12:00:00.000Z'));

    // 12 campaign rows exist, but only 3 resolve to valid products in catalogue
    state.campaignRows = Array.from({ length: 12 }, (_, index) => ({
      item_id: `campaign-item-${index}`,
      expected_name: `Campaign item ${index}`,
      expected_price: 90,
      expected_mrp: 100,
      discount_percent: 5,
      starts_at: '2026-10-18T18:00:00.000Z',
      ends_at: '2026-10-25T18:00:00.000Z',
      campaign_key: 'dealoftheweek-2026-10-19',
      is_current: true,
      selection_reason: `Reason ${index}`,
      offer_terms: 'Online checkout only; valid this week.',
      evidence_source: 'Catalogue snapshot',
      evidence_checked_at: '2026-10-15T15:52:22.000Z',
    }));

    // Catalogue only has 3 items matching (fewer than threshold of 8)
    state.catalogRows = [
      {
        id: 'campaign-item-0',
        name: 'Campaign item 0',
        price: 90,
        mrp: 100,
        qty_on_hand: 5,
        sellable_qty: 5,
        category: 'Grocery',
      },
      {
        id: 'campaign-item-1',
        name: 'Campaign item 1',
        price: 90,
        mrp: 100,
        qty_on_hand: 5,
        sellable_qty: 5,
        category: 'Grocery',
      },
      {
        id: 'campaign-item-2',
        name: 'Campaign item 2',
        price: 90,
        mrp: 100,
        qty_on_hand: 5,
        sellable_qty: 5,
        category: 'Grocery',
      },
    ];

    const Page = await DealOfTheWeekPage();
    render(Page);

    // Should NOT show Weekly Value Edition badge because it degraded
    expect(screen.queryByText(/Weekly Value Edition/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Verified Store Deals/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('hides products with no sellable stock even when physical on-hand quantity is positive', async () => {
    state.catalogRows[1] = { ...state.catalogRows[1], qty_on_hand: 8, sellable_qty: 0 };

    const Page = await DealOfTheWeekPage();
    render(Page);

    expect(screen.getByText('Verified Ramen')).toBeInTheDocument();
    expect(screen.queryByText('Verified Soap')).not.toBeInTheDocument();
  });

  it('renders approved weekly campaign edition when campaign criteria are met', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-19T12:00:00.000Z'));

    state.catalogRows = Array.from({ length: 12 }, (_, index) => ({
      id: `weekly-${index}`,
      name: `Weekly item ${index}`,
      price: 90,
      mrp: 100,
      qty_on_hand: 5,
      sellable_qty: 5,
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

    const Page = await DealOfTheWeekPage();
    render(Page);

    expect(screen.getByText('Weekly item 0')).toBeInTheDocument();
    expect(screen.getByText(/Weekly Value Edition/i)).toBeInTheDocument();
    expect(screen.getByText(/19 October 2026–25 October 2026/i)).toBeInTheDocument();

    // Verify targeted RPC call with item_ids was used
    expect(state.rpcCalls.map((c) => c.name)).toContain('search_storefront_catalog_v2');

    vi.useRealTimers();
  });

  it('renders error state safely when catalogue fails', async () => {
    state.catalogError = { message: 'catalogue unavailable' };

    const Page = await DealOfTheWeekPage();
    render(Page);

    expect(screen.getByText(/Some product updates may be delayed/i)).toBeInTheDocument();
  });
});
