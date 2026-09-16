import React from 'react';
import type { Product } from '../../lib/products/types';
import { toProductSlug } from '../../lib/products/slugify';
import { validateGtin } from '../../lib/products/gtin';
import { getDeliveryOfferShippingDetailsSchema } from '../../delivery/deliveryData';
import { JsonLd } from './JsonLd';

interface ProductJsonLdProps {
  product: Product;
  description?: string;
  name?: string;
  brand?: string;
  canonicalUrl?: string;
}

export function ProductJsonLd({ product, description, name, brand, canonicalUrl: providedCanonicalUrl }: ProductJsonLdProps) {
  const canonicalSlug = toProductSlug(product.name, product.id);
  const canonicalUrl = providedCanonicalUrl || `https://www.luckystore1947.com/product/${canonicalSlug}`;
  const effectiveName = name || product.name;
  const effectiveBrand = brand || product.brand;
  const gtinInfo = validateGtin(product.barcode);
  const effectiveSku = product.sku || product.id;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: effectiveName,
    image: product.image_url ? [product.image_url] : undefined,
    description: description || product.description || `${effectiveName} available at Lucky Store in Chattogram`,
    sku: effectiveSku,
    ...(gtinInfo ? { [gtinInfo.property]: gtinInfo.value } : {}),
    ...(effectiveBrand
      ? {
          brand: {
            '@type': 'Brand',
            name: effectiveBrand,
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'BDT',
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: canonicalUrl,
      seller: {
        '@type': 'Organization',
        name: 'Lucky Store',
        url: 'https://www.luckystore1947.com',
      },
      shippingDetails: getDeliveryOfferShippingDetailsSchema(),
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'BD',
        returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
        description:
          'No post-payment returns. Lucky Store offers 100% doorstep inspection: customers may inspect packaging, seals, and dates before payment and reject an item immediately at zero fee penalty.',
      },
    },
  };

  return <JsonLd data={jsonLd} />;
}
