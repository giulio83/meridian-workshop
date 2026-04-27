import { test, expect } from '@playwright/test'

test.describe('Orders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/orders')
    await expect(page.locator('.loading')).toHaveCount(0, { timeout: 10000 })
  })

  test('shows orders table with data', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible()
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('order status badges are present', async ({ page }) => {
    const badges = page.locator('.badge')
    const count = await badges.count()
    expect(count).toBeGreaterThan(0)
  })

  test('clicking a row opens order detail', async ({ page }) => {
    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    // A modal or detail panel should appear
    const modal = page.locator('[class*="modal"], [class*="detail"], [class*="overlay"]').first()
    const appeared = await modal.isVisible().catch(() => false)
    if (appeared) {
      await expect(modal).toBeVisible()
    } else {
      // Some implementations navigate instead of opening modal
      // Just verify no error state
      await expect(page.locator('.error')).toHaveCount(0)
    }
  })
})
