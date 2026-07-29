import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { purgeProtectedCache } from './protectedCache'

describe('purgeProtectedCache', () => {
  it('cancels in-flight work before removing protected data', async () => {
    const queryClient = new QueryClient()
    const cancelQueries = vi.spyOn(queryClient, 'cancelQueries')
    queryClient.setQueryData(['occurrences'], 'cached household data')

    await purgeProtectedCache(queryClient)

    expect(cancelQueries).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(['occurrences'])).toBeUndefined()
  })
})
