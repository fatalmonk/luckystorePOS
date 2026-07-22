/**
 * Product Domain Types
 * 
 * These are the canonical types used throughout the storefront.
 * No Supabase-specific shapes leak through.
 */

// Branded type for type safety
export type ProductId = string & { readonly __brand: unique symbol };

export function createProductId(id: string): ProductId {
  return id as ProductId;
}

// Domain: Category
export interface Category {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  parentId?: string | null;
}

export type CategorySlug = string;

// Domain: Brand
export type Brand = string;

// Domain: Product
export interface Product {
  id: ProductId;
  name: string;
  emoji: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  unit: string;
  category: CategorySlug;
  categoryId?: string;
  stock: number;
  description: string;
  imageUrl?: string;
  createdAt?: Date;
  brand?: Brand;
}

// Search criteria value object
export interface ProductSearchCriteria {
  query?: string;
  categoryId?: string;
  categoryIds?: string[];
  page?: number;
  limit?: number;
}

// Pagination result
export interface PaginatedProducts {
  products: Product[];
  hasMore: boolean;
  total?: number;
}

// Repository interface (seam)
export interface IProductRepository {
  search(criteria: ProductSearchCriteria): Promise<PaginatedProducts>;
  getById(id: ProductId): Promise<Product | null>;
  getCategories(): Promise<Category[]>;
}

// Adapter port (alias — same shape as IProductRepository, separate name for semantic clarity)
export type ProductDataPort = IProductRepository;

// Parser interfaces
export interface BrandParser {
  parse(productName: string): Brand | undefined;
}

export interface EmojiResolver {
  resolve(categoryName: string, dbEmoji?: string | null): string;
}
