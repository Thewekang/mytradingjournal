// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Include both visual and e2e smoke suites
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // Prepare DB and seed once before the server starts
  globalSetup: './tests/e2e/global-setup.mjs',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4001',
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
    viewport: { width: 1280, height: 800 },
    colorScheme: 'dark',
  },
  webServer: {
    command: 'npm run build && npx next start -p 4001',
    url: 'http://localhost:4001',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      testDir: 'tests/visual',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-e2e',
      testDir: 'tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}-{projectName}{ext}',
});
