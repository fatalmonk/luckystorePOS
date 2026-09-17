import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CategoryQuickGrid } from './CategoryQuickGrid';

describe('CategoryQuickGrid', () => {
  it('uses the resolved fallback category name as the accessible link name', () => {
    render(
      <CategoryQuickGrid
        categories={[
          { id: 'tea', slug: 'tea-&-coffee', name: 'Tea & Coffee', emoji: '☕' },
          { id: 'ice-cream', slug: 'ice-cream', name: 'Ice Cream', emoji: '🍨' },
          { id: 'cleaning', slug: 'cleaning-supplies', name: 'Cleaning Supplies', emoji: '🧼' },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: 'Tea & Coffee' })).toHaveAttribute(
      'href',
      '/category/tea-and-coffee',
    );
    expect(screen.getByRole('link', { name: 'Ice Cream' })).toHaveAttribute(
      'href',
      '/category/ice-cream',
    );
    expect(screen.getByRole('link', { name: 'Cleaning Supplies' })).toHaveAttribute(
      'href',
      '/category/cleaning-supplies',
    );
    expect(screen.queryByText('Breakfast')).not.toBeInTheDocument();
    expect(screen.queryByText('Snacks & Drinks')).not.toBeInTheDocument();
  });
});
