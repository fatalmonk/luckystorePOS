import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CategoryHero } from './CategoryHero';

describe('CategoryHero', () => {
  it('renders the category as the page heading with its description and result count', () => {
    const { container } = render(
      <CategoryHero
        name="Tea & Coffee"
        description="Packaged tea and coffee from familiar brands."
        productCount={12}
        imageUrl="/banners/tea.webp"
        icon={<span>Tea</span>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Tea & Coffee' })).toBeInTheDocument();
    expect(screen.getByText('Packaged tea and coffee from familiar brands.')).toBeInTheDocument();
    expect(screen.getByText('12 products')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('keeps a compact mobile banner and exposes an accessible optional back action', () => {
    const onBack = vi.fn();
    const { container } = render(<CategoryHero name="Snacks" onBack={onBack} productCount={0} />);

    expect(container.querySelector('.h-40')).toBeInTheDocument();
    expect(container.querySelector('.sm\\:h-48')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Go back' }).click();
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.getByText('0 products')).toBeInTheDocument();
  });
});
