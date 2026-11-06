import { getCategoryGroup, getParentGroup, normalizeCategorySlug } from './types';
import type { CategoryGroup } from './types';
import type {
  Category as ProductCategory,
  IProductRepository,
  Product as RepositoryProduct,
} from './products';
import type { Product } from './types';

export interface CategoryRouteData {
  group?: CategoryGroup;
  parentGroup?: CategoryGroup;
  products: RepositoryProduct[];
  productCount?: number;
  error?: unknown;
}

interface ResolveCategoryRouteDataOptions {
  slug: string;
  categories: ProductCategory[];
  currentCategory?: ProductCategory;
  searchTerm?: string;
  repository: IProductRepository;
  categoryLabel?: (category: ProductCategory) => string;
}

/** Resolves the shared category hierarchy and product query for localized category pages. */
export async function resolveCategoryRouteData({
  slug,
  categories,
  currentCategory,
  searchTerm,
  repository,
  categoryLabel = (category) => category.name,
}: ResolveCategoryRouteDataOptions): Promise<CategoryRouteData> {
  let group = getCategoryGroup(slug);

  if (!group && currentCategory) {
    const children = categories.filter(
      (category) => (category.parentId ?? category.parent_id) === currentCategory.id,
    );
    if (children.length > 0) {
      group = {
        slug: currentCategory.slug,
        label: categoryLabel(currentCategory),
        emoji: currentCategory.emoji,
        subCategories: children.map((category) => category.slug),
      };
    }
  }

  let parentGroup: CategoryGroup | undefined;
  if (!group) {
    parentGroup = getParentGroup(slug);
    const parentId = currentCategory?.parentId ?? currentCategory?.parent_id;
    if (!parentGroup && parentId) {
      const parentCategory = categories.find((category) => category.id === parentId);
      if (parentCategory) {
        parentGroup = getCategoryGroup(parentCategory.slug) ?? {
          slug: parentCategory.slug,
          label: categoryLabel(parentCategory),
          emoji: parentCategory.emoji,
          subCategories: [slug],
        };
      }
    }
  }

  let products: RepositoryProduct[] = [];
  let productCount: number | undefined;
  const isGroupRoot = group && normalizeCategorySlug(group.slug) === normalizeCategorySlug(slug);

  try {
    if (isGroupRoot && group) {
      const categoryIds = categories
        .filter((category) => {
          const normalizedSlug = normalizeCategorySlug(category.slug);
          return group.subCategories.some((subcategory) => normalizeCategorySlug(subcategory) === normalizedSlug);
        })
        .map((category) => category.id);
      if (currentCategory && !categoryIds.includes(currentCategory.id)) {
        categoryIds.push(currentCategory.id);
      }
      const result = await repository.search({
        query: searchTerm || undefined,
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
        limit: 500,
      });
      products = result.products;
      if (!result.hasMore) productCount = result.products.length;
    } else if (currentCategory?.id) {
      const result = await repository.search({
        query: searchTerm || undefined,
        categoryId: currentCategory.id,
        limit: 200,
      });
      products = result.products;
      if (!result.hasMore) productCount = result.products.length;

      // Legacy products may have category names without category IDs.
      if (products.length === 0 && !searchTerm) {
        const fallback = await repository.search({
          query: currentCategory.name || slug.replace(/-/g, ' '),
          limit: 200,
        });
        products = fallback.products;
        productCount = fallback.hasMore ? undefined : fallback.products.length;
      }
    } else {
      const result = await repository.search({
        query: searchTerm || slug.replace(/-/g, ' '),
        limit: 200,
      });
      products = result.products;
      if (!result.hasMore) productCount = result.products.length;
    }
  } catch (error) {
    return { group, parentGroup, products, productCount, error };
  }

  return { group, parentGroup, products, productCount };
}

export interface CategoryCatalogProducts {
  products: Product[];
  error?: unknown;
}

/** Keeps the offline catalog fallback policy consistent across localized category landing pages. */
export async function loadCategoryCatalogProducts(
  repository: IProductRepository,
  snapshot: Product[],
  searchTerm?: string,
): Promise<CategoryCatalogProducts> {
  let fetchedProducts: Product[] = [];
  let error: unknown;
  try {
    const result = await repository.search({ query: searchTerm || undefined });
    fetchedProducts = result.products.map((product) => ({ ...product, id: product.id }));
  } catch (queryError) {
    error = queryError;
  }

  if (fetchedProducts.length > 0) {
    return { products: fetchedProducts };
  }

  const fallback = searchTerm
    ? snapshot.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : snapshot;
  return { products: fallback, error };
}
