import { getCachedProductBySlug } from '../products/getCachedProduct';
import { getCachedCrossSellProducts, prepareCrossSell } from '../products/getCachedCrossSell';
import { getEnrichedProductData } from '../products/productEnrichment';
import { createProductRepository, createProductId } from '../products/index';
import type { Product } from '../products/types';
import { supabase } from '../supabase';

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
): MobileProductDetailDto {
  const imageUrl = product.imageUrl ?? product.image_url;
  const effectiveName = locale === 'bn' && product.bengaliName
    ? product.bengaliName
    : (enrichment?.exactName || product.name);

  const effectiveDescription = locale === 'bn' && product.bengaliDescription
    ? product.bengaliDescription
    : (enrichment?.summary || product.description || '');

  return {
    id: product.id,
    name: effectiveName,
    emoji: product.emoji || '🛒',
    price: product.price,
    ...(product.originalPrice !== undefined ? { originalPrice: product.originalPrice } : {}),
    unit: product.unit || 'pc',
    stock: product.stock,
    ...(imageUrl ? { imageUrl } : {}),
    ...(product.badge ? { badge: product.badge } : {}),
    category: product.category?.trim() || 'General',
    ...(product.categoryId || product.category_id ? { categoryId: product.categoryId ?? product.category_id } : {}),
    description: effectiveDescription,
    ...(product.nutrition ? { nutrition: product.nutrition } : {}),
    ...(product.brand ? { brand: product.brand } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.bengaliName ? { bengaliName: product.bengaliName } : {}),
    ...(product.bengaliDescription ? { bengaliDescription: product.bengaliDescription } : {}),
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getMobileProductDetail(
  idOrSlug: string,
  locale: MobileLocale = 'en',
): Promise<MobileProductResponse | null> {
  let product: Product | null = null;

  if (UUID_PATTERN.test(idOrSlug)) {
    const { repo } = createProductRepository(supabase);
    try {
      product = await repo.getById(createProductId(idOrSlug));
    } catch (err) {
      console.error(`[mobile/product] Failed to fetch product by id ${idOrSlug}:`, err);
      return null;
    }
  } else {
    product = await getCachedProductBySlug(idOrSlug);
  }

  if (!product) return null;

  if (locale === 'bn' && !product.bengaliName) {
    try {
      const { data: trans, error: transErr } = await (supabase as any)
        .from('item_translations')
        .select('name, description')
        .eq('item_id', product.id)
        .eq('locale', 'bn')
        .eq('review_status', 'published')
        .maybeSingle();
      if (transErr) {
        console.error(`[mobile/product] Failed to fetch translation for ${product.id}:`, transErr);
      } else if (trans) {
        product.bengaliName = trans.name;
        if (trans.description) {
          product.bengaliDescription = trans.description;
        }
      }
    } catch (err) {
      console.error(`[mobile/product] Translation lookup threw for ${product.id}:`, err);
    }
  }

  const enrichment = getEnrichedProductData(product.id) || getEnrichedProductData(idOrSlug);
  const mainProductDto = toMobileProductDto(product, locale, enrichment);

  let relatedDtos: MobileProductDetailDto[] = [];
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

  return {
    locale,
    product: mainProductDto,
    related: relatedDtos,
  };
}
