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

/**
 * Inclusive/exclusive UUID bounds for an 8-char hex prefix (first UUID group).
 * Prefer this over LIKE: Postgres/PostgREST reject pattern operators on uuid columns.
 */
export function uuidPrefixRange(prefix: string): { gte: string; lt: string | null } | null {
  const clean = prefix.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(clean)) return null;

  const gte = `${clean}-0000-0000-0000-000000000000`;
  const value = Number.parseInt(clean, 16);
  if (value === 0xffffffff) return { gte, lt: null };

  const next = (value + 1).toString(16).padStart(8, '0');
  return { gte, lt: `${next}-0000-0000-0000-000000000000` };
}
