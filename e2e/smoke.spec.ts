import { expect, test } from '@playwright/test'

test('renders the HomeTeam landing page', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: 'HomeTeam' }),
  ).toBeVisible()
})
