import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCartContext } from '../components/CartProvider';
import { ToastProvider } from '../components/Toast';
import { useProductCart } from './useProductCart';
import type { Product } from '../lib/types';

const { routerState } = vi.hoisted(() => ({ routerState: { pathname: '/shop' } }));
vi.mock('next/navigation', () => ({ usePathname: () => routerState.pathname }));

const product: Product = {
  id: 'rice-1', name: 'Rice', emoji: '', price: 100, unit: '1 kg', category: 'rice',
  stock: 5, description: 'Rice',
};

function CartControls() {
  const { quantity, add, decrement, announcement } = useProductCart(product);
  const { totalItems } = useCartContext();
  return <div>
    <button onClick={() => add()}>Add</button>
    <button onClick={decrement}>Remove</button>
    <output aria-label="quantity">{quantity}</output>
    <output aria-label="total items">{totalItems}</output>
    <div role="status" aria-label="cart announcement">{announcement}</div>
  </div>;
}

describe('useProductCart announcements', () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it.each([
    { pathname: '/shop', added: 'Rice added to cart', removed: 'Removed one Rice from cart', summary: 'Your cart' },
    { pathname: '/bn/shop', added: 'Rice ব্যাগে যোগ করা হয়েছে', removed: 'ব্যাগ থেকে Rice একটি সরানো হয়েছে', summary: 'আপনার ব্যাগ' },
  ])('announces add and remove in $pathname locale', async ({ pathname, added, removed, summary }) => {
    routerState.pathname = pathname;
    render(<CartProvider><ToastProvider><CartControls /></ToastProvider></CartProvider>);
    await waitFor(() => expect(screen.getByLabelText('total items')).toHaveTextContent('0'));

    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => {
      expect(screen.getByLabelText('quantity')).toHaveTextContent('1');
      expect(screen.getByLabelText('total items')).toHaveTextContent('1');
      expect(screen.getByLabelText('cart announcement')).toHaveTextContent(added);
      expect(screen.getByText(summary)).toBeInTheDocument();
    });
    const toastRegion = screen.getByRole('region');
    if (pathname === '/shop') expect(toastRegion).toHaveTextContent('1 item');
    else expect(toastRegion).toHaveTextContent('১ টি পণ্য');

    fireEvent.click(screen.getByText('Remove'));
    await waitFor(() => {
      expect(screen.getByLabelText('quantity')).toHaveTextContent('0');
      expect(screen.getByLabelText('total items')).toHaveTextContent('0');
      expect(screen.getByLabelText('cart announcement')).toHaveTextContent(removed);
    });
  });
});
