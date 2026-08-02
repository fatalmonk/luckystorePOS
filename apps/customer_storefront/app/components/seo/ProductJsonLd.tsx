import type { Product } from '../../lib/types';
import { toProductSlug } from '../../lib/products/slugify';

interface ProductJsonLdProps {
  product: Product;
}

export function ProductJsonLd({ product }: ProductJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: product.image_url ? [product.image_url] : undefined,
    description: product.description || `${product.name} available at Lucky Store POS`,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Lucky Store',
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'BDT',
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `https://luckystore1947.com/product/${toProductSlug(product.name, product.id)}`,
      seller: {
        '@type': 'Organization',
        name: 'Lucky Store',
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
