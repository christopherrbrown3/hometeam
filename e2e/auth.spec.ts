import { expect, test } from '@playwright/test'

test('protects HomeTeam routes for unauthenticated visitors', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible()
})

test('starts registration at the top after exploring the login page', async ({ page }) => {
  await page.goto('/')

  const footer = page.locator('.login-footer')
  await footer.scrollIntoViewIfNeeded()
  await footer.getByRole('link', { name: 'Create an account' }).click()

  await expect(page).toHaveURL(/#\/register$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Create your account' })).toBeInViewport()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})
