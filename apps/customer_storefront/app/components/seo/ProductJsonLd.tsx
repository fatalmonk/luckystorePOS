import React from 'react';
import type { Product } from '../../lib/products/types';
import { toProductSlug } from '../../lib/products/slugify';
import { getDeliveryOfferShippingDetailsSchema } from '../../delivery/deliveryData';
import { JsonLd } from './JsonLd';

interface ProductJsonLdProps {
  product: Product;
  description?: string;
}

export function ProductJsonLd({ product, description }: ProductJsonLdProps) {
  const canonicalSlug = toProductSlug(product.name, product.id);
  const canonicalUrl = `https://luckystore1947.com/product/${canonicalSlug}`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: product.image_url ? [product.image_url] : undefined,
    description: description || product.description || `${product.name} available at Lucky Store in Chattogram`,
    sku: product.id,
    ...(product.brand
      ? {
          brand: {
            '@type': 'Brand',
            name: product.brand,
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
        url: 'https://luckystore1947.com',
      },
      shippingDetails: getDeliveryOfferShippingDetailsSchema(),
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'BD',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 0,
        returnMethod: 'https://schema.org/ReturnAtKiosk',
        returnFees: 'https://schema.org/FreeReturn',
        refundType: 'https://schema.org/FullRefund',
        description:
          '100% doorstep inspection before payment. Inspect packaging, seals, and dates upon arrival; reject any item immediately at zero fee penalty.',
      },
    },
  };

  return <JsonLd data={jsonLd} />;
}
