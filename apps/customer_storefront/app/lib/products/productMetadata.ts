import { formatBdt } from '../formatPrice';

/**
 * Formats a clean, high-intent product title within Google SERP display limits (<= 60 chars).
 */
export function formatProductMetaTitle(name: string, price: number, unit?: string): string {
  const priceStr = formatBdt(price);
  const unitSuffix = unit && unit !== 'pc' ? `/${unit}` : '';
  const candidate = `${name} – ${priceStr}${unitSuffix} | Lucky Store`;
  if (candidate.length <= 60) return candidate;
  const noBrand = `${name} – ${priceStr}${unitSuffix}`;
  if (noBrand.length <= 60) return noBrand;
  const suffix = `… – ${priceStr}${unitSuffix}`;
  const maxNameLen = 60 - suffix.length;
  return `${name.slice(0, Math.max(5, maxNameLen)).trim()}${suffix}`;
}

/**
 * Formats an intent-matched, policy-accurate meta description (120–160 chars)
 * incorporating Chattogram local intent, live price, 1 km GeoCircle, COD, and doorstep inspection.
 */
export function formatProductMetaDescription(
  name: string,
  price: number,
  unit?: string,
  enrichedSummary?: string
): string {
  if (enrichedSummary && enrichedSummary.length >= 120 && enrichedSummary.length <= 160) {
    return enrichedSummary;
  }
  const priceStr = formatBdt(price);
  const unitStr = unit && unit !== 'pc' ? ` (${unit})` : '';
  const template = `Order ${name}${unitStr} online at Lucky Store in Chattogram (${priceStr}). Free delivery on ৳500+ within 1 km, Cash on Delivery & doorstep inspection.`;
  if (template.length >= 120 && template.length <= 160) {
    return template;
  }
  if (template.length < 120) {
    const longer = `Order ${name}${unitStr} online at Lucky Store in Chattogram (${priceStr}). Free local delivery on orders ৳500+ within 1 km, Cash on Delivery & doorstep inspection.`;
    return longer.slice(0, 160);
  }
  const availableForName =
    160 -
    `Order …${unitStr} online at Lucky Store in Chattogram. Free delivery on ৳500+ within 1 km, Cash on Delivery & doorstep inspection.`.length;
  const trimmed = name.slice(0, Math.max(10, availableForName)).trim();
  return `Order ${trimmed}…${unitStr} online at Lucky Store in Chattogram. Free delivery on ৳500+ within 1 km, Cash on Delivery & doorstep inspection.`;
}
