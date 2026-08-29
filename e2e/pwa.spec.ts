import { expect, test } from '@playwright/test'

test('installs the scoped app shell and keeps shared mutations out of background sync', async ({ page, request }) => {
  await page.goto('/')

  const registration = await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready
    return { scope: ready.scope, scriptURL: ready.active?.scriptURL ?? '' }
  })
  expect(registration.scope).toBe('http://127.0.0.1:4173/')
  expect(registration.scriptURL).toMatch(/service-worker\.js$/)

  const worker = await request.get(registration.scriptURL)
  expect(worker.ok()).toBe(true)
  const source = await worker.text()
  expect(source).toContain('notificationclick')
  expect(source).toContain('Household task update')
  expect(source).not.toMatch(/addEventListener\(["']sync["']/)
  expect(source).not.toContain('SyncManager')
})

test('revisits the protected app shell offline without inventing an authorized task view', async ({ context, page }) => {
  await page.goto('/#/today')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()

  await context.setOffline(true)
  await page.reload()

  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).not.toBeVisible()
  await context.setOffline(false)
})
