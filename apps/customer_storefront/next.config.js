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
    formats: ['image/webp'],
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
