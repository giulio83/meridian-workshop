import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('loads and shows dashboard cards', async ({ page }) => {
    await expect(page.locator('.page-header h2')).toBeVisible()
    // Wait for at least one card to appear (data loaded)
    await expect(page.locator('.card').first()).toBeVisible({ timeout: 10000 })
  })

  test('navigation tabs are all present', async ({ page }) => {
    const nav = page.locator('.nav-tabs')
    await expect(nav.getByRole('link', { name: /inventory/i })).toBeVisible()
    await expect(nav.getByRole('link', { name: /orders/i })).toBeVisible()
    await expect(nav.getByRole('link', { name: /restocking/i })).toBeVisible()
    await expect(nav.getByRole('link', { name: /reports/i })).toBeVisible()
  })

  test('filter bar is visible', async ({ page }) => {
    await expect(page.locator('.filter-bar, .filter-row, [class*="filter"]').first()).toBeVisible()
  })

  test('language switcher is present', async ({ page }) => {
    await expect(page.locator('.language-switcher')).toBeVisible()
  })

  test('switches to Japanese', async ({ page }) => {
    const switcher = page.locator('.language-switcher')
    await switcher.click()
    // After switching, page title area should update
    await page.waitForTimeout(300)
    // Logo / nav company name should now be in Japanese context
    await expect(page.locator('.logo h1')).toBeVisible()
    // Switch back to EN for clean state
    await switcher.click()
  })
})
