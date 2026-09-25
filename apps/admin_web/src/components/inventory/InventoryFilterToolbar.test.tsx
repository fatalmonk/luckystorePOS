import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InventoryFilterToolbar } from './InventoryFilterToolbar';

describe('InventoryFilterToolbar', () => {
  it('stacks on small screens so inventory search keeps the full row width', () => {
    render(
      <InventoryFilterToolbar
        searchTerm=""
        onSearchChange={vi.fn()}
        sortBy="name-asc"
        onSortChange={vi.fn()}
        onOpenBarcode={vi.fn()}
        onViewChange={vi.fn()}
      />,
    );

    const search = screen.getByRole('textbox', { name: 'Search inventory by name or SKU' });
    expect(search.parentElement?.parentElement).toHaveClass('flex-col', 'sm:flex-row');
    expect(search.parentElement).toHaveClass('w-full');
  });
});
