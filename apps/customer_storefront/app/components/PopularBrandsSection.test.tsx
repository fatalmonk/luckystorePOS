import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PopularBrandsSection } from './PopularBrandsSection';

describe('PopularBrandsSection', () => {
  it('renders English popular brands section with semantic heading and links', () => {
    render(<PopularBrandsSection locale="en" />);

    const heading = screen.getByRole('heading', { level: 2, name: /Shop Popular Brands/i });
    expect(heading).toBeInTheDocument();

    const seeAllLink = screen.getByRole('link', { name: /See all — Shop Popular Brands/i });
    expect(seeAllLink).toHaveAttribute('href', '/brand');

    const brandLink = screen.getByRole('link', { name: /Radhuni/i });
    expect(brandLink).toHaveAttribute('href', '/brand/radhuni');

    const reel = screen.getByRole('region', { name: /Shop Popular Brands brands/i });
    expect(reel).toHaveClass('grid-reel');
  });

  it('renders Bengali popular brands section with localized content and links', () => {
    render(<PopularBrandsSection locale="bn" />);

    const heading = screen.getByRole('heading', { level: 2, name: /জনপ্রিয় ব্র্যান্ডসমূহ/i });
    expect(heading).toBeInTheDocument();

    const seeAllLink = screen.getByRole('link', { name: /সব দেখুন — জনপ্রিয় ব্র্যান্ডসমূহ/i });
    expect(seeAllLink).toHaveAttribute('href', '/bn/brand');

    const brandLink = screen.getByRole('link', { name: /রাঁধুনী/i });
    expect(brandLink).toHaveAttribute('href', '/bn/brand/radhuni');

    const reel = screen.getByRole('region', { name: /জনপ্রিয় ব্র্যান্ডসমূহ brands/i });
    expect(reel).toHaveClass('grid-reel');
  });
});
