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

  it('localizes a missing-image fallback in Bengali', () => {
    render(<ProductImage alt={'\u099a\u09be'} category="Tea" sizes="100px" locale="bn" />);
    const fallback = screen.getByTestId('product-image-fallback');
    expect(fallback.getAttribute('aria-label')).toContain('\u099a\u09be');
    expect(fallback.getAttribute('aria-label')).toContain('\u099b\u09ac\u09bf');
    expect(fallback.getAttribute('aria-label')).not.toMatch(/image|unavailable/i);
  });

  it('keeps the Bengali locale when a loaded image fails', () => {
    render(<ProductImage src="https://example.com/broken.webp" alt={'\u099a\u09be'} category="Tea" sizes="100px" locale="bn" />);
    fireEvent.error(screen.getByRole('img', { name: '\u099a\u09be' }));
    const fallback = screen.getByTestId('product-image-fallback');
    expect(fallback.getAttribute('aria-label')).toContain('\u099a\u09be');
    expect(fallback.getAttribute('aria-label')).toContain('\u099b\u09ac\u09bf');
    expect(fallback.getAttribute('aria-label')).not.toMatch(/image|unavailable/i);
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
  it('uses resized Cloudflare candidates when storefront image resizing is enabled', () => {
    vi.stubEnv('NEXT_PUBLIC_IMAGE_RESIZE', '1');
    try {
      render(
        <ProductImage
          src="https://images.luckystore1947.com/products/item.webp?t=123"
          alt="Resized packshot"
          sizes="(max-width: 640px) 50vw, 301px"
        />,
      );
      const image = screen.getByRole('img', { name: 'Resized packshot' });
      expect(image.getAttribute('srcSet')).toContain('/cdn-cgi/image/width=320,quality=75,format=auto,fit=scale-down/products/item.webp?t=123 320w');
      expect(image).toHaveAttribute('loading', 'lazy');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('keeps an unfetched lazy image instead of showing the unavailable fallback', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);
    vi.spyOn(HTMLImageElement.prototype, 'currentSrc', 'get').mockReturnValue('');

    render(
      <ProductImage
        src="https://example.com/lazy.webp"
        alt="Lazy item"
        category="Snacks"
        sizes="100px"
        showLoadingState
      />,
    );

    expect(screen.getByRole('img', { name: 'Lazy item' })).toBeInTheDocument();
    expect(screen.queryByTestId('product-image-fallback')).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('replaces an image that already failed before the error listener attached', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);
    vi.spyOn(HTMLImageElement.prototype, 'currentSrc', 'get').mockReturnValue('https://example.com/broken.webp');

    render(
      <ProductImage
        src="https://example.com/broken.webp"
        alt="Broken item"
        category="Snacks"
        sizes="100px"
      />,
    );

    expect(screen.getByRole('img', { name: 'Broken item image unavailable' })).toBeInTheDocument();
    vi.restoreAllMocks();
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
