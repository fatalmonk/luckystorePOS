import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroBanner } from './HeroBanner';

describe('HeroBanner', () => {
  it('uses slide title as informative alt fallback when image alt is missing and text is shown', () => {
    render(
      <HeroBanner
        slides={[
          {
            image: { src: '/banners/deals.webp' },
            title: 'Weekly deals',
            subtitle: 'Save on essentials',
          },
        ]}
      />,
    );

    expect(screen.getByRole('img', { name: 'Weekly deals' })).toBeInTheDocument();
  });

  it('keeps hideText slides decorative when no explicit image alt is provided', () => {
    const { container } = render(
      <HeroBanner
        slides={[
          {
            image: { src: '/banners/promo.webp' },
            title: 'Promo',
            subtitle: '',
            hideText: true,
          },
        ]}
      />,
    );

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('aria-hidden', 'true');
  });

  it('prefers explicit responsive image alt over slide title', () => {
    render(
      <HeroBanner
        slides={[
          {
            image: { src: '/banners/deals.webp', alt: 'Lucky Store weekly deals banner' },
            title: 'Weekly deals',
            subtitle: 'Save on essentials',
          },
        ]}
      />,
    );

    expect(screen.getByRole('img', { name: 'Lucky Store weekly deals banner' })).toBeInTheDocument();
  });
});
