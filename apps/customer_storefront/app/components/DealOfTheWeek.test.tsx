import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../lib/types';
import { DealOfTheWeek } from './DealOfTheWeek';

const scrollBy = vi.fn();
const add = vi.fn();

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('./DealCountdown', () => ({
  DealCountdown: ({ className }: { className?: string }) => <span className={className}>Countdown</span>,
}));
vi.mock('../hooks/useProductCart', () => ({
  useProductCart: () => ({ canAdd: true, add, announcement: '' }),
}));
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
    add.mockReset();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    Element.prototype.scrollBy = scrollBy;
  });

  it('keeps the strongest deal as lead and renders every remaining deal in a carousel', () => {
    const products = [50, 40, 30, 20, 10].map((discount, index) => product(`${index + 1}`, discount));
    products[4].stock = 0;
    render(<DealOfTheWeek products={products} discountedProductCount={48} />);

    expect(screen.getByRole('heading', { name: 'Deal of the Week' })).toHaveClass('text-xl', 'min-[480px]:text-2xl', 'sm:text-3xl');
    expect(
      screen.getByText('A weekly pick at a special price.')
    ).toBeInTheDocument();
    expect(screen.getByText('Countdown')).toHaveClass('justify-self-end');
    expect(screen.getByRole('link', { name: '50% off — View Deal 1' })).toBeInTheDocument();
    expect(screen.getAllByTestId('deal-product')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'See all 48 deals →' })).toHaveAttribute('href', '/best/dealoftheweek');
    fireEvent.click(screen.getByRole('button', { name: 'Add to Cart: Deal 1' }));
    expect(add).toHaveBeenCalledTimes(1);

    const rail = screen.getByRole('region', { name: 'More weekly deals' });
    expect(rail).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', { name: 'Previous weekly deals' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next weekly deals' })).toBeInTheDocument();

    Object.defineProperty(rail, 'clientWidth', { configurable: true, value: 500 });
    fireEvent.keyDown(rail, { key: 'ArrowRight' });
    expect(scrollBy).toHaveBeenCalledWith({ left: 390, behavior: 'smooth' });
  });

  it('renders the approved weekly products with lead product and supporting rail', () => {
    const picks = [product('a', 10), product('b', 20), product('c', 30)];
    render(<DealOfTheWeek products={[]} weeklyPicks={picks} weeklyEditionActive />);

    expect(screen.getByText(/verified unranked picks/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /10% off — View Deal a/i })).toBeInTheDocument();
    expect(screen.getAllByTestId('deal-product')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'See all weekly picks →' })).toHaveAttribute('href', '/best/dealoftheweek');
    expect(screen.getByRole('button', { name: 'Add to Cart: Deal a' })).toBeInTheDocument();
  });

  it('keeps the Bengali deal page route and localized cart action', () => {
    const products = [product('a', 30), product('b', 20)];
    render(<DealOfTheWeek products={products} locale="bn" />);

    expect(screen.getByRole('heading', { name: 'সপ্তাহের সেরা অফার' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'যোগ করুন: Deal a' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /সবগুলো অফার/ })).toHaveAttribute(
      'href',
      '/bn/best/dealoftheweek',
    );
  });
});
