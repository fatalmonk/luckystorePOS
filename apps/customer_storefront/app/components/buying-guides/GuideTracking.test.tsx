import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addToCart, rememberBuyingGuide } = vi.hoisted(() => ({
  addToCart: vi.fn(),
  rememberBuyingGuide: vi.fn(),
}));

vi.mock('../CartProvider', () => ({ useCartContext: () => ({ addToCart }) }));
vi.mock('../../lib/analytics', () => ({
  rememberBuyingGuide,
  sendAnalyticsEvent: vi.fn(),
  trackBuyingGuideView: vi.fn(),
}));

import { GuideAddToCartButton } from './GuideTracking';
import { getPromotionalPrice } from '../../lib/storefront-promotions';

const product = {
  id: 'd0bdf0ae-dd95-4ea7-9a40-fdc8f3f7ce00',
  name: 'Olympic Energy Plus Biscuits 150g',
  emoji: '',
  price: 30,
  originalPrice: 35,
  unit: '150g',
  category: 'Biscuits & Cookies',
  category_id: 'f17d879c-9f74-49bc-969d-d62e03a07fc1',
  stock: 2,
  description: 'A selected biscuit pack.',
  image_url: 'https://images.luckystore1947.com/products/SN-OLY-NRG-150G.webp',
  brand: 'Olympic',
};

describe('buying-guide direct cart action', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('keeps the approved MRP basis available to promotion pricing', () => {
    expect(getPromotionalPrice(product, [{
      item_id: product.id,
      expected_name: product.name,
      expected_price: 30,
      expected_mrp: 35,
      discount_percent: 10,
      starts_at: '2026-01-01T00:00:00Z',
      ends_at: '2027-01-01T00:00:00Z',
    }], new Date('2026-10-17T00:00:00Z'))).toBe(27);
  });

  it('refreshes guide attribution and uses the existing cart path', () => {
    addToCart.mockReturnValue(true);
    render(<GuideAddToCartButton product={product} slug="biscuits-bangladesh" revision={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Olympic Energy Plus Biscuits 150g to cart' }));
    expect(rememberBuyingGuide).toHaveBeenCalledWith('biscuits-bangladesh', 1);
    expect(addToCart).toHaveBeenCalledWith(product);
    expect(screen.getByRole('status').textContent).toContain('Added to cart');
  });

  it('reports the existing cart rejection without claiming success', () => {
    addToCart.mockReturnValue(false);
    render(<GuideAddToCartButton product={product} slug="biscuits-bangladesh" revision={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Olympic Energy Plus Biscuits 150g to cart' }));
    expect(screen.getByRole('status').textContent).toContain('Already at the available stock limit');
  });
});
