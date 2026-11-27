import { describe, expect, it, vi } from 'vitest';
import {
  ICE_CREAM_PAGE_SIZE,
  iceCreamPaginationEnabled,
  iceCreamPageHref,
  resolveIceCreamPage,
} from './iceCreamPagination';

describe('Ice Cream pagination URL qualification', () => {
  it('uses 24 products per page and formats proper localized routes', () => {
    expect(ICE_CREAM_PAGE_SIZE).toBe(24);
    expect(iceCreamPageHref('/category/ice-cream', 1)).toBe('/category/ice-cream');
    expect(iceCreamPageHref('/category/ice-cream', 2)).toBe('/category/ice-cream?page=2');
    expect(iceCreamPageHref('/bn/category/ice-cream', 3)).toBe('/bn/category/ice-cream?page=3');
  });

  it('is isolated to the explicit pilot flag and category', () => {
    vi.stubEnv('LUCKYSTORE_ICE_CREAM_PAGINATION', 'enabled');
    try {
      expect(iceCreamPaginationEnabled('ice-cream')).toBe(true);
      expect(iceCreamPaginationEnabled('snacks')).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(iceCreamPaginationEnabled('ice-cream')).toBe(false);
  });

  it('accepts an indexable numbered page separately from tracked parameters', () => {
    expect(resolveIceCreamPage({ page: '2' })).toMatchObject({
      page: 2, hasFilters: false, invalid: false, needsRedirect: false,
    });
    expect(resolveIceCreamPage({ page: '3', utm_source: 'ad', fbclid: 'abc' }))
      .toMatchObject({ page: 3, hasFilters: false, invalid: false });
    for (const tracking of ['gad_source', 'gbraid', 'wbraid', 'srsltid', 'dclid', 'UTM_SOMETHING_CUSTOM']) {
      expect(resolveIceCreamPage({ page: '2', [tracking]: 'click-id' }))
        .toMatchObject({ page: 2, hasFilters: false, invalid: false, needsRedirect: false });
    }
    expect(resolveIceCreamPage({})).toMatchObject({
      page: 1, hasFilters: false, needsRedirect: false,
    });
  });

  it('redirects page one to clean route and page plus filter to a filtered first page', () => {
    expect(resolveIceCreamPage({ page: '1' })).toMatchObject({
      page: 1, needsRedirect: true, normalizedQuery: '',
    });
    expect(resolveIceCreamPage({ page: '2', sort: 'price_asc' })).toMatchObject({
      hasFilters: true, needsRedirect: true, normalizedQuery: 'sort=price_asc',
    });
    expect(resolveIceCreamPage({ page: '4', brand: 'Polar' })).toMatchObject({
      hasFilters: true, needsRedirect: true, normalizedQuery: 'brand=Polar',
    });
    expect(resolveIceCreamPage({ sort: 'price_asc' })).toMatchObject({
      page: 1, hasFilters: true, needsRedirect: false,
    });
  });

  it.each(['0', '-1', '2.5', 'abc', '01', '', '9999'])(
    'rejects invalid page parameter %s', (page) => {
      expect(resolveIceCreamPage({ page }).invalid).toBe(true);
    },
  );

  it('rejects ambiguous duplicate page parameters', () => {
    expect(resolveIceCreamPage({ page: ['2', '3'] }).invalid).toBe(true);
  });
});
