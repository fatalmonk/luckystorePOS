import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../lib/types';
import { FeaturedProducts } from './FeaturedProducts';

const scrollBy = vi.fn();

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('./ProductCard', () => ({
  ProductCard: ({ name }: { name: string }) => <article data-testid="product-card">{name}</article>,
}));
vi.mock('../hooks/useCartActions', () => ({
  useCartActions: () => ({
    cart: [],
    flyItems: [],
    handleAddToCart: vi.fn(),
    handleUpdateQty: vi.fn(),
    handleFlyComplete: vi.fn(),
  }),
}));

function product(id: string): Product {
  return {
    id,
    category: 'Dairy & Eggs',
    name: `Product ${id}`,
    emoji: '🛒',
    price: 100,
    unit: 'pc',
    stock: 5,
    description: 'Catalog product',
  };
}

describe('FeaturedProducts', () => {
  beforeEach(() => {
    scrollBy.mockReset();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    Element.prototype.scrollBy = scrollBy;
  });

  it('renders featured products in one keyboard-scrollable carousel', () => {
    render(<FeaturedProducts products={Array.from({ length: 7 }, (_, index) => product(`${index + 1}`))} />);

    const rail = screen.getByRole('region', { name: 'Featured groceries carousel' });
    expect(rail).toHaveAttribute('tabindex', '0');
    expect(screen.getAllByTestId('product-card')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Previous featured groceries' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next featured groceries' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Electronics/ })).not.toBeInTheDocument();

    Object.defineProperty(rail, 'clientWidth', { configurable: true, value: 500 });
    fireEvent.keyDown(rail, { key: 'ArrowRight' });
    expect(scrollBy).toHaveBeenCalledWith({ left: 390, behavior: 'smooth' });
  });
});
