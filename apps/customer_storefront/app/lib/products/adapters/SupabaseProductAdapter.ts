/**
 * Supabase Product Adapter
 *
 * Implements ProductDataPort using Supabase RPC calls.
 * All Supabase-specific code lives here — no leakage to domain.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Product,
  ProductId,
  Category,
  ProductSearchCriteria,
  PaginatedProducts,
  ProductDataPort,
  BrandParser,
  EmojiResolver,
} from '../types';
import { createProductId, resolveProductSearchPagination } from '../types';
import {
  validateProductRow,
  validateCategoryRow,
  tryValidateProductRow,
  type ProductRow,
  type CategoryRow,
} from './types';

import { searchStorefrontProducts } from '../../search/searchProducts';
import { fetchStorefrontCatalogItemsByIds } from '../../storefrontCatalogLookup';
import { STOREFRONT_STORE_ID } from '../constants';


/**
 * Maps a raw Supabase row to domain Product.
 * This is where all the messy field mapping happens.
 */
function mapRowToProduct(
  row: ProductRow,
  brandParser: BrandParser,
  emojiResolver: EmojiResolver,
  categoryEmojiMap: Map<string, string>
): Product {
  const id = createProductId(row.id ?? row.item_id ?? '');
  const price = Number(row.price);
  const originalPrice = row.mrp ? Number(row.mrp) : undefined;
  const stock = Number(row.sellable_qty ?? row.stock ?? 0);

  // Resolve emoji from category
  const categorySlug = row.category;
  const categoryEmoji = categoryEmojiMap.get(row.category_id ?? '') ?? categoryEmojiMap.get(categorySlug);
  const emoji = emojiResolver.resolve(categorySlug, categoryEmoji);

  // Parse brand from name or normalize DB brand (e.g. Nescafe -> Nestle)
  const dbBrand = row.brand ? (brandParser.parse(row.brand) ?? row.brand) : undefined;
  const brand = dbBrand ?? brandParser.parse(row.name);

  return {
    id,
    name: row.name,
    emoji,
    price,
    originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
    badge: originalPrice && originalPrice > price ? 'On Sale' : undefined,
    unit: 'pc', // Could be moved to schema later
    category: categorySlug,
    categoryId: row.category_id ?? undefined,
    category_id: row.category_id ?? undefined,
    stock,
    description: row.description ?? '',
    imageUrl: row.image_url ?? undefined,
    image_url: row.image_url ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    created_at: row.created_at ?? undefined,
    brand,
    sku: row.sku ?? undefined,
    barcode: row.barcode ?? undefined,
  };
}

/**
 * Maps a raw Supabase row to domain Category.
 */
function mapRowToCategory(row: CategoryRow, emojiResolver?: EmojiResolver): Category {
  const slug = row.slug ?? row.name.toLowerCase().replace(/\s+/g, '-');
  const emoji = emojiResolver
    ? emojiResolver.resolve(row.name || slug, row.emoji)
    : (row.emoji && row.emoji !== '📦' ? row.emoji : '🍿');

  return {
    id: row.id,
    slug,
    name: row.name,
    emoji,
    parentId: row.parent_id ?? null,
    parent_id: row.parent_id ?? null,
  };
}

export class SupabaseProductAdapter implements ProductDataPort {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly brandParser: BrandParser,
    private readonly emojiResolver: EmojiResolver,
    private readonly storeId: string = STOREFRONT_STORE_ID
  ) {}

  async search(criteria: ProductSearchCriteria): Promise<PaginatedProducts> {
    const { limit, offset } = resolveProductSearchPagination(criteria);

    const { products: searchResults, hasMore } = await searchStorefrontProducts({
      query: criteria.query,
      storeId: this.storeId,
      categoryId: criteria.categoryId,
      categoryIds: criteria.categoryIds,
      limit,
      offset,
      supabaseClient: this.supabase,
    });

    // Fetch categories for emoji resolution
    const categories = await this.getCategories();
    const categoryEmojiMap = new Map(categories.map((c) => [c.id, c.emoji]));

    const products: Product[] = searchResults.map((p) => {
      const categoryEmoji = categoryEmojiMap.get(p.categoryId ?? '') ?? categoryEmojiMap.get(p.category);
      const emoji = this.emojiResolver.resolve(p.category, categoryEmoji);
      const dbBrand = p.brand ? (this.brandParser.parse(p.brand) ?? p.brand) : undefined;
      const brand = dbBrand ?? this.brandParser.parse(p.name);

      return {
        ...p,
        emoji,
        brand,
      };
    });

    return { products, hasMore };
  }

  async getById(id: ProductId): Promise<Product | null> {
    const cleanId = String(id).trim();

    // Direct table query — uses primary key index, includes description
    const { data, error } = await this.supabase
      .from('items')
      .select('id, name, price, mrp, category_id, description, image_url, created_at, brand')
      .eq('id', cleanId)
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      const categories = await this.getCategories();
      const categoryEmojiMap = new Map(categories.map(c => [c.id, c.emoji]));
      const categoryNameMap = new Map(categories.map(c => [c.id, c.name]));

      const { data: stockData, error: stockError } = await this.supabase
        .from('stock_levels')
        .select('qty, reserved, qty_reserved_online')
        .eq('item_id', data.id)
        .eq('store_id', this.storeId)
        .maybeSingle();

      // The public storefront may not be granted direct stock_levels reads.
      // Fall back to the authoritative storefront catalogue projection so detail
      // pages retain the same stock state used by the homepage cards.
      let resolvedStock = stockData
        ? Math.max(0, Number(stockData.qty ?? 0) - Number(stockData.reserved ?? 0) - Number(stockData.qty_reserved_online ?? 0))
        : null;
      if (stockError || resolvedStock === null) {
        try {
          const projectedRows = await fetchStorefrontCatalogItemsByIds(this.supabase, this.storeId, [data.id]);
          const projected = projectedRows.find((row) => (row.id ?? row.item_id) === data.id) as any;
          resolvedStock = projected?.sellable_qty ?? projected?.stock ?? 0;
        } catch {
          // Stock is supplementary on product detail. Keep the item visible as
          // unavailable if its live stock projection cannot be fetched.
          resolvedStock = 0;
        }
      }

      const row = {
        ...data,
        category: categoryNameMap.get(data.category_id ?? '') || '',
        stock: resolvedStock,
        qty_on_hand: resolvedStock,
      };

      const validated = tryValidateProductRow(row);
      if (!validated) return null;
      return mapRowToProduct(validated, this.brandParser, this.emojiResolver, categoryEmojiMap);
    }

    // Fallback: retain the exact ID lookup without scanning catalog pages.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)) {
      return null;
    }
    const [match] = await fetchStorefrontCatalogItemsByIds(this.supabase, this.storeId, [cleanId]);

    if (!match) return null;

    // Fetch categories for emoji resolution
    const categories = await this.getCategories();
    const categoryEmojiMap = new Map(categories.map(c => [c.id, c.emoji]));

    const validated = tryValidateProductRow(match);
    if (!validated) return null;
    return mapRowToProduct(validated, this.brandParser, this.emojiResolver, categoryEmojiMap);
  }

  async getByIdPrefix(prefix: string): Promise<Product | null> {
    const trimmed = prefix.trim();
    if (!trimmed) return null;

    let normalized: string;
    // Canonical 8-4-4-4-12 UUID
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trimmed)) {
      normalized = trimmed.replace(/-/g, '').toLowerCase();
    } else if (/^[0-9a-fA-F]{4,32}$/.test(trimmed)) {
      // 4-32 contiguous hexadecimal characters (no arbitrary hyphens permitted)
      normalized = trimmed.toLowerCase();
    } else {
      // Reject arbitrary embedded hyphens, invalid characters, control characters
      return null;
    }

    // Single bounded RPC — returns at most 2 candidate IDs using a UUID range
    // scan on the existing items primary-key B-tree. Never calls
    // search_storefront_catalog or loops over catalog pages.
    const { data: rpcData, error: rpcError } = await this.supabase.rpc(
      'resolve_storefront_item_prefix_v1',
      { p_store_id: this.storeId, p_prefix: normalized },
    );

    if (rpcError) {
      // Propagate RPC failures through existing error-handling contracts.
      // Never silently fall back to the old full-catalog scan.
      throw new Error(`getByIdPrefix resolver RPC failed: ${rpcError.message}`);
    }

    const candidates = (rpcData ?? []) as Array<{ item_id: string }>;

    // 0 matches → no product found.
    // 2 matches → ambiguous prefix; fail closed.
    // Any other count is defensive: treat as ambiguous.
    if (candidates.length !== 1) return null;

    const rawId = candidates[0]?.item_id;
    // Validate that the returned value is a well-formed UUID before delegating.
    if (!rawId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(rawId)) {
      return null;
    }

    // Delegate to the existing authoritative getById for the full product
    // projection (description, stock, categories, Bengali content, etc.).
    return this.getById(createProductId(rawId));
  }

  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('id, slug, name, emoji, parent_id, display_order, active')
      .eq('active', true)
      .order('display_order');

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    const rows = (data ?? []) as unknown[];
    return rows.map(row => {
      const validated = validateCategoryRow(row);
      return mapRowToCategory(validated, this.emojiResolver);
    });
  }
}
