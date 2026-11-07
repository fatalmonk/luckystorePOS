import { defineConfig, devices } from '@playwright/test';
import { getMutationSafety } from './e2e/support/mutationSafety';

const mutationSafety = getMutationSafety();

if (mutationSafety.requested && !mutationSafety.allowed) {
  throw new Error(`Refusing E2E database mutation: ${mutationSafety.reason}`);
}

const hasIsolatedPreview = mutationSafety.allowed;
const E2E_PORT = 3001;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './e2e',
  testIgnore:
    process.env.CI && !hasIsolatedPreview
      ? [
          '**/homepage-audit.spec.ts',
          '**/product-navigation.spec.ts',
          '**/search-and-filters.spec.ts',
          '**/visual-audit.spec.ts',
          '**/wishlist.spec.ts',
        ]
      : undefined,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || E2E_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: process.env.CI
          ? `node -e "const fs=require('fs'), cp=require('child_process'); const standalone='.next/standalone/apps/customer_storefront/server.js'; if(fs.existsSync(standalone)){ cp.execSync('PORT=${E2E_PORT} node ' + standalone, {stdio:'inherit'}); } else if(fs.existsSync('.next')){ cp.execSync('npx next start -p ${E2E_PORT}', {stdio:'inherit'}); } else { cp.execSync('npm run dev -- --port ${E2E_PORT}', {stdio:'inherit'}); }"`
          : `npm run dev -- --port ${E2E_PORT}`,
        url: E2E_BASE_URL,
        reuseExistingServer: !process.env.CI,
      },
});
