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

  it('gives the hero a clear story, search, and real product discovery rail', () => {
    renderWithProviders(<CampaignGrid products={mockProducts} />);

    const title = screen.getByRole('heading', {
      name: 'Daily essentials from a store Chittagong knows.',
    });
    const hero = title.closest('section');
    expect(hero).not.toBeNull();

    expect(within(hero!).getByRole('search', { name: 'Search groceries' })).toBeInTheDocument();
    expect(within(hero!).getByRole('searchbox')).toHaveAttribute('name', 'q');
    expect(within(hero!).getByLabelText('A basket of everyday Lucky Store groceries')).toBeInTheDocument();
    expect(within(hero!).getByRole('link', { name: 'Rice' })).toHaveAttribute('href', '/category?q=rice');
    expect(within(hero!).getByText('Search organic staples')).toBeInTheDocument();
    expect(within(hero!).queryByText('Healthy Living')).not.toBeInTheDocument();
    expect(within(hero!).queryByText('Pantry Staples')).not.toBeInTheDocument();
    expect(within(hero!).queryByText(/Top Choice/i)).not.toBeInTheDocument();

    expect(within(hero!).queryByText('Stocked daily')).not.toBeInTheDocument();
    expect(within(hero!).getByRole('link', { name: 'Shop groceries' })).toHaveAttribute(
      'href',
      '/category',
    );
    expect(within(hero!).getByText('Everyday')).toBeInTheDocument();
  });

  it('does not render the old themed rail controls inside the hero', () => {
    renderWithProviders(<CampaignGrid products={mockProducts} />);

    expect(screen.queryByRole('button', { name: 'Previous products' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next products' })).not.toBeInTheDocument();
  });

  it('uses shared semantic campaign roles and readable functional type', () => {
    renderWithProviders(<CampaignGrid products={mockProducts} />);

    const hero = screen
      .getByRole('heading', { name: 'Daily essentials from a store Chittagong knows.' })
      .closest('section')!;

    expect(hero).toHaveClass('campaign-hero');
    expect(hero.querySelectorAll('.hero-discovery')).toHaveLength(1);
  });
});
