import { expect, test } from '@playwright/test'

test('does not create an authorized realtime product view for a visitor without a session', async ({ browser }) => {
  const firstSession = await browser.newContext()
  const secondSession = await browser.newContext()
  const firstPage = await firstSession.newPage()
  const secondPage = await secondSession.newPage()

  await Promise.all([firstPage.goto('/#/today'), secondPage.goto('/#/history')])

  await expect(firstPage.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
  await expect(secondPage.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
  await expect(firstPage.getByRole('heading', { name: 'Today' })).not.toBeVisible()
  await expect(secondPage.getByRole('heading', { name: 'History' })).not.toBeVisible()

  await Promise.all([firstSession.close(), secondSession.close()])
})
