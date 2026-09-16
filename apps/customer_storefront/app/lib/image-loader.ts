'use client';

interface CloudflareLoaderParams {
  src: string;
  width?: number;
  quality?: number;
}

/**
 * Image loader for customer storefront.
 *
 * - Enforces HTTPS for absolute URLs to prevent non-TLS mixed content requests.
 * - Keeps original asset paths until Cloudflare image-resizing infrastructure is available.
 * - SVGs, data URIs, and local assets pass through safely.
 */
export default function cloudflareLoader({
  src,
}: CloudflareLoaderParams): string {
  if (!src) return '';

  let normalizedSrc = src.trim();

  // Enforce HTTPS for absolute HTTP URLs to prevent unencrypted requests
  if (normalizedSrc.startsWith('http://')) {
    normalizedSrc = 'https://' + normalizedSrc.slice('http://'.length);
  }

  // Pass through vector images, base64 data URIs, or untouched URLs
  return normalizedSrc;
}

