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
  type ProductRow,
  type CategoryRow,
} from './types';

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

  // Parse brand from name
  const brand = row.brand ?? brandParser.parse(row.name);

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
  };
}

/**
 * Maps a raw Supabase row to domain Category.
 */
function mapRowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug ?? row.name.toLowerCase().replace(/\s+/g, '-'),
    name: row.name,
    emoji: row.emoji ?? '📦',
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

    // Build category IDs array for RPC
    let categoryIdsForRpc: string | null = null;
    if (criteria.categoryId) {
      categoryIdsForRpc = criteria.categoryId;
    } else if (criteria.categoryIds && criteria.categoryIds.length > 0) {
      // For multiple category IDs, we'll need to make multiple calls
      // and merge results (same as current implementation)
      return this.searchMultipleCategories(criteria);
    }

    const { data, error } = await this.supabase.rpc('search_items_pos', {
      p_store_id: this.storeId,
      p_query: criteria.query ?? '',
      p_category_id: categoryIdsForRpc,
      p_limit: limit + 1, // +1 to detect hasMore
      p_offset: offset,
    });

    if (error) {
      throw new Error(`RPC search failed: ${error.message}`);
    }

    // Fetch categories for emoji resolution
    const categories = await this.getCategories();
    const categoryEmojiMap = new Map(categories.map(c => [c.id, c.emoji]));

    const rows = (data ?? []) as unknown[];
    const hasMore = rows.length > limit;
    const products = rows
      .slice(0, limit)
      .map(row => {
        const validated = validateProductRow(row);
        return mapRowToProduct(validated, this.brandParser, this.emojiResolver, categoryEmojiMap);
      });

    return { products, hasMore };
  }

  private async searchMultipleCategories(
    criteria: ProductSearchCriteria
  ): Promise<PaginatedProducts> {
    const limit = criteria.limit ?? 60;
    const categoryIds = criteria.categoryIds ?? [];

    // Fetch from all categories in parallel
    const results = await Promise.all(
      categoryIds.map(async (catId) => {
        const { data, error } = await this.supabase.rpc('search_items_pos', {
          p_store_id: this.storeId,
          p_query: criteria.query ?? '',
          p_category_id: catId,
          p_limit: limit + 1,
          p_offset: (criteria.page ?? 0) * limit,
        });

        if (error) throw error;
        return (data ?? []) as unknown[];
      })
    );

    // Merge and sort
    const merged = results.flat();
    merged.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    // Fetch categories for emoji resolution
    const categories = await this.getCategories();
    const categoryEmojiMap = new Map(categories.map(c => [c.id, c.emoji]));

    const hasMore = merged.length > limit;
    const products = merged
      .slice(0, limit)
      .map(row => {
        const validated = validateProductRow(row);
        return mapRowToProduct(validated, this.brandParser, this.emojiResolver, categoryEmojiMap);
      });

    return { products, hasMore };
  }

  async getById(id: ProductId): Promise<Product | null> {
    // Current workaround: search with limit 2 and find match
    // Cache decorator will mitigate the inefficiency
    const { data, error } = await this.supabase.rpc('search_items_pos', {
      p_store_id: this.storeId,
      p_query: String(id),
      p_category_id: null,
      p_limit: 2,
      p_offset: 0,
    });

    if (error) {
      throw new Error(`RPC getById failed: ${error.message}`);
    }

    const rows = (data ?? []) as unknown[];
    const match = rows.find((row: any) =>
      (row.id ?? row.item_id) === String(id)
    );

    if (!match) return null;

    // Fetch categories for emoji resolution
    const categories = await this.getCategories();
    const categoryEmojiMap = new Map(categories.map(c => [c.id, c.emoji]));

    const validated = validateProductRow(match);
    return mapRowToProduct(validated, this.brandParser, this.emojiResolver, categoryEmojiMap);
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
      return mapRowToCategory(validated);
    });
  }
}