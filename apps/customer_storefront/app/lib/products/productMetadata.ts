import { formatBdt } from '../formatPrice';
import type { Metadata } from 'next';

export interface ProductMetadataInput {
  name: string;
  price: number;
  unit?: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  images?: Array<{ url: string; alt: string }>;
  brand?: string;
  category?: string;
}

export function buildProductMetaKeywords(name: string, brand?: string, category?: string): string[] {
  const productType = category?.trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').toLocaleLowerCase();

  return [...new Set([
    name,
    brand && productType ? `${brand} ${productType}` : brand,
    category,
    `${name} Chattogram`,
    productType && `${productType} Chattogram`,
    'Lucky Store',
  ].filter((value): value is string => Boolean(value)))];
}

export function buildProductMetadata(input: ProductMetadataInput): Metadata {
  const title = formatProductMetaTitle(input.name, input.price, input.unit);
  const images = input.images?.length ? input.images : [{ url: input.imageUrl, alt: input.name }];

  return {
    title: { absolute: title },
    description: input.description,
    keywords: buildProductMetaKeywords(input.name, input.brand, input.category),
    alternates: {
      canonical: input.canonicalUrl,
      languages: {
        'en-BD': input.canonicalUrl,
        'bn-BD': input.canonicalUrl.replace('/product/', '/bn/product/'),
        'x-default': input.canonicalUrl,
      },
    },
    openGraph: {
      // Next.js 15 rejects `product` as an Open Graph type; Product JSON-LD below
      // carries the product-specific offer and identity data instead.
      type: 'website',
      locale: 'en_BD',
      url: input.canonicalUrl,
      siteName: 'Lucky Store',
      title,
      description: input.description,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: input.description,
      images: [input.imageUrl],
    },
  };
}

/**
 * Formats a clean, high-intent product title within Google SERP display limits (<= 60 chars).
 * Includes brand inline because product pages set `title.absolute`, which bypasses the
 * root layout `%s | Lucky Store` template.
 */
export function formatProductMetaTitle(name: string, price: number, unit?: string): string {
  const priceStr = formatBdt(price);
  const unitSuffix = unit && unit !== 'pc' ? `/${unit}` : '';
  const candidate = `${name} – ${priceStr}${unitSuffix} | Lucky Store`;
  if (candidate.length <= 68) return candidate;
  const suffixWithBrand = `… – ${priceStr}${unitSuffix} | Lucky Store`;
  const maxNameLenWithBrand = 60 - suffixWithBrand.length;
  if (maxNameLenWithBrand >= 5) {
    return `${name.slice(0, maxNameLenWithBrand).trim()}${suffixWithBrand}`;
  }
  const noBrand = `${name} – ${priceStr}${unitSuffix}`;
  if (noBrand.length <= 60) return noBrand;
  const suffix = `… – ${priceStr}${unitSuffix}`;
  const maxNameLen = Math.max(0, 60 - suffix.length);
  return `${name.slice(0, maxNameLen).trim()}${suffix}`;
}

/**
 * Fits a description within 160 characters. Identity takes priority over optional
 * store-policy prose; 120 characters is a display guideline, not a minimum.
 * Verified enrichment is kept as complete sentences when it includes the identity.
 */
export function formatProductMetaDescription(
  name: string,
  price: number,
  unit?: string,
  enrichedSummary?: string
): string {
  if (enrichedSummary) {
    const identityWords = name.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    const summaryWords = new Set(enrichedSummary.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu));
    if (identityWords.length && identityWords.every((word) => summaryWords.has(word))) {
      if (enrichedSummary.length <= 160) return enrichedSummary;
      const sentences = enrichedSummary.match(/[^.!?]+[.!?](?:\s|$)/g) || [];
      let excerpt = '';
      for (const sentence of sentences) {
        const candidate = `${excerpt} ${sentence.trim()}`.trim();
        if (candidate.length > 160) break;
        excerpt = candidate;
      }
      const excerptWords = new Set(excerpt.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu));
      if (identityWords.every((word) => excerptWords.has(word))) {
        if (excerpt.length < 110) {
          let augmented = excerpt;
          for (const detail of [' Free delivery on ৳500+ within 1 km.', ' Cash on Delivery.', ' Doorstep inspection.']) {
            if (augmented.length + detail.length <= 160) augmented += detail;
          }
          return augmented;
        }
        return excerpt;
      }
    }
  }
  const priceStr = formatBdt(price);
  const unitStr = unit && unit !== 'pc' ? ` (${unit})` : '';
  const core = `Order ${name}${unitStr} at Lucky Store in Chattogram (${priceStr}).`;
  if (core.length <= 160) {
    let description = core;
    for (const detail of [' Free delivery on ৳500+ within 1 km.', ' Cash on Delivery.', ' Doorstep inspection.']) {
      if (description.length + detail.length <= 160) description += detail;
    }
    return description;
  }
  // Remove all optional prose before shortening an unusually long identity.
  const suffix = `${unitStr} (${priceStr}).`;
  const available = Math.max(0, 160 - 'Order '.length - suffix.length);
  if (name.length <= available) return `Order ${name}${suffix}`;
  // A middle ellipsis preserves the brand/start and pack-size/end of catalog names.
  const tailLength = Math.min(32, Math.floor((available - 1) / 2));
  const headLength = Math.max(0, available - tailLength - 1);
  return `Order ${name.slice(0, headLength).trimEnd()}…${name.slice(-tailLength).trimStart()}${suffix}`;
}
