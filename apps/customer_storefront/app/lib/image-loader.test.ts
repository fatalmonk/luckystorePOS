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

  it('passes through URLs already using Cloudflare Image Resizing', () => {
    const existing = 'https://images.luckystore1947.com/cdn-cgi/image/width=100/products/sample.webp';
    expect(cloudflareLoader({ src: existing, width: 200 })).toBe(existing);
  });

  it('transforms Cloudflare R2 product image URLs with width and quality', () => {
    const src = 'https://images.luckystore1947.com/products/NOO-BUL-QTC.webp?t=123';
    const result = cloudflareLoader({ src, width: 384, quality: 80 });
    expect(result).toBe(
      'https://images.luckystore1947.com/cdn-cgi/image/width=384,quality=80,format=auto/products/NOO-BUL-QTC.webp?t=123'
    );
  });

  it('defaults quality to 75 for product images if not specified', () => {
    const src = 'https://images.luckystore1947.com/products/NOO-BUL-ORG.webp';
    const result = cloudflareLoader({ src, width: 224 });
    expect(result).toBe(
      'https://images.luckystore1947.com/cdn-cgi/image/width=224,quality=75,format=auto/products/NOO-BUL-ORG.webp'
    );
  });

  it('transforms local static assets in production', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      // @ts-expect-error mutating test env
      process.env.NODE_ENV = 'production';
      const result = cloudflareLoader({ src: '/images/hero-grocery-basket.webp', width: 384 });
      expect(result).toBe(
        '/cdn-cgi/image/width=384,quality=80,format=auto/images/hero-grocery-basket.webp'
      );
    } finally {
      // @ts-expect-error restoring test env
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('preserves local paths during development', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      // @ts-expect-error mutating test env
      process.env.NODE_ENV = 'development';
      const result = cloudflareLoader({ src: '/images/hero-grocery-basket.webp', width: 384 });
      expect(result).toBe('/images/hero-grocery-basket.webp');
    } finally {
      // @ts-expect-error restoring test env
      process.env.NODE_ENV = originalEnv;
    }
  });
});
