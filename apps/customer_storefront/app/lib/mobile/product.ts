import { getCachedProductBySlug } from '../products/getCachedProduct';
import { getCachedCrossSellProducts, prepareCrossSell } from '../products/getCachedCrossSell';
import { getEnrichedProductData } from '../products/productEnrichment';
import {
  getPublishedItemTranslations,
  type LocalizedProductDetails,
  type PublishedItemTranslation,
} from '../products/productTranslations';
import { createAnonymousStorefrontProductRepository, createProductId } from '../products/index';
import type { Product } from '../products/types';

export type MobileLocale = 'en' | 'bn';

export interface MobileProductDetailDto {
  id: string;
  name: string;
  emoji: string;
  price: number;
  originalPrice?: number;
  unit: string;
  stock: number;
  imageUrl?: string;
  badge?: string;
  category: string;
  categoryId?: string;
  description: string;
  nutrition?: string;
  brand?: string;
  sku?: string;
  origin?: string;
  details?: LocalizedProductDetails;
  translationStatus?: 'published' | 'missing';
  bengaliName?: string;
  bengaliDescription?: string;
}

export interface MobileProductResponse {
  locale: MobileLocale;
  product: MobileProductDetailDto;
  related: MobileProductDetailDto[];
}

export function toMobileProductDto(
  product: Product,
  locale: MobileLocale,
  enrichment?: any,
  translation?: PublishedItemTranslation | null,
): MobileProductDetailDto {
  const imageUrl = product.imageUrl ?? product.image_url;
  const isBengali = locale === 'bn';
  const effectiveName = isBengali
    ? translation?.name ?? ''
    : enrichment?.exactName || product.name;
  const effectiveDescription = isBengali
    ? translation?.description ?? ''
    : enrichment?.summary || product.description || '';

  return {
    id: product.id,
    name: effectiveName,
    emoji: product.emoji || '🛒',
    price: product.price,
    ...(product.originalPrice !== undefined ? { originalPrice: product.originalPrice } : {}),
    unit: product.unit || 'pc',
    stock: product.stock,
    ...(imageUrl ? { imageUrl } : {}),
    ...(!isBengali && product.badge ? { badge: product.badge } : {}),
    category: isBengali ? '' : product.category?.trim() || 'General',
    ...(product.categoryId || product.category_id ? { categoryId: product.categoryId ?? product.category_id } : {}),
    description: effectiveDescription,
    ...(!isBengali && product.nutrition ? { nutrition: product.nutrition } : {}),
    ...(product.brand ? { brand: product.brand } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(isBengali
      ? {
          translationStatus: translation ? 'published' as const : 'missing' as const,
          ...(translation?.origin ? { origin: translation.origin } : {}),
          ...(translation?.details ? { details: translation.details } : {}),
          ...(translation ? { bengaliName: translation.name } : {}),
          ...(translation?.description ? { bengaliDescription: translation.description } : {}),
        }
      : {
          ...(product.bengaliName ? { bengaliName: product.bengaliName } : {}),
          ...(product.bengaliDescription ? { bengaliDescription: product.bengaliDescription } : {}),
        }),
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getMobileProductDetail(
  idOrSlug: string,
  locale: MobileLocale = 'en',
): Promise<MobileProductResponse | null> {
  let product: Product | null = null;

  if (UUID_PATTERN.test(idOrSlug)) {
    try {
      const { repo } = createAnonymousStorefrontProductRepository();
      product = await repo.getById(createProductId(idOrSlug));
    } catch (err) {
      console.error(`[mobile/product] Failed to fetch product by id ${idOrSlug}:`, err);
      return null;
    }
  } else {
    product = await getCachedProductBySlug(idOrSlug);
  }

  if (!product) return null;

  const translation = locale === 'bn'
    ? (await getPublishedItemTranslations([product.id])).get(product.id) ?? null
    : null;
  const enrichment = locale === 'en'
    ? getEnrichedProductData(product.id) || getEnrichedProductData(idOrSlug)
    : undefined;
  const mainProductDto = toMobileProductDto(product, locale, enrichment, translation);

  let relatedDtos: MobileProductDetailDto[] = [];
  if (locale === 'en') {
    try {
      const rawCrossSell = await getCachedCrossSellProducts(
        product.category,
        product.categoryId || product.category_id,
        product.id,
      );
      const crossSell = prepareCrossSell(rawCrossSell);
      relatedDtos = crossSell.slice(0, 8).map((p) => toMobileProductDto(p, locale));
    } catch (err) {
      console.error('Failed to load cross sell for mobile product:', err);
    }
  }

  return {
    locale,
    product: mainProductDto,
    related: relatedDtos,
  };
}
