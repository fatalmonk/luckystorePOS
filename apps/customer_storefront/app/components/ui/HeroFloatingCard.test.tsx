import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroDiscoveryRail } from './HeroFloatingCard';
import type { Product } from '../../lib/types';

const products: Product[] = [
  {
    id: 'rice-1',
    name: 'Miniket Rice',
    price: 620,
    unit: '5 kg',
    category: 'rice & grain',
    stock: 12,
    emoji: '🍚',
    description: 'Everyday rice for family meals.',
  },
  {
    id: 'milk-1',
    name: 'Fresh Milk',
    price: 90,
    unit: '1 liter',
    category: 'dairy & eggs',
    stock: 0,
    emoji: '🥛',
    description: 'Fresh milk for everyday use.',
  },
];

describe('HeroDiscoveryRail', () => {
  it('renders a grocery search form, suggested searches, and real in-stock products', () => {
    render(<HeroDiscoveryRail products={products} />);

    expect(screen.getByRole('search', { name: 'Search groceries' })).toHaveAttribute(
      'action',
      '/category',
    );
    expect(screen.getByRole('searchbox')).toHaveAttribute('name', 'q');
    expect(screen.getByRole('link', { name: 'Rice' })).toHaveAttribute('href', '/category?q=rice');
    expect(screen.getByRole('link', { name: 'Snacks' })).toHaveAttribute('href', '/category/snacks');
    expect(screen.getByRole('link', { name: 'Cleaning' })).toHaveAttribute(
      'href',
      '/category/cleaning-supplies',
    );

    const rail = screen.getByLabelText('Quick picks from today products');
    expect(within(rail).getByRole('link', { name: /Miniket Rice/ })).toHaveAttribute(
      'href',
      '/product/miniket-rice--rice1',
    );
    expect(within(rail).queryByRole('link', { name: /Fresh Milk/ })).not.toBeInTheDocument();
  });

  it('does not render fake rating or review signals', () => {
    render(<HeroDiscoveryRail products={products} />);

    expect(screen.queryByText(/reviews/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Top Choice/i)).not.toBeInTheDocument();
  });
});
