import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductImage } from './ProductImage';

vi.mock('next/image', () => ({
  default: ({ fill: _fill, priority: _priority, alt = '', ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

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

  it('replaces a failed image without exposing a broken-image fallback', () => {
    render(
      <ProductImage
        src="https://example.com/broken.webp"
        alt="Broken item"
        category="Snacks"
        sizes="100px"
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'Broken item' }));
    expect(screen.getByRole('img', { name: 'Broken item image unavailable' })).toBeInTheDocument();
  });
});
