import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Breadcrumbs } from './Breadcrumbs';

describe('Breadcrumbs structured data', () => {
  it('emits canonical absolute URLs for relative breadcrumb links', () => {
    const { container } = render(
      <Breadcrumbs items={[{ label: 'Contact Us', href: '/contact' }]} />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    const schema = JSON.parse(script?.textContent || '{}');

    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toEqual([
      expect.objectContaining({ position: 1, name: 'Home', item: 'https://luckystore1947.com' }),
      expect.objectContaining({ position: 2, name: 'Contact Us', item: 'https://luckystore1947.com/contact' }),
    ]);
  });

  it('preserves an already absolute breadcrumb URL without duplicating the origin', () => {
    const { container } = render(
      <Breadcrumbs items={[{ label: 'Delivery', href: 'https://luckystore1947.com/delivery' }]} />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    const schema = JSON.parse(script?.textContent || '{}');

    expect(schema.itemListElement[1].item).toBe('https://luckystore1947.com/delivery');
  });
});
