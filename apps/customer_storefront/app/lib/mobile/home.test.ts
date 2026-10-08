import { describe, expect, it } from 'vitest';

import { FALLBACK_PRODUCTS, type HomePageData } from '../products/getHomePageData';
import { toMobileHome } from './home';

function fixture(product = { id: 'p1', name: 'Rice', emoji: '🌾', price: 100, unit: '1 kg', category: 'rice', stock: 4, description: '', cost: 60 }) {
  return {
    inStock: [product], categories: [{ id: 'c1', slug: 'rice', name: 'Rice', emoji: '🌾' }],
    dealsProducts: [product], morningProducts: [product], pantryProducts: [product], featuredProducts: [product], campaignProducts: [], freshProducts: [product], personalCareProducts: [], nestleProducts: [], snacksProducts: [product],
  } as unknown as HomePageData;
}

describe('toMobileHome', () => {
  it('returns a bounded public allowlist with localized section titles', () => {
    const dto = toMobileHome(fixture(), 'bn');
    expect(dto.locale).toBe('bn');
    expect(dto.sections[0].title).toBe('দ্রুত বাছাই');
    expect(dto.sections[0].products[0]).not.toHaveProperty('cost');
    expect(dto.sections[0].products[0]).toEqual(expect.objectContaining({ id: 'p1', stock: 4 }));
  });

  it('hides fallback products from ordering when the catalogue is degraded', () => {
    const dto = toMobileHome(fixture(FALLBACK_PRODUCTS[0] as never), 'en');
    expect(dto.degraded).toBe(true);
    expect(dto.sections).toEqual([]);
  });
});
