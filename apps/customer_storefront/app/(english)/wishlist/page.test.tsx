import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WishlistPage from './page';

const mocks = vi.hoisted(() => ({
  pathname: { value: '/wishlist' },
  wishlistIds: { value: [] as string[] },
  product: { value: null as null | Record<string, unknown> },
}));

vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname.value }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock('../../components/updated/Header', () => ({ Header: () => null }));
vi.mock('../../components/BottomNav', () => ({ BottomNav: () => null }));
vi.mock('../../lib/wishlistHelpers', () => ({ getLocalWishlist: () => mocks.wishlistIds.value }));
vi.mock('../../lib/products/index', () => ({
  createProductId: (id: string) => id,
  createProductRepository: () => ({ repo: { getById: async () => mocks.product.value } }),
}));
vi.mock('../../lib/supabase/client', () => ({ createClient: () => ({}) }));
vi.mock('../../components/product/ProductImage', () => ({ ProductImage: () => null }));

describe('WishlistPage locale', () => {
  beforeEach(() => {
    mocks.pathname.value = '/wishlist';
    mocks.wishlistIds.value = [];
    mocks.product.value = null;
  });

  it('keeps Bengali empty-state content and shopping links localized', async () => {
    mocks.pathname.value = '/bn/wishlist';
    render(<WishlistPage />);

    expect(await screen.findByRole('heading', { name: 'আপনার পছন্দের তালিকা' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'আপনার পছন্দের তালিকা খালি' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'কেনাকাটা শুরু করুন' })).toHaveAttribute('href', '/bn');
  });

  it('keeps the English wishlist copy and shopping links in English', async () => {
    render(<WishlistPage />);

    expect(await screen.findByRole('heading', { name: 'Your Wishlist' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start Shopping' })).toHaveAttribute('href', '/');
  });

  it('keeps Bengali product and remove controls inside the Bengali route space', async () => {
    mocks.pathname.value = '/bn/wishlist';
    mocks.wishlistIds.value = ['item-1'];
    mocks.product.value = {
      id: 'item-1', name: 'Test Rice', price: 10, image_url: '', category: 'Rice', unit: 'pc',
    };
    render(<WishlistPage />);

    const productLink = await screen.findByRole('link', { name: /Test Rice/ });
    expect(productLink.getAttribute('href')).toMatch(/^\/bn\/product\//);
    expect(screen.getByRole('button', { name: 'তালিকা থেকে সরান' })).toBeInTheDocument();
  });
});
