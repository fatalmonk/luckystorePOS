import type { Product } from '../../lib/types';

export async function loadBuyAgainProducts(items: ReadonlyArray<{ id: string }>): Promise<Map<string, Product>> {
  const products = new Map<string, Product>();
  for (const id of new Set(items.map((item) => item.id).filter(Boolean))) {
    const response = await fetch(`/api/products?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (response.status === 404) continue;
    if (!response.ok) throw new Error('Could not load current products');

    const product: Product & { degraded?: boolean; catalogSnapshotFallback?: boolean } = await response.json();
    if (product.id !== id || !Number.isFinite(product.price) || !Number.isFinite(product.stock)) {
      throw new Error('Invalid current product');
    }
    if (!product.degraded && !product.catalogSnapshotFallback) products.set(id, product);
  }
  return products;
}
