import type { Product } from "./types";

export interface DealOfTheWeekSelection {
  leadProduct: Product;
  supportingProducts: Product[];
}

export const MIN_DISCOUNT_BADGE_PERCENT = 10;

/**
 * Calculates discount percentage for a product.
 */
export function getDiscountPercentage(product: Pick<Product, 'price' | 'originalPrice'>): number {
  if (!product.originalPrice || product.originalPrice <= product.price) {
    return 0;
  }
  return Math.floor(((product.originalPrice - product.price) * 100) / product.originalPrice);
}

/**
 * Returns a customer-facing percentage only when the saving clears the
 * storefront's minimum meaningful-discount threshold.
 */
export function getDiscountBadgePercentage(product: Pick<Product, 'price' | 'originalPrice'>): number | null {
  const discountPercentage = getDiscountPercentage(product);
  return discountPercentage >= MIN_DISCOUNT_BADGE_PERCENT ? discountPercentage : null;
}

/**
 * Selects the lead product (highest discount percentage in stock) and every
 * remaining discounted product in the same ranked order.
 */
export function getDealOfTheWeekProducts(products: Product[], limit?: number): DealOfTheWeekSelection | null {
  const discountedInStock = products
    .filter((p) => p.stock > 0 && getDiscountBadgePercentage(p) !== null)
    .map((p) => ({
      product: p,
      discountPercent: getDiscountPercentage(p),
    }))
    .sort((a, b) => b.discountPercent - a.discountPercent || b.product.price - a.product.price);

  if (discountedInStock.length === 0) {
    return null;
  }

  const leadProduct = discountedInStock[0].product;
  const items = limit !== undefined ? discountedInStock.slice(1, 1 + limit) : discountedInStock.slice(1);
  const supportingProducts = items.map((item) => item.product);

  return {
    leadProduct,
    supportingProducts,
  };
}

