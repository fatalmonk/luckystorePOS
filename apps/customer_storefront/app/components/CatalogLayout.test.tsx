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
});
