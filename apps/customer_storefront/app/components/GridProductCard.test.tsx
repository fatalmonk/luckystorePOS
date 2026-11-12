import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  ProductImage: ({ alt, src }: { alt: string; src?: string }) => <span role="img" aria-label={alt} data-src={src} />,
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

  it('links a Bengali label to the shared English catalog slug', () => {
    render(
      <GridProductCard
        locale="bn"
        product={{
          ...product,
          id: '95c86e99-34c8-4ed3-823d-2ca8446fdbd9',
          name: 'ডিপ্লোমা ইন্স্ট্যান্ট ফুল ক্রিম মিল্ক পাউডার',
          originalName: 'Diploma Instant Full Cream Milk Powder 500 g',
        }}
      />,
    );

    const href = '/bn/product/diploma-instant-full-cream-milk-powder-500-g--95c86e99';
    const productLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === href);
    expect(productLinks.length).toBeGreaterThan(0);
  });

  it('uses image and title links for navigation', () => {
    renderCard();

    expect(screen.getByRole('link', { name: 'Quick view: Test Rice' })).toHaveAttribute('href', '/product/test-rice--abc123');
    const titleLink = screen.getByRole('link', { name: 'Test Rice' });
    expect(titleLink).toHaveAttribute('href', '/product/test-rice--abc123');
    expect(titleLink).toHaveClass('min-h-11', 'px-1', 'py-1');
  });

  it('uses the curated Kheer half-liter image when the catalog image is missing', () => {
    renderCard({
      id: '79e0ece1-0c5e-4e2f-a003-d2f37b73fafb',
      name: 'Polar Kheer 1/2 Liter',
      image_url: undefined,
    });

    expect(screen.getByRole('img', { name: 'Polar Kheer ice cream tub with a 1/2L size label' }))
      .toHaveAttribute('data-src', 'https://images.luckystore1947.com/products/polar/kheer-500ml-1-2l.webp');
  });

  it('prioritizes curated gallery packshots over legacy or uncurated catalog image_url', () => {
    renderCard({
      id: 'd6b58fa7-85ae-4934-8c81-4235c369fc63',
      name: 'Polar 2 in 1 Vanilla-Chocolate 1 Liter',
      image_url: 'https://polarbd.com/wp-content/webp-express/webp-images/uploads/2025/03/2in1-Vanilla_Chocolate-05-1024x1024.jpg.webp',
    });

    expect(screen.getByRole('img', { name: 'Polar 2 in 1 Vanilla-Chocolate ice cream tub, 1 liter' }))
      .toHaveAttribute('data-src', 'https://images.luckystore1947.com/products/polar/2-in-1-vanilla-chocolate-tub.webp');
  });

  it('keeps add, increment, and decrement actions inside buttons', () => {
    const { rerender } = render(<GridProductCard product={product} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart: Test Rice' }));
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
    expect(wishlist).toHaveClass('size-11', 'focus-visible:ring-warm-accent');
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

  it('opens a keyboard-dismissible preview, keeps focus restoration, and uses the shared cart add action', () => {
    renderCard();
    const trigger = screen.getByRole('link', { name: 'Quick view: Test Rice' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Test Rice' });
    expect(dialog).toHaveClass('rounded-t-warm-sheet', 'md:rounded-warm-panel');
    expect(screen.getByText('Pack size')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('1 kg');
    expect(screen.getByRole('link', { name: 'Full product details' })).toHaveAttribute('href', '/product/test-rice--abc123');
    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart' }));
    expect(add).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('localizes preview labels and disables quantity changes for unverified stock', () => {
    render(<GridProductCard product={{ ...product, availabilityUnknown: true }} locale="bn" />);
    fireEvent.click(screen.getByRole('link', { name: 'দ্রুত দেখুন: Test Rice' }));

    expect(screen.getByRole('dialog', { name: 'Test Rice' })).toBeInTheDocument();
    expect(screen.getByText('প্যাকের পরিমাণ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'স্টক যাচাই করা যায়নি' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'যোগ করুন' })).not.toBeInTheDocument();
  });

  it('opens from the product name and traps keyboard focus inside the preview', () => {
    renderCard();
    const titleLink = screen.getByRole('link', { name: 'Test Rice' });
    fireEvent.click(titleLink);

    const closeButton = screen.getByRole('button', { name: 'Close product preview' });
    const detailsLink = screen.getByRole('link', { name: 'Full product details' });
    expect(document.activeElement).toBe(closeButton);
    detailsLink.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(detailsLink);
  });

});
