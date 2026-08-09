import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../lib/types';
import { GridProductCard } from './GridProductCard';

const add = vi.fn();
const increment = vi.fn();
const decrement = vi.fn();
const toggle = vi.fn();

let cartState = {
  quantity: 0,
  canAdd: true,
  announcement: '',
};

let wishlistState = {
  isWishlisted: false,
  isPending: false,
};

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('./product/ProductImage', () => ({
  ProductImage: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

vi.mock('../hooks/useProductCart', () => ({
  useProductCart: () => ({
    ...cartState,
    add,
    increment,
    decrement,
  }),
}));

vi.mock('../hooks/useProductWishlist', () => ({
  useProductWishlist: () => ({
    ...wishlistState,
    toggle,
  }),
}));

const product: Product = {
  id: 'abc-123',
  name: 'Test Rice',
  emoji: '',
  price: 90,
  originalPrice: 100,
  unit: '1 kg',
  category: 'rice-and-grain',
  stock: 5,
  description: 'Rice',
  image_url: '/rice.png',
};

function renderCard(overrides: Partial<Product> = {}) {
  return render(<GridProductCard product={{ ...product, ...overrides }} />);
}

describe('GridProductCard', () => {
  beforeEach(() => {
    add.mockReset();
    increment.mockReset();
    decrement.mockReset();
    toggle.mockReset();
    cartState = { quantity: 0, canAdd: true, announcement: '' };
    wishlistState = { isWishlisted: false, isPending: false };
  });

  it('keeps wishlist activation isolated from product navigation', () => {
    renderCard();

    const wishlist = screen.getByRole('button', { name: 'Save Test Rice to wishlist' });
    expect(wishlist).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(wishlist);
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(add).not.toHaveBeenCalled();
  });

  it('uses image and title links for navigation', () => {
    renderCard();

    expect(screen.getByRole('link', { name: 'View Test Rice' })).toHaveAttribute('href', '/product/test-rice--abc123');
    expect(screen.getByRole('link', { name: 'Test Rice' })).toHaveAttribute('href', '/product/test-rice--abc123');
  });

  it('keeps add, increment, and decrement actions inside buttons', () => {
    const { rerender } = render(<GridProductCard product={product} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Test Rice to cart' }));
    expect(add).toHaveBeenCalledTimes(1);

    cartState = { quantity: 1, canAdd: true, announcement: '' };
    rerender(<GridProductCard product={product} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add another Test Rice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove one Test Rice' }));
    expect(increment).toHaveBeenCalledTimes(1);
    expect(decrement).toHaveBeenCalledTimes(1);
  });

  it('renders accessible wishlist selected state and label', () => {
    wishlistState = { isWishlisted: true, isPending: false };
    renderCard();

    const wishlist = screen.getByRole('button', { name: 'Remove Test Rice from wishlist' });
    expect(wishlist).toHaveAttribute('aria-pressed', 'true');
    expect(wishlist).toHaveClass('h-11', 'w-11', 'focus-visible:ring-warm-accent');
  });

  it('keeps out-of-stock products disabled without adding fake notifications', () => {
    cartState = { quantity: 0, canAdd: false, announcement: '' };
    renderCard({ stock: 0 });

    const addButton = screen.getByRole('button', { name: 'Test Rice is out of stock' });
    expect(addButton).toBeDisabled();
    expect(screen.queryByText(/notify/i)).not.toBeInTheDocument();
  });

  it('exposes cart quantity and live announcements', () => {
    cartState = { quantity: 2, canAdd: true, announcement: 'Added another Test Rice to cart' };
    renderCard();

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Added another Test Rice to cart')).toBeInTheDocument();
  });
});
