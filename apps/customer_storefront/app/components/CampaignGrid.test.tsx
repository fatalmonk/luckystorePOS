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
    name: 'Premium Black Tea',
    emoji: '🍵',
    price: 120,
    unit: 'box',
    category: 'tea',
    stock: 10,
    description: 'Premium black tea',
  },
  {
    id: 'coffee-1',
    name: 'Instant Coffee',
    emoji: '☕',
    price: 250,
    unit: 'jar',
    category: 'coffee',
    stock: 8,
    description: 'Instant coffee',
  },
  {
    id: 'milk-1',
    name: 'Fresh Milk',
    emoji: '🥛',
    price: 80,
    unit: 'liter',
    category: 'milk',
    stock: 15,
    description: 'Fresh milk',
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
    Element.prototype.scrollBy = scrollBy;
  });

  it('gives the hero a clear story, destinations, and healthy living rail', () => {
    renderWithProviders(<CampaignGrid products={mockProducts} />);

    const title = screen.getByRole('heading', {
      name: 'Save Money. Live Better.',
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
      .getByRole('heading', { name: 'Save Money. Live Better.' })
      .closest('section')!;

    expect(hero).toHaveClass('campaign-hero');
    expect(hero.querySelectorAll('.campaign-kicker')).toHaveLength(1);
  });
});
