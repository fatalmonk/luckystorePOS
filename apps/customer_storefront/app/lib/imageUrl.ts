/**
 * Resolves a local /images/... path to the configured CDN base URL.
 * Falls back to the local path when NEXT_PUBLIC_IMAGE_BASE_URL is not set (local dev).
 *
 * Usage:
 *   img('/images/promo_snacks.webp')
 *   // → 'https://images.luckystore1947.com/images/promo_snacks.webp'
 */
const BASE = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? '').replace(/\/$/, '');

export function img(path: string): string {
  if (!BASE) return path;
  // path should start with /, e.g. '/images/foo.webp'
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Converts a srcSet string with local paths to CDN-prefixed paths.
 * Input:  '/images/foo_400.webp 400w, /images/foo_800.webp 800w'
 * Output: 'https://cdn.../images/foo_400.webp 400w, ...'
 */
export function srcSet(set: string): string {
  if (!BASE) return set;
  return set.replace(/(\/images\/[^\s,]+)/g, (match) => `${BASE}${match}`);
}
