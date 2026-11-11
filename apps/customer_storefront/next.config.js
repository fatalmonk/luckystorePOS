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

const nextConfig = {
  // Keep generated metadata in <head> for raw HTML crawlers. Next.js otherwise
  // streams slow dynamic metadata into <body> for user agents outside its bot list.
  htmlLimitedBots: /.*/,
  // Keep Turbopack and Webpack dev artifacts separate to prevent stale/mixed
  // client and server output when switching compilers. Production stays `.next`.
  distDir: (isDev && process.env.NEXT_DEV_DIST_DIR) || '.next',
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/*': ['../../node_modules/critters/**/*'],
  },
  serverExternalPackages: ['critters'],
  devIndicators: false,
  images: {
    // Delivery uses the custom Cloudflare loader. The built-in optimizer stays
    // closed: an empty remotePatterns list rejects crafted /_next/image URLs.
    loader: 'custom',
    loaderFile: './app/lib/image-loader.ts',
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1600],
    imageSizes: [64, 96, 128, 160, 256, 320, 384],
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
    // Critters inlines only the CSS used by the server HTML and loads the rest
    // of the stylesheet without blocking first paint. inlineCss is left off
    // because it duplicates the entire sheet in the document and the RSC payload.
    optimizeCss: true,
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
    const privateCache = [{ key: 'Cache-Control', value: PRIVATE_CACHE_CONTROL }];
    const hashedCache = [{ key: 'Cache-Control', value: HASHED_STATIC_CACHE_CONTROL }];
    const publicAssetCache = [{ key: 'Cache-Control', value: PUBLIC_ASSET_CACHE_CONTROL }];
    const manifestCache = [{ key: 'Cache-Control', value: MANIFEST_CACHE_CONTROL }];
    const privateSources = [
      '/cart',
      '/cart/:path*',
      '/checkout',
      '/checkout/:path*',
      '/login',
      '/login/:path*',
      '/signup',
      '/signup/:path*',
      '/profile',
      '/profile/:path*',
      '/order',
      '/order/:path*',
      '/wishlist',
      '/wishlist/:path*',
      '/account',
      '/account/:path*',
      '/bn/cart',
      '/bn/cart/:path*',
      '/bn/checkout',
      '/bn/checkout/:path*',
      '/bn/login',
      '/bn/login/:path*',
      '/bn/signup',
      '/bn/signup/:path*',
      '/bn/profile',
      '/bn/profile/:path*',
      '/bn/order',
      '/bn/order/:path*',
      '/bn/wishlist',
      '/bn/wishlist/:path*',
    ];
    return [
      {
        source: '/api/mobile/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-order-tracking-token' },
          ...SECURITY_HEADERS,
        ],
      },
      // Both patterns are intentional. Next's path matcher has historically
      // missed either the root or dotted static paths depending on the source.
      { source: '/:path*', headers: securityAndDiscovery },
      { source: '/(.*)', headers: securityAndDiscovery },
      { source: '/images/:path*', headers: publicAssetCache },
      { source: '/_next/static/:path*', headers: hashedCache },
      {
        source: '/:file(.*\\.(?:png|webp|avif|jpe?g|gif|svg|ico|woff2)$)',
        headers: publicAssetCache,
      },
      {
        source: '/:file(.*\\.webmanifest$)',
        headers: manifestCache,
      },
      ...privateSources.map((source) => ({ source, headers: privateCache })),
    ];
  },
};

module.exports = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })(nextConfig)
  : nextConfig;
