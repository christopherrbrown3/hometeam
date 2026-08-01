import { expect, test } from '@playwright/test'

test('publishes rich invite metadata and an installable HomeTeam manifest', async ({ page, request }) => {
  await page.goto('/')

  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Join my household on HomeTeam')
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /hometeam-invite-preview\.png$/)
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', 'favicon.svg')

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBeTruthy()
  if (!manifestHref) throw new Error('HomeTeam did not expose a PWA manifest link.')
  const manifestResponse = await request.get(new URL(manifestHref, page.url()).toString())
  expect(manifestResponse.ok()).toBe(true)
  const manifest = await manifestResponse.json()
  expect(manifest).toMatchObject({ display: 'standalone', name: 'HomeTeam' })
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: '/pwa-192x192.png' }),
    expect.objectContaining({ src: '/pwa-512x512.png' }),
    expect.objectContaining({ purpose: 'maskable', src: '/pwa-maskable-512x512.png' }),
  ]))

  const previewResponse = await request.get(new URL('/hometeam-invite-preview.png', page.url()).toString())
  expect(previewResponse.ok()).toBe(true)
  expect(previewResponse.headers()['content-type']).toContain('image/png')
})

test('share-friendly invite URLs preserve the protected join route', async ({ page }) => {
  const token = '123e4567-e89b-42d3-a456-426614174000'
  await page.goto(`/?invite=${token}`)

  await expect(page).toHaveURL(/#\/login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('hometeam.intended-route'))).toBe(`/join/${token}`)
})
