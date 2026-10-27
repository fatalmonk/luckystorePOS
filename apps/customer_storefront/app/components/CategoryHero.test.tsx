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
    expect(screen.getByRole('region', { name: 'Tea & Coffee' })).toBeInTheDocument();
    expect(screen.getByText('Packaged tea and coffee from familiar brands.')).toBeInTheDocument();
    expect(screen.getByText('12 products')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('keeps a compact mobile banner and exposes an accessible optional back action', () => {
    const onBack = vi.fn();
    const { container } = render(<CategoryHero name="Snacks" onBack={onBack} productCount={0} />);

    expect(container.querySelector('.h-48')).toBeInTheDocument();
    expect(container.querySelector('.lg\\:h-56')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Go back' }).click();
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.getByText('0 products')).toBeInTheDocument();
  });

  it('localizes the product count for Bengali shoppers', () => {
    render(<CategoryHero name="চা" locale="bn" productCount={12} />);
    expect(screen.getByText('১২ টি পণ্য')).toBeInTheDocument();

  });

  it('omits the count when the complete result count is unavailable', () => {
    render(<CategoryHero name="Tea & Coffee" />);
    expect(screen.queryByText(/product/)).not.toBeInTheDocument();
  });

  it('uses a unique stable heading id for each hero instance', () => {
    const { container } = render(
      <>
        <CategoryHero name="Tea" />
        <CategoryHero name="Coffee" />
      </>,
    );
    const headings = container.querySelectorAll('h1');
    expect(headings).toHaveLength(2);
    expect(headings[0].id).not.toBe(headings[1].id);
    expect([...headings].map((heading) => heading.id)).toEqual([
      container.querySelectorAll('section')[0].getAttribute('aria-labelledby'),
      container.querySelectorAll('section')[1].getAttribute('aria-labelledby'),
    ]);
    expect(container.querySelectorAll('section')[0]).toHaveAccessibleName('Tea');
    expect(container.querySelectorAll('section')[1]).toHaveAccessibleName('Coffee');
  });
});
