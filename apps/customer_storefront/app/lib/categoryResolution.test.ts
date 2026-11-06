import { describe, expect, it } from 'vitest';
import { getCanonicalCategoryRedirectPath } from './categoryResolution';

describe('getCanonicalCategoryRedirectPath', () => {
  it('keeps the first value for repeated query parameters on English redirects', () => {
    expect(
      getCanonicalCategoryRedirectPath('en', 'rice', 'rice-and-grain', {
        q: ['rice', 'grain'],
        theme: 'dark',
      }),
    ).toBe('/category/rice-and-grain?q=rice&theme=dark');
  });

  it('uses the Bengali route prefix and omits an empty query string', () => {
    expect(getCanonicalCategoryRedirectPath('bn', 'snacks-old', 'snacks', {})).toBe(
      '/bn/category/snacks',
    );
  });

  it('does not redirect a canonical slug', () => {
    expect(getCanonicalCategoryRedirectPath('en', 'snacks', 'snacks', { q: 'chips' })).toBeNull();
  });
});
