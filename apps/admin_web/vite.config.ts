import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/(\/|\\)(react|react-dom|react-router|react-router-dom|scheduler)(\/|\\)/.test(id)) {
              return 'vendor-react'
            }
            if (/(\/|\\)(recharts|d3|lucide-react|clsx)(\/|\\)/.test(id)) {
              return 'vendor-ui'
            }
            if (/(\/|\\)(@supabase\/supabase-js|@supabase\/postgres-js|@tanstack\/react-query|papaparse)(\/|\\)/.test(id)) {
              return 'vendor-data'
            }
            if (/(\/|\\)(i18next|react-i18next|i18next-browser-languagedetector)(\/|\\)/.test(id)) {
              return 'vendor-i18n'
            }
            if (/(\/|\\)(react-hook-form|@hookform\/resolvers|zod)(\/|\\)/.test(id)) {
              return 'vendor-forms'
            }
            if (/(\/|\\)(date-fns|gsap|@gsap)(\/|\\)/.test(id)) {
              return 'vendor-utils'
            }
            return 'vendor'
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js', 'recharts', 'date-fns', 'react-i18next', 'i18next'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: true,
  },
})