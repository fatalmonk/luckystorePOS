import { defineConfig, devices } from '@playwright/test';

const hasIsolatedPreview = process.env.E2E_CAN_MUTATE === 'true';

export default defineConfig({
  testDir: './e2e',
  testIgnore:
    process.env.CI && !hasIsolatedPreview
      ? [
          '**/checkout.spec.ts',
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
    baseURL: 'http://localhost:3000',
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
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
