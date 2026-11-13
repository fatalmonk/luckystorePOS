import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductImageGallery } from './ProductImageGallery';

const embla = vi.hoisted(() => {
  let selected = 0;
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const emit = (event: string) => listeners.get(event)?.forEach((listener) => listener(api));
  const api = {
    canScrollPrev: () => selected > 0,
    canScrollNext: () => selected < 2,
    scrollPrev: () => { selected = Math.max(0, selected - 1); emit('select'); },
    scrollNext: () => { selected = Math.min(2, selected + 1); emit('select'); },
    scrollTo: (index: number) => { selected = index; emit('select'); },
    selectedScrollSnap: () => selected,
    on: (event: string, listener: (...args: unknown[]) => void) => {
      const bucket = listeners.get(event) || new Set();
      bucket.add(listener);
      listeners.set(event, bucket);
    },
    off: (event: string, listener: (...args: unknown[]) => void) => listeners.get(event)?.delete(listener),
  };

  return {
    api,
    reset: () => { selected = 0; listeners.clear(); },
  };
});

vi.mock('embla-carousel-react', () => ({
  default: () => [() => undefined, embla.api],
}));

vi.mock('./ProductImage', () => ({
  ProductImage: ({ src, alt, locale }: { src?: string; alt: string; locale?: string }) => (
    <span role="img" aria-label={alt} data-src={src} data-locale={locale} />
  ),
}));

const images = [
  { url: '/front.webp', alt: 'Front of package' },
  { url: '/ingredients.webp', alt: 'Ingredients panel' },
  { url: '/nutrition.webp', alt: 'Nutrition panel' },
];

describe('ProductImageGallery', () => {
  beforeEach(() => embla.reset());

  it('renders one image without navigation or image selectors', () => {
    render(
      <ProductImageGallery
        images={[images[0]]}
        productName="Polar Vanilla"
        category="Ice-Cream"
        sizes="100vw"
      />
    );

    expect(screen.getByRole('img', { name: 'Front of package' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /product image|show image/i })).toBeNull();
  });

  it('shows the category fallback when the source image is explicitly unresolved', () => {
    render(
      <ProductImageGallery
        images={[]}
        productName="Polar Double Sundae"
        category="Ice-Cream"
        sizes="100vw"
      />
    );

    expect(screen.getByRole('img', { name: 'Polar Double Sundae' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /product image|show image/i })).toBeNull();
  });

  it('supports previous/next controls, indicator selection, and arrow keys', () => {
    render(
      <ProductImageGallery
        images={images}
        productName="Polar Vanilla"
        category="Ice-Cream"
        sizes="100vw"
      />
    );

    const carousel = screen.getByRole('region', { name: 'Polar Vanilla product images' });
    fireEvent.click(screen.getByRole('button', { name: 'Next product image' }));
    expect(screen.getByText('Image 2 of 3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Show image 3 of 3: Nutrition panel' }));
    expect(screen.getByText('Image 3 of 3')).toBeTruthy();

    fireEvent.keyDown(carousel, { key: 'ArrowLeft' });
    expect(screen.getByText('Image 2 of 3')).toBeTruthy();
  });

  it('renders a pack-size badge without baking it into the source image', () => {
    render(
      <ProductImageGallery
        images={[{ ...images[0], badge: '1/2 L' }]}
        productName="Polar Vanilla"
        category="Ice-Cream"
        sizes="100vw"
      />
    );

    expect(screen.getByText('1/2 L')).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('data-src')).toBe('/front.webp');
  });

  it('localizes Bengali gallery controls, role descriptions, and image counts', () => {
    const name = '\u099a\u09be';
    render(
      <ProductImageGallery
        images={images.map((image) => ({ ...image, alt: name }))}
        productName={name}
        category="Tea"
        sizes="100vw"
        locale="bn"
      />,
    );

    const carousel = screen.getByRole('region', { name: `${name} \u09aa\u09a3\u09cd\u09af\u09c7\u09b0 \u099b\u09ac\u09bf` });
    expect(carousel.getAttribute('aria-roledescription')).not.toBe('carousel');
    const next = screen.getByRole('button', { name: '\u09aa\u09a3\u09cd\u09af\u09c7\u09b0 \u09aa\u09b0\u09c7\u09b0 \u099b\u09ac\u09bf' });
    fireEvent.click(next);
    expect(screen.getByText('\u099b\u09ac\u09bf \u09e8 / \u09e9')).toBeInTheDocument();
    fireEvent.keyDown(carousel, { key: 'ArrowLeft' });
    expect(screen.getByText('\u099b\u09ac\u09bf \u09e7 / \u09e9')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /product image|show image/i })).toBeNull();
    expect(screen.getAllByRole('group').every((group) => group.getAttribute('aria-roledescription') !== 'slide')).toBe(true);
  });

  it('generates Bengali alternatives and selectors when an image alternative is absent', () => {
    const name = '\u099a\u09be';
    render(
      <ProductImageGallery
        images={[{ ...images[0], alt: '' }, { ...images[1], alt: '' }]}
        productName={name}
        category="Tea"
        sizes="100vw"
        locale="bn"
      />,
    );

    const firstAlt = `${name}, \u099b\u09ac\u09bf \u09e7`;
    expect(screen.getByRole('img', { name: firstAlt })).toHaveAttribute('data-locale', 'bn');
    expect(screen.getByRole('button', { name: `\u099b\u09ac\u09bf \u09e7 / \u09e8: ${firstAlt}` })).toBeInTheDocument();
  });

  it('passes the Bengali locale through to the missing-image fallback', () => {
    render(<ProductImageGallery images={[]} productName={'\u099a\u09be'} category="Tea" sizes="100vw" locale="bn" />);
    expect(screen.getByRole('img', { name: '\u099a\u09be' })).toHaveAttribute('data-locale', 'bn');
  });
});
