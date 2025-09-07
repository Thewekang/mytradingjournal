import { test, expect } from '@playwright/test';

test.describe('Visual Baseline', () => {
  test('exports page renders stable layout', async ({ page }) => {
  await page.goto('/exports');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot('exports.png', { maxDiffPixelRatio: 0.02 });
  });
});
