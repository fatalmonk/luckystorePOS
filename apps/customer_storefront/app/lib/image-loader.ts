'use client';

interface CloudflareLoaderParams {
  src: string;
  width: number;
  quality?: number;
}

/**
 * Custom Next.js Image Loader leveraging Cloudflare Image Resizing.
 * 
 * - R2 Product images (images.luckystore1947.com): resized & converted to AVIF/WebP on-the-fly at edge.
 * - Local storefront assets (/images/..., /logo-main.png): routed through Cloudflare Image Resizing in production.
 * - SVGs, data URIs, and local dev server assets pass through unchanged.
 */
export default function cloudflareLoader({
  src,
  width,
  quality,
}: CloudflareLoaderParams): string {
  if (!src) return '';

  // Pass through vector images, base64 data URIs, or already transformed URLs
  if (
    src.endsWith('.svg') ||
    src.includes('.svg?') ||
    src.startsWith('data:') ||
    src.includes('/cdn-cgi/image/')
  ) {
    return src;
  }

  const q = quality || 75;

  // Cloudflare R2 bucket images (e.g. https://images.luckystore1947.com/products/...)
  const cdnPrefix = 'https://images.luckystore1947.com/';
  if (src.startsWith(cdnPrefix)) {
    const relativePath = src.slice(cdnPrefix.length);
    return `https://images.luckystore1947.com/cdn-cgi/image/width=${width},quality=${q},format=auto/${relativePath}`;
  }

  // Local static assets (e.g. /images/hero-grocery-basket.webp, /logo-main.png)
  if (src.startsWith('/')) {
    // In local development, the dev server does not have Cloudflare's /cdn-cgi/ edge engine
    if (process.env.NODE_ENV === 'development') {
      return src;
    }
    return `/cdn-cgi/image/width=${width},quality=${quality || 80},format=auto${src}`;
  }

  return src;
}
