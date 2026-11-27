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
  hasMore?: boolean;
  error?: unknown;
}

interface ResolveCategoryRouteDataOptions {
  slug: string;
  categories: ProductCategory[];
  currentCategory?: ProductCategory;
  searchTerm?: string;
  /** Only enabled for the separately qualified Ice Cream leaf-category pilot. */
  page?: number;
  pageSize?: number;
  /** Never use fuzzy category-name fallback when exact category membership is required. */
  strictCategory?: boolean;
  /** Fetch all exact-category matches for truthful client-side filters; fail above the cap. */
  completeCategory?: boolean;
  repository: IProductRepository;
  categoryLabel?: (category: ProductCategory) => string;
}

/** Resolves the shared category hierarchy and product query for localized category pages. */
export async function resolveCategoryRouteData({
  slug,
  categories,
  currentCategory,
  searchTerm,
  page,
  pageSize,
  strictCategory = false,
  completeCategory = false,
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
  let hasMore: boolean | undefined;
  const isGroupRoot = group && normalizeCategorySlug(group.slug) === normalizeCategorySlug(slug);

  try {
    if (strictCategory && (isGroupRoot || !currentCategory?.id)) {
      throw new Error('Exact category membership is required for pagination');
    }
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
      if (completeCategory) {
        // Do not display incomplete facets: client filters require the full
        // eligible catalog. Never perform an unbounded or fuzzy search.
        // The atomic snapshot RPC observes one database state. Offset-based
        // multi-RPC traversal can silently omit products during catalog edits.
        const result = await repository.search({
          query: searchTerm || undefined,
          categoryId: currentCategory.id,
          limit: 1000,
          offset: 0,
          consistentSnapshot: true,
        });
        if (result.hasMore) throw new Error('Category exceeds safe filter limit');
        const seen = new Set<string>();
        for (const item of result.products) {
          if (seen.has(String(item.id))) throw new Error('Duplicate product ID in complete category');
          seen.add(String(item.id));
        }
        products = result.products;
        productCount = products.length;
        hasMore = false;
      } else {
      const result = await repository.search({
        query: searchTerm || undefined,
        categoryId: currentCategory.id,
        limit: pageSize ?? 200,
        ...(pageSize !== undefined ? { offset: ((page ?? 1) - 1) * pageSize } : {}),
      });
      products = result.products;
      hasMore = result.hasMore;
      if (!result.hasMore) productCount = pageSize !== undefined
        ? ((page ?? 1) - 1) * pageSize + result.products.length
        : result.products.length;

      // Legacy items sometimes lack category IDs. Before using the name fallback
      // on a deep page, verify the ID-based category was empty on page one.
      // Otherwise a valid out-of-range page could pick up unrelated name matches.
      if (!strictCategory && products.length === 0 && !searchTerm) {
        let categoryHasItems = false;
        if (pageSize !== undefined && (page ?? 1) > 1) {
          const first = await repository.search({ categoryId: currentCategory.id, limit: 1, offset: 0 });
          categoryHasItems = first.products.length > 0;
        }
        if (!categoryHasItems) {
          const offset = pageSize !== undefined ? ((page ?? 1) - 1) * pageSize : 0;
          const fallback = await repository.search({
            query: currentCategory.name || slug.replace(/-/g, ' '),
            limit: pageSize ?? 200,
            ...(pageSize !== undefined ? { offset } : {}),
          });
          products = fallback.products;
          hasMore = fallback.hasMore;
          productCount = fallback.hasMore ? undefined : offset + fallback.products.length;
        }
      }
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
    return { group, parentGroup, products, productCount, hasMore, error };
  }

  return { group, parentGroup, products, productCount, hasMore };
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
