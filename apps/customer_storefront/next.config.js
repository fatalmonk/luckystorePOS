/** @type {import('next').NextConfig} */
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const {
  SECURITY_HEADERS,
  HASHED_STATIC_CACHE_CONTROL,
  PUBLIC_ASSET_CACHE_CONTROL,
  MANIFEST_CACHE_CONTROL,
  PRIVATE_CACHE_CONTROL,
} = require('./security-headers.cjs');
const publicImageCacheHeader = {
  key: 'Cache-Control',
  value: PUBLIC_ASSET_CACHE_CONTROL,
};

const nextConfig = {
  // Keep generated metadata in <head> for raw HTML crawlers. Next.js otherwise
  // streams slow dynamic metadata into <body> for user agents outside its bot list.
  htmlLimitedBots: /.*/,
  // Keep Turbopack and Webpack dev artifacts separate to prevent stale/mixed
  // client and server output when switching compilers. Production stays `.next`.
  distDir: (isDev && process.env.NEXT_DEV_DIST_DIR) || '.next',
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
    optimizePackageImports: ['@supabase/supabase-js', '@phosphor-icons/react'],
    ...(isDev ? {
      // Keep dev route graphs disk-backed and discard unreachable routes promptly.
      turbopackFileSystemCacheForDev: true,
      turbopackMemoryEviction: 'full',
      turbopackGc: { rootTtlMs: 0 },
      // Avoid loading every page entry into memory before it is requested.
      preloadEntriesOnStart: false,
    } : {}),
    // Keep the large shared stylesheet external. Next's inlineCss mode duplicates
    // it in both the document and the initial RSC payload on every dynamic route.
    webpackMemoryOptimizations: true,
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
      {
        source: '/product/dove-shampoo-intensive-repair-330ml--0cb22302',
        destination: '/product/dove-shampoo-intensive-repair-330-ml--6e4bb7c3',
        permanent: true,
      },
      {
        source: '/bn/product/dove-shampoo-intensive-repair-330ml--0cb22302',
        destination: '/bn/product/dove-shampoo-intensive-repair-330-ml--6e4bb7c3',
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
      '<https://agent.luckystore1947.com/.well-known/oauth-protected-resource>; rel="oauth-protected-resource"',
      '</.well-known/openid-configuration>; rel="service-doc"',
      '</.well-known/mcp/server-card.json>; rel="service-meta"',
      '</.well-known/agent-skills/index.json>; rel="service-doc"',
      '</auth.md>; rel="service-doc"',
      '</llms.txt>; rel="service-doc"',
      '</robots.txt>; rel="service-doc"',
      '</sitemap.xml>; rel="sitemap"',
    ];
    const securityAndDiscovery = [
      ...SECURITY_HEADERS,
      { key: 'Link', value: linkHeaders.join(', ') },
    ];
    const privateSources = [
      '/cart', '/cart/:path*', '/checkout', '/checkout/:path*',
      '/login', '/login/:path*', '/signup', '/signup/:path*',
      '/profile', '/profile/:path*', '/order', '/order/:path*',
      '/wishlist', '/wishlist/:path*', '/account', '/account/:path*',
      '/bn/cart', '/bn/cart/:path*', '/bn/checkout', '/bn/checkout/:path*',
      '/bn/login', '/bn/login/:path*', '/bn/signup', '/bn/signup/:path*',
      '/bn/profile', '/bn/profile/:path*', '/bn/order', '/bn/order/:path*',
      '/bn/wishlist', '/bn/wishlist/:path*',
    ];
    return [
      {
        source: '/scripts/:path*',
        headers: [{ key: 'Cache-Control', value: HASHED_STATIC_CACHE_CONTROL }],
      },
      {
        source: '/:file(.*\\.(?:png|webp|avif|jpe?g|gif|svg|ico|woff2)$)',
        headers: [{ key: 'Cache-Control', value: PUBLIC_ASSET_CACHE_CONTROL }],
      },
      // These release-bundled assets are version-controlled. Change the URL when
      // replacing their bytes so returning browsers do not retain stale artwork.
      {
        source: '/images/:path*',
        headers: [publicImageCacheHeader],
      },
      ...[
        '/logo-main.png',
        '/logo-main-inverse.png',
        '/logo-bangla.svg',
        '/logo-bangla-inverse.svg',
      ].map((source) => ({ source, headers: [publicImageCacheHeader] })),
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: HASHED_STATIC_CACHE_CONTROL }],
      },
      {
        source: '/:file(.*\\.webmanifest$)',
        headers: [{ key: 'Cache-Control', value: MANIFEST_CACHE_CONTROL }],
      },
      ...privateSources.map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: PRIVATE_CACHE_CONTROL }],
      })),
      {
        source: '/api/mobile/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-order-tracking-token' },
        ],
      },
      {
        source: '/:path*',
        headers: securityAndDiscovery,
      },
      {
        source: '/(.*)',
        headers: securityAndDiscovery,
      },
    ];
  },
};

module.exports = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })(nextConfig)
  : nextConfig;
