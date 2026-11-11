import { describe, expect, it } from 'vitest';
import { buildOptimizedImageUrl } from './image-loader';

describe('cloudflareLoader', () => {
  it('handles empty or missing src', () => {
    expect(buildOptimizedImageUrl('', 200, 75, { resize: true })).toBe('');
  });

  it('passes through SVGs and data URIs unchanged', () => {
    expect(buildOptimizedImageUrl('/icon.svg', 200, 75, { resize: true })).toBe('/icon.svg');
    expect(buildOptimizedImageUrl('/icon.svg?v=1', 200, 75, { resize: true })).toBe('/icon.svg?v=1');
    expect(buildOptimizedImageUrl('data:image/png;base64,123', 200, 75, { resize: true })).toBe('data:image/png;base64,123');
  });

  it('enforces HTTPS before resizing an absolute product image', () => {
    expect(buildOptimizedImageUrl('http://images.luckystore1947.com/products/sample.webp', 256, 70, { resize: true }))
      .toBe('https://images.luckystore1947.com/cdn-cgi/image/width=256,quality=70,format=auto,fit=scale-down/products/sample.webp');
  });

  it('requests a small Cloudflare variant for product photos and keeps the cache-buster', () => {
    const src = 'https://images.luckystore1947.com/products/NOO-BUL-QTC.webp?t=123';
    expect(buildOptimizedImageUrl(src, 384, 80, { resize: true })).toBe(
      'https://images.luckystore1947.com/cdn-cgi/image/width=384,quality=80,format=auto,fit=scale-down/products/NOO-BUL-QTC.webp?t=123',
    );
  });

  it('resizes local hero files on the storefront zone when enabled', () => {
    expect(buildOptimizedImageUrl('/images/hero-reference.webp', 640, 70, { resize: true })).toBe(
      '/cdn-cgi/image/width=640,quality=70,format=auto,fit=scale-down/images/hero-reference.webp',
    );
  });

  it('leaves original URLs in place when resizing is disabled', () => {
    const src = 'https://images.luckystore1947.com/products/NOO-BUL-QTC.webp?t=123';
    expect(buildOptimizedImageUrl(src, 384, 80, { resize: false })).toBe(src);
    expect(buildOptimizedImageUrl('/images/hero-grocery-basket.webp', 384, undefined, { resize: false })).toBe(
      '/images/hero-grocery-basket.webp',
    );
  });

  it('does not resize unrelated hosts', () => {
    expect(buildOptimizedImageUrl('https://notfair.co/api/seo/image/test', 640, 75, { resize: true })).toBe(
      'https://notfair.co/api/seo/image/test',
    );
  });
});
