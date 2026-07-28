import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../App'
import { router } from '../app/router'

describe('App', () => {
  it('redirects an unauthenticated visitor to sign in', async () => {
    await router.navigate('/')

    render(<App />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in' }),
    ).toBeVisible()
  })
})
