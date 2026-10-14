import { formatBdt } from '../formatPrice';

/**
 * Formats a clean, high-intent product title within Google SERP display limits (<= 60 chars).
 * Includes brand inline because product pages set `title.absolute`, which bypasses the
 * root layout `%s | Lucky Store` template.
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
 * Fits a description within 160 characters. Identity takes priority over optional
 * store-policy prose; 120 characters is a display guideline, not a minimum.
 * Verified enrichment is kept as complete sentences when it includes the identity.
 */
export function formatProductMetaDescription(
  name: string,
  price: number,
  unit?: string,
  enrichedSummary?: string
): string {
  if (enrichedSummary) {
    const identityWords = name.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    const summaryWords = new Set(enrichedSummary.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu));
    if (identityWords.length && identityWords.every((word) => summaryWords.has(word))) {
      if (enrichedSummary.length <= 160) return enrichedSummary;
      const sentences = enrichedSummary.match(/[^.!?]+[.!?](?:\s|$)/g) || [];
      let excerpt = '';
      for (const sentence of sentences) {
        const candidate = `${excerpt} ${sentence.trim()}`.trim();
        if (candidate.length > 160) break;
        excerpt = candidate;
      }
      const excerptWords = new Set(excerpt.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu));
      if (identityWords.every((word) => excerptWords.has(word))) return excerpt;
    }
  }
  const priceStr = formatBdt(price);
  const unitStr = unit && unit !== 'pc' ? ` (${unit})` : '';
  const core = `Order ${name}${unitStr} at Lucky Store in Chattogram (${priceStr}).`;
  if (core.length <= 160) {
    let description = core;
    for (const detail of [' Free delivery on ৳500+ within 1 km.', ' Cash on Delivery.', ' Doorstep inspection.']) {
      if (description.length + detail.length <= 160) description += detail;
    }
    return description;
  }
  // Remove all optional prose before shortening an unusually long identity.
  const suffix = `${unitStr} (${priceStr}).`;
  const available = Math.max(0, 160 - 'Order '.length - suffix.length);
  if (name.length <= available) return `Order ${name}${suffix}`;
  // A middle ellipsis preserves the brand/start and pack-size/end of catalog names.
  const tailLength = Math.min(32, Math.floor((available - 1) / 2));
  const headLength = Math.max(0, available - tailLength - 1);
  return `Order ${name.slice(0, headLength).trimEnd()}…${name.slice(-tailLength).trimStart()}${suffix}`;
}
