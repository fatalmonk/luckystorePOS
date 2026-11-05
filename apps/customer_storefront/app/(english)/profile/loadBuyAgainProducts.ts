import type { Product } from '../../lib/types';

export async function loadBuyAgainProducts(items: ReadonlyArray<{ id: string }>): Promise<Map<string, Product>> {
  const ids = [...new Set(items.map((item) => item.id).filter(Boolean))];
  const results = await Promise.all(ids.map(async (id) => {
    const response = await fetch(`/api/products?id=${encodeURIComponent(id)}&fresh=1`, { cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Could not load current products');

    const product: Product & { degraded?: boolean; catalogSnapshotFallback?: boolean } = await response.json();
    if (product.id !== id || !Number.isFinite(product.price) || product.price < 0 || !Number.isFinite(product.stock)) {
      throw new Error('Invalid current product');
    }
    return !product.degraded && !product.catalogSnapshotFallback ? product : null;
  }));

  const products = new Map<string, Product>();
  for (const product of results) {
    if (product) products.set(product.id, product);
  }
  return products;
}
