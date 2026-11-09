import { useQuery } from '@tanstack/react-query'
import type { ProductoCatalogo } from '@/types/api'
import { llamarApi } from './api-client'

// Patrón para todas las lecturas de la API: una función que llama al endpoint
// y un hook con useQuery que la envuelve. Copia este archivo para nuevos recursos.

export function obtenerCatalogo() {
  return llamarApi<ProductoCatalogo[]>('/catalogo')
}

export function useCatalogo() {
  return useQuery({
    queryKey: ['catalogo'],
    queryFn: obtenerCatalogo,
  })
}
