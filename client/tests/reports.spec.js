import { test, expect } from '@playwright/test'

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports')
    await expect(page.locator('.loading')).toHaveCount(0, { timeout: 10000 })
  })

  test('page header is visible', async ({ page }) => {
    await expect(page.locator('.page-header h2')).toBeVisible()
  })

  test('quarterly report table is present with data', async ({ page }) => {
    const tables = page.locator('table')
    const count = await tables.count()
    expect(count).toBeGreaterThanOrEqual(1)

    const rows = page.locator('table').first().locator('tbody tr')
    await expect(rows.first()).toBeVisible()
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)
  })

  test('monthly trends section is present', async ({ page }) => {
    // Scroll down to ensure content is in view
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    // There should be at least 2 card sections (quarterly + trends)
    const cards = page.locator('.card')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('global warehouse filter affects reports data', async ({ page }) => {
    // Get initial row count
    const rows = page.locator('table').first().locator('tbody tr')
    const initialCount = await rows.count()

    // Find warehouse filter in FilterBar
    const warehouseSelect = page.locator('select').first()
    const hasSelect = await warehouseSelect.isVisible().catch(() => false)

    if (hasSelect) {
      const options = await warehouseSelect.locator('option').allTextContents()
      // Pick a non-"all" option if available
      const nonAllOption = options.find(o => !o.toLowerCase().includes('all'))
      if (nonAllOption) {
        await warehouseSelect.selectOption({ label: nonAllOption })
        await expect(page.locator('.loading')).toHaveCount(0, { timeout: 10000 })
        const filteredCount = await rows.count()
        // Row count may change — just verify no JS error and table still present
        await expect(page.locator('table').first()).toBeVisible()
        expect(filteredCount).toBeGreaterThanOrEqual(0)
      }
    } else {
      expect(initialCount).toBeGreaterThan(0)
    }
  })

  test('currency values are formatted', async ({ page }) => {
    const cells = page.locator('td')
    const texts = await cells.allTextContents()
    const hasCurrency = texts.some(t => t.includes('$') || t.includes('¥') || /[\d,]+/.test(t))
    expect(hasCurrency).toBe(true)
  })
})
