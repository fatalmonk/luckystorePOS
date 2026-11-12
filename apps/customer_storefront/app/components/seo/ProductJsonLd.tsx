import React from 'react';
import type { Product } from '../../lib/products/types';
import { toProductSlug } from '../../lib/products/slugify';
import { validateGtin } from '../../lib/products/gtin';
import { getMerchantReturnPolicies } from '../../lib/deliveryData';
import { getBrandByName } from '../../lib/brandsData';
import { JsonLd } from './JsonLd';

interface ProductJsonLdProps {
  product: Product;
  description?: string;
  name?: string;
  brand?: string;
  canonicalUrl?: string;
  images?: string[];
}

export function ProductJsonLd({ product, description, name, brand, canonicalUrl: providedCanonicalUrl, images }: ProductJsonLdProps) {
  const canonicalSlug = toProductSlug(product.name, product.id, { englishName: product.originalName });
  const canonicalUrl = providedCanonicalUrl || `https://www.luckystore1947.com/product/${canonicalSlug}`;
  const effectiveName = name || product.name;
  const effectiveBrand = brand || product.brand;
  const matchedBrand = getBrandByName(effectiveBrand);
  const gtinInfo = validateGtin(product.barcode);
  const effectiveSku = product.sku || product.id;
  const imageUrls = (images !== undefined ? images : product.image_url ? [product.image_url] : [])
    .map((image) => {
      try {
        const url = new URL(image, 'https://www.luckystore1947.com');
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
      } catch {
        return null;
      }
    })
    .filter((image): image is string => image !== null);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: effectiveName,
    image: imageUrls.length > 0 ? imageUrls : undefined,
    description: description || product.description || `${effectiveName} available at Lucky Store in Chattogram`,
    sku: effectiveSku,
    ...(gtinInfo ? { [gtinInfo.property]: gtinInfo.value } : {}),
    ...(effectiveBrand
      ? {
          brand: {
            '@type': 'Brand',
            name: effectiveBrand,
            ...(matchedBrand?.sameAs && matchedBrand.sameAs.length > 0
              ? { sameAs: [...matchedBrand.sameAs] }
              : {}),
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'BDT',
      itemCondition: 'https://schema.org/NewCondition',
      ...(!product.availabilityUnknown
        ? {
            availability: product.stock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          }
        : {}),
      url: canonicalUrl,
      seller: {
        '@type': 'Organization',
        name: 'Lucky Store',
        url: 'https://www.luckystore1947.com',
      },
      hasMerchantReturnPolicy: getMerchantReturnPolicies(),
    },
  };

  return <JsonLd data={jsonLd} />;
}
