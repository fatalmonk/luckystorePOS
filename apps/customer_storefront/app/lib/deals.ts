import type { Product } from './types';

export interface DealOfTheWeekSelection {
  leadProduct: Product;
  supportingProducts: Product[];
}

/**
 * Calculates discount percentage for a product.
 */
export function getDiscountPercentage(product: Product): number {
  if (!product.originalPrice || product.originalPrice <= product.price) {
    return 0;
  }
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
}

/**
 * Selects the Lead Product (highest discount percentage in-stock) and 
 * up to 6 Supporting Products (next highest discount percentages in-stock).
 */
export function getDealOfTheWeekProducts(products: Product[]): DealOfTheWeekSelection | null {
  const discountedInStock = products
    .filter((p) => p.stock > 0 && p.originalPrice && p.originalPrice > p.price)
    .map((p) => ({
      product: p,
      discountPercent: getDiscountPercentage(p),
    }))
    .sort((a, b) => b.discountPercent - a.discountPercent || b.product.price - a.product.price);

  if (discountedInStock.length === 0) {
    return null;
  }

  const leadProduct = discountedInStock[0].product;
  const supportingProducts = discountedInStock.slice(1, 7).map((item) => item.product);

  return {
    leadProduct,
    supportingProducts,
  };
}

/**
 * Returns the Date object for the next Sunday 23:59:59 in Asia/Dhaka timezone (UTC+6).
 * Asia/Dhaka 23:59:59 is 17:59:59 UTC on the same day.
 */
export function getNextSundayDeadline(now: Date = new Date()): Date {
  // Convert current time to Dhaka time components
  const dhakaOffsetMs = 6 * 60 * 60 * 1000;
  const dhakaTime = new Date(now.getTime() + dhakaOffsetMs);

  const dhakaYear = dhakaTime.getUTCFullYear();
  const dhakaMonth = dhakaTime.getUTCMonth();
  const dhakaDate = dhakaTime.getUTCDate();
  const dhakaDay = dhakaTime.getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

  // Calculate days until next Sunday (if today is Sunday and time is before 23:59:59, target today)
  let daysUntilSunday = (7 - dhakaDay) % 7;
  
  // If today is Sunday, check if 23:59:59.999 has passed
  const isPastSunday = dhakaDay === 0 && (
    dhakaTime.getUTCHours() > 23 ||
    (dhakaTime.getUTCHours() === 23 && dhakaTime.getUTCMinutes() === 59 && dhakaTime.getUTCSeconds() === 59)
  );

  if (isPastSunday) {
    daysUntilSunday = 7;
  }

  // Create target date at 23:59:59 UTC for Dhaka (which is 17:59:59 UTC)
  const targetDhakaDate = new Date(Date.UTC(dhakaYear, dhakaMonth, dhakaDate + daysUntilSunday, 17, 59, 59, 999));
  return targetDhakaDate;
}
