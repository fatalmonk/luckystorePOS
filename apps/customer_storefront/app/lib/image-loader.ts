interface CloudflareLoaderParams {
  src: string;
  width?: number;
  quality?: number;
}

export interface ImageResizeOptions {
  /** When omitted, resizing is on only if NEXT_PUBLIC_IMAGE_RESIZE=1. */
  resize?: boolean;
}

const IMAGE_HOST = 'images.luckystore1947.com';

function shouldResize(resize: boolean | undefined): boolean {
  if (resize !== undefined) return resize;
  return process.env.NEXT_PUBLIC_IMAGE_RESIZE === '1';
}

function resizeOptions(width: number | undefined, quality: number | undefined): string {
  const safeWidth = Math.max(16, Math.round(width || 640));
  const safeQuality = Math.max(40, Math.min(90, Math.round(quality || 75)));
  return `width=${safeWidth},quality=${safeQuality},format=auto,fit=scale-down`;
}

/**
 * Builds a Cloudflare Image Resizing URL when resizing is enabled.
 * The built-in `/_next/image` optimizer stays unused; this only rewrites
 * same-site and images.luckystore1947.com URLs.
 */
export function buildOptimizedImageUrl(
  src: string,
  width?: number,
  quality?: number,
  options: ImageResizeOptions = {},
): string {
  if (!src) return '';
  let normalized = src.trim();
  if (/^http:\/\//i.test(normalized)) {
    normalized = `https://${normalized.slice(normalized.indexOf('://') + 3)}`;
  }
  if (
    normalized.startsWith('data:')
    || normalized.startsWith('blob:')
    || /\.svg(?:$|\?)/i.test(normalized)
    || normalized.includes('/cdn-cgi/image/')
  ) {
    return normalized;
  }
  if (!shouldResize(options.resize)) return normalized;

  const params = resizeOptions(width, quality);
  if (normalized.startsWith('/')) {
    return `/cdn-cgi/image/${params}${normalized}`;
  }

  try {
    const url = new URL(normalized);
    if (url.hostname === IMAGE_HOST) {
      const path = url.pathname.replace(/^\/+/, '');
      return `${url.origin}/cdn-cgi/image/${params}/${path}${url.search}`;
    }
  } catch {
    return normalized;
  }
  return normalized;
}

export default function cloudflareLoader({ src, width, quality }: CloudflareLoaderParams): string {
  return buildOptimizedImageUrl(src, width, quality);
}

/**
 * src/srcSet pair for a same-origin image.
 * Emits a few Cloudflare widths when NEXT_PUBLIC_IMAGE_RESIZE=1.
 * SVGs and every other URL the loader refuses stay on the original, with no
 * duplicate srcset (that duplicate list is what made browsers drop images).
 */
export function cloudflareImageSources(
  src: string,
  widths: readonly number[],
  quality = 75,
): { src: string; srcSet?: string } {
  if (!src || widths.length === 0 || process.env.NEXT_PUBLIC_IMAGE_RESIZE !== '1') {
    return { src };
  }

  const uniqueWidths = [...new Set(widths)].sort((a, b) => a - b);
  const resized = uniqueWidths.map((width) => buildOptimizedImageUrl(src, width, quality, { resize: true }));
  if (resized[0] === src) return { src };

  const largest = uniqueWidths[uniqueWidths.length - 1];
  return {
    src: buildOptimizedImageUrl(src, largest, quality, { resize: true }),
    srcSet: resized.map((url, index) => `${url} ${uniqueWidths[index]}w`).join(', '),
  };
}
