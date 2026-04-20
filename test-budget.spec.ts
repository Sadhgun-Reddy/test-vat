import { test, expect } from '@playwright/test';

test('Verify Budget Allocations Page', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'admin@vahd.gov.in');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button:has-text("Sign In")');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard');
  await page.waitForLoadState('networkidle');

  await page.goto('http://localhost:3000/settings');
  await page.waitForLoadState('networkidle');

  await page.click('text=Budget / Percentage Allocation');
  await page.waitForLoadState('networkidle');

  await page.waitForTimeout(2000);

  await expect(page.locator('button', { hasText: '+ Add new' })).toBeVisible({ timeout: 10000 });
  await page.click('button:has-text("+ Add new")');
  await expect(page.locator('text=Add Budget Allocation')).toBeVisible({ timeout: 10000 });
  await page.click('button:has-text("+ Add more")');

  const rowCount = await page.locator('table tbody tr').count();
  expect(rowCount).toBeGreaterThan(0);
});
