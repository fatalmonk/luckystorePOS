/**
 * Products Module
 *
 * Public API for the product domain.
 * All external imports should come through here.
 */

// Domain types
export type {
  Product,
  ProductId,
  Category,
  CategorySlug,
  Brand,
  ProductSearchCriteria,
  PaginatedProducts,
  IProductRepository,
  ProductDataPort,
  BrandParser,
  EmojiResolver,
} from './types';

// Type guards and constructors
export { createProductId } from './types';

// Repository
export {
  ProductRepository,
  createProductRepository,
  type CacheControl,
  type ProductRepositoryBundle,
} from './repository';

// Parsers
export { RuleBasedBrandParser } from './parsers/BrandParser';
export { WordMatchEmojiResolver } from './parsers/EmojiResolver';

// Adapters (advanced usage — most consumers should use createProductRepository)
export { SupabaseProductAdapter } from './adapters/SupabaseProductAdapter';
export { CachingProductAdapter, type CacheConfig } from './adapters/CachingProductAdapter';
export {
  ProductRowSchema,
  CategoryRowSchema,
  validateProductRow,
  validateCategoryRow,
  SchemaMismatchError,
} from './adapters/types';
