import { describe, it, expect, vi } from 'vitest';
import sitemap, { isProductSitemapEligible } from '../sitemap';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table !== 'item_translations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: vi.fn(() => {
          const filters: Record<string, string> = {};
          const queryBuilder = {
            eq: vi.fn((col: string, val: string) => {
              filters[col] = val;
              return queryBuilder;
            }),
            order: vi.fn(() => queryBuilder),
            range: vi.fn(async () => {
              if (filters.locale === 'bn' && filters.review_status === 'published') {
                return {
                  data: [{ item_id: '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd' }],
                  error: null,
                };
              }
              return { data: [], error: null };
            }),
          };
          return queryBuilder;
        }),
      };
    }),
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
          id: '7ddf0fb2-f831-4205-b9f8-e1e8b4e6e8fd',
          name: 'Untranslated Active Item',
          price: 150,
          is_active: true,
          updated_at: '2026-09-20T11:00:00Z',
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

  it('generates both EN and BN URLs with reciprocal language alternates and accurate timestamps', async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    // Dynamic Index: Homepage pair
    expect(urls).toContain('https://www.luckystore1947.com');
    expect(urls).toContain('https://www.luckystore1947.com/bn');

    const homeEn = entries.find((e) => e.url === 'https://www.luckystore1947.com');
    const homeBn = entries.find((e) => e.url === 'https://www.luckystore1947.com/bn');

    expect(homeEn?.alternates?.languages?.['en-BD']).toBe('https://www.luckystore1947.com');
    expect(homeEn?.alternates?.languages?.['bn-BD']).toBe('https://www.luckystore1947.com/bn');
    expect(homeEn?.alternates?.languages?.['x-default']).toBe('https://www.luckystore1947.com');

    expect(homeBn?.alternates?.languages?.['en-BD']).toBe('https://www.luckystore1947.com');
    expect(homeBn?.alternates?.languages?.['bn-BD']).toBe('https://www.luckystore1947.com/bn');
    expect(homeBn?.alternates?.languages?.['x-default']).toBe('https://www.luckystore1947.com');

    // Dynamic Index: Category Root pair
    expect(urls).toContain('https://www.luckystore1947.com/category');
    expect(urls).toContain('https://www.luckystore1947.com/bn/category');

    const catRootEn = entries.find((e) => e.url === 'https://www.luckystore1947.com/category');
    const catRootBn = entries.find((e) => e.url === 'https://www.luckystore1947.com/bn/category');

    expect(catRootEn?.alternates?.languages?.['en-BD']).toBe('https://www.luckystore1947.com/category');
    expect(catRootEn?.alternates?.languages?.['bn-BD']).toBe('https://www.luckystore1947.com/bn/category');
    expect(catRootBn?.alternates?.languages?.['en-BD']).toBe('https://www.luckystore1947.com/category');
    expect(catRootBn?.alternates?.languages?.['bn-BD']).toBe('https://www.luckystore1947.com/bn/category');

    // Static Pages: verified pairs exist with reciprocal alternates
    expect(urls).toContain('https://www.luckystore1947.com/delivery');
    expect(urls).toContain('https://www.luckystore1947.com/bn/delivery');
    const deliveryEn = entries.find((e) => e.url === 'https://www.luckystore1947.com/delivery');
    const deliveryBn = entries.find((e) => e.url === 'https://www.luckystore1947.com/bn/delivery');
    expect(deliveryEn?.alternates?.languages?.['bn-BD']).toBe('https://www.luckystore1947.com/bn/delivery');
    expect(deliveryBn?.alternates?.languages?.['en-BD']).toBe('https://www.luckystore1947.com/delivery');

    expect(urls).toContain('https://www.luckystore1947.com/fortune-cookies-near-me');
    expect(urls).toContain('https://www.luckystore1947.com/bn/fortune-cookies-near-me');
    const fortuneEn = entries.find((e) => e.url === 'https://www.luckystore1947.com/fortune-cookies-near-me');
    const fortuneBn = entries.find((e) => e.url === 'https://www.luckystore1947.com/bn/fortune-cookies-near-me');
    expect(fortuneEn?.alternates?.languages?.['bn-BD']).toBe('https://www.luckystore1947.com/bn/fortune-cookies-near-me');
    expect(fortuneBn?.alternates?.languages?.['en-BD']).toBe('https://www.luckystore1947.com/fortune-cookies-near-me');

    // Unpaired static pages: no fabricated /bn counterparts
    expect(urls).toContain('https://www.luckystore1947.com/contact');
    expect(urls).not.toContain('https://www.luckystore1947.com/bn/contact');
    const contactEn = entries.find((e) => e.url === 'https://www.luckystore1947.com/contact');
    expect(contactEn?.alternates).toBeUndefined();

    expect(urls).toContain('https://www.luckystore1947.com/privacy');
    expect(urls).not.toContain('https://www.luckystore1947.com/bn/privacy');

    expect(urls).toContain('https://www.luckystore1947.com/terms');
    expect(urls).not.toContain('https://www.luckystore1947.com/bn/terms');

    expect(urls).toContain('https://www.luckystore1947.com/security-policy');
    expect(urls).not.toContain('https://www.luckystore1947.com/bn/security-policy');

    expect(urls).toContain('https://www.luckystore1947.com/data-deletion');
    expect(urls).not.toContain('https://www.luckystore1947.com/bn/data-deletion');

    // Category Detail (EN & BN + alternates + deduplicated)
    expect(urls).toContain('https://www.luckystore1947.com/category/dairy-and-eggs');
    expect(urls).toContain('https://www.luckystore1947.com/bn/category/dairy-and-eggs');
    const categoryEn = entries.find((e) => e.url === 'https://www.luckystore1947.com/category/dairy-and-eggs');
    const categoryBn = entries.find((e) => e.url === 'https://www.luckystore1947.com/bn/category/dairy-and-eggs');
    expect(categoryEn?.alternates?.languages?.['bn-BD']).toBe('https://www.luckystore1947.com/bn/category/dairy-and-eggs');
    expect(categoryEn?.alternates?.languages?.['en-BD']).toBe('https://www.luckystore1947.com/category/dairy-and-eggs');
    expect(categoryBn?.alternates?.languages?.['en-BD']).toBe('https://www.luckystore1947.com/category/dairy-and-eggs');
    expect(categoryBn?.alternates?.languages?.['bn-BD']).toBe('https://www.luckystore1947.com/bn/category/dairy-and-eggs');

    // Product (EN & BN + lastModified + eligibility + alternates)
    const expectedProductSlug = 'fresh-milk-1l--4acf0fb2';
    expect(urls).toContain(`https://www.luckystore1947.com/product/${expectedProductSlug}`);
    expect(urls).toContain(`https://www.luckystore1947.com/bn/product/${expectedProductSlug}`);
    expect(urls).not.toContain('https://www.luckystore1947.com/product/inactive-item--5bcf0fb2');
    expect(urls).not.toContain('https://www.luckystore1947.com/product/zero-price-item--6ccf0fb2');

    const productEn = entries.find((e) => e.url === `https://www.luckystore1947.com/product/${expectedProductSlug}`);
    const productBn = entries.find((e) => e.url === `https://www.luckystore1947.com/bn/product/${expectedProductSlug}`);
    expect(productEn?.lastModified).toBe('2026-09-20T10:00:00Z');
    expect(productBn?.lastModified).toBe('2026-09-20T10:00:00Z');
    expect(productEn?.alternates?.languages?.['bn-BD']).toBe(`https://www.luckystore1947.com/bn/product/${expectedProductSlug}`);
    expect(productEn?.alternates?.languages?.['en-BD']).toBe(`https://www.luckystore1947.com/product/${expectedProductSlug}`);
    expect(productBn?.alternates?.languages?.['en-BD']).toBe(`https://www.luckystore1947.com/product/${expectedProductSlug}`);
    expect(productBn?.alternates?.languages?.['bn-BD']).toBe(`https://www.luckystore1947.com/bn/product/${expectedProductSlug}`);

    // Untranslated eligible product: exists in EN, absent in /bn/product/..., no bn-BD alternate
    const untranslatedSlug = 'untranslated-active-item--7ddf0fb2';
    expect(urls).toContain(`https://www.luckystore1947.com/product/${untranslatedSlug}`);
    expect(urls).not.toContain(`https://www.luckystore1947.com/bn/product/${untranslatedSlug}`);
    const untranslatedEn = entries.find((e) => e.url === `https://www.luckystore1947.com/product/${untranslatedSlug}`);
    expect(untranslatedEn?.lastModified).toBe('2026-09-20T11:00:00Z');
    expect(untranslatedEn?.alternates?.languages?.['en-BD']).toBe(`https://www.luckystore1947.com/product/${untranslatedSlug}`);
    expect(untranslatedEn?.alternates?.languages?.['bn-BD']).toBeUndefined();
  });
});