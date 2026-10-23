import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductImage } from './ProductImage';

describe('ProductImage', () => {
  it('renders a known category-family glyph when an image is missing', () => {
    render(<ProductImage alt="Milk" category="Dairy & Eggs" sizes="100px" />);

    expect(screen.getByRole('img', { name: 'Milk image unavailable' })).toBeInTheDocument();
    expect(screen.queryByText('🥛')).not.toBeInTheDocument();
    expect(screen.queryByText('Lucky Store')).not.toBeInTheDocument();
  });

  it('uses the branded neutral fallback for an unknown category', () => {
    render(<ProductImage alt="Mystery item" category="Miscellaneous" sizes="100px" />);

    expect(screen.getByText('Lucky Store')).toBeInTheDocument();
  });

  it('treats the legacy missing-image path as unavailable without requesting it', () => {
    render(
      <ProductImage
        src="/images/products/default.svg"
        alt="Legacy placeholder"
        category="Snacks"
        sizes="100px"
      />,
    );

    expect(
      screen.getByRole('img', { name: 'Legacy placeholder image unavailable' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Legacy placeholder' })).not.toBeInTheDocument();
  });

  it('replaces a failed image without exposing a broken-image fallback', () => {
    render(
      <ProductImage
        src="https://example.com/broken.webp"
        alt="Broken item"
        category="Snacks"
        sizes="100px"
      />,
    );

    const image = screen.getByRole('img', { name: 'Broken item' });
    expect(image.getAttribute('src')).toContain(encodeURIComponent('https://example.com/broken.webp'));

    fireEvent.error(image);
    expect(screen.getByRole('img', { name: 'Broken item image unavailable' })).toBeInTheDocument();
  });

  it('requests responsive image candidates for product photos', () => {
    render(
      <ProductImage
        src="https://images.luckystore1947.com/products/item.webp"
        alt="Product packshot"
        category="Snacks"
        sizes="(max-width: 640px) 50vw, 240px"
      />,
    );

    const image = screen.getByRole('img', { name: 'Product packshot' });
    expect(image.getAttribute('srcSet')).toContain('/_next/image?url=');
    expect(image).toHaveAttribute('sizes', '(max-width: 640px) 50vw, 240px');
  });

  it('hides the loading placeholder when a cached image is already complete on mount', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(120);

    render(
      <ProductImage
        src="https://example.com/cached.webp"
        alt="Cached item"
        category="Snacks"
        sizes="100px"
        showLoadingState
      />,
    );

    expect(screen.queryByTestId('product-image-loading')).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
