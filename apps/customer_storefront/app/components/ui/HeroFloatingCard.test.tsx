import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HeroDiscoveryRail } from './HeroFloatingCard';
import type { Product } from '../../lib/types';

const products: Product[] = [
  {
    id: 'rice-1',
    name: 'Miniket Rice',
    price: 620,
    unit: '5 kg',
    category: 'rice & grain',
    stock: 12,
    emoji: '🍚',
    description: 'Everyday rice for family meals.',
  },
  {
    id: 'milk-1',
    name: 'Fresh Milk',
    price: 90,
    unit: '1 liter',
    category: 'dairy & eggs',
    stock: 0,
    emoji: '🥛',
    description: 'Fresh milk for everyday use.',
  },
];

describe('HeroDiscoveryRail', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    document.body.removeAttribute('data-header-hidden');
  });

  it('renders a grocery search form, suggested searches, and real in-stock products', () => {
    render(<HeroDiscoveryRail products={products} />);

    expect(screen.getByRole('search', { name: 'Search groceries' })).toHaveAttribute(
      'action',
      '/category',
    );
    expect(screen.getByRole('searchbox')).toHaveAttribute('name', 'q');
    expect(screen.getByRole('link', { name: 'Rice' })).toHaveAttribute('href', '/category?q=rice');
    expect(screen.getByRole('link', { name: 'Snacks' })).toHaveAttribute('href', '/category/snacks');
    expect(screen.getByRole('link', { name: 'Cleaning' })).toHaveAttribute(
      'href',
      '/category/cleaning-supplies',
    );

    const rail = screen.getByLabelText('A few essentials to get you started products');
    expect(within(rail).getByRole('link', { name: /Miniket Rice/ })).toHaveAttribute(
      'href',
      '/product/miniket-rice--rice1',
    );
    expect(within(rail).queryByRole('link', { name: /Fresh Milk/ })).not.toBeInTheDocument();
  });

  it('does not render fake rating or review signals', () => {
    render(<HeroDiscoveryRail products={products} />);

    expect(screen.queryByText(/reviews/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Top Choice/i)).not.toBeInTheDocument();
  });

  it('renders shortcut icons with text-warm-fg and group-hover:text-warm-accent-text for contrast', () => {
    const { container } = render(<HeroDiscoveryRail products={products} />);
    const mobileIconWell = container.querySelector('.hero-discovery .group span.rounded-full');
    expect(mobileIconWell).toHaveClass('text-warm-fg');
    expect(mobileIconWell).toHaveClass('group-hover:text-warm-accent-text');
    expect(mobileIconWell).not.toHaveClass('text-warm-accent-text');
  });

  it('manages sticky search state on mobile/tablet when scroll reaches search component and header hides', () => {
    let rafCallback: FrameRequestCallback = () => {};
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });

    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 1023px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<HeroDiscoveryRail products={products} />);
    const anchor = container.querySelector('[data-sticky-search-anchor="true"]');
    const searchWrapper = container.querySelector('[data-sticky-search]');
    expect(anchor).toBeInTheDocument();
    expect(searchWrapper).toHaveAttribute('data-sticky-search', 'false');

    // Mock anchor getBoundingClientRect to indicate scroll reached search component
    if (anchor) {
      vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
        top: -10,
        bottom: 46,
        left: 0,
        right: 375,
        width: 375,
        height: 56,
        x: 0,
        y: -10,
        toJSON: () => {},
      });
    }

    // Set header hidden on body, scrollY > 40 and trigger scroll
    act(() => {
      window.scrollY = 200;
      document.body.setAttribute('data-header-hidden', 'true');
      window.dispatchEvent(new Event('scroll'));
      rafCallback(0);
    });

    expect(document.body.querySelector('[data-sticky-search="true"]')).toBeInTheDocument();
    const stickyWrapper = document.body.querySelector('[data-sticky-search="true"]');
    expect(stickyWrapper).toHaveClass('fixed');
    expect(stickyWrapper).toHaveClass('top-0');
    expect(stickyWrapper).toHaveClass('translate-y-0');

    // When scrolling up, header shows (header-visibility-change { hidden: false })
    act(() => {
      window.dispatchEvent(
        new CustomEvent('header-visibility-change', { detail: { hidden: false } }),
      );
    });
    expect(stickyWrapper).toHaveClass('-translate-y-full');

    // When header hides again (scrolling down), search component translates back into view
    act(() => {
      window.dispatchEvent(
        new CustomEvent('header-visibility-change', { detail: { hidden: true } }),
      );
    });
    expect(stickyWrapper).toHaveClass('translate-y-0');

    window.matchMedia = originalMatchMedia;
  });

  it('keeps search component static on desktop viewport even when scrolled down', () => {
    let rafCallback: FrameRequestCallback = () => {};
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });

    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false, // Desktop >= 1024px
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<HeroDiscoveryRail products={products} />);
    const anchor = container.querySelector('[data-sticky-search-anchor="true"]');
    const searchWrapper = container.querySelector('[data-sticky-search]');

    if (anchor) {
      vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
        top: -100,
        bottom: -44,
        left: 0,
        right: 1200,
        width: 1200,
        height: 56,
        x: 0,
        y: -100,
        toJSON: () => {},
      });
    }

    act(() => {
      window.scrollY = 200;
      document.body.setAttribute('data-header-hidden', 'true');
      window.dispatchEvent(new Event('scroll'));
      rafCallback(0);
    });

    expect(searchWrapper).toHaveAttribute('data-sticky-search', 'false');
    expect(searchWrapper).not.toHaveClass('fixed');

    window.matchMedia = originalMatchMedia;
  });
});
