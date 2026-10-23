import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { InventoryItem } from '../../types/inventory';
import { InventoryProductCard } from './InventoryProductCard';

const item = {
  id: 'item-1',
  name: 'Long product name for spacing checks',
  cost: 10,
  price: 15,
  current_qty: 8,
  image_url: null,
} as InventoryItem;

describe('InventoryProductCard action targets', () => {
  it('provides large labeled action and selection targets without crowding the title', () => {
    const onToggleSelect = vi.fn();
    const onViewHistory = vi.fn();
    render(
      <InventoryProductCard
        item={item}
        onToggleSelect={onToggleSelect}
        onViewHistory={onViewHistory}
      />,
    );

    const actions = screen.getByRole('button', { name: `Actions for ${item.name}` });
    expect(actions).toHaveClass('w-11', 'h-11', 'focus-visible:ring-2');
    fireEvent.click(actions);
    expect(actions).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(onViewHistory).toHaveBeenCalledWith(item);

    const selection = screen.getByRole('checkbox', { name: `Select ${item.name}` });
    expect(selection.parentElement).toHaveClass('w-11', 'h-11', 'focus-within:ring-2');
    fireEvent.click(selection);
    expect(onToggleSelect).toHaveBeenCalledWith(item.id);
    const heading = screen.getByRole('heading', { name: item.name });
    expect(heading).not.toHaveClass('pl-12');
    expect(heading).not.toHaveClass('pr-12');
  });
});
