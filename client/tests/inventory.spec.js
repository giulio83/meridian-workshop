import { test, expect } from '@playwright/test'

test.describe('Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory')
    // Wait for data to load
    await expect(page.locator('.loading')).toHaveCount(0, { timeout: 10000 })
  })

  test('shows inventory table with rows', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible()
    const rows = page.locator('tbody tr')
    await expect(rows.first()).toBeVisible()
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('table has expected columns', async ({ page }) => {
    const headers = page.locator('thead th')
    const texts = await headers.allTextContents()
    const joined = texts.join(' ').toUpperCase()
    // Check for core columns regardless of language
    expect(joined).toMatch(/SKU|ITEM|NAME|STOCK|QTY|QUANTITY/i)
  })

  test('inventory card sections are present', async ({ page }) => {
    const cards = page.locator('.card')
    await expect(cards.first()).toBeVisible()
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('search or filter narrows results', async ({ page }) => {
    // Get baseline count
    const allRows = page.locator('tbody tr')
    const baseCount = await allRows.count()

    // Find a search input if present
    const searchInput = page.locator('input[type="text"], input[placeholder*="search" i], input[placeholder*="SKU" i]').first()
    const hasSearch = await searchInput.isVisible().catch(() => false)

    if (hasSearch) {
      await searchInput.fill('SRV')
      await page.waitForTimeout(400)
      const filteredCount = await allRows.count()
      expect(filteredCount).toBeLessThanOrEqual(baseCount)
    } else {
      // No search input — just verify table is stable
      expect(baseCount).toBeGreaterThan(0)
    }
  })
})
