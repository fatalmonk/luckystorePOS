import { describe, it, expect, vi } from 'vitest';
import sitemap, { isProductSitemapEligible } from '../sitemap';

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({
      data: [
        {
          id: '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
          name: 'Fresh Milk 1L',
          price: 90,
          is_active: true,
          updated_at: '2026-09-20T10:00:00Z',
        },
        {
          id: '5bcf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
          name: 'Inactive Item',
          price: 100,
          is_active: false,
        },
        {
          id: '6ccf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
          name: 'Zero Price Item',
          price: 0,
          is_active: true,
        },
      ],
      error: null,
    }),
  },
}));

vi.mock('../lib/products/getCachedCategories', () => ({
  getCachedCategories: vi.fn().mockResolvedValue([
    { id: 'cat-1', name: 'Dairy & Eggs', slug: 'dairy-and-eggs' },
    { id: 'cat-2', name: 'Dairy & Eggs', slug: 'dairy-and-eggs' }, // Duplicate slug
  ]),
}));

describe('sitemap', () => {
  it('correctly filters product sitemap eligibility', () => {
    expect(isProductSitemapEligible({ id: '1', name: 'Milk', price: 90, is_active: true })).toBe(true);
    expect(isProductSitemapEligible({ id: '2', name: 'Milk', price: 90, is_active: false })).toBe(false);
    expect(isProductSitemapEligible({ id: '3', name: 'Milk', price: 0, is_active: true })).toBe(false);
    expect(isProductSitemapEligible({ id: '', name: 'Milk', price: 90 })).toBe(false);
    expect(isProductSitemapEligible({ id: '4', name: '', price: 90 })).toBe(false);
  });

  it('generates both EN and BN URLs for index, category, and product pages', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    // Dynamic Index
    expect(urls).toContain('https://www.luckystore1947.com');
    expect(urls).toContain('https://www.luckystore1947.com/category');
    expect(urls).toContain('https://www.luckystore1947.com/bn');
    expect(urls).toContain('https://www.luckystore1947.com/bn/category');

    // Static Pages
    expect(urls).toContain('https://www.luckystore1947.com/delivery');

    // Category (EN & BN + alternates + deduplicated)
    expect(urls).toContain('https://www.luckystore1947.com/category/dairy-and-eggs');
    expect(urls).toContain('https://www.luckystore1947.com/bn/category/dairy-and-eggs');
    const categoryEn = entries.find((e) => e.url === 'https://www.luckystore1947.com/category/dairy-and-eggs');
    expect(categoryEn?.alternates?.languages?.['bn-BD']).toBe('https://www.luckystore1947.com/bn/category/dairy-and-eggs');

    // Product (EN & BN + lastModified + eligibility)
    const expectedProductSlug = 'fresh-milk-1l--4acf0fb2';
    expect(urls).toContain(`https://www.luckystore1947.com/product/${expectedProductSlug}`);
    expect(urls).toContain(`https://www.luckystore1947.com/bn/product/${expectedProductSlug}`);
    expect(urls).not.toContain('https://www.luckystore1947.com/product/inactive-item--5bcf0fb2');
    expect(urls).not.toContain('https://www.luckystore1947.com/product/zero-price-item--6ccf0fb2');

    const productEn = entries.find((e) => e.url === `https://www.luckystore1947.com/product/${expectedProductSlug}`);
    expect(productEn?.lastModified).toBe('2026-09-20T10:00:00Z');
    expect(productEn?.alternates?.languages?.['bn-BD']).toBe(`https://www.luckystore1947.com/bn/product/${expectedProductSlug}`);
  });
});