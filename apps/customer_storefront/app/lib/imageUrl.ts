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
const BASE = process.env.NEXT_PUBLIC_IMAGE_BASE_URL !== undefined
  ? process.env.NEXT_PUBLIC_IMAGE_BASE_URL
  : (process.env.NODE_ENV === 'development' ? '' : DEFAULT_CDN_BASE);

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

interface ResponsiveImageCandidate {
  /** Width suffix used in the asset filename. */
  fileWidth: number;
  /** Actual intrinsic width when it differs from the filename suffix. */
  intrinsicWidth?: number;
}

const DEFAULT_HERO_CANDIDATES: ResponsiveImageCandidate[] = [
  { fileWidth: 400 },
  { fileWidth: 600 },
  { fileWidth: 800 },
  { fileWidth: 1200 },
];

/**
 * Build standardized responsive hero banner image object with AVIF & WebP srcsets.
 */
export function responsiveHeroBanner(
  base: string,
  alt: string,
  candidates: ResponsiveImageCandidate[] = DEFAULT_HERO_CANDIDATES,
): ResponsiveImage {
  const buildSet = (extension: 'avif' | 'webp') => candidates
    .map(({ fileWidth, intrinsicWidth }) => (
      `/banners/${base}_${fileWidth}.${extension} ${intrinsicWidth ?? fileWidth}w`
    ))
    .join(', ');

  const largestCandidate = candidates.at(-1) ?? DEFAULT_HERO_CANDIDATES.at(-1)!;

  return {
    src: img(`/banners/${base}_${largestCandidate.fileWidth}.webp`),
    srcSet: srcSet(buildSet('webp')),
    sizes: '(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px',
    sources: [
      {
        srcSet: srcSet(buildSet('avif')),
        type: 'image/avif',
      },
    ],
    alt,
  };
}

