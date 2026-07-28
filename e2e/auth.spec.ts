import { expect, test } from '@playwright/test'

test('protects HomeTeam routes for unauthenticated visitors', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible()
})
