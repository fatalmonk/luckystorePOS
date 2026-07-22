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
  const normalized = {
    q: criteria.query ?? '',
    cat: criteria.categoryId ?? '',
    cats: criteria.categoryIds?.join(',') ?? '',
    p: criteria.page ?? 0,
    l: criteria.limit ?? 60,
  };
  return JSON.stringify(normalized);
}

/**
 * Decorator that adds caching to any ProductDataPort.
 */
export class CachingProductAdapter implements ProductDataPort {
  private readonly searchCache = new Map<string, CacheEntry<PaginatedProducts>>();
  private readonly productCache = new Map<string, CacheEntry<Product | null>>();
  private readonly categoryCache = new Map<string, CacheEntry<Category[]>>();

  constructor(
    private readonly inner: ProductDataPort,
    private readonly config: CacheConfig = DEFAULT_CONFIG
  ) {}

  async search(criteria: ProductSearchCriteria): Promise<PaginatedProducts> {
    const key = hashCriteria(criteria);
    const cached = this.searchCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const result = await this.inner.search(criteria);
    this.searchCache.set(key, {
      data: result,
      expiresAt: Date.now() + this.config.searchTtlMs,
    });
    evictIfNeeded(this.searchCache, this.config.maxSearchEntries);

    return result;
  }

  async getById(id: ProductId): Promise<Product | null> {
    const key = String(id);
    const cached = this.productCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const result = await this.inner.getById(id);
    this.productCache.set(key, {
      data: result,
      expiresAt: Date.now() + this.config.productTtlMs,
    });
    evictIfNeeded(this.productCache, this.config.maxProductEntries);

    return result;
  }

  async getCategories(): Promise<Category[]> {
    const key = 'all';
    const cached = this.categoryCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const result = await this.inner.getCategories();
    this.categoryCache.set(key, {
      data: result,
      expiresAt: Date.now() + this.config.categoryTtlMs,
    });

    return result;
  }

  /**
   * Invalidate specific cache entries or all caches.
   * Call this when data changes (e.g., after admin updates).
   */
  invalidate(pattern?: {
    search?: boolean;
    products?: ProductId[];
    categories?: boolean;
  }): void {
    if (!pattern) {
      // Invalidate all
      this.searchCache.clear();
      this.productCache.clear();
      this.categoryCache.clear();
      return;
    }

    if (pattern.search) {
      this.searchCache.clear();
    }

    if (pattern.products) {
      for (const id of pattern.products) {
        this.productCache.delete(String(id));
      }
    }

    if (pattern.categories) {
      this.categoryCache.clear();
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
