import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '../lib/types';
import { CatalogLayout } from './CatalogLayout';

vi.mock('next/navigation', () => ({
  usePathname: () => '/category/ice-cream',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('./GridProductCard', () => ({
  GridProductCard: ({ product }: { product: Product }) => <div>{product.name}</div>,
}));

vi.mock('../lib/analytics', () => ({ trackViewItemList: vi.fn() }));

const product: Product = {
  id: 'ice-cream-1',
  name: 'Test Ice Cream',
  price: 100,
  unit: 'pc',
  category: 'Ice-Cream',
  stock: 5,
  emoji: '🍨',
  description: 'Test product',
};

describe('CatalogLayout breadcrumb', () => {
  it('shows the locale-aware category trail above the results summary', () => {
    render(
      <CatalogLayout
        products={[product]}
        categorySlug="ice-cream"
        categories={[{ id: 'ice-cream', slug: 'ice-cream', name: 'Ice-Cream', emoji: '🍨' }]}
        theme=""
        sort="best"
        searchParams={{}}
        locale="en"
      />,
    );

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(breadcrumb).getByRole('link', { name: 'Shop' })).toHaveAttribute('href', '/category');
    expect(within(breadcrumb).getByText('Ice-Cream')).toHaveAttribute('aria-current', 'page');
  });

  it('can hide its generic trail when the page already renders a category breadcrumb', () => {
    render(
      <CatalogLayout
        products={[product]}
        categorySlug="ice-cream"
        categories={[{ id: 'ice-cream', slug: 'ice-cream', name: 'Ice-Cream', emoji: '🍨' }]}
        theme=""
        sort="best"
        searchParams={{}}
        locale="en"
        hideBreadcrumb
      />,
    );

    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument();
  });

  it('renders subcategory navigation links with canonical slugs (e.g. dairy-and-eggs)', () => {
    render(
      <CatalogLayout
        products={[product]}
        categorySlug="breakfast"
        categories={[
          { id: 'breakfast', slug: 'breakfast', name: 'Breakfast', emoji: '🍳' },
          { id: 'dairy-sub', slug: 'dairy-&-eggs', name: 'Dairy & Eggs', emoji: '🥛', parent_id: 'breakfast' },
        ]}
        theme=""
        sort="best"
        searchParams={{}}
        locale="en"
      />,
    );

    const subcategoryNav = screen.getByRole('navigation', { name: 'Explore Sub-categories' });
    const dairyLink = within(subcategoryNav).getByRole('link', { name: /Dairy & Eggs/i });
    expect(dairyLink).toHaveAttribute('href', '/category/dairy-and-eggs');
  });

  it('deduplicates subcategories that map to the same canonical slug', () => {
    render(
      <CatalogLayout
        products={[product]}
        categorySlug="breakfast"
        categories={[
          { id: 'breakfast', slug: 'breakfast', name: 'Breakfast', emoji: '🍳' },
          { id: 'dairy-sub-1', slug: 'dairy', name: 'Dairy', emoji: '🥛', parent_id: 'breakfast' },
          { id: 'dairy-sub-2', slug: 'dairy-&-eggs', name: 'Dairy & Eggs', emoji: '🥛', parent_id: 'breakfast' },
        ]}
        theme=""
        sort="best"
        searchParams={{}}
        locale="en"
      />,
    );

    const subcategoryNav = screen.getByRole('navigation', { name: 'Explore Sub-categories' });
    const dairyLinks = within(subcategoryNav).getAllByRole('link', { name: /Dairy/i });
    expect(dairyLinks).toHaveLength(1);
    expect(dairyLinks[0]).toHaveAttribute('href', '/category/dairy-and-eggs');
  });

  it('renders Bengali subcategory navigation links with localized prefix (/bn/category/dairy-and-eggs)', () => {
    render(
      <CatalogLayout
        products={[product]}
        categorySlug="breakfast"
        categories={[
          { id: 'breakfast', slug: 'breakfast', name: 'Breakfast', emoji: '🍳' },
          { id: 'dairy-sub', slug: 'dairy-&-eggs', name: 'Dairy & Eggs', emoji: '🥛', parent_id: 'breakfast' },
        ]}
        theme=""
        sort="best"
        searchParams={{}}
        locale="bn"
      />,
    );

    const subcategoryNav = screen.getByRole('navigation', { name: 'সাব-ক্যাটাগরি দেখুন' });
    const dairyLink = within(subcategoryNav).getByRole('link', { name: /দুধ ও ডিম/i });
    expect(dairyLink).toHaveAttribute('href', '/bn/category/dairy-and-eggs');
  });

  it('prefers canonical record over legacy record regardless of input order', () => {
    // Test case A: legacy first, canonical second
    const { unmount } = render(
      <CatalogLayout
        products={[product]}
        categorySlug="breakfast"
        categories={[
          { id: 'breakfast', slug: 'breakfast', name: 'Breakfast', emoji: '🍳' },
          { id: 'dairy-legacy', slug: 'dairy', name: 'Dairy Legacy', emoji: '🥛', parent_id: 'breakfast' },
          { id: 'dairy-canonical', slug: 'dairy-and-eggs', name: 'Dairy & Eggs Canonical', emoji: '🥛', parent_id: 'breakfast' },
        ]}
        theme=""
        sort="best"
        searchParams={{}}
        locale="en"
      />,
    );

    let subcategoryNav = screen.getByRole('navigation', { name: 'Explore Sub-categories' });
    let dairyLinks = within(subcategoryNav).getAllByRole('link', { name: /Dairy/i });
    expect(dairyLinks).toHaveLength(1);
    expect(dairyLinks[0]).toHaveAttribute('href', '/category/dairy-and-eggs');
    expect(dairyLinks[0]).toHaveTextContent('Dairy & Eggs Canonical');
    unmount();

    // Test case B: canonical first, legacy second (reversed order)
    render(
      <CatalogLayout
        products={[product]}
        categorySlug="breakfast"
        categories={[
          { id: 'breakfast', slug: 'breakfast', name: 'Breakfast', emoji: '🍳' },
          { id: 'dairy-canonical', slug: 'dairy-and-eggs', name: 'Dairy & Eggs Canonical', emoji: '🥛', parent_id: 'breakfast' },
          { id: 'dairy-legacy', slug: 'dairy', name: 'Dairy Legacy', emoji: '🥛', parent_id: 'breakfast' },
        ]}
        theme=""
        sort="best"
        searchParams={{}}
        locale="en"
      />,
    );

    subcategoryNav = screen.getByRole('navigation', { name: 'Explore Sub-categories' });
    dairyLinks = within(subcategoryNav).getAllByRole('link', { name: /Dairy/i });
    expect(dairyLinks).toHaveLength(1);
    expect(dairyLinks[0]).toHaveAttribute('href', '/category/dairy-and-eggs');
    expect(dairyLinks[0]).toHaveTextContent('Dairy & Eggs Canonical');
  });
});
