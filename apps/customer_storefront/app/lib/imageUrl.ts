/**
 * Resolves a local /images/... path to the configured CDN base URL.
 * Falls back to the local path when NEXT_PUBLIC_IMAGE_BASE_URL is not set (local dev).
 *
 * Usage:
 *   img('/banners/promo_snacks.webp')
 *   // → 'https://images.luckystore1947.com/banners/promo_snacks.webp'
 *
 * NOTE: R2 bucket object keys use /banners/ and /categories/ prefixes.
 * Avoid /images/ — that prefix does not exist on the CDN.
 */
const DEFAULT_CDN_BASE = 'https://images.luckystore1947.com';
const BASE = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL || DEFAULT_CDN_BASE).replace(/\/$/, '');

export function img(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (!BASE) return path;
  // path should start with /, e.g. '/banners/foo.webp'
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Converts a srcSet string with local paths to CDN-prefixed paths.
 * Input:  '/banners/foo_400.webp 400w, /banners/foo_800.webp 800w'
 * Output: 'https://images.luckystore1947.com/banners/foo_400.webp 400w, ...'
 */
export function srcSet(set: string): string {
  if (!set) return '';
  if (!BASE) return set;
  return set.replace(/(^|[\s,])(\/(banners|categories|images)\/[^\s,]+)/g, (_match, p1, p2) => `${p1}${BASE}${p2}`);
}

export interface ResponsiveImage {
  src: string;
  srcSet?: string;
  sizes?: string;
  sources?: { srcSet: string; type: string; media?: string }[];
  alt?: string;
}

/**
 * Build standardized responsive hero banner image object with AVIF & WebP srcsets.
 */
export function responsiveHeroBanner(base: string, alt: string): ResponsiveImage {
  return {
    src: img(`/banners/${base}_1200.webp`),
    srcSet: srcSet(
      `/banners/${base}_400.webp 400w, /banners/${base}_600.webp 600w, /banners/${base}_800.webp 800w, /banners/${base}_1200.webp 1200w`
    ),
    sizes: '(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px',
    sources: [
      {
        srcSet: srcSet(`/banners/${base}.avif 600w`),
        type: 'image/avif',
      },
    ],
    alt,
  };
}


