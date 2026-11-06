import type { IProductRepository, Product } from './types';

const SEARCH_PAGE_SIZE = 500;
const MAX_SEARCH_PAGES = 10;

/** Fetch a bounded set of search pages while the repository reports more results. */
export async function searchAllPages(
  repo: Pick<IProductRepository, 'search'>,
  query: string,
): Promise<Product[]> {
  const products: Product[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_SEARCH_PAGES; page += 1) {
    const result = await repo.search({ query, limit: SEARCH_PAGE_SIZE, offset });
    products.push(...result.products);
    if (!result.hasMore || result.products.length === 0) break;
    offset += result.products.length;
  }

  return products;
}
