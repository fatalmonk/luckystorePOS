import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductClient from './ProductClient';
import { createProductId } from '../../../lib/products/types';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../../../components/updated/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock('../../../components/BottomNav', () => ({
  BottomNav: () => <div data-testid="bottom-nav" />,
}));

vi.mock('../../../components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../../components/CartProvider', () => ({
  useCartContext: () => ({
    cart: [],
    addToCart: vi.fn(),
    updateQty: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({ addViewed: vi.fn() }),
}));

vi.mock('../../../lib/analytics', () => ({
  trackViewItem: vi.fn(),
  trackViewItemList: vi.fn(),
}));

describe('ProductClient Brand Linking', () => {
  const mockProduct = {
    id: createProductId('p-ispahani-200g'),
    name: "Ispahani Blender's Choice Premium Black Tea 200g",
    brand: 'Ispahani',
    category: 'Tea & Coffee',
    price: 160,
    unit: '200g',
    stock: 5,
    description: 'Fresh black tea from Ispahani.',
    emoji: '☕',
  };

  it('renders brand links to dedicated brand hub in English locale', () => {
    render(<ProductClient product={mockProduct} crossSell={[]} locale="en" />);

    // Brand link in subtitle below product title
    const brandLinks = screen.getAllByRole('link', { name: 'Ispahani' });
    expect(brandLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of brandLinks) {
      expect(link).toHaveAttribute('href', '/brand/ispahani');
    }
  });

  it('renders brand links to dedicated brand hub in Bengali locale', () => {
    render(<ProductClient product={mockProduct} crossSell={[]} locale="bn" />);

    const brandLinks = screen.getAllByRole('link', { name: 'Ispahani' });
    expect(brandLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of brandLinks) {
      expect(link).toHaveAttribute('href', '/bn/brand/ispahani');
    }
  });

  it('links brand in specifications table when provided via enrichment', () => {
    const mockEnriched = {
      exactName: "Ispahani Blender's Choice Premium Black Tea 200g",
      brand: 'Ispahani',
      netQuantity: '200g',
      category: 'Tea & Coffee',
      summary: 'Premium tea from Ispahani.',
      specifications: [
        { label: 'Brand', value: 'Ispahani' },
        { label: 'Net Weight', value: '200g' },
      ],
      highlights: [],
      faqs: [],
      evidenceRefs: {},
      fieldEvidence: {
        exactName: ['PACK_FRONT'],
        brand: ['PACK_FRONT'],
        netQuantity: ['PACK_FRONT'],
        category: ['TAXONOMY'],
        summary: ['EDITORIAL'],
      },
    };

    render(
      <ProductClient
        product={mockProduct}
        crossSell={[]}
        locale="en"
        enrichment={mockEnriched as any}
      />,
    );

    const brandLinks = screen.getAllByRole('link', { name: 'Ispahani' });
    // Should have both subtitle and table links
    expect(brandLinks.length).toBe(2);
    expect(brandLinks[0]).toHaveAttribute('href', '/brand/ispahani');
    expect(brandLinks[1]).toHaveAttribute('href', '/brand/ispahani');
  });

  it('links unknown brand to brand directory fallback', () => {
    const unknownProduct = {
      ...mockProduct,
      brand: 'Custom Local Brand',
    };

    render(<ProductClient product={unknownProduct} crossSell={[]} locale="en" />);

    const brandLinks = screen.getAllByRole('link', { name: 'Custom Local Brand' });
    expect(brandLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of brandLinks) {
      expect(link).toHaveAttribute('href', '/brand');
    }
  });
});
