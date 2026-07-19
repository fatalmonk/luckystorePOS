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
        // images.luckystore1947.com is now included above for Next.js image optimization,
        // allowing on-the-fly resizing to resolve Lighthouse warnings for oversized images.
        protocol: 'https',
        hostname: '*.workers.dev',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
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
        source: '/(.*)',
        headers: [
          { key: 'Link', value: linkHeaders.join(', ') },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
