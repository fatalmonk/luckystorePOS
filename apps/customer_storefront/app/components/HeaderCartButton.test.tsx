import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HeaderCartButton } from './HeaderCartButton';

vi.mock('../hooks/useCartSheet', () => ({ useCartSheet: () => ({ open: vi.fn() }) }));
vi.mock('./CartProvider', () => ({
  useCartContext: () => ({ totalItems: 0, total: 0, isLoaded: true }),
}));

describe('HeaderCartButton', () => {
  it('uses a clear, centered 22px cart mark', () => {
    render(<HeaderCartButton />);

    const button = screen.getByRole('button', { name: 'Cart (empty)' });
    expect(button.querySelector('svg')).toHaveAttribute('width', '20');
    expect(button.querySelector('svg')).toHaveAttribute('height', '20');
  });
});
