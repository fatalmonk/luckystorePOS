import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CampaignGrid } from './CampaignGrid';

const scrollBy = vi.fn();

describe('CampaignGrid', () => {
  beforeEach(() => {
    scrollBy.mockReset();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    Element.prototype.scrollBy = scrollBy;
  });

  it('gives the hero a clear story, destinations, and decorative imagery', () => {
    render(<CampaignGrid />);

    const title = screen.getByRole('heading', {
      name: 'Groceries you know, delivered across Chittagong.',
    });
    const hero = title.closest('section');
    expect(hero).not.toBeNull();

    const destinations = [
      ['Browse groceries', '/category'],
      ['Explore everyday groceries', '/category'],
      ['Shop Buldak ramen deals', '/search?q=buldak'],
      ['Shop dairy and eggs', '/category/dairy-and-eggs'],
      ['Shop tea and coffee', '/category/tea-&-coffee'],
    ] as const;

    for (const [name, href] of destinations) {
      expect(within(hero!).getByRole('link', { name })).toHaveAttribute('href', href);
    }

    const images = hero!.querySelectorAll('img');
    expect(images).toHaveLength(5);
    for (const image of images) {
      expect(image).toHaveAttribute('alt', '');
    }

    expect(images[2]).toHaveAttribute(
      'srcset',
      expect.stringContaining('promo_buldak_1200.webp 1024w'),
    );
    expect(images[3]).toHaveAttribute('srcset', expect.stringContaining('promo_dairy_600.webp'));
    expect(images[3]).not.toHaveAttribute('srcset', expect.stringContaining('promo_dairy_1200.webp'));
    expect(images[4]).toHaveAttribute('srcset', expect.stringContaining('promo_tea_coffee_1200.webp'));
    expect(within(hero!).queryByText('Local delivery')).not.toBeInTheDocument();
    expect(within(hero!).getByText('Stocked daily')).toBeInTheDocument();
    expect(within(hero!).queryByRole('link', { name: 'How ordering works' })).not.toBeInTheDocument();
    expect(within(hero!).queryByText(/Local Reviews/i)).not.toBeInTheDocument();
  });

  it('offers named reel controls and keyboard scrolling', () => {
    render(<CampaignGrid />);

    const reel = screen.getByRole('region', { name: 'Featured campaign carousel' });
    expect(reel).toHaveAttribute('tabindex', '0');
    expect(reel).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByText('Scroll, swipe, or use the arrow keys.')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Previous campaign' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Next campaign' })).toHaveLength(1);

    Object.defineProperty(reel, 'clientWidth', { configurable: true, value: 500 });
    fireEvent.keyDown(reel, { key: 'ArrowRight' });
    expect(scrollBy).toHaveBeenCalledWith({ left: 360, behavior: 'smooth' });

    fireEvent.click(screen.getAllByRole('button', { name: 'Previous campaign' })[0]);
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -360, behavior: 'smooth' });
  });

  it('uses shared semantic campaign roles and readable functional type', () => {
    render(<CampaignGrid />);

    const hero = screen
      .getByRole('heading', { name: 'Groceries you know, delivered across Chittagong.' })
      .closest('section')!;

    expect(hero).toHaveClass('campaign-hero');
    expect(hero.querySelectorAll('.campaign-card-content')).toHaveLength(4);
    expect(hero.querySelectorAll('.campaign-kicker')).toHaveLength(6);
    expect(hero.querySelectorAll('.campaign-card-action')).toHaveLength(4);
  });
});
