import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '../types';
import { getHomePageData, type HomePageData } from '../products/getHomePageData';

vi.mock('../../components/HomeShell', () => ({ HomeShell: () => null }));
vi.mock('../../components/updated/Header', () => ({ Header: () => null }));
vi.mock('../products/getHomePageData', () => ({
  getHomePageData: vi.fn(),
}));

import Home from '../../(english)/page';
import { BengaliHomeContent } from '../../(bengali)/bn/page';

function product(name: string, id: string, price: number): Product {
  return {
    id,
    name,
    emoji: '🛒',
    price,
    unit: 'pc',
    category: 'Snacks',
    stock: 4,
    description: 'Featured product',
  };
}

function pageData(partial: Partial<HomePageData>): HomePageData {
  return {
    inStock: [],
    weeklyPicks: [],
    weeklyEditionActive: false,
    weeklyEditionUnavailable: false,
    categories: [],
    dealsProducts: [],
    morningProducts: [],
    pantryProducts: [],
    featuredProducts: [],
    campaignProducts: [],
    freshProducts: [],
    personalCareProducts: [],
    nestleProducts: [],
    snacksProducts: [],
    ...partial,
  };
}

function itemLists(container: HTMLElement) {
  return [...container.querySelectorAll('script[type="application/ld+json"]')]
    .map((node) => JSON.parse(node.textContent || '{}') as { '@type'?: string })
    .filter((schema) => schema['@type'] === 'ItemList');
}

const featured = [
  product('Diploma Milk Powder', '95c86e99-1111-2222-3333-444455556666', 120),
  product('Missing price', 'aaaaaaaa-1111-2222-3333-444455556666', Number.NaN),
  product('Zero price', 'bbbbbbbb-1111-2222-3333-444455556666', 0),
];

describe('homepage featured product structured data', () => {
  it('publishes priced English product URLs and omits snapshot offers', async () => {
    vi.mocked(getHomePageData).mockResolvedValue(pageData({ featuredProducts: featured }));
    const { container } = render(await Home());
    const list = itemLists(container)[0] as {
      name: string;
      itemListElement: Array<{ position: number; item: { name: string; url: string; offers?: { priceCurrency: string; price: number; availability?: string } } }>;
    };

    expect(list.name).toBe('Featured groceries at Lucky Store');
    expect(list.itemListElement).toHaveLength(1);
    expect(list.itemListElement[0]).toMatchObject({
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'Product',
        name: 'Diploma Milk Powder',
        url: 'https://www.luckystore1947.com/product/diploma-milk-powder--95c86e99',
        offers: { '@type': 'Offer', priceCurrency: 'BDT', price: 120 },
      },
    });
    expect(list.itemListElement[0].item.offers).not.toHaveProperty('availability');

    vi.mocked(getHomePageData).mockResolvedValue(pageData({
      catalogSnapshotFallback: true,
      featuredProducts: featured,
    }));
    const snapshot = render(await Home());
    const snapshotList = itemLists(snapshot.container)[0] as {
      itemListElement: Array<{ item: { offers?: unknown } }>;
    };
    expect(snapshotList.itemListElement[0].item.offers).toBeUndefined();
  });

  it('publishes the Bengali list with a localized product URL and BDT price', async () => {
    vi.mocked(getHomePageData).mockResolvedValue(pageData({ featuredProducts: featured }));
    const { container } = render(await BengaliHomeContent());
    const list = itemLists(container)[0] as {
      name: string;
      itemListElement: Array<{ item: { url: string; offers: { priceCurrency: string; price: number } } }>;
    };
    expect(list.name).toBe('লাকি স্টোরের জনপ্রিয় পণ্যসমূহ');
    expect(list.itemListElement[0].item.url).toBe(
      'https://www.luckystore1947.com/bn/product/diploma-milk-powder--95c86e99',
    );
    expect(list.itemListElement[0].item.offers).toEqual({
      '@type': 'Offer',
      priceCurrency: 'BDT',
      price: 120,
    });
    expect(getHomePageData).toHaveBeenCalledWith('bn');
  });
});
