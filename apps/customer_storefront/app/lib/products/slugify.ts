/**
 * Product Slug Utilities
 *
 * Converts between UUID-based and human-readable product slugs.
 * Format: `{sanitized-name}--{first-8-chars-of-uuid}`
 * Example: `britannia-marie-gold-biscuits--067da398`
 */

/** Generate a semantic slug from product name + UUID */
export function toProductSlug(name: string, id: string): string {
  const namePart = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // strip special chars
    .trim()
    .replace(/\s+/g, '-')         // spaces → hyphens
    .replace(/-{2,}/g, '-')       // collapse consecutive hyphens
    .slice(0, 60);                 // keep URLs manageable

  const idPrefix = id.replace(/-/g, '').slice(0, 8); // first 8 hex chars, no dashes
  return `${namePart}--${idPrefix}`;
}

/**
 * Extract the ID prefix from a slug.
 * Returns the 8-char hex prefix from `name--prefix`.
 * Falls back to the whole string if no `--` separator found.
 */
export function extractIdFromSlug(slug: string): string {
  const parts = slug.split('--');
  return parts.at(-1) ?? slug;
}

/** Returns true if the string looks like a bare UUID (36 chars, 4 hyphens) */
export function isBareUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
