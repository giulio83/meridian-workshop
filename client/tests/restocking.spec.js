import { test, expect } from '@playwright/test'

test.describe('Restocking Recommendations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/restocking')
    await expect(page.locator('.loading')).toHaveCount(0, { timeout: 10000 })
  })

  test('page header is visible', async ({ page }) => {
    await expect(page.locator('.page-header h2')).toBeVisible()
  })

  test('shows recommendations table with items', async ({ page }) => {
    const table = page.locator('table')
    await expect(table).toBeVisible()
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('summary stat cards are present', async ({ page }) => {
    const cards = page.locator('.stat-card')
    await expect(cards.first()).toBeVisible()
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('budget input is present and accepts a value', async ({ page }) => {
    const budgetInput = page.locator('.budget-input')
    await expect(budgetInput).toBeVisible()
    await budgetInput.fill('50000')
    await expect(budgetInput).toHaveValue('50000')
  })

  test('applying a budget filters the recommendations', async ({ page }) => {
    const budgetInput = page.locator('.budget-input')
    const applyBtn = page.locator('.btn-apply')

    await budgetInput.fill('50000')
    await applyBtn.click()

    // Wait for reload
    await expect(page.locator('.loading')).toHaveCount(0, { timeout: 10000 })

    // Budget remaining stat card should now appear (4th card)
    const cards = page.locator('.stat-card')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test('rows show urgency badges', async ({ page }) => {
    const badges = page.locator('tbody tr .badge')
    const count = await badges.count()
    expect(count).toBeGreaterThan(0)
  })

  test('cost column shows currency values', async ({ page }) => {
    const rows = page.locator('tbody tr')
    const firstRow = rows.first()
    const cells = firstRow.locator('td')
    const texts = await cells.allTextContents()
    // At least one cell should contain a currency symbol
    const hasCurrency = texts.some(t => t.includes('$') || t.includes('¥') || t.includes(','))
    expect(hasCurrency).toBe(true)
  })
})
