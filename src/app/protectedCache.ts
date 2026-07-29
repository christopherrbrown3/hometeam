import type { QueryClient } from '@tanstack/react-query'

/** Cancels work first so a request started before revocation cannot refill cache. */
export async function purgeProtectedCache(queryClient: QueryClient) {
  await queryClient.cancelQueries()
  queryClient.clear()
}
