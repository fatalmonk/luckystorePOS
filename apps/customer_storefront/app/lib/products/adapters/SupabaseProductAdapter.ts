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
import { createProductId } from '../types';
import {
  validateProductRow,
  validateCategoryRow,
  tryValidateProductRow,
  type ProductRow,
  type CategoryRow,
} from './types';

import { searchStorefrontProducts } from '../../search/searchProducts';

const STORE_ID = '4acf0fb2-f831-4205-b9f8-e1e8b4e6e8fd';

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
  const stock = Number(row.stock ?? row.qty_on_hand ?? 0);

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
    private readonly storeId: string = STORE_ID
  ) {}

  async search(criteria: ProductSearchCriteria): Promise<PaginatedProducts> {
    const limit = criteria.limit ?? 60;
    const offset = (criteria.page ?? 0) * limit;

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
        .select('qty')
        .eq('item_id', data.id)
        .eq('store_id', this.storeId)
        .maybeSingle();

      // The public storefront may not be granted direct stock_levels reads.
      // Fall back to the authoritative POS search projection so product detail
      // pages retain the same stock state used by the homepage cards.
      let resolvedStock = stockData?.qty ?? null;
      if (stockError || resolvedStock === null) {
        const { data: projectedRows } = await this.supabase.rpc('search_storefront_catalog', {
          p_store_id: this.storeId,
          p_query: '',
          p_category_id: null,
          p_limit: 1000,
          p_offset: 0,
        });
        const projected = (projectedRows ?? []).find((row: any) => (row.id ?? row.item_id) === data.id) as any;
        resolvedStock = projected?.qty_on_hand ?? projected?.stock ?? 0;
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

    // Fallback: RPC scan
    const { data: rpcData, error: rpcError } = await this.supabase.rpc('search_storefront_catalog', {
      p_store_id: this.storeId,
      p_query: '',
      p_category_id: null,
      p_limit: 100,
      p_offset: 0,
    });

    if (rpcError) {
      throw new Error(`RPC getById failed: ${rpcError.message}`);
    }

    const rows = (rpcData ?? []) as unknown[];
    const match = rows.find((row: any) =>
      (row.id ?? row.item_id) === String(id)
    );

    if (!match) return null;

    // Fetch categories for emoji resolution
    const categories = await this.getCategories();
    const categoryEmojiMap = new Map(categories.map(c => [c.id, c.emoji]));

    const validated = tryValidateProductRow(match);
    if (!validated) return null;
    return mapRowToProduct(validated, this.brandParser, this.emojiResolver, categoryEmojiMap);
  }

  async getByIdPrefix(prefix: string): Promise<Product | null> {
    const cleanPrefix = prefix.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
    if (!cleanPrefix || cleanPrefix.length < 4) return null;

    // Resolve 8-char slug prefix against active catalog via search_storefront_catalog
    const { data: rpcData, error: rpcError } = await this.supabase.rpc('search_storefront_catalog', {
      p_store_id: this.storeId,
      p_query: '',
      p_category_id: null,
      p_limit: 1000,
      p_offset: 0,
    });

    if (rpcError) throw new Error(`getByIdPrefix RPC failed: ${rpcError.message}`);

    const rows = (rpcData ?? []) as unknown[];
    const matches = rows.filter((row: any) =>
      ((row.id ?? row.item_id) as string)?.replace(/-/g, '').toLowerCase().startsWith(cleanPrefix)
    );

    // Fail closed: require exactly 1 unique match; reject ambiguous collisions (>1) or 0 matches
    if (matches.length !== 1) return null;

    const fullId = String((matches[0] as any).id ?? (matches[0] as any).item_id);

    // Delegate to getById for complete storefront product projection (including description)
    return this.getById(createProductId(fullId));
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
