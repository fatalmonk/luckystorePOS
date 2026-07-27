/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const path = require('path');

const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  devIndicators: false,
  images: {
    // Keep unoptimized: true so Vercel Image Optimization quota (1,000 free requests/mo) is never exceeded.
    // Static assets & banners use native responsive srcsets (_400, _600, _800, _1200 AVIF/WebP) directly from CDN.
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'images.luckystore1947.com',
      },
      {
        // images.luckystore1947.com is included above for Next.js image optimization,
        // allowing on-the-fly resizing to resolve Lighthouse warnings for oversized images.
        protocol: 'https',
        hostname: '*.workers.dev',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
    inlineCss: true,
  },
  async headers() {
    const linkHeaders = [
      '</.well-known/api-catalog>; rel="api-catalog"',
      '</.well-known/oauth-authorization-server>; rel="service-doc"',
      '</.well-known/oauth-protected-resource>; rel="service-doc"',
      '<https://agent.luckystore1947.com/.well-known/oauth-protected-resource>; rel="oauth-protected-resource"',
      '</.well-known/openid-configuration>; rel="service-doc"',
      '</.well-known/mcp/server-card.json>; rel="service-meta"',
      '</.well-known/agent-skills/index.json>; rel="service-doc"',
      '</auth.md>; rel="service-doc"',
      '</robots.txt>; rel="service-doc"',
      '</sitemap.xml>; rel="sitemap"',
    ];
    return [
      {
        source: '/site.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'Link', value: linkHeaders.join(', ') },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
