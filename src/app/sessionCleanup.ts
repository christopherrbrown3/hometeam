import type { QueryClient } from '@tanstack/react-query'
import { purgeProtectedCache } from './protectedCache'

export function clearSessionData(queryClient: QueryClient) {
  void purgeProtectedCache(queryClient)
}
