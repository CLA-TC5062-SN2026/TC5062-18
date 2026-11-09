import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Avisos } from '@/components/Avisos'
import { queryClient } from '@/lib/query-client'

/** Proveedores comunes a ambos portales: TanStack Query y avisos globales. */
export function Proveedores({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Avisos />
    </QueryClientProvider>
  )
}
