import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CartItemRow } from './CartItemRow';

describe('CartItemRow quantity controls', () => {
  it('uses fixed, labeled 44px controls with visible keyboard focus styles', () => {
    const onUpdateQty = vi.fn();
    render(
      <CartItemRow
        item={{ product: { id: 'item-1', name: 'Sample item', price: 12 }, qty: 2 }}
        onUpdateQty={onUpdateQty}
        onRemoveFromCart={vi.fn()}
      />,
    );

    const decrease = screen.getByRole('button', { name: 'Decrease quantity' });
    expect(decrease).toHaveClass(
      'w-11', 'h-11', 'shrink-0', 'focus-visible:ring-2',
    );
    fireEvent.click(decrease);
    expect(onUpdateQty).toHaveBeenCalledWith('item-1', 1);

    const increase = screen.getByRole('button', { name: 'Increase quantity' });
    expect(increase).toHaveClass(
      'w-11', 'h-11', 'shrink-0', 'focus-visible:ring-2',
    );
    fireEvent.click(increase);
    expect(onUpdateQty).toHaveBeenCalledWith('item-1', 3);
  });
});
