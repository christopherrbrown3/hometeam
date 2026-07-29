import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { AuthProvider } from '../features/auth/AuthProvider'
import { RemoteChangeProvider } from '../features/realtime/RemoteChangeNotice'
import { createQueryClient } from '../lib/queryClient'

type AppProvidersProps = Readonly<{
  children: ReactNode
}>

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider><RemoteChangeProvider>{children}</RemoteChangeProvider></AuthProvider>
    </QueryClientProvider>
  )
}
