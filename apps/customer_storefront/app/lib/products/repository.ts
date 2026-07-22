/**
 * Product Repository
 *
 * The main repository implementation that coordinates the adapter and parsers.
 * This is the seam — callers depend on this interface, not on Supabase.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Product,
  ProductId,
  Category,
  ProductSearchCriteria,
  PaginatedProducts,
  IProductRepository,
  ProductDataPort,
  BrandParser,
  EmojiResolver,
} from './types';
import { RuleBasedBrandParser } from './parsers/BrandParser';
import { WordMatchEmojiResolver } from './parsers/EmojiResolver';
import { SupabaseProductAdapter } from './adapters/SupabaseProductAdapter';
import { CachingProductAdapter } from './adapters/CachingProductAdapter';

/**
 * Cache control handle returned by the factory.
 * Allows callers to invalidate cached data without
 * depending on the caching adapter directly.
 */
export interface CacheControl {
  invalidate(pattern?: {
    search?: boolean;
    products?: ProductId[];
    categories?: boolean;
  }): void;
}

/** No-op cache control when caching is disabled. */
const NOOP_CACHE_CONTROL: CacheControl = { invalidate: () => {} };

/**
 * Return type from createProductRepository.
 * Provides both the repository seam and a cache control handle.
 */
export interface ProductRepositoryBundle {
  repo: IProductRepository;
  cache: CacheControl;
}

/**
 * Concrete ProductRepository implementation.
 *
 * The repository is intentionally thin — it delegates to the adapter for data access
 * and uses parsers for domain logic. This keeps concerns separated:
 *
 * - Repository: coordination, interface
 * - Adapter: data access (Supabase, cache, etc.)
 * - Parsers: domain logic (brand extraction, emoji resolution)
 */
export class ProductRepository implements IProductRepository {
  constructor(
    private readonly adapter: ProductDataPort,
    private readonly brandParser: BrandParser,
    private readonly emojiResolver: EmojiResolver
  ) {}

  async search(criteria: ProductSearchCriteria): Promise<PaginatedProducts> {
    const normalizedCriteria: ProductSearchCriteria = {
      ...criteria,
      limit: Math.min(criteria.limit ?? 60, 100), // Enforce max page size
    };

    return this.adapter.search(normalizedCriteria);
  }

  async getById(id: ProductId): Promise<Product | null> {
    return this.adapter.getById(id);
  }

  async getCategories(): Promise<Category[]> {
    return this.adapter.getCategories();
  }
}

/**
 * Factory for creating a fully-configured repository.
 *
 * Usage:
 *   const { repo, cache } = createProductRepository(supabase);
 *   const product = await repo.getById(createProductId('abc-123'));
 *   cache.invalidate({ categories: true }); // after admin update
 */
export function createProductRepository(
  supabaseClient: SupabaseClient,
  options?: {
    brandParser?: BrandParser;
    emojiResolver?: EmojiResolver;
    enableCache?: boolean;
  }
): ProductRepositoryBundle {
  const brandParser = options?.brandParser ?? new RuleBasedBrandParser();
  const emojiResolver = options?.emojiResolver ?? new WordMatchEmojiResolver();

  let adapter: ProductDataPort = new SupabaseProductAdapter(
    supabaseClient,
    brandParser,
    emojiResolver
  );

  let cacheControl: CacheControl = NOOP_CACHE_CONTROL;

  if (options?.enableCache !== false) {
    const cachingAdapter = new CachingProductAdapter(adapter);
    adapter = cachingAdapter;
    cacheControl = cachingAdapter;
  }

  return {
    repo: new ProductRepository(adapter, brandParser, emojiResolver),
    cache: cacheControl,
  };
}
