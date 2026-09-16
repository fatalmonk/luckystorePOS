import { describe, expect, it } from 'vitest';
import cloudflareLoader from './image-loader';

describe('cloudflareLoader', () => {
  it('handles empty or missing src', () => {
    expect(cloudflareLoader({ src: '', width: 200 })).toBe('');
  });

  it('passes through SVGs and data URIs unchanged', () => {
    expect(cloudflareLoader({ src: '/icon.svg', width: 200 })).toBe('/icon.svg');
    expect(cloudflareLoader({ src: '/icon.svg?v=1', width: 200 })).toBe('/icon.svg?v=1');
    expect(cloudflareLoader({ src: 'data:image/png;base64,123', width: 200 })).toBe('data:image/png;base64,123');
  });

  it('enforces HTTPS for absolute HTTP URLs to eliminate mixed content', () => {
    const httpUrl = 'http://images.luckystore1947.com/products/sample.webp';
    expect(cloudflareLoader({ src: httpUrl, width: 200 })).toBe(
      'https://images.luckystore1947.com/products/sample.webp'
    );
  });

  it('preserves HTTPS Cloudflare R2 product image URLs without 404-inducing cdn-cgi prefix', () => {
    const src = 'https://images.luckystore1947.com/products/NOO-BUL-QTC.webp?t=123';
    expect(cloudflareLoader({ src, width: 384, quality: 80 })).toBe(src);
  });

  it('preserves local static asset paths without transformation', () => {
    expect(cloudflareLoader({ src: '/images/hero-grocery-basket.webp', width: 384 })).toBe(
      '/images/hero-grocery-basket.webp'
    );
  });
});

