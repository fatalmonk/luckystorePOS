import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Product } from '../lib/types';
import { HomeShell } from './HomeShell';

const renderedShelves: Array<{
  weeklyDealProducts: Product[];
  discountedProductCount: number;
  weeklyPicks: Product[];
  weeklyEditionActive: boolean;
}> = [];

vi.mock('./updated/Header', () => ({ Header: () => <header /> }));
vi.mock('./updated/Footer', () => ({ Footer: () => <footer /> }));
vi.mock('./BottomNav', () => ({ BottomNav: () => null }));
vi.mock('./CartStorageNotice', () => ({ CartStorageNotice: () => null }));
vi.mock('./CampaignGrid', () => ({ CampaignGrid: () => null }));
vi.mock('./HomePromoBanners', () => ({ HomeTeaBanner: () => null }));
vi.mock('./ProductGridSection', () => ({ ProductGridSection: () => null }));
vi.mock('./InstallPromptBootstrap', () => ({ InstallPromptBootstrap: () => null }));
vi.mock('./DeferredHomeShelves', () => ({
  DeferredHomeShelves: (props: {
    weeklyDealProducts: Product[];
    discountedProductCount: number;
    weeklyPicks: Product[];
    weeklyEditionActive: boolean;
  }) => {
    renderedShelves.push(props);
    return <div data-testid="home-shelves" />;
  },
}));

function product(id: string, discount: number): Product {
  return {
    id,
    category: 'Snacks',
    name: `Deal ${id}`,
    emoji: '🛒',
    price: 100 - discount,
    originalPrice: 100,
    unit: 'pc',
    stock: 5,
    description: 'Discounted product',
  };
}

function renderHome(inStock: Product[], extras: Partial<React.ComponentProps<typeof HomeShell>> = {}) {
  renderedShelves.length = 0;
  return render(
    <HomeShell
      inStock={inStock}
      dealsProducts={[]}
      morningProducts={[]}
      pantryProducts={[]}
      featuredProducts={[]}
      campaignProducts={[]}
      {...extras}
    />,
  );
}

describe('HomeShell weekly deals', () => {
  it('sends only the lead and eight supporting deals the rail renders', () => {
    const products = Array.from({ length: 12 }, (_, index) => product(`p${index + 1}`, 50 - index));
    renderHome(products);

    const shelves = renderedShelves[0];
    expect(shelves.weeklyDealProducts).toHaveLength(9);
    expect(shelves.weeklyDealProducts.map((item) => item.id)).toEqual([
      'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9',
    ]);
    expect(shelves.discountedProductCount).toBe(12);
    expect(screen.getByTestId('home-shelves')).toBeInTheDocument();
  });

  it('keeps the separate discounted-product count capped without shipping every discounted product', () => {
    const products = Array.from({ length: 60 }, (_, index) => product(`p${index + 1}`, 70));
    renderHome(products);

    expect(renderedShelves[0].weeklyDealProducts).toHaveLength(9);
    expect(renderedShelves[0].discountedProductCount).toBe(48);
  });

  it('keeps an active weekly campaign pick list instead of replacing it with ranked discounts', () => {
    const ranked = Array.from({ length: 12 }, (_, index) => product(`ranked-${index + 1}`, 40 - index));
    const picks = [product('pick-a', 11), product('pick-b', 12), product('pick-c', 13)];
    renderHome(ranked, { weeklyEditionActive: true, weeklyPicks: picks });

    expect(renderedShelves[0].weeklyDealProducts).toEqual([]);
    expect(renderedShelves[0].weeklyPicks.map((item) => item.id)).toEqual(['pick-a', 'pick-b', 'pick-c']);
    expect(renderedShelves[0].discountedProductCount).toBe(12);
  });
});
