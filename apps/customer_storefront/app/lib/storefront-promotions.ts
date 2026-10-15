export interface StorefrontItemPromotion {
  item_id: string;
  expected_name: string;
  discount_percent: number | string;
  expected_price: number | string;
  expected_mrp: number | string;
  starts_at: string;
  ends_at: string;
  campaign_key?: string;
  revision?: number;
  is_current?: boolean;
  offer_terms?: string;
  selection_reason?: string;
  evidence_source?: string;
  evidence_checked_at?: string;
}

export const STOREFRONT_STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';
const PROMOTION_COLUMNS = 'item_id,expected_name,discount_percent,expected_price,expected_mrp,starts_at,ends_at';

export async function loadActiveStorefrontPromotions(
  client: any,
  itemIds: string[],
): Promise<StorefrontItemPromotion[]> {
  const uniqueIds = [...new Set(itemIds)];
  if (uniqueIds.length === 0) return [];

  const { data, error } = await client
    .from('storefront_item_promotions')
    .select(PROMOTION_COLUMNS)
    .eq('store_id', STOREFRONT_STORE_ID)
    .in('item_id', uniqueIds);

  if (error) throw new Error(`Failed to verify active product offers: ${error.message}`);
  return (data ?? []) as StorefrontItemPromotion[];
}

export async function loadCurrentStorefrontDealCampaign(
  client: any,
  now = new Date(),
): Promise<StorefrontItemPromotion[]> {
  const { data, error } = await client
    .from('storefront_item_promotions')
    .select('item_id,expected_name,discount_percent,expected_price,expected_mrp,starts_at,ends_at,campaign_key,revision,is_current,offer_terms,selection_reason,evidence_source,evidence_checked_at')
    .eq('store_id', STOREFRONT_STORE_ID)
    .eq('is_current', true)
    .gt('ends_at', now.toISOString());

  if (error) throw new Error(`Failed to verify weekly deal campaign: ${error.message}`);
  return (data ?? []) as StorefrontItemPromotion[];
}

export function getActiveWeeklyDealEdition(
  rows: StorefrontItemPromotion[],
  now = new Date(),
): StorefrontItemPromotion[] {
  const campaigns = new Map<string, StorefrontItemPromotion[]>();
  for (const row of rows) {
    const startsAt = Date.parse(row.starts_at);
    const endsAt = Date.parse(row.ends_at);
    if (row.is_current === false || !row.campaign_key || !Number.isFinite(startsAt) || !Number.isFinite(endsAt) || startsAt >= endsAt || startsAt > now.getTime() || endsAt <= now.getTime()) continue;
    const group = campaigns.get(row.campaign_key) ?? [];
    group.push(row);
    campaigns.set(row.campaign_key, group);
  }

  return [...campaigns.values()]
    .filter((campaign) => campaign.length >= 12 && campaign.length <= 16)
    .sort((a, b) => Date.parse(b[0].starts_at) - Date.parse(a[0].starts_at))[0] ?? [];
}

interface PromotionPricedItem {
  id: string;
  name?: string;
  price: number;
  originalPrice?: number;
  mrp?: number;
  stock?: number;
}

export function getPromotionalPrice(
  item: PromotionPricedItem,
  promotions: StorefrontItemPromotion[],
  now = new Date(),
): number {
  const promotion = promotions.find((candidate) => candidate.item_id === item.id);
  if (!promotion || (item.stock !== undefined && item.stock <= 0)) return item.price;

  const startsAt = Date.parse(promotion.starts_at);
  const endsAt = Date.parse(promotion.ends_at);
  const expectedPrice = Number(promotion.expected_price);
  const expectedMrp = Number(promotion.expected_mrp);
  const itemMrp = item.mrp ?? item.originalPrice;

  // The catalogue price and MRP are the reviewed offer basis. If either changes,
  // stop applying the extra offer until a newly reviewed promotion is recorded.
  if (
    now.getTime() < startsAt || now.getTime() >= endsAt ||
    (item.name !== undefined && item.name !== promotion.expected_name) ||
    Number(item.price) !== expectedPrice || itemMrp === undefined || Number(itemMrp) !== expectedMrp
  ) {
    return item.price;
  }

  const discountPercent = Number(promotion.discount_percent);
  return Math.round(item.price * (1 - discountPercent / 100) * 100) / 100;
}

export function getPromotionSavings(
  item: PromotionPricedItem,
  promotions: StorefrontItemPromotion[],
  now = new Date(),
): number {
  return Math.round((item.price - getPromotionalPrice(item, promotions, now)) * 100) / 100;
}
