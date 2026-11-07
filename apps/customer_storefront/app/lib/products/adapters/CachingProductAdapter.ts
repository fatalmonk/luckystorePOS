/**
 * Caching Product Adapter
 *
 * Decorator that adds transparent caching to any ProductDataPort.
 * Follows the decorator pattern — wraps without changing interface.
 */

import type {
  Product,
  ProductId,
  Category,
  ProductSearchCriteria,
  PaginatedProducts,
  ProductDataPort,
} from '../types';
import { resolveProductSearchPagination } from '../types';

// Simple in-memory cache entry
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface CacheConfig {
  /** TTL in ms for search results. Default: 60s */
  searchTtlMs: number;
  /** TTL in ms for single product lookups. Default: 5 min */
  productTtlMs: number;
  /** TTL in ms for category list. Default: 10 min */
  categoryTtlMs: number;
  /** Max entries in search cache before LRU eviction. Default: 200 */
  maxSearchEntries: number;
  /** Max entries in product cache before LRU eviction. Default: 500 */
  maxProductEntries: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  searchTtlMs: 60_000,
  productTtlMs: 300_000,
  categoryTtlMs: 600_000,
  maxSearchEntries: 200,
  maxProductEntries: 500,
};

/**
 * Evict oldest entry from a Map when it exceeds maxSize.
 * Uses Map insertion order (first key = oldest).
 */
function evictIfNeeded<T>(cache: Map<string, T>, maxSize: number): void {
  while (cache.size > maxSize) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
    else break;
  }
}

/**
 * Hash function for search criteria (for cache keys)
 */
function hashCriteria(criteria: ProductSearchCriteria): string {
  const { limit, offset } = resolveProductSearchPagination(criteria);
  return JSON.stringify([
    criteria.query ?? '',
    criteria.categoryId ?? '',
    criteria.categoryIds ?? [],
    limit,
    offset,
  ]);
}

/**
 * Decorator that adds caching to any ProductDataPort.
 */
export class CachingProductAdapter implements ProductDataPort {
  private readonly searchCache = new Map<string, CacheEntry<PaginatedProducts>>();
  private readonly productCache = new Map<string, CacheEntry<Product | null>>();
  private readonly categoryCache = new Map<string, CacheEntry<Category[]>>();
  // Coalesces concurrent identical misses into a single inner call. Entries are
  // removed on settle; failures are never cached.
  private readonly inFlight = new Map<string, Promise<unknown>>();
  // Bumped per cache domain on invalidate(); in-flight responses captured under
  // an older generation must not repopulate caches cleared while they were
  // pending. Domain counters keep unrelated caches committable.
  private readonly generations = { search: 0, product: 0, category: 0 };

  constructor(
    private readonly inner: ProductDataPort,
    private readonly config: CacheConfig = DEFAULT_CONFIG
  ) {}

  private async deduped<T>(key: string, fetch: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T>;

    let promise!: Promise<T>;
    promise = fetch().finally(() => {
      // Delete only our own entry: invalidate() may have already removed it,
      // and a newer leader for the same key must survive.
      if (this.inFlight.get(key) === promise) {
        this.inFlight.delete(key);
      }
    });
    this.inFlight.set(key, promise);
    return promise;
  }

  /** Drop in-flight entries whose keys belong to the invalidated domains. */
  private dropInFlight(prefixes: string[]): void {
    for (const key of Array.from(this.inFlight.keys())) {
      if (prefixes.some((p) => key.startsWith(p))) {
        this.inFlight.delete(key);
      }
    }
  }

  /**
   * Guard a cache write against invalidation races: commit only when no
   * invalidate() touching this domain ran between the inner fetch starting and
   * settling. The value is still returned to the waiting callers either way.
   */
  private commitIfCurrent(
    domain: keyof typeof this.generations,
    startedAtGeneration: number,
    commit: () => void
  ): void {
    if (startedAtGeneration === this.generations[domain]) commit();
  }

  async search(criteria: ProductSearchCriteria): Promise<PaginatedProducts> {
    const key = hashCriteria(criteria);
    const cached = this.searchCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const startedAtGeneration = this.generations.search;
    return this.deduped(`search:${key}`, async () => {
      const result = await this.inner.search(criteria);
      this.commitIfCurrent('search', startedAtGeneration, () => {
        this.searchCache.set(key, {
          data: result,
          expiresAt: Date.now() + this.config.searchTtlMs,
        });
        evictIfNeeded(this.searchCache, this.config.maxSearchEntries);
      });
      return result;
    });
  }

  async getById(id: ProductId): Promise<Product | null> {
    const key = String(id);
    const cached = this.productCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const startedAtGeneration = this.generations.product;
    return this.deduped(`product:${key}`, async () => {
      const result = await this.inner.getById(id);
      this.commitIfCurrent('product', startedAtGeneration, () => {
        this.productCache.set(key, {
          data: result,
          expiresAt: Date.now() + this.config.productTtlMs,
        });
        evictIfNeeded(this.productCache, this.config.maxProductEntries);
      });
      return result;
    });
  }

  /**
   * Normalize and validate a raw prefix string to a consistent cache key.
   * Accepts:
   *  - 4-32 contiguous hexadecimal characters (e.g. '045df58d', 'ae09a3ef5f2c4f148a9ca66c63e028b4')
   *  - Canonical 8-4-4-4-12 UUID (e.g. 'ae09a3ef-5f2c-4f14-8a9c-a66c63e028b4')
   * Rejects:
   *  - Arbitrary embedded hyphens (e.g. 'ae-09-a3-ef', 'ae09--a3ef')
   *  - Invalid non-hex characters or control characters (e.g. 'ab!cd', 'ae09-zz-a3ef')
   *  - Malformed UUID shapes
   * Must match the validation performed by SupabaseProductAdapter.getByIdPrefix.
   */
  private static normalizePrefix(prefix: string): string | null {
    const trimmed = prefix.trim();
    if (!trimmed) return null;

    // Check if it's a canonical 8-4-4-4-12 UUID
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trimmed)) {
      return trimmed.replace(/-/g, '').toLowerCase();
    }

    // Otherwise must be 4-32 contiguous hexadecimal characters (no hyphens permitted)
    if (/^[0-9a-fA-F]{4,32}$/.test(trimmed)) {
      return trimmed.toLowerCase();
    }

    return null;
  }

  async getByIdPrefix(prefix: string): Promise<Product | null> {
    const normalized = CachingProductAdapter.normalizePrefix(prefix);

    // Invalid prefixes are rejected locally without touching the cache.
    if (!normalized) return null;

    const key = `prefix:${normalized}`;
    const cached = this.productCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const startedAtGeneration = this.generations.product;
    return this.deduped(`inflight:${key}`, async () => {
      // RPC failures propagate and are never cached as null results, so
      // callers can distinguish a network/DB error from a genuine prefix miss.
      const result = await this.inner.getByIdPrefix(normalized);

      this.commitIfCurrent('product', startedAtGeneration, () => {
        this.productCache.set(key, {
          data: result,
          expiresAt: Date.now() + this.config.productTtlMs,
        });
        evictIfNeeded(this.productCache, this.config.maxProductEntries);
      });

      return result;
    });
  }

  async getCategories(): Promise<Category[]> {
    const key = 'all';
    const cached = this.categoryCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const startedAtGeneration = this.generations.category;
    return this.deduped('categories:all', async () => {
      const result = await this.inner.getCategories();
      this.commitIfCurrent('category', startedAtGeneration, () => {
        this.categoryCache.set(key, {
          data: result,
          expiresAt: Date.now() + this.config.categoryTtlMs,
        });
      });
      return result;
    });
  }

  /**
   * Invalidate specific cache entries or all caches.
   * Call this when data changes (e.g., after admin updates).
   *
   * When specific product IDs are invalidated, all prefix cache entries are
   * also cleared: a prefix may resolve to any product, so stale positive,
   * negative and ambiguous prefix results must not persist after a product
   * is created, activated, deactivated or deleted.
   */
  invalidate(pattern?: {
    search?: boolean;
    products?: ProductId[];
    categories?: boolean;
  }): void {
    // Bump domain generations first so in-flight fetches started before this
    // call cannot commit stale results into the cleared caches when they
    // settle, then drop the matching in-flight entries so callers arriving
    // after invalidation start a fresh fetch instead of joining the stale one.
    if (!pattern) {
      // Invalidate all
      this.generations.search += 1;
      this.generations.product += 1;
      this.generations.category += 1;
      this.searchCache.clear();
      this.productCache.clear();
      this.categoryCache.clear();
      this.dropInFlight(['search:', 'product:', 'inflight:', 'categories:']);
      this.invalidateInnerCategoriesCache();
      return;
    }

    if (pattern.search) {
      this.generations.search += 1;
      this.searchCache.clear();
      this.dropInFlight(['search:']);
    }

    if (pattern.products) {
      // Product changes can also alter search result composition.
      this.generations.product += 1;
      this.generations.search += 1;
      for (const id of pattern.products) {
        this.productCache.delete(String(id));
      }
      // Clear all prefix cache entries: any product change can alter prefix
      // resolution outcomes (new collision, removed unique match, etc.).
      for (const key of Array.from(this.productCache.keys())) {
        if (key.startsWith('prefix:')) {
          this.productCache.delete(key);
        }
      }
      this.dropInFlight(['product:', 'inflight:', 'search:']);
    }

    if (pattern.categories) {
      this.generations.category += 1;
      this.categoryCache.clear();
      this.dropInFlight(['categories:']);
      this.invalidateInnerCategoriesCache();
    }
  }

  /**
   * Propagate category invalidation into the inner adapter when it keeps its
   * own bounded category cache (SupabaseProductAdapter), so its 60s TTL cannot
   * outlive the contract that invalidate({ categories: true }) implies.
   */
  private invalidateInnerCategoriesCache(): void {
    const inner = this.inner as { invalidateCategoriesCache?: () => void };
    if (typeof inner.invalidateCategoriesCache === 'function') {
      inner.invalidateCategoriesCache();
    }
  }

  /**
   * Get cache statistics for debugging/monitoring.
   */
  getStats(): {
    searchEntries: number;
    productEntries: number;
    categoryEntries: number;
  } {
    return {
      searchEntries: this.searchCache.size,
      productEntries: this.productCache.size,
      categoryEntries: this.categoryCache.size,
    };
  }
}
