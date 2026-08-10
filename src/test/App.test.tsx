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
    expect(screen.getByText('Nobody has to keep the whole house in their head.')).toBeVisible()
    expect(screen.getByRole('figure', { name: /Product preview · Example household/i })).toBeVisible()
    expect(screen.getByRole('heading', { level: 2, name: 'Everyone can see whose turn it is.' })).toBeVisible()
    expect(screen.getAllByText('Kim')).toHaveLength(3)
    expect(screen.queryAllByText(/inkimidator/i)).toHaveLength(0)
    expect(screen.getByText('Create an account to get started with HomeTeam.')).toBeVisible()
    expect(screen.queryByText(/approved separately/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Under the hood' })).not.toBeInTheDocument()
    expect(screen.queryByText('Built like a real product')).not.toBeInTheDocument()
  })
})
