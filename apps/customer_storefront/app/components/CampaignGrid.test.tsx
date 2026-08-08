import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignGrid } from './CampaignGrid';
import { ToastProvider } from './Toast';
import { CartProvider } from './CartProvider';
import type { Product } from '../lib/types';

const scrollBy = vi.fn();

const mockProducts: Product[] = [
  {
    id: 'tea-1',
    name: 'Organic Black Tea',
    emoji: '🍵',
    price: 120,
    unit: 'box',
    category: 'organic-tea',
    stock: 10,
    description: 'Organic black tea',
  },
  {
    id: 'coffee-1',
    name: 'Organic Coffee',
    emoji: '☕',
    price: 250,
    unit: 'jar',
    category: 'organic-coffee',
    stock: 8,
    description: 'Organic coffee',
  },
  {
    id: 'milk-1',
    name: 'Organic Fresh Milk',
    emoji: '🥛',
    price: 80,
    unit: 'liter',
    category: 'organic-milk',
    stock: 15,
    description: 'Organic milk',
  },
  {
    id: 'honey-1',
    name: 'Organic Raw Honey',
    emoji: '🍯',
    price: 350,
    unit: 'jar',
    category: 'organic-honey',
    stock: 12,
    description: 'Pure organic raw honey',
  },
];

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <CartProvider>
      <ToastProvider>{ui}</ToastProvider>
    </CartProvider>
  );
}

describe('CampaignGrid', () => {
  beforeEach(() => {
    scrollBy.mockReset();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    if (typeof Element !== 'undefined') {
      Element.prototype.scrollBy = scrollBy;
    }
  });

  it('gives the hero a clear story, destinations, and healthy living rail', () => {
    renderWithProviders(<CampaignGrid products={mockProducts} />);

    const title = screen.getByRole('heading', {
      name: 'Daily groceries from a store Chittagong knows.',
    });
    const hero = title.closest('section');
    expect(hero).not.toBeNull();

    expect(within(hero!).getByRole('link', { name: 'Shop organic goods' })).toHaveAttribute(
      'href',
      '/category?search=organic',
    );

    expect(within(hero!).getByText('Healthy Living')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Healthy Living products' }),
    ).toBeInTheDocument();
    expect(within(hero!).getByText('Pure, organic food & wholesome natural groceries.')).toBeInTheDocument();

    expect(within(hero!).getByText('Stocked daily')).toBeInTheDocument();
    expect(within(hero!).getByRole('link', { name: 'Shop groceries' })).toHaveAttribute(
      'href',
      '/category',
    );
  });

  it('offers named tea & coffee rail scroll controls', () => {
    renderWithProviders(<CampaignGrid products={mockProducts} />);

    const allPrev = screen.getAllByRole('button', { name: 'Previous products' });
    const allNext = screen.getAllByRole('button', { name: 'Next products' });
    expect(allPrev.length).toBeGreaterThanOrEqual(1);
    expect(allNext.length).toBeGreaterThanOrEqual(1);
  });

  it('uses shared semantic campaign roles and readable functional type', () => {
    renderWithProviders(<CampaignGrid products={mockProducts} />);

    const hero = screen
      .getByRole('heading', { name: 'Daily groceries from a store Chittagong knows.' })
      .closest('section')!;

    expect(hero).toHaveClass('campaign-hero');
    expect(hero.querySelectorAll('.campaign-kicker')).toHaveLength(1);
  });
});
