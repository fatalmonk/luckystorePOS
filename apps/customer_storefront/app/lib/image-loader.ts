interface CloudflareLoaderParams {
  src: string;
  width?: number;
  quality?: number;
}

export interface ImageResizeOptions {
  /** When omitted, resizing is on for production builds. */
  resize?: boolean;
}

const IMAGE_HOST = 'images.luckystore1947.com';

function shouldResize(resize: boolean | undefined): boolean {
  if (resize !== undefined) return resize;
  return process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_IMAGE_RESIZE !== '0';
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
  if (normalized.startsWith('http://')) {
    normalized = `https://${normalized.slice('http://'.length)}`;
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
