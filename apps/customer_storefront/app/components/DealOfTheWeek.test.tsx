import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../lib/types';
import { DealOfTheWeek } from './DealOfTheWeek';

const scrollBy = vi.fn();

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('./DealCountdown', () => ({ DealCountdown: () => <span>Countdown</span> }));
vi.mock('./GridProductCard', () => ({
  GridProductCard: ({ product }: { product: Product }) => <article data-testid="deal-product">{product.name}</article>,
}));

function product(id: string, discount: number): Product {
  return {
    id,
    category: 'Snacks',
    name: `Deal ${id}`,
    emoji: '🛒',
    price: 100 - discount,
    originalPrice: 100,
    unit: 'pc',
    stock: 5,
    description: 'Discounted product',
  };
}

describe('DealOfTheWeek', () => {
  beforeEach(() => {
    scrollBy.mockReset();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    Element.prototype.scrollBy = scrollBy;
  });

  it('keeps the strongest deal as lead and renders every remaining deal in a carousel', () => {
    const products = [50, 40, 30, 20, 10].map((discount, index) => product(`${index + 1}`, discount));
    products[4].stock = 0;
    render(<DealOfTheWeek products={products} />);

    expect(screen.getByRole('link', { name: 'View Deal 1' })).toBeInTheDocument();
    expect(screen.getAllByTestId('deal-product')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'See all 5 deals →' })).toBeInTheDocument();

    const rail = screen.getByRole('region', { name: 'More weekly deals' });
    expect(rail).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Previous weekly deals' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next weekly deals' })).toBeInTheDocument();

    Object.defineProperty(rail, 'clientWidth', { configurable: true, value: 500 });
    fireEvent.keyDown(rail, { key: 'ArrowRight' });
    expect(scrollBy).toHaveBeenCalledWith({ left: 390, behavior: 'smooth' });
  });
});
