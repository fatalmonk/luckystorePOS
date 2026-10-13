import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Converts hashed CSS <link> tags to preload+stylesheet pairs so the browser
 * fetches them in parallel with HTML parsing instead of blocking on them.
 * Savings: ~40 ms per Lighthouse audit.
 */
function preloadCriticalAssetsPlugin(): Plugin {
  return {
    name: 'preload-critical-assets',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      let result = html.replace(
        /<link rel="stylesheet" crossorigin href="([^"]+\.css)">/g,
        (_, href) =>
          `<link rel="preload" as="style" href="${href}"><link rel="stylesheet" crossorigin href="${href}">`,
      );

      // Preload critical Geist variable fonts directly in <head>
      if (ctx.bundle) {
        for (const fileName of Object.keys(ctx.bundle)) {
          if (fileName.endsWith('.woff2') && fileName.includes('geist')) {
            result = result.replace(
              '</head>',
              `  <link rel="preload" href="/${fileName}" as="font" type="font/woff2" crossorigin>\n  </head>`,
            );
          }
        }
      }
      return result;
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preloadCriticalAssetsPlugin()],

  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
    // Force single copies of deps that appear in multiple chunks
    dedupe: ['react', 'react-dom', 'react-is', 'tslib', 'use-sync-external-store'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    modulePreload: { polyfill: false },
    rollupOptions: {
      // Allow Vite/Rollup to handle chunking to prevent circular dependency runtime deadlocks
    },
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js', 'recharts', 'date-fns', 'react-i18next', 'i18next'],
    // Devtools are lazy-loaded in DEV only; excluding prevents them from being
    // bundled into a shared chunk alongside react, removing the 90 KiB duplicate.
    exclude: ['@tanstack/react-query-devtools'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
  },
})