import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HeaderCartButton } from './HeaderCartButton';

vi.mock('../hooks/useCartSheet', () => ({ useCartSheet: () => ({ open: vi.fn() }) }));
const cart = vi.hoisted(() => ({ totalItems: 0, total: 0, isLoaded: true }));
vi.mock('./CartProvider', () => ({
  useCartContext: () => cart,
}));

describe('HeaderCartButton', () => {
  beforeEach(() => Object.assign(cart, { totalItems: 0, total: 0, isLoaded: true }));

  it.each([false, true])('reserves saffron for a loaded, populated cart (compact=%s)', (compact) => {
    const { rerender } = render(<HeaderCartButton compact={compact} />);
    const surface = compact ? 'before:bg-warm-accent' : 'bg-warm-accent';
    expect(screen.getByRole('button', { name: 'Cart (empty)' })).not.toHaveClass(surface);

    Object.assign(cart, { totalItems: 2, total: 100, isLoaded: false });
    rerender(<HeaderCartButton compact={compact} />);
    expect(screen.getByRole('button', { name: 'Cart (empty)' })).not.toHaveClass(surface);

    cart.isLoaded = true;
    rerender(<HeaderCartButton compact={compact} />);
    expect(screen.getByRole('button', { name: /Cart \(2 items/ })).toHaveClass(surface);

    cart.totalItems = 0;
    rerender(<HeaderCartButton compact={compact} />);
    expect(screen.getByRole('button', { name: 'Cart (empty)' })).not.toHaveClass(surface);
  });

  it('uses a clear, centered 20px cart mark', () => {
    render(<HeaderCartButton />);

    const button = screen.getByRole('button', { name: 'Cart (empty)' });
    expect(button.querySelector('svg')).toHaveAttribute('width', '20');
    expect(button.querySelector('svg')).toHaveAttribute('height', '20');
  });
});
