import type { QueryClient } from '@tanstack/react-query'

export function clearSessionData(queryClient: QueryClient) {
  queryClient.clear()
}
