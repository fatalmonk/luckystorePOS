import { describe, expect, it } from 'vitest';
import { getLocaleFromPathname, stripLocalePrefix, withLocale } from './config';
import { getLocaleHref } from './navigation';

describe('Bengali storefront locale foundation', () => {
  it('detects only the /bn route tree as Bengali', () => {
    expect(getLocaleFromPathname('/bn')).toBe('bn');
    expect(getLocaleFromPathname('/bn/category/rice-and-grain')).toBe('bn');
    expect(getLocaleFromPathname('/category/rice-and-grain')).toBe('en');
  });

  it('switches locale while preserving the pathname and query string', () => {
    expect(getLocaleHref('/bn/category/rice-and-grain', '?sort=price', 'en')).toBe(
      '/category/rice-and-grain?sort=price',
    );
    expect(getLocaleHref('/category/rice-and-grain', '?sort=price', 'bn')).toBe(
      '/bn/category/rice-and-grain?sort=price',
    );
  });

  it('does not create encoded Bengali URL slugs', () => {
    expect(stripLocalePrefix('/bn')).toBe('/');
    expect(withLocale('/', 'bn')).toBe('/bn');
    expect(withLocale('/category/rice-and-grain', 'bn')).toBe('/bn/category/rice-and-grain');
  });
});
