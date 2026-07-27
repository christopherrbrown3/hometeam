import { expect, test } from '@playwright/test'

test('routes the HomeTeam root to Today', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Today' }),
  ).toBeVisible()
})
