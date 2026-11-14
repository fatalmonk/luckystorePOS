import { defineConfig } from 'vitest/config';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.test.{ts,tsx}', 'lib/**/*.test.{ts,tsx}'],
    // Transform the SDK so its next/image.js import uses the test ESM interop.
    server: { deps: { inline: ['notfair-nextjs-blog'] } },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'next/image.js': require.resolve('next/image'),
    },
  },
});
