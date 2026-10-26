/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  devIndicators: false,
  images: {
    // Keep remote images browser-loaded until the standalone optimizer can
    // validate every redirect destination and reject private network targets.
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 160, 224, 280, 320, 384],
    // Do not enable the public Next image optimizer until remote redirects are
    // validated against private and loopback IP ranges. unoptimized images load
    // directly in the browser and this empty allowlist rejects crafted optimizer URLs.
    remotePatterns: [],
  },
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
    inlineCss: true,
  },
  async redirects() {
    return [
      {
        source: '/product/radhuni-biriyani-masala-40-g--cbbc35e5',
        destination: '/product/radhuni-biryani-masala-40g--35fdd44a',
        permanent: true,
      },
      {
        source: '/bn/product/radhuni-biriyani-masala-40-g--cbbc35e5',
        destination: '/bn/product/radhuni-biryani-masala-40g--35fdd44a',
        permanent: true,
      },
      {
        source: '/product/radhuni-roast-masala-40g--4ef25400',
        destination: '/product/radhuni-roast-masala-35-g--602a8c45',
        permanent: true,
      },
      {
        source: '/bn/product/radhuni-roast-masala-40g--4ef25400',
        destination: '/bn/product/radhuni-roast-masala-35-g--602a8c45',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/auth.md',
        destination: '/api/markdown?path=/auth.md',
      },
      {
        source: '/.well-known/auth.md',
        destination: '/api/markdown?path=/auth.md',
      },
    ];
  },
  async headers() {
    const linkHeaders = [
      '</.well-known/api-catalog>; rel="api-catalog"',
      '</.well-known/acp.json>; rel="service-desc"',
      '</.well-known/oauth-authorization-server>; rel="service-doc"',
      '</.well-known/oauth-protected-resource>; rel="service-doc"',
      '<https://agent.luckystore1947.com/.well-known/oauth-protected-resource>; rel="oauth-protected-resource"',
      '</.well-known/openid-configuration>; rel="service-doc"',
      '</.well-known/mcp/server-card.json>; rel="service-meta"',
      '</.well-known/agent-skills/index.json>; rel="service-doc"',
      '</auth.md>; rel="service-doc"',
      '</llms.txt>; rel="service-doc"',
      '</robots.txt>; rel="service-doc"',
      '</sitemap.xml>; rel="sitemap"',
    ];
    return [
      {
        source: '/api/mobile/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-order-tracking-token' },
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

module.exports = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })(nextConfig)
  : nextConfig;
