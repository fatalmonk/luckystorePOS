import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../lib/types';
import { CategorySingleCarousel } from './CategorySingleCarousel';

const scrollBy = vi.fn();

function product(id: string, category: string): Product {
  return {
    id,
    category,
    name: `Product ${id}`,
    emoji: '🛒',
    price: 100,
    unit: 'pc',
    stock: 5,
    description: 'Catalog product',
  };
}

describe('CategorySingleCarousel', () => {
  beforeEach(() => {
    scrollBy.mockReset();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    Element.prototype.scrollBy = scrollBy;
  });

  it('renders one keyboard-scrollable category rail with catalog counts', () => {
    render(
      <CategorySingleCarousel
        products={[
          product('milk-a', 'Dairy & Eggs'),
          product('milk-b', 'Milk'),
          product('tea', 'Tea & Coffee'),
        ]}
      />,
    );

    const rail = screen.getByRole('region', { name: 'Shop by category' });
    expect(rail).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('link', { name: /Dairy & Eggs 2 items/ })).toHaveAttribute(
      'href',
      '/category/dairy-and-eggs',
    );
    expect(screen.getByRole('link', { name: /Tea & Coffee 1 item/ })).toHaveAttribute(
      'href',
      '/category/tea-&-coffee',
    );

    Object.defineProperty(rail, 'clientWidth', { configurable: true, value: 500 });
    fireEvent.keyDown(rail, { key: 'ArrowRight' });
    expect(scrollBy).toHaveBeenCalledWith({ left: 360, behavior: 'smooth' });
  });
});
