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
import { getAnonymousStorefrontClient } from '../supabase/anonymousStorefront';

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

// Reuse the default repository bundle across requests handled by this Node.js
// process so the adapter's bounded TTL caches actually reduce Supabase reads.
type RepositoryMode = 'default' | 'anonymous-storefront';
type CachedRepositoryBundles = Partial<Record<RepositoryMode, ProductRepositoryBundle>>;
const defaultRepositoryBundles = new WeakMap<SupabaseClient, CachedRepositoryBundles>();

export interface ProductRepositoryOptions {
  brandParser?: BrandParser;
  emojiResolver?: EmojiResolver;
  enableCache?: boolean;
}

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
      limit: Math.min(criteria.limit ?? 60, 500), // Enforce max page size
    };

    return this.adapter.search(normalizedCriteria);
  }

  async getById(id: ProductId): Promise<Product | null> {
    return this.adapter.getById(id);
  }

  async getByIdPrefix(prefix: string): Promise<Product | null> {
    return this.adapter.getByIdPrefix(prefix);
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
  options?: ProductRepositoryOptions,
): ProductRepositoryBundle {
  return createRepositoryBundle(supabaseClient, options, 'default');
}

/** Product reads through this factory always use an isolated public anon client. */
export function createAnonymousStorefrontProductRepository(
  options?: ProductRepositoryOptions,
): ProductRepositoryBundle {
  return createRepositoryBundle(getAnonymousStorefrontClient(), options, 'anonymous-storefront');
}

function createRepositoryBundle(
  supabaseClient: SupabaseClient,
  options: ProductRepositoryOptions | undefined,
  mode: RepositoryMode,
): ProductRepositoryBundle {
  if (options === undefined) {
    const existing = defaultRepositoryBundles.get(supabaseClient)?.[mode];
    if (existing) return existing;
  }

  const brandParser = options?.brandParser ?? new RuleBasedBrandParser();
  const emojiResolver = options?.emojiResolver ?? new WordMatchEmojiResolver();

  const cachingEnabled = options?.enableCache !== false;

  let adapter: ProductDataPort = new SupabaseProductAdapter(
    supabaseClient,
    brandParser,
    emojiResolver,
    undefined,
    // enableCache: false must mean fresh reads: disable the adapter-internal
    // bounded category cache as well, not just the decorator.
    {
      ...(cachingEnabled ? {} : { categoriesTtlMs: 0 }),
      ...(mode === 'anonymous-storefront' ? { stockReadMode: 'catalog' as const } : {}),
    }
  );

  let cacheControl: CacheControl = NOOP_CACHE_CONTROL;

  if (cachingEnabled) {
    const cachingAdapter = new CachingProductAdapter(adapter);
    adapter = cachingAdapter;
    cacheControl = cachingAdapter;
  }

  const bundle = {
    repo: new ProductRepository(adapter, brandParser, emojiResolver),
    cache: cacheControl,
  };

  if (options === undefined) {
    const bundles = defaultRepositoryBundles.get(supabaseClient) ?? {};
    bundles[mode] = bundle;
    defaultRepositoryBundles.set(supabaseClient, bundles);
  }

  return bundle;
}
