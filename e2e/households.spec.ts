import { expect, test } from '@playwright/test'

test('does not expose household management to an unauthenticated visitor', async ({ page }) => {
  await page.goto('/#/more')

  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Household settings' })).not.toBeVisible()
})
