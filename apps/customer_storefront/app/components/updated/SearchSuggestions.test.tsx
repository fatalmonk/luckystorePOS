import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchSuggestions } from './SearchSuggestions';

describe('SearchSuggestions', () => {
  it('uses explicit storefront surface and foreground tokens', () => {
    render(
      <SearchSuggestions
        query=""
        recentSearches={['Milk']}
        popularSearches={['Eggs']}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const suggestions = screen.getByRole('region', { name: 'Search suggestions' });
    expect(suggestions).toHaveClass('bg-warm-surface', 'text-warm-fg');
    expect(screen.getByRole('button', { name: 'Milk' })).toHaveClass('text-warm-fg');
    expect(screen.getByRole('button', { name: 'Eggs' })).toHaveClass('text-warm-fg');
  });

  it('selects a suggestion and closes on Escape', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <SearchSuggestions
        query=""
        recentSearches={[]}
        popularSearches={['Rice']}
        onSelect={onSelect}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rice' }));
    expect(onSelect).toHaveBeenCalledWith('Rice');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
