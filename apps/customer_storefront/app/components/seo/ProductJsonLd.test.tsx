import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createProductId, type Product } from '../../lib/products/types';
import { ProductJsonLd } from './ProductJsonLd';

const product: Product = {
  id: createProductId('f6d581d5-0000-0000-0000-000000000001'),
  name: 'Polar Chocolate Cup',
  emoji: '🍦',
  price: 30,
  unit: 'pc',
  category: 'Ice-Cream',
  stock: 12,
  description: 'Polar Chocolate Cup ice cream.',
  brand: 'Polar',
  sku: 'IC-POL-CHO-CUP',
};

function parseJsonLd(markup: string): Record<string, any> {
  const json = markup.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  if (!json) throw new Error('Product JSON-LD script was not rendered');
  return JSON.parse(json);
}

describe('ProductJsonLd', () => {
  it('renders the canonical product identity, verified image, live offer and stock state', () => {
    const markup = renderToStaticMarkup(
      <ProductJsonLd
        product={product}
        name="Polar Chocolate Cup"
        brand="Polar"
        description="Polar Chocolate Cup 100 ml."
        canonicalUrl="https://www.luckystore1947.com/product/polar-chocolate-cup--f6d581d5"
        images={['/products/polar/chocolate-cup-front.webp']}
      />
    );
    const jsonLd = parseJsonLd(markup);

    expect(jsonLd['@type']).toBe('Product');
    expect(jsonLd.name).toBe('Polar Chocolate Cup');
    expect(jsonLd.image).toEqual(['/products/polar/chocolate-cup-front.webp']);
    expect(jsonLd.offers).toMatchObject({
      price: 30,
      priceCurrency: 'BDT',
      availability: 'https://schema.org/InStock',
      url: 'https://www.luckystore1947.com/product/polar-chocolate-cup--f6d581d5',
    });
  });

  it('omits explicitly unresolved product images rather than emitting a broken URL', () => {
    const jsonLd = parseJsonLd(renderToStaticMarkup(<ProductJsonLd product={product} images={[]} />));
    expect(jsonLd).not.toHaveProperty('image');
  });

  it('safely escapes script delimiters inside dynamic product text', () => {
    const markup = renderToStaticMarkup(
      <ProductJsonLd product={{ ...product, description: '</script><script>alert(1)</script>' }} />
    );

    expect(markup).not.toContain('</script><script>alert(1)');
    expect(parseJsonLd(markup).description).toBe('</script><script>alert(1)</script>');
  });
});
