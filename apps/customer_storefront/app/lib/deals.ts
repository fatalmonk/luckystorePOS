import type { Product } from './types';
import { supabase } from './supabase';
import {
  STOREFRONT_STORE_ID,
  getPromotionalPrice,
  getActiveWeeklyDealEdition,
  loadCurrentStorefrontDealCampaign,
  type StorefrontItemPromotion,
} from './storefront-promotions';

export interface DealOfTheWeekSelection {
  leadProduct: Product;
  supportingProducts: Product[];
}

export const MIN_DISCOUNT_BADGE_PERCENT = 10;

/**
 * Calculates discount percentage for a product.
 */
export function getDiscountPercentage(product: Pick<Product, 'price' | 'originalPrice'>): number {
  if (!product.originalPrice || product.originalPrice <= product.price) {
    return 0;
  }
  return Math.floor(((product.originalPrice - product.price) / product.originalPrice) * 100);
}

/**
 * Returns a customer-facing percentage only when the saving clears the
 * storefront's minimum meaningful-discount threshold.
 */
export function getDiscountBadgePercentage(product: Pick<Product, 'price' | 'originalPrice'>): number | null {
  const discountPercentage = getDiscountPercentage(product);
  return discountPercentage >= MIN_DISCOUNT_BADGE_PERCENT ? discountPercentage : null;
}

/**
 * Selects the lead product (highest discount percentage in stock) and every
 * remaining discounted product in the same ranked order.
 */
export function getDealOfTheWeekProducts(products: Product[], limit?: number): DealOfTheWeekSelection | null {
  const discountedInStock = products
    .filter((p) => p.stock > 0 && getDiscountBadgePercentage(p) !== null)
    .map((p) => ({
      product: p,
      discountPercent: getDiscountPercentage(p),
    }))
    .sort((a, b) => b.discountPercent - a.discountPercent || b.product.price - a.product.price);

  if (discountedInStock.length === 0) {
    return null;
  }

  const leadProduct = discountedInStock[0].product;
  const items = limit !== undefined ? discountedInStock.slice(1, 1 + limit) : discountedInStock.slice(1);
  const supportingProducts = items.map((item) => item.product);

  return {
    leadProduct,
    supportingProducts,
  };
}

/**
 * Returns the Date object for the next Sunday 23:59:59 in Asia/Dhaka timezone (UTC+6).
 * Asia/Dhaka 23:59:59 is 17:59:59 UTC on the same day.
 */
export function getNextSundayDeadline(now: Date = new Date()): Date {
  // Convert current time to Dhaka time components
  const dhakaOffsetMs = 6 * 60 * 60 * 1000;
  const dhakaTime = new Date(now.getTime() + dhakaOffsetMs);

  const dhakaYear = dhakaTime.getUTCFullYear();
  const dhakaMonth = dhakaTime.getUTCMonth();
  const dhakaDate = dhakaTime.getUTCDate();
  const dhakaDay = dhakaTime.getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

  // Calculate days until next Sunday (if today is Sunday and time is before 23:59:59, target today)
  let daysUntilSunday = (7 - dhakaDay) % 7;
  
  // If today is Sunday, check if 23:59:59.999 has passed
  const isPastSunday = dhakaDay === 0 && (
    dhakaTime.getUTCHours() > 23 ||
    (dhakaTime.getUTCHours() === 23 && dhakaTime.getUTCMinutes() === 59 && dhakaTime.getUTCSeconds() === 59)
  );

  if (isPastSunday) {
    daysUntilSunday = 7;
  }

  // Create target date at 23:59:59 UTC for Dhaka (which is 17:59:59 UTC)
  const targetDhakaDate = new Date(Date.UTC(dhakaYear, dhakaMonth, dhakaDate + daysUntilSunday, 17, 59, 59, 999));
  return targetDhakaDate;
}

export interface WeeklyDealProduct extends Product {
  verifiedDiscountPercent?: number;
  promotionalPrice?: number;
  selectionReason?: string;
  offerTerms?: string;
  campaignKey?: string;
}

export const MIN_CAMPAIGN_ELIGIBLE_PRODUCTS = 8;

export type WeeklyDealsDegradedReason =
  | 'none'
  | 'campaign_lookup_failed'
  | 'insufficient_eligible_products'
  | 'catalogue_outage';

export interface WeeklyDealsResult {
  products: WeeklyDealProduct[];
  activeEdition: boolean;
  editionPeriod: string;
  campaignKey?: string;
  startsAt?: string;
  endsAt?: string;
  degradedReason?: WeeklyDealsDegradedReason;
  error?: string;
}

interface CatalogRow {
  id?: string;
  item_id?: string;
  name?: string;
  price?: number | string;
  mrp?: number | string | null;
  category?: string | null;
  category_id?: string | null;
  image_url?: string | null;
  description?: string | null;
  unit?: string | null;
  qty_on_hand?: number | string | null;
  sellable_qty?: number | string | null;
  stock?: number | string | null;
  brand?: string | null;
  discount_percent?: number | string | null;
}

export function hasWeeklyEvidence(row: StorefrontItemPromotion): boolean {
  return Boolean(
    row.selection_reason?.trim()
    && row.offer_terms?.trim()
    && row.evidence_source?.trim()
    && row.evidence_checked_at
    && Number.isFinite(Date.parse(row.evidence_checked_at))
    && Date.parse(row.evidence_checked_at) <= Date.parse(row.starts_at),
  );
}

export function formatEditionPeriod(rows: StorefrontItemPromotion[]): string {
  const startsAt = Math.min(...rows.map((row) => Date.parse(row.starts_at)));
  const endsAt = Math.max(...rows.map((row) => Date.parse(row.ends_at)));
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt >= endsAt) return '';
  const format = (date: Date) => date.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Dhaka', day: 'numeric', month: 'long', year: 'numeric',
  });
  return `${format(new Date(startsAt))}–${format(new Date(endsAt - 1))} (Asia/Dhaka)`;
}

export function toWeeklyDealProduct(row: CatalogRow): WeeklyDealProduct | null {
  const id = row.id ?? row.item_id;
  const price = Number(row.price);
  const mrp = Number(row.mrp);
  const stock = Number(row.sellable_qty ?? 0);
  if (
    !id ||
    !row.name?.trim() ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(mrp) ||
    mrp <= price ||
    !Number.isFinite(stock) ||
    stock <= 0
  ) {
    return null;
  }
  return {
    id,
    name: row.name.trim(),
    emoji: '🛒',
    price,
    originalPrice: mrp,
    unit: row.unit?.trim() || 'item',
    category: row.category?.trim() || 'Grocery',
    category_id: row.category_id || undefined,
    stock,
    description: row.description?.trim() || '',
    image_url: row.image_url?.trim() || undefined,
    brand: row.brand?.trim() || undefined,
  };
}

export async function loadWeeklyDeals(
  client: any = supabase,
  now = new Date(),
  limit = 48,
): Promise<WeeklyDealsResult> {
  let degradedReason: WeeklyDealsDegradedReason = 'none';

  try {
    let allCampaignRows: StorefrontItemPromotion[] = [];
    try {
      allCampaignRows = await loadCurrentStorefrontDealCampaign(client, now);
    } catch (campaignErr) {
      console.error('[DealOfTheWeek] Weekly promotion campaign lookup failed:', campaignErr);
      degradedReason = 'campaign_lookup_failed';
    }

    const activeRows = getActiveWeeklyDealEdition(allCampaignRows, now);
    const hasScheduledEdition = activeRows.length >= 12 && activeRows.every(hasWeeklyEvidence);
    const verifiedRows = hasScheduledEdition ? activeRows : [];

    if (hasScheduledEdition) {
      const itemIds = verifiedRows.map((r) => r.item_id);
      const { data, error } = await client.rpc('search_storefront_catalog_v2', {
        p_store_id: STOREFRONT_STORE_ID,
        p_query: '',
        p_category_id: null,
        p_item_ids: itemIds,
        p_limit: itemIds.length,
        p_offset: 0,
      });

      if (error || !Array.isArray(data)) {
        throw new Error('Storefront catalogue could not be verified');
      }

      const rows = data as CatalogRow[];
      const byId = new Map(
        rows
          .map((r) => toWeeklyDealProduct(r))
          .filter((p): p is WeeklyDealProduct => p !== null)
          .map((p) => [p.id, p])
      );

      const eligibleProducts: WeeklyDealProduct[] = verifiedRows.flatMap((row) => {
        const product = byId.get(row.item_id);
        if (
          !product ||
          product.name !== row.expected_name ||
          product.price !== Number(row.expected_price) ||
          product.originalPrice !== Number(row.expected_mrp) ||
          product.price > Math.round((product.originalPrice ?? product.price) * 0.9 * 100) / 100 ||
          product.stock <= 0
        ) {
          return [];
        }

        const promoPrice = getPromotionalPrice(
          {
            id: product.id,
            name: product.name,
            price: product.price,
            mrp: product.originalPrice,
            stock: product.stock,
          },
          [row],
          now
        );

        return [
          {
            ...product,
            verifiedDiscountPercent: Math.floor(
              (((product.originalPrice ?? product.price) - product.price) /
                (product.originalPrice ?? product.price)) *
                100
            ),
            promotionalPrice: promoPrice,
            selectionReason: row.selection_reason,
            offerTerms: row.offer_terms,
            campaignKey: row.campaign_key,
          },
        ];
      });

      // Require a minimum threshold of eligible products to activate the campaign
      if (eligibleProducts.length >= MIN_CAMPAIGN_ELIGIBLE_PRODUCTS) {
        return {
          products: eligibleProducts,
          activeEdition: true,
          editionPeriod: formatEditionPeriod(verifiedRows),
          campaignKey: verifiedRows[0]?.campaign_key,
          startsAt: verifiedRows[0]?.starts_at,
          endsAt: verifiedRows[0]?.ends_at,
          degradedReason: 'none',
        };
      }

      // If fewer than threshold items qualify, degrade to catalogue deals
      console.warn(
        `[DealOfTheWeek] Weekly campaign ${verifiedRows[0]?.campaign_key} has only ${eligibleProducts.length} eligible products (minimum ${MIN_CAMPAIGN_ELIGIBLE_PRODUCTS}); degrading to catalogue deals.`,
      );
      degradedReason = 'insufficient_eligible_products';
    }

    // Fallback: Fetch deals filtered & ordered in PostgreSQL before limiting
    try {
      const { data: dealsData, error: dealsErr } = await client.rpc('get_storefront_deals', {
        p_store_id: STOREFRONT_STORE_ID,
        p_min_discount_percent: 10,
        p_limit: Math.min(limit, 100),
        p_offset: 0,
      });

      if (!dealsErr && Array.isArray(dealsData)) {
        const rows = dealsData as CatalogRow[];
        const products: WeeklyDealProduct[] = rows
          .map((r) => toWeeklyDealProduct(r))
          .filter((p): p is WeeklyDealProduct => p !== null)
          .map((p) => ({
            ...p,
            verifiedDiscountPercent: Math.floor(
              (((p.originalPrice ?? p.price) - p.price) / (p.originalPrice ?? p.price)) * 100,
            ),
          }));

        return {
          products,
          activeEdition: false,
          editionPeriod: '',
          degradedReason,
        };
      }
    } catch {
      // get_storefront_deals RPC may not exist in mock/legacy environments
    }

    // Secondary fallback for legacy/mock test environments using search_storefront_catalog
    const { data, error } = await client.rpc('search_storefront_catalog', {
      p_store_id: STOREFRONT_STORE_ID,
      p_query: '',
      p_category_id: null,
      p_limit: Math.min(limit, 100),
      p_offset: 0,
    });

    if (error || !Array.isArray(data)) {
      throw new Error('Storefront catalogue could not be verified');
    }

    const rows = data as CatalogRow[];
    const products: WeeklyDealProduct[] = rows
      .map((r) => toWeeklyDealProduct(r))
      .filter((p): p is WeeklyDealProduct => p !== null)
      .filter(
        (p) =>
          p.originalPrice !== undefined &&
          p.originalPrice > p.price &&
          p.price <= Math.round(p.originalPrice * 0.9 * 100) / 100 &&
          p.stock > 0,
      )
      .map((p) => ({
        ...p,
        verifiedDiscountPercent: Math.floor(
          (((p.originalPrice ?? p.price) - p.price) / (p.originalPrice ?? p.price)) * 100,
        ),
      }))
      .sort(
        (a, b) =>
          (b.verifiedDiscountPercent ?? 0) - (a.verifiedDiscountPercent ?? 0) ||
          a.price - b.price ||
          a.name.localeCompare(b.name) ||
          a.id.localeCompare(b.id),
      );

    return {
      products,
      activeEdition: false,
      editionPeriod: '',
      degradedReason,
    };
  } catch (err: any) {
    return {
      products: [],
      activeEdition: false,
      editionPeriod: '',
      degradedReason: 'catalogue_outage',
      error: err?.message || 'Deals temporarily unavailable',
    };
  }
}


